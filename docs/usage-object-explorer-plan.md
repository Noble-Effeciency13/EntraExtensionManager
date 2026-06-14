# Planning: Usage Monitor — Object & Value Drill‑down

**Status:** Investigation / planning (no code yet)
**Author:** _draft for review_
**Related code:** [src/features/tools/UsagePage.tsx](../src/features/tools/UsagePage.tsx), [src/components/UsageDialog.tsx](../src/components/UsageDialog.tsx), [src/api/usage.ts](../src/api/usage.ts), [src/graph/client.ts](../src/graph/client.ts), [src/auth/msalConfig.ts](../src/auth/msalConfig.ts)

---

## 1. Objective

Today the Usage monitor answers **"how many"** objects use an extension. We want it to also answer **"which objects"** and **"what value"** — i.e. drill from a count into the actual list of directory objects that carry a given extension attribute, together with the data stored in that attribute.

Example target experience:

> For schema extension `contoso_hr`, target **User**, show the 1,240 users that have a value, each row listing UPN + the per‑property values (`employeeId`, `costCenter`, …), with search, paging and CSV export.

This document analyses the Graph API, permission, performance, UI and code requirements. It does **not** change behaviour yet.

---

## 2. Current state

The usage feature only ever **counts**. The core call in [src/api/usage.ts](../src/api/usage.ts) is:

```ts
// countWithFilter()
client.api(`${collection}/$count`)
  .header('ConsistencyLevel', 'eventual')
  .filter(filter)            // e.g. `contoso_hr/employeeId ne null`
  .get();                    // -> a number
```

Supported target collections (the `SUPPORTED_COLLECTIONS` map):

| Target object       | Graph collection                        |
| ------------------- | --------------------------------------- |
| User                | `/users`                                |
| Group               | `/groups`                               |
| Device              | `/devices`                              |
| Application         | `/applications`                         |
| AdministrativeUnit  | `/directory/administrativeUnits`        |

`Organization` is deliberately excluded (singleton, `$count` unsupported). Mailbox‑bound schema targets (`Message`, `Event`, `Post`, `Contact`) are **not** in the map because they are not directory‑listable the same way.

Consumers:
- [UsagePage.tsx](../src/features/tools/UsagePage.tsx) — dashboard with `useBulkUsageProbe`, charts, and a per‑row **Probe** button.
- [UsageDialog.tsx](../src/components/UsageDialog.tsx) — per‑extension dialog showing counts per target type.

**Gap:** no call ever returns object identities or attribute values; there is no paging, no value rendering, no export.

---

## 3. Graph API design

### 3.1 From counting to listing

Replace `/{collection}/$count` with a **collection list** that selects the extension data:

```http
GET /users
  ?$filter={probe} ne null
  &$select=id,displayName,userPrincipalName,{selectExpr}
  &$count=true
  &$top=100
ConsistencyLevel: eventual
```

Response gives `value[]`, `@odata.count`, and `@odata.nextLink` for paging.

### 3.2 Schema extensions vs directory extensions

The `$filter` / `$select` expressions differ by variant:

| Variant                | Filter (`{probe}`)              | Select (`{selectExpr}`)        | Value shape returned |
| ---------------------- | ------------------------------- | ------------------------------ | -------------------- |
| Schema extension       | `{extId}/{firstProp} ne null`   | `{extId}`                      | nested object: `{ prop1: v1, prop2: v2, … }` |
| Directory extension    | `{extName} ne null`             | `{extName}`                    | scalar on the object: `extension_{appId}_{name}: value` |

- **Schema extension:** selecting the extension `id` returns *all* its properties as one complex object, so a single `$select` yields every property value for the row.
- **Directory extension:** the attribute is a flat property `extension_{appId}_{name}`; select it directly.

> Filtering for "not null" on these properties is an **advanced query** — it requires `ConsistencyLevel: eventual` and `$count=true` (already proven by the existing count probe).

### 3.3 Per‑target identity columns

Pick sensible display/identity columns per collection so the table is meaningful:

