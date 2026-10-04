export type Fetcher = typeof fetch;
export async function getJson(url: string, fetcher: Fetcher): Promise<unknown> {
  const response = await fetcher(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error('Source request failed');
  return response.json();
}
