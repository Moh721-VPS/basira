import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Gemini } from './gemini';
import { McpSource } from './sources/McpSource';
import { QuranEncSource } from './sources/QuranEncSource';
import { HadeethEncSource } from './sources/HadeethEncSource';
import type { Fetcher } from './http';

test('Gemini sends a JSON schema and environment model; key stays in header', async () => {
  const fetcher: Fetcher = async (url, init) => {
    assert.equal(String(url), 'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent');
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'test-key');
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.generationConfig.responseFormat.text.schema, { type: 'object' });
    assert.equal(String(init?.body).includes('test-key'), false);
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"claims":["claim"]}' }] } }] });
  };
  assert.deepEqual(await new Gemini({ GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' }, fetcher).generate('instruction', {}, { type: 'object' }), { claims: ['claim'] });
});
test('Gemini HTTP errors, truncated output, invalid JSON are failures', async () => {
  for (const response of [new Response('private upstream details', { status: 429 }), Response.json({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'invalid' }] } }] })]) {
    await assert.rejects(() => new Gemini({ GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' }, async () => response).generate('', {}, {}));
  }
});
function mcpFetcher(partial = false, toolError = false, structured = true): Fetcher {
  return async (_url, init) => {
    const rpc = JSON.parse(String(init?.body));
    if (rpc.method === 'notifications/initialized') return new Response(null, { status: 202 });
    let result: unknown;
    if (rpc.method === 'initialize') result = { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } };
    else if (rpc.params.name === 'search') {
      assert.deepEqual(rpc.params.arguments, { query: 'claim', language: 'en', limit: 5 });
      result = { structuredContent: { results: [{ id: 'hadith:4560:en', title: 'hit', url: 'https://hadeethenc.com/en/browse/hadith/4560' }] }, content: [{ type: 'text', text: partial ? 'quran: unavailable (timed out after 5000ms)' : 'search complete' }], isError: toolError };
    } else {
      assert.deepEqual(rpc.params.arguments, { id: 'hadith:4560:en' });
      const doc = { id: 'hadith:4560:en', title: 'Source title', text: 'Exact narration\nGrade: Authentic', url: 'https://hadeethenc.com/en/browse/hadith/4560', metadata: { source: 'HadeethEnc', grade: 'Authentic' } };
      result = structured ? { structuredContent: doc } : { content: [{ type: 'text', text: JSON.stringify(doc) }] };
    }
    return new Response(`event: message\r\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result })}\r\n\r\n`, { headers: { 'Content-Type': 'text/event-stream' } });
  };
}
test('MCP handles inspected SSE search/fetch shape, opaque IDs, and source text', async () => {
  for (const structured of [true, false]) {
    const records = await new McpSource(mcpFetcher(false, false, structured)).search('claim', 'en');
    assert.equal(records.length, 1);
    assert.equal(records[0].source, 'HadeethEnc');
    assert.equal(records[0].snippet, 'Exact narration\nGrade: Authentic');
  }
});
test('MCP partial failure and tool failure are not empty successful searches', async () => {
  await assert.rejects(() => new McpSource(mcpFetcher(true)).search('claim', 'en'));
  await assert.rejects(() => new McpSource(mcpFetcher(false, true)).search('claim', 'en'));
});
test('QuranEnc uses reference lookup and preserves source text, footnotes and version', async () => {
  const calls: string[] = [];
  const fetcher: Fetcher = async url => { calls.push(String(url)); return Response.json(String(url).includes('translations/list') ? { translations: [{ key: 'arabic_test', version: '1.0', title: 'Source translation' }] } : { result: { sura: '1', aya: '1', arabic_text: 'نص المصدر', translation: 'Source translation text', footnotes: 'Source footnotes' } }); };
  const source = new QuranEncSource(fetcher);
  assert.deepEqual(await source.search('General claim', 'ar'), []);
  const result = await source.search('القرآن ١:١ نص المصدر', 'ar');
  assert.equal(calls.length, 2);
  assert.equal(result[0].snippet, 'نص المصدر\n\nSource translation text\n\nSource footnotes');
  assert.match(result[0].title, /v1.0/);
  assert.equal(result[0].url, 'https://quranenc.com/ar/browse/arabic_test/1#1');
});
test('HadeethEnc performs documented phrase search then fetches source grading verbatim', async () => {
  for (const grade of ['Authentic', undefined]) {
    const calls: string[] = [];
    const source = new HadeethEncSource(async url => { calls.push(String(url)); return Response.json(String(url).includes('/search/') ? [{ id: '4560', title: 'Hit' }] : { id: '4560', title: 'Source title', hadeeth: 'Full source narration', grade, explanation: 'Source commentary' }); });
    const result = await source.search('intentions', 'en');
    assert.match(calls[0], /search\/\?phrase=intentions&language=en/);
    assert.equal(result[0].snippet.includes('Grade:'), grade !== undefined);
    if (grade) assert.match(result[0].snippet, /Grade: Authentic/);
  }
});