| Collection            | Suggested `$select` identity fields            |
| --------------------- | ---------------------------------------------- |
| `/users`              | `id, displayName, userPrincipalName`           |
| `/groups`             | `id, displayName, mailNickname`                |
| `/devices`            | `id, displayName, deviceId`                    |
| `/applications`       | `id, displayName, appId`                       |
| `/directory/administrativeUnits` | `id, displayName`                   |

### 3.4 Paging strategy

- Use `$top` (≤ 999 for directory objects) and follow `@odata.nextLink`.
- Default to a **preview** (first page, e.g. 100) and offer **Load more** / **Load all** with progress + cancel.
- Reuse the bounded‑concurrency / `Retry-After`‑aware patterns already in `useBulkUsageProbe`.

---

## 4. Permissions analysis

**Key finding: the existing Read‑mode scopes are already sufficient** for the five supported target types. No new admin consent is strictly required for v1.

Current scopes ([msalConfig.ts](../src/auth/msalConfig.ts)):

```
readScopes = User.Read, Application.Read.All, Directory.Read.All, AuditLog.Read.All
```

Coverage for **reading objects + their extension values**:

| Target              | Minimum delegated scope             | Covered by current scopes?           |
| ------------------- | ----------------------------------- | ------------------------------------ |
| User                | `Directory.Read.All` / `User.Read.All` | ✅ `Directory.Read.All`            |
| Group               | `Directory.Read.All` / `Group.Read.All` | ✅ `Directory.Read.All`           |
| Device              | `Directory.Read.All` / `Device.Read.All` | ✅ `Directory.Read.All`          |
| Application         | `Application.Read.All`              | ✅ already granted                    |
| AdministrativeUnit  | `Directory.Read.All` / `AdministrativeUnit.Read.All` | ✅ `Directory.Read.All` |

Notes / caveats:
- The extension **value** lives on the directory object, so it is returned under the same read scope — no extra scope per attribute.
- Reading data is fully compatible with the app's **Read mode**; this feature should never require Edit mode.
- Future expansion to mailbox‑bound schema targets (`Message`, `Event`, `Post`, `Contact`) *would* need per‑user scopes such as `Mail.Read` / `Calendars.Read` and is **out of scope** for v1.
- Conditional Access / PIM in the tenant can still restrict directory reads regardless of granted scopes.

---

## 5. Performance, throttling & reliability

Listing objects is materially heavier than counting:

- **Throttling:** Graph throttles list+filter+count more aggressively than `$count` alone. Keep the existing sequential‑per‑target + bounded worker‑pool approach and honour `Retry-After`.
- **Lazy by default:** unlike the count probe (which auto‑runs on dashboard entry), the object list must be **on‑demand** — only fetch when the user opens a specific extension/target drill‑down.
- **Page sizing:** `$top` up to 999 for directory objects; expose Load‑more rather than eagerly walking every page.
- **Cancellation:** support aborting an in‑flight paged load (the dashboard already tracks progress state we can mirror).
- **Caching:** use `useInfiniteQuery` (react‑query is already a dependency) keyed by `{variant, extId, target}` so re‑opening a drill‑down is instant.

---

## 6. UI / UX design

Two viable surfaces (recommend starting with **A**):

**A. Extend the per‑extension dialog** ([UsageDialog.tsx](../src/components/UsageDialog.tsx))
- Add a **"View objects"** action on each target‑type row (next to the count).
- Opens an objects table: columns = *Object* (displayName), *Identifier* (UPN/appId/…), *Value(s)*.
- Client‑side search over the loaded page, Load‑more, and **Export CSV/JSON**.

**B. Dedicated drill‑down route**
- New route e.g. `/tools/usage/:variant/:extId/:target` in [router.tsx](../src/router.tsx).
- Full‑page virtualized table for very large result sets; deep‑linkable.

Cross‑cutting UI concerns:
- **Value rendering:** schema extensions return a complex object → render as key/value chips or sub‑columns; directory extensions render a single value. Truncate long/`Binary` values.
- **Virtualization** for large lists (Phase 2+).
- **Empty/error states** consistent with current dialog.
- **PII warning banner** + optional value masking toggle (see §8).

---

## 7. Code changes required

New / changed files:

