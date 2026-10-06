import { notes } from './gate';
import type { ClaimStatus, Env, Lang, VerifyResponse } from './types';
import type { Fetcher } from './http';

const MAX_WAV = 44 + 16000 * 2 * 60;
const statuses: ClaimStatus[] = ['SUPPORTED', 'NEEDS_MORE_VERIFICATION', 'REFER_TO_SPECIALIST', 'SYSTEM_ERROR'];
const publishers = ['QuranEnc', 'HadeethEnc', 'IslamHouse'];
const labels = {
  ar: ['مدعوم بالدليل', 'يحتاج إلى مزيد من التحقق', 'يحال إلى مختص', 'تعذر التحقق بسبب خطأ في الخدمة'],
  en: ['Supported by evidence', 'Needs more verification', 'Refer to a specialist', 'Verification failed because of a service error'],
};
const encoder = new TextEncoder();
type SpeechPayload = { version: 1; expires: number; lang: Lang; claims: { status: ClaimStatus; sources: string[] }[] };
export function voiceConfiguration(env: Env) {
  const enabled = env.VOICE_ENABLED === 'true' && env.MOCK_MODE !== 'true' && Boolean(env.ELEVENLABS_API_KEY?.trim());
  return { transcribe: enabled, speak: enabled && Boolean(env.ELEVENLABS_VOICE_ID?.trim() && /^[a-zA-Z0-9_-]+$/.test(env.ELEVENLABS_VOICE_ID.trim())), maxSeconds: 60 };
}
function base64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); }
function unbase64(value: string) { if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid token'); return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0)); }
async function signingKey(env: Env) { return crypto.subtle.importKey('raw', encoder.encode(`basira-report-v1:${env.ELEVENLABS_API_KEY}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
export async function signSpeechReport(result: VerifyResponse, lang: Lang, env: Env, now = Date.now()): Promise<string | undefined> {
  if (!voiceConfiguration(env).speak) return;
  // Read outcomes and attribution, never sacred text or model-authored prose.
  const payload: SpeechPayload = { version: 1, expires: now + 15 * 60000, lang, claims: result.claims.map(c => ({ status: c.status, sources: publishers.filter(source => c.evidence.some(e => e.title.startsWith(`${source}:`))) })) };
  const body = base64(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(body)));
  return `${body}.${base64(signature)}`;
}
export async function readSpeechReport(token: unknown, env: Env, now = Date.now()): Promise<SpeechPayload> {
  if (typeof token !== 'string' || token.length > 4000) throw new Error('Invalid token');
  const parts = token.split('.');
  if (parts.length !== 2 || !await crypto.subtle.verify('HMAC', await signingKey(env), unbase64(parts[1]), encoder.encode(parts[0]))) throw new Error('Invalid signature');
  const payload = JSON.parse(new TextDecoder().decode(unbase64(parts[0]))) as SpeechPayload;
  if (payload.version !== 1 || !['ar', 'en'].includes(payload.lang) || !Number.isFinite(payload.expires) || payload.expires <= now || payload.expires > now + 15 * 60000 || !Array.isArray(payload.claims) || !payload.claims.length || payload.claims.length > 5 || payload.claims.some(c => !statuses.includes(c.status) || !Array.isArray(c.sources) || c.sources.some(s => !publishers.includes(s)))) throw new Error('Invalid payload');
  return payload;
}
export function speechText(payload: SpeechPayload): string {
  const lang = payload.lang;
  const intro = lang === 'ar' ? 'تقرير بصيرة. هذه أداة للتحقق المسند وليست جهة إفتاء.' : 'Basira verification report. This tool checks source evidence and does not provide religious rulings.';
  return [intro, ...payload.claims.map((c, i) => {
    const index = statuses.indexOf(c.status);
    const note = c.status === 'SUPPORTED' ? notes[lang].supported : c.status === 'NEEDS_MORE_VERIFICATION' ? notes[lang].insufficient : c.status === 'REFER_TO_SPECIALIST' ? notes[lang].referral : notes[lang].error;
    return `${lang === 'ar' ? 'الادعاء رقم' : 'Claim number'} ${i + 1}. ${labels[lang][index]}. ${note}${c.sources.length ? ` ${lang === 'ar' ? 'المصادر' : 'Sources'}: ${c.sources.join(', ')}.` : ''}`;
  })].join('\n');
}
async function limitedBody(request: Request, limit: number): Promise<Uint8Array> {
  const reader = request.body?.getReader(); if (!reader) throw new Error('Empty body');
  const chunks: Uint8Array[] = []; let length = 0;
  for (;;) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > limit) { await reader.cancel(); throw new Error('Body too large'); } chunks.push(value); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } return bytes;
}
export function validateWav(bytes: Uint8Array): void {
  if (bytes.length < 44 + 3200 || bytes.length > MAX_WAV) throw new Error('Invalid duration');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), text = (start: number, size: number) => new TextDecoder().decode(bytes.slice(start, start + size));
  if (text(0, 4) !== 'RIFF' || text(8, 4) !== 'WAVE' || text(12, 4) !== 'fmt ' || text(36, 4) !== 'data' || view.getUint32(4, true) !== bytes.length - 8 || view.getUint32(16, true) !== 16 || view.getUint16(20, true) !== 1 || view.getUint16(22, true) !== 1 || view.getUint32(24, true) !== 16000 || view.getUint32(28, true) !== 32000 || view.getUint16(32, true) !== 2 || view.getUint16(34, true) !== 16 || view.getUint32(40, true) !== bytes.length - 44 || (bytes.length - 44) % 2) throw new Error('Invalid WAV');
}
export async function voiceRoute(request: Request, env: Env, fetcher: Fetcher = (url, init) => fetch(url, init)): Promise<Response | null> {
  const url = new URL(request.url); if (!['/api/voice/config', '/api/transcribe', '/api/speak'].includes(url.pathname)) return null;
  const error = (code: string, status: number) => Response.json({ error: code }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (url.pathname === '/api/voice/config') return request.method === 'GET' ? Response.json(voiceConfiguration(env), { headers: { 'Cache-Control': 'no-store' } }) : error('METHOD_NOT_ALLOWED', 405);
  if (request.method !== 'POST') return error('METHOD_NOT_ALLOWED', 405);
  if (request.headers.has('Origin') && request.headers.get('Origin') !== url.origin) return error('ORIGIN_NOT_ALLOWED', 403);
  const config = voiceConfiguration(env);
  if (!(url.pathname === '/api/transcribe' ? config.transcribe : config.speak)) return error('VOICE_NOT_CONFIGURED', 503);
  if (url.pathname === '/api/transcribe') {
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('audio/wav')) return error('EXPECTED_WAV', 415);
    const lang = url.searchParams.get('lang'); if (lang !== 'ar' && lang !== 'en') return error('INVALID_LANG', 400);
    let bytes: Uint8Array; try { bytes = await limitedBody(request, MAX_WAV); validateWav(bytes); } catch { return error('INVALID_RECORDING', 400); }
    try {
      const form = new FormData(); form.set('file', new Blob([bytes], { type: 'audio/wav' }), 'claim.wav'); form.set('model_id', env.ELEVENLABS_STT_MODEL?.trim() || 'scribe_v2'); form.set('language_code', lang === 'ar' ? 'ara' : 'eng'); form.set('tag_audio_events', 'false');
      const upstream = await fetcher('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY! }, body: form, signal: AbortSignal.timeout(60000), redirect: 'manual' });
      if (!upstream.ok) { await upstream.body?.cancel(); return error('VOICE_SERVICE_FAILED', 502); }
      const data = await upstream.json() as { text?: unknown };
      if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 10000) return error('EMPTY_OR_INVALID_TRANSCRIPT', 502);
      return Response.json({ text: data.text.trim() }, { headers: { 'Cache-Control': 'no-store' } });
    } catch { return error('VOICE_SERVICE_FAILED', 502); }
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return error('EXPECTED_JSON', 415);
  let payload: SpeechPayload;
  try { const body = JSON.parse(new TextDecoder().decode(await limitedBody(request, 5000))); payload = await readSpeechReport(body.token, env); } catch { return error('INVALID_REPORT_TOKEN', 400); }
  try {
    const upstream = await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.ELEVENLABS_VOICE_ID!.trim())}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY!, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: speechText(payload), model_id: env.ELEVENLABS_TTS_MODEL?.trim() || 'eleven_multilingual_v2', language_code: payload.lang }), signal: AbortSignal.timeout(60000), redirect: 'manual' });
    if (!upstream.ok || !upstream.headers.get('Content-Type')?.startsWith('audio/')) { await upstream.body?.cancel(); return error('VOICE_SERVICE_FAILED', 502); }
    return new Response(upstream.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
  } catch { return error('VOICE_SERVICE_FAILED', 502); }
}
