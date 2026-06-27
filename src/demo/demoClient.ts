/**
 * A stand-in for the Microsoft Graph `Client` used while demo mode is active.
 * It mimics the fluent request-builder surface the API layer relies on
 * (`.api(path).select().expand().top().filter().orderby().header().count()
 * .search().get()/.post()/.patch()/.delete()`) and resolves every call against
 * the in-memory {@link getDemoStore demo store} instead of the network.
 *
 * Fidelity is "plausible", not exact: filters/search are interpreted with
 * best-effort heuristics, which is all the demo needs. Unknown routes resolve
 * to empty results rather than throwing, so new API calls degrade gracefully.
 */
import {
  getDemoStore,
  type DemoObject,
  type DemoOpenExtension,
  type DemoStore,
} from './demoData';
import type { SchemaExtension } from '@/types/extensions';

/** Sentinel access token that signals {@link createGraphClient} to go offline. */
export const DEMO_GRAPH_TOKEN = '__eem_demo_token__';

type Json = Record<string, unknown>;

interface DemoRequestState {
  path: string;
  filter?: string;
  search?: string;
  count?: boolean;
}

type DirectoryKey = keyof DemoStore['directory'];

const COLLECTION_BY_PATH: Record<string, DirectoryKey> = {
  '/users': 'users',
  '/groups': 'groups',
  '/devices': 'devices',
  '/applications': 'applications',
  '/organization': 'organization',
  '/directory/administrativeUnits': 'administrativeUnits',
};

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function rand8(): string {
  return Math.random().toString(36).slice(2, 10);
}

function stripQuery(path: string): string {
  const noProto = path.replace(/^https?:\/\/[^/]+/i, '');
  const q = noProto.indexOf('?');
  const base = q >= 0 ? noProto.slice(0, q) : noProto;
  return base.replace(/\/+$/, '') || '/';
}

