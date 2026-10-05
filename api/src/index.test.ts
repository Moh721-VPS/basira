import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './index';

const request = (body: string) => new Request('https://basira.test/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
test('health distinguishes mock, missing configuration, and real configuration without leaking secrets', async () => {
  const health = new Request('https://basira.test/api/health');
  for (const [env, status, expected] of [
    [{ MOCK_MODE: 'true' }, 200, { mode: 'mock', configured: true }],
    [{ MOCK_MODE: 'false' }, 503, { mode: 'real', configured: false }],
    [{ GEMINI_API_KEY: 'private-test-key', GEMINI_MODEL: 'test-model' }, 200, { mode: 'real', configured: true }],
    [{ GEMINI_API_KEY: 'private-test-key', GEMINI_MODEL: '../invalid' }, 503, { mode: 'real', configured: false }],
  ] as const) {
    const response = await worker.fetch(health, env);
    assert.equal(response.status, status);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), expected);
  }
  assert.equal((await worker.fetch(new Request(health, { method: 'POST' }))).status, 405);
});
test('valid input returns the mock contract and never claims support', async () => {
  const response = await worker.fetch(request(JSON.stringify({ text: 'Example claim', lang: 'en' })), { MOCK_MODE: 'true' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { claims: [{ id: 'C1', text: 'Example claim', status: 'NEEDS_MORE_VERIFICATION', evidence: [{ id: 'E1', title: 'Mock evidence — example only', url: 'https://example.com/', snippet: 'Placeholder evidence. This does not support or refute the submitted text.' }], note: 'MOCK DATA: no verification was performed. بيانات تجريبية: لم يُجرَ أي تحقق.' }] });
});
test('rejects invalid JSON and text without returning claim judgments', async () => {
  for (const body of ['{', 'null', '{}', '{"text":" "}', JSON.stringify({ text: 'a'.repeat(10001) })]) {
    const response = await worker.fetch(request(body));
    assert.equal(response.status, 400);
    assert.equal(Object.hasOwn((await response.json()) as object, 'claims'), false);
  }
});
test('routes and methods are explicit', async () => {
  assert.equal((await worker.fetch(new Request('https://basira.test/'))).status, 404);
  const response = await worker.fetch(new Request('https://basira.test/api/verify'));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
  assert.equal((await worker.fetch(new Request('https://basira.test/api/verify', { method: 'POST', body: 'text' }))).status, 415);
});
test('system failure is an HTTP error, never a claim status', async () => {
  const broken = request('{}');
  Object.defineProperty(broken, 'headers', { get() { return new Headers({ 'Content-Type': 'application/json' }); } });
  broken.json = async <T>() => ({ get text() { throw new Error('Simulated failure'); } }) as T;
  const response = await worker.fetch(broken);
  assert.equal(response.status, 500);
  const data = await response.json() as { claims: { status: string; evidence: unknown[] }[] };
  assert.equal(data.claims[0].status, 'SYSTEM_ERROR');
  assert.deepEqual(data.claims[0].evidence, []);
});
