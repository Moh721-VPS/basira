export type Fetcher = typeof fetch;
export async function getJson(url: string, fetcher: Fetcher): Promise<unknown> {
  // Inspect redirects explicitly and reject 3xx below instead of following
  // another host. This also works in the deployed Workers runtime.
  const response = await fetcher(url, { signal: AbortSignal.timeout(10000), redirect: 'manual' });
  if (!response.ok) { console.warn('BASIRA_SOURCE_HTTP_ERROR', new URL(url).hostname, response.status); throw new Error('Source request failed'); }
  return response.json();
}