/** Pull the non-null property/extension key out of a `<key> ne null` filter. */
function filterKey(filter: string | undefined): string | undefined {
  if (!filter) return undefined;
  const m = filter.match(/([^\s(]+)\s+ne\s+null/i);
  if (!m) return undefined;
  const token = m[1];
  return token.includes('/') ? token.split('/')[0] : token;
}

/** Extract the free-text term from a Graph `$search` expression. */
function searchTerm(search: string | undefined): string | undefined {
  if (!search) return undefined;
  const m = search.match(/:([^"]+)"/);
  return m ? m[1].trim().toLowerCase() : undefined;
}

function allDirectoryObjects(store: DemoStore): DemoObject[] {
  const d = store.directory;
  return [
    ...d.users,
    ...d.groups,
    ...d.devices,
    ...d.organization,
    ...d.administrativeUnits,
  ];
}

function findObject(store: DemoStore, id: string): DemoObject | undefined {
  return allDirectoryObjects(store).find((o) => o.id === id);
}

function objectSummary(o: DemoObject): Json {
  const out: Json = { id: o.id, displayName: o.displayName, ...o.values };
  if (o.userPrincipalName) out.userPrincipalName = o.userPrincipalName;
  if (o.mail) out.mail = o.mail;
  if (o.mailNickname) out.mailNickname = o.mailNickname;
  if (o.deviceId) out.deviceId = o.deviceId;
  if (o.appId) out.appId = o.appId;
  return out;
}

// --------------------------------------------------------------------------
// GET
// --------------------------------------------------------------------------
function routeGet(req: DemoRequestState): unknown {
  const store = getDemoStore();
  const path = stripQuery(req.path);

  // /{collection}/$count  -> number
  const countMatch = path.match(/^(.*)\/\$count$/);
  if (countMatch) {
    const collPath = countMatch[1];
    const key = filterKey(req.filter);
    const coll = COLLECTION_BY_PATH[collPath];
    if (!coll || !key) return 0;
    return store.directory[coll].filter((o) => o.values[key] != null).length;
  }

  // /schemaExtensions  -> list (optionally filtered by status / owner)
  if (path === '/schemaExtensions') {
    let items = store.schemaExtensions;
    const status = req.filter?.match(/status\s+eq\s+'([^']+)'/i)?.[1];
    const owner = req.filter?.match(/owner\s+eq\s+'([^']+)'/i)?.[1];
    if (status) items = items.filter((s) => s.status === status);
    if (owner) items = items.filter((s) => s.owner === owner);
    return { value: items };
  }

  // /servicePrincipals  -> resolve any appId to the demo home tenant
  if (path === '/servicePrincipals') {
    return { value: [{ appOwnerOrganizationId: store.account.tenantId }] };
  }

  // /organization  -> singleton list
  if (path === '/organization') {
    return { value: store.directory.organization.map(objectSummary) };
  }

  // /{collection}/{id}/extensions[/{name}]  -> open extensions
  const extMatch = path.match(
    /^\/(users|groups|devices|organization)\/([^/]+)\/extensions(?:\/(.+))?$/,
  );
  if (extMatch) {
    const obj = findObject(store, decodeURIComponent(extMatch[2]));
    const list = obj?.extensions ?? [];
    if (extMatch[3]) {
      const name = decodeURIComponent(extMatch[3]);
      const one = list.find((e) => e.id === name || e.extensionName === name);
      return one ?? { value: [] };
    }
    return { value: list };
  }

  // /applications  -> app registrations (directory-extensions page, app picker,
  // appId list) or a name search.
  if (path === '/applications') {
    const term = searchTerm(req.search);
    let apps = store.apps;
    const starts = req.filter?.match(/startswith\(displayName,'([^']*)'\)/i)?.[1];
    if (term) apps = apps.filter((a) => a.displayName.toLowerCase().includes(term));
    else if (starts)
      apps = apps.filter((a) =>
        a.displayName.toLowerCase().startsWith(starts.toLowerCase()),
      );
    return {
      value: apps.map((a) => ({
        id: a.id,
        appId: a.appId,
        displayName: a.displayName,
        extensionProperties: a.extensionProperties,
      })),
    };
  }

  // /{collection}  -> directory search or usage-objects listing
  const coll = COLLECTION_BY_PATH[path];
  if (coll) {
    const objects = store.directory[coll];
    const term = searchTerm(req.search);
    if (term !== undefined || req.search) {
      const matched = (
        term
          ? objects.filter(
              (o) =>
                o.displayName.toLowerCase().includes(term) ||
                o.userPrincipalName?.toLowerCase().includes(term) ||
                o.mail?.toLowerCase().includes(term) ||
                o.deviceId?.toLowerCase().includes(term),
            )
          : objects
      ).slice(0, 25);
      return { value: matched.map(objectSummary) };
    }
    const key = filterKey(req.filter);
    const rows = (key ? objects.filter((o) => o.values[key] != null) : objects).map(
      objectSummary,
    );
    return { '@odata.count': rows.length, value: rows };
  }

  // /{collection}/{id}  -> single object read-back (validate / assign tools)
  const itemMatch = path.match(
    /^\/(users|groups|devices|organization|directory\/administrativeUnits)\/([^/]+)$/,
  );
  if (itemMatch) {
    const obj = findObject(store, decodeURIComponent(itemMatch[2]));
    return obj ? objectSummary(obj) : {};
  }

  return { value: [] };
}

// --------------------------------------------------------------------------
// POST
// --------------------------------------------------------------------------
function routePost(req: DemoRequestState, body: Json): unknown {
  const store = getDemoStore();
  const path = stripQuery(req.path);

  // Create a schema extension definition.
  if (path === '/schemaExtensions') {
    const rawId = String(body.id ?? 'schema');
    const id = rawId.includes('_') ? rawId : `ext${rand8()}_${rawId}`;
    const created: SchemaExtension = {
      id,
      description: String(body.description ?? ''),
      targetTypes: (body.targetTypes as string[]) ?? [],
      properties: (body.properties as SchemaExtension['properties']) ?? [],
      status: 'InDevelopment',
      owner: String(body.owner ?? store.apps[0]?.appId ?? ''),
    };
    store.schemaExtensions = [created, ...store.schemaExtensions];
    return created;
  }

  // Create a directory extension property on an app registration.
  const propMatch = path.match(/^\/applications\/([^/]+)\/extensionProperties$/);
  if (propMatch) {
    const app = store.apps.find((a) => a.id === decodeURIComponent(propMatch[1]));
    const shortName = String(body.name ?? 'attribute');
    const created = {
      id: uuid(),
      name: app ? `extension_${app.appId.replace(/-/g, '')}_${shortName}` : shortName,
      dataType: String(body.dataType ?? 'String'),
      targetObjects: (body.targetObjects as string[]) ?? [],
      isSyncedFromOnPremises: false,
    };
    if (app) app.extensionProperties = [...app.extensionProperties, created as never];
    return created;
  }

  // Create an open extension on a directory object.
  const extMatch = path.match(
    /^\/(users|groups|devices|organization)\/([^/]+)\/extensions$/,
  );
  if (extMatch) {
    const obj = findObject(store, decodeURIComponent(extMatch[2]));
    const name = String(body.extensionName ?? body.id ?? 'extension');
    const data: Json = {};
    for (const [k, v] of Object.entries(body)) {
      if (k === '@odata.type' || k === 'extensionName' || k === 'id') continue;
      data[k] = v;
    }
    const created: DemoOpenExtension = {
      '@odata.type': '#microsoft.graph.openTypeExtension',
      id: name,
      extensionName: name,
      ...data,
    };
    if (obj) obj.extensions = [...obj.extensions, created];
    return created;
  }

  return body ?? {};
}

// --------------------------------------------------------------------------
// PATCH
// --------------------------------------------------------------------------
function routePatch(req: DemoRequestState, body: Json): unknown {
  const store = getDemoStore();
  const path = stripQuery(req.path);

  // Update a schema extension definition.
  const schemaMatch = path.match(/^\/schemaExtensions\/(.+)$/);
  if (schemaMatch) {
    const id = decodeURIComponent(schemaMatch[1]);
    store.schemaExtensions = store.schemaExtensions.map((s) =>
      s.id === id
        ? {
            ...s,
            ...(body.description !== undefined
              ? { description: String(body.description) }
              : {}),
            ...(body.targetTypes !== undefined
              ? { targetTypes: body.targetTypes as string[] }
              : {}),
            ...(body.properties !== undefined
              ? { properties: body.properties as SchemaExtension['properties'] }
              : {}),
            ...(body.status !== undefined
              ? { status: body.status as SchemaExtension['status'] }
              : {}),
          }
        : s,
    );
    return {};
  }

  // Update an open extension's data.
  const extMatch = path.match(
    /^\/(users|groups|devices|organization)\/([^/]+)\/extensions\/(.+)$/,
  );
  if (extMatch) {
    const obj = findObject(store, decodeURIComponent(extMatch[2]));
    const name = decodeURIComponent(extMatch[3]);
    if (obj) {
      obj.extensions = obj.extensions.map((e) =>
        e.id === name || e.extensionName === name ? { ...e, ...body } : e,
      );
    }
    return {};
  }

  // Assign / clear an extension value on a directory object (validate + assign).
  const itemMatch = path.match(
    /^\/(users|groups|devices|organization|directory\/administrativeUnits)\/([^/]+)$/,
  );
  if (itemMatch) {
    const obj = findObject(store, decodeURIComponent(itemMatch[2]));
    if (obj) {
      for (const [k, v] of Object.entries(body)) {
        if (v === null) delete obj.values[k];
        else obj.values[k] = v;
      }
    }
    return {};
  }

  return {};
}

// --------------------------------------------------------------------------
// DELETE
// --------------------------------------------------------------------------
function routeDelete(req: DemoRequestState): unknown {
  const store = getDemoStore();
  const path = stripQuery(req.path);

  const schemaMatch = path.match(/^\/schemaExtensions\/(.+)$/);
  if (schemaMatch) {
    const id = decodeURIComponent(schemaMatch[1]);
    store.schemaExtensions = store.schemaExtensions.filter((s) => s.id !== id);
    return undefined;
  }

  const propMatch = path.match(
    /^\/applications\/([^/]+)\/extensionProperties\/([^/]+)$/,
  );
  if (propMatch) {
    const app = store.apps.find((a) => a.id === decodeURIComponent(propMatch[1]));
    const eid = decodeURIComponent(propMatch[2]);
    if (app)
      app.extensionProperties = app.extensionProperties.filter(
        (e) => e.id !== eid && e.name !== eid,
      );
    return undefined;
  }

  const extMatch = path.match(
    /^\/(users|groups|devices|organization)\/([^/]+)\/extensions\/(.+)$/,
  );
  if (extMatch) {
    const obj = findObject(store, decodeURIComponent(extMatch[2]));
    const name = decodeURIComponent(extMatch[3]);
    if (obj)
      obj.extensions = obj.extensions.filter(
        (e) => e.id !== name && e.extensionName !== name,
      );
    return undefined;
  }

  return undefined;
}

/** Chainable request builder mirroring the subset of the Graph SDK we use. */
function makeRequest(path: string) {
  const state: DemoRequestState = { path };
  const builder = {
    version: () => builder,
    select: () => builder,
    expand: () => builder,
    top: () => builder,
    skip: () => builder,
    orderby: () => builder,
    header: () => builder,
    headers: () => builder,
    query: () => builder,
    count: (value = true) => {
      state.count = value;
      return builder;
    },
    search: (value: string) => {
      state.search = value;
      return builder;
    },
    filter: (value: string) => {
      state.filter = value;
      return builder;
    },
    get: async () => routeGet(state),
    post: async (body: Json = {}) => routePost(state, body),
    patch: async (body: Json = {}) => routePatch(state, body),
    delete: async () => routeDelete(state),
    put: async (body: Json = {}) => routePost(state, body),
  };
  return builder;
}

/** Create the offline demo Graph client. Cast to `Client` at the call site. */
export function createDemoGraphClient() {
  return {
    api(path: string) {
      return makeRequest(path);
    },
  };
}
