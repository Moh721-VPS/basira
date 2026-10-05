import { string, type EvidenceSource, type IdentifiedEvidence, type Lang } from './types';
const approvedHosts = new Set(['quranenc.com', 'hadeethenc.com', 'islamhouse.com', 'islamcontent.com']);
export function approvedUrl(value: unknown): string {
  const url = string(value), parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !approvedHosts.has(parsed.hostname) || parsed.username || parsed.password || parsed.port) throw new Error('Unapproved evidence URL');
  return url;
}
export async function retrieve(claim: string, lang: Lang, primary: EvidenceSource, fallbacks: EvidenceSource[]): Promise<IdentifiedEvidence[]> {
  let records;
  try { records = await primary.search(claim, lang); }
  catch {
    console.warn('BASIRA_PRIMARY_FAILED');
    // Empty/failed fallbacks must never erase the original retrieval failure.
    const results = await Promise.allSettled(fallbacks.map(source => source.search(claim, lang)));
    if (results.some(result => result.status === 'rejected')) { console.warn('BASIRA_FALLBACK_FAILED'); throw new Error('Fallback retrieval failed'); }
    records = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    if (!records.length) throw new Error('Retrieval unavailable');
  }
  const seen = new Set<string>();
  return records.filter(record => { const url = approvedUrl(record.url); string(record.title); string(record.snippet); string(record.source); if (record.snippet.length > 40000) throw new Error('Evidence too large'); if (seen.has(url)) return false; seen.add(url); return true; }).slice(0, 5).map((record, index) => ({ ...record, id: `E${index + 1}` }));
}
