import type { Client, GraphRequest } from '@microsoft/microsoft-graph-client';

/**
 * Execute a Graph collection request and follow every `@odata.nextLink`,
 * returning all items flattened across pages. Centralizes the pagination
 * while-loop that the data hooks would otherwise each reimplement.
 *
 * @param client  The Graph client (used to fetch subsequent pages by URL).
 * @param request A built collection request to execute for the first page.
 */
export async function fetchAllPages<T = unknown>(
  client: Client,
  request: GraphRequest,
): Promise<T[]> {
  const items: T[] = [];
  let res: { value?: T[]; ['@odata.nextLink']?: string } | undefined =
    await request.get();
  while (res) {
    for (const item of res.value ?? []) items.push(item);
    const next = res['@odata.nextLink'];
    if (!next) break;
    res = await client.api(next).get();
  }
  return items;
}
