export type Fetcher = typeof fetch;
export async function fetchSource(url: string, fetcher: Fetcher, init: RequestInit = {}): Promise<Response> {
  const options = { ...init, signal: init.signal ?? AbortSignal.timeout(15000), redirect: 'manual' as const };
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try { response = await fetcher(url, options); }
    catch (error) {
      if (attempt === 0 && error instanceof TypeError && !options.signal.aborted) { console.info('BASIRA_SOURCE_RETRY', new URL(url).hostname); continue; }
      throw error;
    }
    if (attempt === 0 && [502, 503, 504].includes(response.status) && !options.signal.aborted) {
      await response.body?.cancel();
      console.info('BASIRA_SOURCE_RETRY', new URL(url).hostname, response.status);
      continue;
    }
    return response;
  }
}
export async function getJson(url: string, fetcher: Fetcher): Promise<unknown> {
  // Inspect redirects explicitly and reject 3xx below instead of following
  // another host. This also works in the deployed Workers runtime.
  const response = await fetchSource(url, fetcher);
  if (!response.ok) { console.warn('BASIRA_SOURCE_HTTP_ERROR', new URL(url).hostname, response.status); throw new Error('Source request failed'); }
  return response.json();
}
