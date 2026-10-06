import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { McpSource } from '../api/src/sources/McpSource';
import { HadeethEncSource } from '../api/src/sources/HadeethEncSource';
import { retrieve } from '../api/src/retrieve';
import type { EvidenceSource, Lang } from '../api/src/types';
const cases: { id: string; text: string; lang: Lang; source: EvidenceSource }[] = [
 { id: 'mcp-intentions-en', text: 'Actions are judged by intentions.', lang: 'en', source: new McpSource() },
 { id: 'mcp-intentions-ar', text: 'إنما الأعمال بالنيات.', lang: 'ar', source: new McpSource() },
 { id: 'mcp-negative', text: 'The Quran contains exactly 200 surahs.', lang: 'en', source: new McpSource() },
 { id: 'hadith-reference', text: 'hadeethenc 4560', lang: 'en', source: new HadeethEncSource() },
];
const records = [];
for (const item of cases) {
 const start = Date.now();
 try {
  const evidence = await retrieve(item.text, item.lang, item.source, []);
  const record = { id: item.id, status: 'RETRIEVED', seconds: (Date.now() - start) / 1000, evidence: evidence.map(e => ({ id: e.id, source: e.source, url: e.url, characters: e.snippet.length, sha256: createHash('sha256').update(e.snippet).digest('hex') })) };
  records.push(record); console.log(JSON.stringify(record));
 } catch { records.push({ id: item.id, status: 'SYSTEM_ERROR' }); console.log(`${item.id}: SYSTEM_ERROR`); }
}
await mkdir(new URL('./results/', import.meta.url), { recursive: true });
await writeFile(new URL('./results/retrieval.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), note: 'Real retrieval diagnostics, no model calls. Source identity/count/hash do not establish semantic relevance.', records }, null, 2));
if (records.some(record => record.status === 'SYSTEM_ERROR')) process.exitCode = 1;
