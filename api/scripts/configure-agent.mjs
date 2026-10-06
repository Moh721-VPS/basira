import fs from 'node:fs/promises';
const path = '.dev.vars';
let text = await fs.readFile(path, 'utf8');
const env = Object.fromEntries(text.split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^(["'])(.*)\1$/, '$2')]; }));
if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID || !env.BASIRA_AGENT_TOKEN)
    throw new Error('Validated voice configuration and brain secret are required');
const headers = { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' };
async function call(path, init = {}) { const r = await fetch('https://api.elevenlabs.io' + path, { headers, ...init, signal: AbortSignal.timeout(30000) }); const d = await r.json().catch(() => ({})); if (!r.ok) {
    const code = d.detail?.status;
    let message = String(d.detail?.message || '').split(env.ELEVENLABS_API_KEY).join('[redacted]').split(env.BASIRA_AGENT_TOKEN).join('[redacted]');
    if (Array.isArray(d.detail))
        message = d.detail.map(e => e.loc?.join('.')).join(', ');
    throw new Error(`ElevenLabs ${r.status}: ${typeof code === 'string' ? code : 'request_failed'} ${message.slice(0, 400)}`);
} return d; }
function save(name, value) { const regex = new RegExp(`^${name}=.*$`, 'm'); text = regex.test(text) ? text.replace(regex, () => `${name}=${value}`) : text.trimEnd() + `\n${name}=${value}\n`; }
let secretId = env.ELEVENLABS_BRAIN_SECRET_ID;
if (!secretId) {
    const secret = await call('/v1/convai/secrets', { method: 'POST', body: JSON.stringify({ type: 'new', name: 'Basira source brain', value: env.BASIRA_AGENT_TOKEN }) });
    secretId = secret.secret_id;
    save('ELEVENLABS_BRAIN_SECRET_ID', secretId);
    await fs.writeFile(path, text);
}
const greetingAr = 'أهلاً وسهلاً! أنا بصيرة، يسعدني الحديث معك ومساعدتك في المعرفة الإسلامية. ما الذي تحب أن نتحدث عنه اليوم؟';
const config = { name: 'بصيرة — المحادثة العربية', conversation_config: { agent: { first_message: greetingAr, language: 'ar', prompt: { prompt: 'This is a source-based research companion. The custom backend supplies all responses. Never use a backup model or generate doctrine, rulings, hadith grades or citations. Use display_sources to show backend-issued citations. Speak Arabic only. Be welcoming. Read the exact backend reply; never read publisher names, source URLs, evidence IDs or tool arguments aloud. Citations belong on screen.', llm: 'custom-llm', custom_llm: { url: 'https://basira.basira-api.workers.dev/api/agent', model_id: 'basira-source-discussion', api_key: { secret_id: secretId }, api_type: 'chat_completions' }, backup_llm_config: { preference: 'disabled' }, cascade_timeout_seconds: 15, ignore_default_personality: true, tools: [{ type: 'client', name: 'display_sources', description: 'Show the source citations contained in the backend-signed response token, then acknowledge receipt.', expects_response: true, pre_tool_speech: 'off', tool_error_handling_mode: 'passthrough', parameters: { type: 'object', required: ['responseToken'], properties: { responseToken: { type: 'string', description: 'The exact response token issued by the Basira backend.' } } } }] } }, tts: { voice_id: env.ELEVENLABS_VOICE_ID, model_id: 'eleven_flash_v2_5' }, turn: { turn_timeout: 15, silence_end_call_timeout: 45, speculative_turn: false, soft_timeout_config: { timeout_seconds: 3, message: 'جارٍ الرجوع إلى المصادر.', use_llm_generated_message: false } }, conversation: { max_duration_seconds: 180, client_events: ['audio', 'interruption', 'user_transcript', 'agent_response', 'client_tool_call'] } }, platform_settings: { auth: { enable_auth: true }, call_limits: { agent_concurrency_limit: 1, daily_limit: 10, bursting_enabled: false }, privacy: { record_voice: false, retention_days: 1, delete_audio: true, delete_transcript_and_pii: true, apply_to_existing_conversations: false }, overrides: { conversation_config_override: { agent: { language: true } } }, data_collection: {}, evaluation: { criteria: [] } } };

config.platform_settings.overrides.conversation_config_override.agent.language = false;
let agentId = env.ELEVENLABS_AGENT_ID;
if (!agentId) {
    const created = await call('/v1/convai/agents/create', { method: 'POST', body: JSON.stringify(config) });
    agentId = created.agent_id;
    save('ELEVENLABS_AGENT_ID', agentId);
    await fs.writeFile(path, text);
}
else
    await call(`/v1/convai/agents/${agentId}`, { method: 'PATCH', body: JSON.stringify(config) });
const checked = await call(`/v1/convai/agents/${agentId}`);
const prompt = checked.conversation_config.agent.prompt;
if (prompt.llm !== 'custom-llm' || prompt.backup_llm_config?.preference !== 'disabled' || prompt.custom_llm?.url !== config.conversation_config.agent.prompt.custom_llm.url || checked.platform_settings.auth.enable_auth !== true)
    throw new Error('Agent guard validation failed');
save('LIVE_AGENT_ENABLED', 'true');
await fs.writeFile(path, text);
console.log(JSON.stringify({ agentId, created: !env.ELEVENLABS_AGENT_ID, customSourceBackend: true, backupModelDisabled: true, privateSessions: true, maxSeconds: 180, dailySessions: 10 }));
