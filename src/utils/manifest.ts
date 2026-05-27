import type {
  DirectoryExtensionProperty,
  SchemaExtension,
} from '@/types/extensions';

/** JSON snippet that mirrors Graph's POST body for /schemaExtensions. */
export function schemaExtensionManifest(ext: SchemaExtension): string {
  const body = {
    id: stripVerifiedDomainPrefix(ext.id),
    description: ext.description ?? '',
    targetTypes: ext.targetTypes,
    properties: ext.properties.map((p) => ({ name: p.name, type: p.type })),
  };
  return JSON.stringify(body, null, 2);
}

/**
 * JSON snippet matching the extensionProperty POST body on
 * /applications/{id}/extensionProperties.
 */
export function directoryExtensionManifest(
  ext: DirectoryExtensionProperty,
): string {
  const body = {
    name: stripQualifiedName(ext.name),
    dataType: ext.dataType,
    targetObjects: ext.targetObjects,
  };
  return JSON.stringify(body, null, 2);
}

/**
 * App registration manifest snippet for an extensionProperty — for IaC tools
 * that produce the v2 / Microsoft Graph application manifest shape.
 */
export function directoryExtensionAppManifestSnippet(
  ext: DirectoryExtensionProperty,
): string {
  const snippet = {
    extensionProperties: [
      {
        name: stripQualifiedName(ext.name),
        dataType: ext.dataType,
        targetObjects: ext.targetObjects,
      },
    ],
  };
  return JSON.stringify(snippet, null, 2);
}

function stripQualifiedName(name: string): string {
  // extension_{appId-no-dashes}_{actualName} -> {actualName}
  const m = /^extension_[a-fA-F0-9]{32}_(.+)$/.exec(name);
  return m ? m[1] : name;
}

function stripVerifiedDomainPrefix(id: string): string {
  // Some tenants register schema extensions with a verified-domain prefix
  // such as contoso_courses. Strip the leading domain segment if present so
  // the snippet POSTs against /schemaExtensions cleanly.
  const m = /^[^_]+_(.+)$/.exec(id);
  return m ? m[1] : id;
}
