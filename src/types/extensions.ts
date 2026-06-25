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
export type SchemaExtensionTargetType =
  (typeof schemaExtensionTargetTypeValues)[number];

/**
 * Outlook / messaging resource types. Microsoft Graph rejects the `Binary`
 * property type on these — `Binary` is only valid on directory objects
 * (User, Group, Device, Organization, AdministrativeUnit). Creating such a
 * combination fails server-side, so the editor filters it out up front.
 * Compared case-insensitively because Graph accepts both `Message` and
 * `message`.
 */
export const schemaMessagingTargetTypes = [
  'Contact',
  'Event',
  'Message',
  'Post',
] as const;

/** Property types that can't be combined with the listed target types. */
const schemaPropertyTypeTargetRestrictions: Partial<
  Record<SchemaPropertyType, readonly string[]>
> = {
  Binary: schemaMessagingTargetTypes,
};

const normalizeTargetType = (value: string) => value.trim().toLowerCase();

/**
 * The selected target types that are incompatible with the given property
 * type. Empty when the combination is valid.
 */
export function incompatibleTargetsForPropertyType(
  type: SchemaPropertyType,
  targetTypes: readonly string[],
): string[] {
  const blocked = schemaPropertyTypeTargetRestrictions[type];
  if (!blocked) return [];
  const blockedSet = new Set(blocked.map(normalizeTargetType));
  return targetTypes.filter((t) => blockedSet.has(normalizeTargetType(t)));
}

/** True when `type` is valid for every selected target type. */
export function isPropertyTypeCompatible(
  type: SchemaPropertyType,
  targetTypes: readonly string[],
): boolean {
  return incompatibleTargetsForPropertyType(type, targetTypes).length === 0;
}

/** Property types valid for *all* currently selected target types. */
export function allowedPropertyTypesForTargets(
  targetTypes: readonly string[],
): SchemaPropertyType[] {
  return schemaPropertyTypeValues.filter((type) =>
    isPropertyTypeCompatible(type, targetTypes),
  );
}

export const schemaExtensionPropertySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(64, 'Max 64 characters')
    .regex(/^[A-Za-z][A-Za-z0-9]*$/, 'Letters and digits only; must start with a letter'),
  type: z.enum(schemaPropertyTypeValues),
});
export type SchemaExtensionProperty = z.infer<typeof schemaExtensionPropertySchema>;

export const schemaExtensionFormSchema = z
  .object({
    id: z
      .string()
      .min(1, 'Id is required')
      .max(100, 'Max 100 characters')
      .regex(/^[A-Za-z0-9_]+$/, 'Letters, digits, underscore only'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(1024, 'Max 1024 characters'),
    targetTypes: z
      .array(z.string().min(1))
      .min(1, 'Select at least one target type'),
    properties: z
      .array(schemaExtensionPropertySchema)
      .min(1, 'Add at least one property'),
    owner: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    value.properties.forEach((property, index) => {
      const blocking = incompatibleTargetsForPropertyType(
        property.type,
        value.targetTypes,
      );
      if (blocking.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['properties', index, 'type'],
          message: `${property.type} isn't supported for ${blocking.join(', ')}.`,
        });
      }
    });
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
