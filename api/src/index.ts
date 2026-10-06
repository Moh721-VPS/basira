import { Gemini } from './gemini';
import { McpSource } from './sources/McpSource';
import { QuranEncSource } from './sources/QuranEncSource';
import { HadeethEncSource } from './sources/HadeethEncSource';
import { pipeline, type Dependencies } from './pipeline';
import { mock } from './mock';
import { notes } from './gate';
import { signSpeechReport, voiceRoute } from './voice';
import { discussionRoute } from './discussion';
import type { Env, Lang } from './types';
export type { ClaimStatus, VerifyResponse } from './types';

export function createWorker(dependencies?: Dependencies) {
  return { async fetch(request: Request, env: Env = {}): Promise<Response> {
    const discussion = await discussionRoute(request, env, dependencies); if (discussion) return discussion;
    const voice = await voiceRoute(request, env); if (voice) return voice;
    if (new URL(request.url).pathname === '/api/health') {
      if (request.method !== 'GET') return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405, headers: { Allow: 'GET' } });
      const mode = env.MOCK_MODE === 'true' ? 'mock' : 'real';
      const configured = mode === 'mock' || Boolean(env.GEMINI_API_KEY?.trim() && env.GEMINI_MODEL?.trim() && /^[a-zA-Z0-9._-]+$/.test(env.GEMINI_MODEL.trim()));
      // Configuration readiness only; this does not claim upstream services work.
      return Response.json({ mode, configured }, { status: configured ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    }
    if (new URL(request.url).pathname !== '/api/verify') return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    if (request.method !== 'POST') return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405, headers: { Allow: 'POST' } });
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return Response.json({ error: 'EXPECTED_JSON' }, { status: 415 });
    let text = '', lang: Lang = 'ar';
    try {
      let body: unknown;
      try { body = await request.json(); } catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400 }); }
      if (typeof body !== 'object' || body === null || !('text' in body) || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 10000) return Response.json({ error: 'INVALID_TEXT', message: 'Provide non-empty text up to 10000 characters.' }, { status: 400 });
      if ('lang' in body && body.lang !== 'ar' && body.lang !== 'en') return Response.json({ error: 'INVALID_LANG' }, { status: 400 });
      text = body.text.trim(); lang = 'lang' in body ? body.lang as Lang : 'ar';
      const result = env.MOCK_MODE === 'true' ? mock(text) : await pipeline(text, lang, dependencies ?? { model: new Gemini(env), primary: new McpSource(), fallbacks: [new QuranEncSource(), new HadeethEncSource()] });
      let speechToken: string | undefined;
      try { speechToken = await signSpeechReport(result, lang, env); } catch { /* Voice must never fail verification. */ }
      return Response.json({ ...result, ...(speechToken ? { speechToken } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return Response.json({ claims: [{ id: 'C1', text, status: 'SYSTEM_ERROR', evidence: [], note: notes[lang].error }] }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
  } };
}
export default createWorker();
