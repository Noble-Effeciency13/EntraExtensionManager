/**
 * Helpers for safely composing OData query parameters for Microsoft Graph.
 */

/**
 * Escape a value for inclusion inside a single-quoted OData string literal.
 * OData escapes a single quote by doubling it. Always run user- or data-derived
 * values through this before interpolating them into `$filter`/`$search`.
 *
 * @example
 * client.api('/servicePrincipals').filter(`appId eq '${escapeODataString(appId)}'`)
 */
export function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}
