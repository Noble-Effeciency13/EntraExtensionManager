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

// ---------- Raw HTTP request snippets ----------

/** Raw Graph HTTP request to create the schema extension. */
export function schemaExtensionHttp(ext: SchemaExtension): string {
  return [
    'POST https://graph.microsoft.com/v1.0/schemaExtensions',
    'Content-Type: application/json',
    '',
    schemaExtensionManifest(ext),
  ].join('\n');
}

/** Raw Graph HTTP request to create the directory extension property. */
export function directoryExtensionHttp(ext: DirectoryExtensionProperty): string {
  return [
    'POST https://graph.microsoft.com/v1.0/applications/{app-object-id}/extensionProperties',
    'Content-Type: application/json',
    '',
    directoryExtensionManifest(ext),
  ].join('\n');
}

// ---------- Microsoft Graph PowerShell snippets ----------

function toPowerShell(value: unknown, indent = 0): string {
  const pad = '\t'.repeat(indent);
  const padInner = '\t'.repeat(indent + 1);
  if (Array.isArray(value)) {
    if (value.length === 0) return '@()';
    return `@(\n${value
      .map((v) => `${padInner}${toPowerShell(v, indent + 1)}`)
      .join('\n')}\n${pad})`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return `@{\n${entries
      .map(([k, v]) => `${padInner}${k} = ${toPowerShell(v, indent + 1)}`)
      .join('\n')}\n${pad}}`;
  }
  if (typeof value === 'string') return `"${value.replace(/"/g, '`"')}"`;
  if (typeof value === 'boolean') return value ? '$true' : '$false';
  if (value === null || value === undefined) return '$null';
  return String(value);
}

/** Microsoft.Graph PowerShell snippet to create the schema extension. */
export function schemaExtensionPowerShell(ext: SchemaExtension): string {
  const params = toPowerShell({
    Id: stripVerifiedDomainPrefix(ext.id),
    Description: ext.description ?? '',
    TargetTypes: ext.targetTypes,
    Properties: ext.properties.map((p) => ({ Name: p.name, Type: p.type })),
  });
  return [
    'Import-Module Microsoft.Graph.SchemaExtensions',
    '',
    `$params = ${params}`,
    '',
    'New-MgSchemaExtension -BodyParameter $params',
  ].join('\n');
}

/** Microsoft.Graph PowerShell snippet to create the directory extension. */
export function directoryExtensionPowerShell(
  ext: DirectoryExtensionProperty,
): string {
  const params = toPowerShell({
    Name: stripQualifiedName(ext.name),
    DataType: ext.dataType,
    TargetObjects: ext.targetObjects,
  });
  return [
    'Import-Module Microsoft.Graph.Applications',
    '',
    `$params = ${params}`,
    '',
    'New-MgApplicationExtensionProperty -ApplicationId $appObjectId -BodyParameter $params',
  ].join('\n');
}
