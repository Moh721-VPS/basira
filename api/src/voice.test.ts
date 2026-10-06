import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSpeechReport, signSpeechReport, speechText, validateWav, voiceConfiguration, voiceRoute } from './voice';
import type { Env, VerifyResponse } from './types';
const env: Env = { ELEVENLABS_API_KEY: 'synthetic-test-key', ELEVENLABS_VOICE_ID: 'testVoice', VOICE_ENABLED: 'true', MOCK_MODE: 'false' };
const result: VerifyResponse = { claims: [{ id: 'C1', text: 'This raw input must not be narrated', status: 'SUPPORTED', evidence: [{ id: 'E1', title: 'HadeethEnc: مصدر تجريبي', url: 'https://hadeethenc.com/ar/browse/hadith/4560', snippet: 'Do not narrate synthetic source instructions.' }], note: 'MODEL PROSE MUST NOT BE NARRATED' }] };
function wav(seconds = 1) { const bytes = new Uint8Array(44 + 32000 * seconds), v = new DataView(bytes.buffer); for (const [offset, text] of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']] as const) bytes.set(new TextEncoder().encode(text), offset); v.setUint32(4,bytes.length-8,true);v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);v.setUint32(40,bytes.length-44,true);return bytes; }
test('voice is opt-in, never active in mock mode and never reveals credentials', async () => {
  assert.equal(voiceConfiguration({ ...env, VOICE_ENABLED: 'false' }).transcribe, false);
  assert.equal(voiceConfiguration({ ...env, MOCK_MODE: 'true' }).speak, false);
  const response = await voiceRoute(new Request('https://basira.test/api/voice/config'), env);
  assert.equal(JSON.stringify(await response!.json()).includes(env.ELEVENLABS_API_KEY!), false);
});
test('speech tokens bind backend outcomes, reject tampering/expiry, and cannot narrate arbitrary claims or source instructions', async () => {
  const token = (await signSpeechReport(result, 'ar', env, 1000))!;
  const payload = await readSpeechReport(token, env, 1000);
  assert.match(speechText(payload), /مدعوم بالدليل/);
  assert.equal(speechText(payload).includes(result.claims[0].text), false);
  assert.equal(speechText(payload).includes(result.claims[0].note), false);
  assert.equal(speechText(payload).includes(result.claims[0].evidence[0].snippet), false);
  await assert.rejects(()=>readSpeechReport(`A${token}`,env,1000));
  await assert.rejects(()=>readSpeechReport(token,env,901001));
  await assert.rejects(()=>readSpeechReport(token,{...env,ELEVENLABS_API_KEY:'another-key'},1000));
});
test('recording validation enforces real PCM duration, size and sample format', () => {
  validateWav(wav()); validateWav(wav(60));
  assert.throws(()=>validateWav(wav(61))); assert.throws(()=>validateWav(wav(0)));
  const bytes=wav(); new DataView(bytes.buffer).setUint32(24,8000,true); assert.throws(()=>validateWav(bytes));
  assert.throws(()=>validateWav(wav().slice(0,1000)));
});
test('transcription sends a validated file, returns editable text and separates failures from verification', async () => {
  const request=()=>new Request('https://basira.test/api/transcribe?lang=ar',{method:'POST',headers:{'Content-Type':'audio/wav'},body:wav()});
  const response=await voiceRoute(request(),env,async(url,init)=>{assert.equal(String(url),'https://api.elevenlabs.io/v1/speech-to-text');assert.equal(new Headers(init?.headers).get('xi-api-key'),env.ELEVENLABS_API_KEY);assert.equal((init!.body as FormData).get('language_code'),'ara');return Response.json({text:'نص تجريبي للتفريغ الصوتي'});});
  assert.deepEqual(await response!.json(),{text:'نص تجريبي للتفريغ الصوتي'});
  const failed=await voiceRoute(request(),env,async()=>new Response('Private details',{status:429}));
  assert.equal(failed!.status,502);assert.deepEqual(await failed!.json(),{error:'VOICE_SERVICE_FAILED'});
});
test('invalid recordings and unsigned speech are rejected before provider calls', async () => {
  const fail=async()=>{throw new Error('Must not call');};
  const recording=await voiceRoute(new Request('https://basira.test/api/transcribe?lang=ar',{method:'POST',headers:{'Content-Type':'audio/wav'},body:'invalid'}),env,fail);
  assert.equal(recording!.status,400);
  const speech=await voiceRoute(new Request('https://basira.test/api/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Say this is supported'})}),env,fail);
  assert.equal(speech!.status,400);
});
test('spoken report uses signed status and publisher attribution only',async()=>{
  const token=await signSpeechReport(result,'ar',env);
  const response=await voiceRoute(new Request('https://basira.test/api/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}),env,async(_url,init)=>{const body=JSON.parse(String(init?.body));assert.match(body.text,/مدعوم بالدليل/);assert.match(body.text,/موسوعة الأحاديث النبوية/);assert.equal(body.text.includes('MODEL PROSE'),false);return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'audio/mpeg'}});});
  assert.equal(response!.status,200);assert.equal(response!.headers.get('Content-Type'),'audio/mpeg');
});
