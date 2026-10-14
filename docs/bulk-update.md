# Bulk Update

**v1.1.0** adds Bulk Update, adjacent single/bulk assignment actions, combined
property filters, and an improved walkthrough. This non-breaking minor release
preserves existing permissions, runtime configuration, and extension definitions.

In **Edit mode**, choose **Bulk Assign/Update** directly beside a Schema or
Directory Extension's single-object assignment arrow. The existing actions-menu
entry **Bulk Update** remains available. For a single object, use the adjacent
arrow instead. See the [Wizard guide](assignment-wizard.md) for both scenarios.

1. Choose one or more of the extension's declared target types.
2. Choose **Selected objects** and check individual objects, or choose
   **All available objects**. Selections may include multiple object types.
3. Optionally add property conditions and choose **Apply filters**. All conditions
   combine with AND. Applying or clearing conditions resets object selections.
   Check the desired matching objects after applying filters, or use all objects.
4. Enter the configuration. Directory extensions take a value of their declared
   type; Boolean values are `true` or `false`, integers are JSON numbers, Binary
   values are base64, and DateTime values are ISO 8601 timestamps. Schema
   extensions take a JSON object of declared property names and typed values,
   for example `{"courseId":42,"courseName":"Security training"}`.
5. Choose **Review update**, inspect the count, target types, applied conditions,
   and values, then
   choose **Confirm update**.

All available objects means every object matching the **applied property filters**
in the chosen collections, including objects with no existing extension value.
Every Graph page is evaluated without a result cap. The **Filter objects** quick
search only changes visible rows; it does not restrict an all-objects update or
discard checked objects. Property filters and display search are deliberately
separate. Discovery is refreshed before confirmation; if any required collection
or membership fails to load, writing is blocked rather than using a partial list.

![Combined department and standard extension attribute filters](images/assignment-bulk-filters.png)

## Property Filters

Use **Add filter** to add a property, operator, and value. **Apply filters** executes
the query; editing a condition does not issue a request on every keystroke. Review
is disabled while conditions are unapplied. **Clear filters** restores unfiltered
discovery and clears selection.

| Properties | Applicable types |
| --- | --- |
| Display Name, Object Type, Object ID | All supported declared directory target types |
| UPN, Department, Job Title, Company Name, User Type | User |
| Mail | User, Group |
| Account Enabled | User, Device |
| Group Type, Group Membership Rule, Security Enabled, Mail Enabled | Group |
| Group Membership (Group ID), Administrative Unit Membership (Unit ID) | User, Group, Device |
| ExtensionAttribute1 through ExtensionAttribute15 | User, Device |

Text operators are **Equals**, **Not Equals**, **Contains**, **Starts With**,
**Ends With**, **Is Empty**, and **Is Not Empty**. Matching is case-insensitive;
filter values are trimmed. Empty means null, missing, empty string, or empty
collection. False is not empty. A property that does not apply to an object type
never matches, even with Not Equals or Is Empty; a user-only Department filter
therefore excludes groups from a mixed-type operation.

Boolean filters take True or False and support Equals, Not Equals, Is Empty,
and Is Not Empty. Membership filters take a GUID and support Equals/Not Equals
(direct member/not direct member). They are not transitive, and an administrative
unit's group membership does not imply membership for every user in that group.
Multiple membership filters form an intersection. Hidden memberships may require
`Member.Read.Hidden` and a suitable role; those scopes are not added by the app.
An authorization failure blocks discovery and writing.

Group Type matches entries in Graph's `groupTypes` array: `Unified` identifies
a Microsoft 365 group and `DynamicMembership` identifies dynamic membership.
An empty array describes a non-Unified, non-dynamic group; combine Security
Enabled and Mail Enabled to further distinguish security/distribution groups.
Group Membership Rule filters the raw `membershipRule` text.

The 15 standard attributes are read from `onPremisesExtensionAttributes` on users
and `extensionAttributes` on devices. They are not custom schema/directory
extension properties, and they are not available on groups or applications.
These controls only read them as criteria; they do not change those attributes.

## Examples

| Scenario | Combined filters |
| --- | --- |
| Engineering users in a region | Department Equals `Engineering` AND ExtensionAttribute1 Equals `West` |
| Active internal users | User Type Equals `Member` AND Account Enabled Equals `true` AND Mail Ends With `@contoso.com` |
| Job-title and employer intersection | Job Title Contains `Engineer` AND Company Name Starts With `Contoso` |
| Standard attribute pilot population | ExtensionAttribute15 Equals `Pilot` AND ExtensionAttribute2 Is Empty |
| Specific naming convention | Display Name Starts With `LAPTOP-` AND Object Type Equals `Device` |
| Dynamic Microsoft 365 groups | Group Type Equals `Unified` AND Group Type Equals `DynamicMembership` |
| Membership intersection | Group Membership Equals a group GUID AND Administrative Unit Membership Equals a unit GUID |
| Exclude a direct member population | Group Membership Not Equals a group GUID AND Account Enabled Equals `true` |

In the demo, Department Equals `Engineering` AND ExtensionAttribute1 Equals
`West` matches **Adele Vance**. The **Assignment Filter Example Group** has ID
`11111111-0000-4000-8000-000000000001`, and **Assignment Filter Example Unit** has
ID `22222222-0000-4000-8000-000000000001`. Adding both positive membership conditions
to that example still matches Adele. Use real tenant GUIDs outside the demo.

## Large Environments

Only identity and required filter properties are selected. Supported equality
and prefix conditions narrow Graph queries with `$filter`; advanced requests
retain `ConsistencyLevel: eventual` on subsequent pages. Other operators,
including Contains and standard extension attribute filters, are evaluated
page by page locally to avoid claiming unsupported Graph query capabilities.
Start with a selective built-in equality or prefix condition where possible.

Membership IDs are resolved through paginated group/unit member collections
once per unique condition per discovery run, not with a separate request for
each object. Broad queries or local-only conditions can still scan the chosen
collections and take time in large tenants. Discovery checks cancellation
between pages, and failed requests do not silently broaden or partially apply
the target set. Graph advanced indexes are eventually consistent; a fresh query
before confirmation is not a transactional snapshot of the tenant.

Object and result tables render 50 rows per page. Pagination and display search
do not limit the confirmed target count. Only minimal matching identities are
retained for selection and writing; filter property payloads are not persisted.

## Write Results

Updates persist on the objects and overwrite the supplied extension values.
For schemas, only properties supplied in the JSON object are sent. Unknown
properties and invalid types are rejected before writing. Definition metadata
is not changed. Graph still enforces permissions, roles, extension lifecycle,
and restrictions such as on-premises-managed values.

Writes run sequentially, with progress and a final result for each object. A
failed write does not prevent subsequent objects from being attempted. There
is no transaction, automatic rollback, or application-level retry of the bulk
operation. Switching out of Edit mode blocks further writes; an already-sent
request may still complete. Close the results and reopen Bulk Update to retry
only failed objects.

## Supported Targets

The workflow uses the app's existing directory Graph permissions and supports
User, Group, Device, Application, AdministrativeUnit, and Organization, where
declared by the extension. The organization is resolved to its actual object ID.

Mailbox-bound schema targets (Contact, Event, Message, Post) are explicitly
flagged and excluded. They require mailbox/group context and additional Graph
permissions that the application does not currently request. Authentication and
permission scopes are unchanged by this enhancement.