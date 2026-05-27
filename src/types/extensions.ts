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