| File | Change |
| ---- | ------ |
| `src/api/usageObjects.ts` *(new)* | `listSchemaExtensionObjects()`, `listDirectoryExtensionObjects()` and a `useExtensionObjects` hook built on `useInfiniteQuery`; build `$filter`/`$select`/`$top`, follow `@odata.nextLink`. |
| [src/api/usage.ts](../src/api/usage.ts) | Optionally extract the `SUPPORTED_COLLECTIONS` map + identity‑field map into a shared module reused by both count and list code. |
| `src/components/ExtensionObjectsDialog.tsx` *(new)* or extend [UsageDialog.tsx](../src/components/UsageDialog.tsx) | Objects table UI: paging, search, export, value rendering. |
| [src/features/tools/UsagePage.tsx](../src/features/tools/UsagePage.tsx) | Wire the new "View objects" entry point from per‑target rows. |
| [src/types/extensions.ts](../src/types/extensions.ts) | Add `ExtensionObjectRow` / page result types. |
| `src/utils/exportImport.ts` | Reuse/extend for CSV/JSON export of object lists. |
| [src/router.tsx](../src/router.tsx) | Only if option **B** (dedicated route) is chosen. |

Proposed types (illustrative):

```ts
export interface ExtensionObjectRow {
  id: string;
  displayName: string;
  identifier?: string;            // UPN / appId / deviceId
  target: string;                 // User | Group | …
  values: Record<string, unknown>; // schema: per-property; directory: { [name]: value }
}

export interface ExtensionObjectsPage {
  rows: ExtensionObjectRow[];
  nextLink?: string;
  totalCount?: number;            // from @odata.count
}
```

Reused building blocks: `createGraphClient` ([graph/client.ts](../src/graph/client.ts)), `useGraphToken` ([auth/useGraphToken.ts](../src/auth/useGraphToken.ts)), the worker/`Retry-After` pattern in [usage.ts](../src/api/usage.ts).

---

## 8. Security & privacy considerations

- **Real PII exposure:** object lists surface live identities and attribute values, which can be sensitive. Gate strictly behind authenticated Read mode (already the case) and never log values.
- **Masking toggle:** consider an off‑by‑default "reveal values" switch, mirroring how the app treats edit affordances.
- **Export caution:** CSV/JSON exports carry PII out of the browser — add a confirmation and a size cap.
- **Binary / large values:** truncate or base64‑preview rather than dumping raw blobs.
- **No server side:** consistent with the app's browser‑only model; data stays in the session, nothing persisted.

---

## 9. Phased delivery (complexity‑ordered, not time‑boxed)

**Phase 1 — MVP drill‑down**
- One variant at a time, single target, first‑page preview + Load‑more, basic value rendering, CSV export, in the existing dialog (option A).
- No new scopes; reuse current read scopes.

**Phase 2 — Scale & usability**
- Virtualized table, client‑side search/filter, value masking, schema multi‑property columns, JSON export, cancellation.

**Phase 3 — Cross‑extension explorer**
- Dedicated route, aggregate across targets/extensions, saved views, bulk export.

---

## 10. Open questions & risks

1. **Surface:** dialog (A) vs dedicated route (B) for the first release? (Recommend A.)
2. **Schema value rendering:** how to present multi‑property complex values compactly in a table.
3. **Throttling at scale:** validate behaviour on a large tenant (100k+ users) and tune `$top`/concurrency.
4. **Filter support edge cases:** confirm advanced‑query `ne null` works for every supported target (Users/Groups/Devices proven by the count probe; re‑verify Applications/AdministrativeUnits for listing).
5. **Export limits:** maximum rows to export client‑side before performance/PII concerns dominate.
6. **AdministrativeUnit listing:** confirm `$select` of a directory extension is returned on `/directory/administrativeUnits`.

---

## 11. Summary

- **Feasible with no new permissions** for the five currently supported target types — `Directory.Read.All` + `Application.Read.All` already cover reading objects and their extension values.
- The main work is **API (list+page instead of count), value rendering, and UI** — not consent.
- Recommend an **on‑demand, lazy** drill‑down (never auto‑run) starting as a dialog extension, with PII‑aware export and masking.
