import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base = new URL(process.argv[2] || 'https://basira.basira-api.workers.dev');
const repeats = Number(process.argv[3] || 1);
if (!Number.isInteger(repeats) || repeats < 1 || repeats > 5) throw new Error('Repeat count must be 1–5');
let cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
let label = 'Developer regression checks; NOT a human-reviewed benchmark or semantic accuracy estimate';
if (process.argv[4]) {
 const reviewed = JSON.parse(await readFile(process.argv[4], 'utf8'));
 if (reviewed.reviewed !== true || !reviewed.reviewer?.trim() || !reviewed.reviewed_at || !Array.isArray(reviewed.claims) || !reviewed.claims.length) throw new Error('Reviewed set requires reviewed=true, reviewer, date and nonempty claims');
 cases = reviewed.claims;
 label = 'Exact-status and citation checks on a user-supplied reviewed set; semantic entailment still requires passage review';
}
if (!Array.isArray(cases) || !cases.length || new Set(cases.map(c => c.id)).size !== cases.length || cases.some(c => !c.id || typeof c.text !== 'string' || !c.text.trim() || !['ar','en'].includes(c.language) || !['SUPPORTED','NEEDS_MORE_VERIFICATION','REFER_TO_SPECIALIST'].includes(c.expected_status) || (c.expected_urls && (!Array.isArray(c.expected_urls) || c.expected_urls.some(u => typeof u !== 'string'))))) throw new Error('Invalid evaluation cases');
const health = await fetch(new URL('/api/health', base), { signal: AbortSignal.timeout(15000) }).then(r => r.json());
if (health.mode !== 'real' || !health.configured) throw new Error('Refusing to evaluate mock or unconfigured service');
const statuses = ['SUPPORTED', 'NEEDS_MORE_VERIFICATION', 'REFER_TO_SPECIALIST', 'SYSTEM_ERROR'];
const allowed = new Set(['quranenc.com', 'hadeethenc.com', 'islamcontent.com', 'islamhouse.com']);
const records = [];
for (let run = 1; run <= repeats; run++) for (const item of cases) {
 const start = Date.now(); let record;
 try {
  const response = await fetch(new URL('/api/verify', base), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: item.text, lang: item.language }), signal: AbortSignal.timeout(180000) });
  const data = await response.json();
  if (!Array.isArray(data.claims) || !data.claims.length || data.claims.some(c => !statuses.includes(c.status) || !Array.isArray(c.evidence))) throw new Error('Invalid response');
  const claims = data.claims.map(c => ({ id: c.id, text: c.text, status: c.status, urls: c.evidence.map(e => e.url), evidenceLengths: c.evidence.map(e => e.snippet?.length || 0), retrieval: c.retrieval }));
  const serviceError = claims.some(c => c.status === 'SYSTEM_ERROR');
  const wrongSupport = item.expected_status !== 'SUPPORTED' && claims.some(c => c.status === 'SUPPORTED');
  const safeUrls = claims.every(c => c.urls.every(u => { try { const url = new URL(u); return url.protocol === 'https:' && allowed.has(url.hostname) && !url.username && !url.password && !url.port; } catch { return false; } }));
  const citationMatch = item.expected_urls ? claims.some(c => c.urls.some(u => item.expected_urls.includes(u))) : null;
  const pass = response.ok && !serviceError && claims.length === 1 && claims[0].status === item.expected_status && safeUrls && (citationMatch !== false) && claims.every(c => c.status !== 'SUPPORTED' || c.evidenceLengths.some(n => n > 0));
  record = { run, id: item.id, expected: item.expected_status, http: response.status, pass, serviceError, wrongSupport, safeUrls, citationMatch, claims };
 } catch { record = { run, id: item.id, expected: item.expected_status, pass: false, transportError: true, serviceError: true }; }
 record.seconds = Math.round((Date.now() - start) / 100) / 10; records.push(record);
 console.log(`${record.pass ? 'PASS' : 'FAIL'} run=${run} ${item.id}: ${record.claims?.map(c => c.status).join(',') || 'TRANSPORT_ERROR'} (${record.seconds}s)`);
}
const consistency = cases.map(c => ({ id: c.id, sameStatuses: new Set(records.filter(r => r.id === c.id).map(r => JSON.stringify(r.claims?.map(c => c.status) || ['TRANSPORT_ERROR']))).size === 1 }));
const summary = { date: new Date().toISOString(), base: base.origin, label, cases: cases.length, repeats, requests: records.length, passed: records.filter(r => r.pass).length, serviceErrors: records.filter(r => r.serviceError).length, wrongSupport: records.filter(r => r.wrongSupport).length, consistency: repeats > 1 ? consistency : null };
const directory = new URL('./results/', import.meta.url); await mkdir(directory, { recursive: true });
const output = new URL(`run-${Date.now()}.json`, directory); await writeFile(output, JSON.stringify({ summary, records }, null, 2));
console.log(JSON.stringify(summary, null, 2)); console.log(`Saved ${fileURLToPath(output)}`);
if (summary.passed !== summary.requests) process.exitCode = 1;
