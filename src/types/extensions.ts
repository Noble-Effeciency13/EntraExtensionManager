import { z } from 'zod';

// ---------- Schema extensions (/schemaExtensions) ----------

export const schemaPropertyTypeValues = [
  'Binary',
  'Boolean',
  'DateTime',
  'Integer',
  'String',
] as const;
export type SchemaPropertyType = (typeof schemaPropertyTypeValues)[number];

export const schemaExtensionStatusValues = [
  'InDevelopment',
  'Available',
  'Deprecated',
] as const;
export type SchemaExtensionStatus = (typeof schemaExtensionStatusValues)[number];

export const schemaExtensionTargetTypeValues = [
  'User',
  'Group',
  'Device',
  'Organization',
  'Event',
  'Post',
  'Message',
] as const;

export const schemaExtensionPropertySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(64, 'Max 64 characters')
    .regex(/^[A-Za-z][A-Za-z0-9]*$/, 'Letters and digits only; must start with a letter'),
  type: z.enum(schemaPropertyTypeValues),
});
export type SchemaExtensionProperty = z.infer<typeof schemaExtensionPropertySchema>;

export const schemaExtensionFormSchema = z.object({
  id: z
    .string()
    .min(1, 'Id is required')
    .max(100, 'Max 100 characters')
    .regex(/^[A-Za-z0-9_]+$/, 'Letters, digits, underscore only'),
  description: z.string().max(1024).optional().default(''),
  targetTypes: z
    .array(z.string().min(1))
    .min(1, 'Select at least one target type'),
  properties: z
    .array(schemaExtensionPropertySchema)
    .min(1, 'Add at least one property'),
  owner: z.string().optional(),
});
export type SchemaExtensionForm = z.infer<typeof schemaExtensionFormSchema>;

export interface SchemaExtension {
  id: string;
  description?: string;
  targetTypes: string[];
  properties: SchemaExtensionProperty[];
  status: SchemaExtensionStatus;
  owner: string;
}

// ---------- Directory (AAD) extensions (extensionProperty on app) ----------

export const directoryExtensionDataTypeValues = [
  'Binary',
  'Boolean',
  'DateTime',
  'Integer',
  'LargeInteger',
  'String',
] as const;
export type DirectoryExtensionDataType =
  (typeof directoryExtensionDataTypeValues)[number];

export const directoryExtensionTargetValues = [
  'User',
  'Group',
  'Device',
  'Application',
  'AdministrativeUnit',
] as const;
export type DirectoryExtensionTarget =
  (typeof directoryExtensionTargetValues)[number];

export const directoryExtensionFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(64, 'Max 64 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Letters and digits only'),
  dataType: z.enum(directoryExtensionDataTypeValues),
  targetObjects: z
    .array(z.string().min(1))
    .min(1, 'Select at least one target object'),
});
export type DirectoryExtensionForm = z.infer<typeof directoryExtensionFormSchema>;

export interface DirectoryExtensionProperty {
  id: string;
  name: string; // fully qualified: extension_{appId}_{name}
  dataType: DirectoryExtensionDataType;
  targetObjects: string[];
  isSyncedFromOnPremises: boolean;
}

export interface AppRegistration {
  id: string; // directory object id
  appId: string;
  displayName: string;
}

// ---------- Usage object drill-down ----------

/**
 * A single directory object that carries a non-null value for a schema or
 * directory extension, surfaced by the Usage monitor drill-down.
 */
export interface ExtensionObjectRow {
  /** Directory object id. */
  id: string;
  /** Best-effort display name for the object. */
  displayName: string;
  /** Secondary identifier (UPN / appId / deviceId) when available. */
  identifier?: string;
  /**
   * Per-property values held by this object for the extension. For schema
   * extensions this is the full complex value (one entry per property); for
   * directory extensions it is a single entry keyed by the property name.
   */
  values: Record<string, unknown>;
}

/** One page of {@link ExtensionObjectRow}s plus paging metadata. */
export interface ExtensionObjectsPage {
  rows: ExtensionObjectRow[];
  /** Graph `@odata.nextLink` for the following page, if any. */
  nextLink?: string;
  /** Total matching objects from `@odata.count` (first page only). */
  totalCount?: number;
}

// ---------- Open extensions (openTypeExtension) ----------

/**
 * Resource kinds that support open extensions (Microsoft.Graph.openTypeExtension)
 * and are reachable with the app's directory read scopes.
 */
export const openExtensionResourceValues = [
  'User',
  'Group',
  'Device',
  'Organization',
] as const;
export type OpenExtensionResource = (typeof openExtensionResourceValues)[number];

/**
 * A single open extension instance stored on a directory object. Open
 * extensions are schemaless: `data` holds whatever custom properties were
 * written alongside the reserved `id`/`extensionName` fields.
 */
export interface OpenExtensionInstance {
  /** The extension name / id (e.g. `com.contoso.roamingSettings`). */
  id: string;
  /** Custom key/value data stored on the extension. */
  data: Record<string, unknown>;
}
