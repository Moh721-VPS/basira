import { useEffect, useRef, useState } from 'react';
import type { VoiceConversation } from '@elevenlabs/client';
import { sourceLabel } from './sourceLabel';
type Citation = {
    id: string;
    source: string;
    title: string;
    url: string;
    quote: string;
};
type Entry = {
    role: 'user' | 'agent';
    text: string;
    sources: Citation[];
};
function sourceCards(token: unknown): Citation[] {
    if (typeof token !== 'string' || token.length > 20000)
        throw new Error('Invalid source token');
    const encoded = token.split('.')[0].replaceAll('-', '+').replaceAll('_', '/');
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0))));
    if (data.version !== 1 || data.expires <= Date.now() || !Array.isArray(data.reply?.sources) || data.reply.sources.length > 1)
        throw new Error('Invalid source data');
    return data.reply.sources.filter((source: Citation) => {
        try {
            const url = new URL(source.url);
            return url.protocol === 'https:' && ['quranenc.com', 'hadeethenc.com', 'islamhouse.com', 'islamcontent.com'].includes(url.hostname) && !url.username && !url.password && !url.port && typeof source.quote === 'string' && source.quote.length <= 650;
        }
        catch {
            return false;
        }
    });
}
export default function LiveDiscussion({ language, onBusyChange }: {
    language: "ar";
    onBusyChange: (busy: boolean) => void;
}) {
    const ar = language === 'ar', [available, setAvailable] = useState(false), [phase, setPhase] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle'), [entries, setEntries] = useState<Entry[]>([]), [muted, setMuted] = useState(false), [error, setError] = useState(''), [seconds, setSeconds] = useState(0);
    const session = useRef<VoiceConversation | null>(null), pending = useRef<Citation[]>([]), generation = useRef(0), mounted = useRef(true), timer = useRef<number | undefined>(undefined), probe = useRef<MediaStream | null>(null), controller = useRef<AbortController | null>(null), starting = useRef(false);
    function stopProbe() { probe.current?.getTracks().forEach(track => track.stop()); probe.current = null; }
    async function stop() { const attempt = ++generation.current; starting.current = false; controller.current?.abort(); stopProbe(); if (timer.current)
        clearInterval(timer.current); const current = session.current; session.current = null; await current?.endSession().catch(() => { }); if (mounted.current && attempt === generation.current) {
        setPhase('idle');
        setMuted(false);
        onBusyChange(false);
    } }
    useEffect(() => { mounted.current = true; const request = new AbortController(); fetch('/api/discussion/config', { signal: request.signal }).then(r => r.json()).then(data => { if (!request.signal.aborted)
        setAvailable(data.enabled === true); }).catch(() => { }); return () => { mounted.current = false; request.abort(); void stop(); }; }, []);
    async function start() {
        if (!available || starting.current || session.current)
            return;
        const attempt = ++generation.current;
        starting.current = true;
        setPhase('connecting');
        setEntries([]);
        setError('');
        setSeconds(0);
        pending.current = [];
        onBusyChange(true);
        try {
            probe.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!mounted.current || attempt !== generation.current) {
                stopProbe();
                return;
            }
            stopProbe();
            const request = new AbortController();
            controller.current = request;
            const response = await fetch('/api/discussion/session', { method: 'POST', signal: request.signal });
            const data = await response.json();
            if (!response.ok || typeof data.token !== 'string')
                throw new Error('Session unavailable');
            if (attempt !== generation.current)
                return;
            const { Conversation } = await import('@elevenlabs/client');
            if (attempt !== generation.current)
                return;
            const active = await Conversation.startSession({ conversationToken: data.token, connectionType: 'webrtc', textOnly: false, clientTools: { display_sources: ({ responseToken }: {
                        responseToken?: unknown;
                    }) => { pending.current = sourceCards(responseToken); return JSON.stringify({ received: true }); } }, onMessage: message => {
                    if (!mounted.current || attempt !== generation.current)
                        return;
                    const citations = message.role === 'agent' ? pending.current : [];
                    if (message.role === 'agent')
                        pending.current = [];
                    setEntries(previous => [...previous, { role: message.role, text: message.message, sources: citations }].slice(-30));
                }, onModeChange: event => { if (mounted.current && attempt === generation.current)
                    setPhase(event.mode); }, onError: () => { if (mounted.current && attempt === generation.current) {
                    setError('تعذر استمرار المحادثة. يمكنك المحاولة مرة أخرى.');
                    void stop();
                } }, onDisconnect: () => { if (mounted.current && attempt === generation.current) {
                    if (timer.current)
                        clearInterval(timer.current);
                    session.current = null;
                    starting.current = false;
                    setPhase('idle');
                    onBusyChange(false);
                } } });
            if (!mounted.current || attempt !== generation.current) {
                await active.endSession();
                return;
            }
            session.current = active;
            starting.current = false;
            setPhase('listening');
            const started = Date.now();
            timer.current = window.setInterval(() => { const elapsed = Math.floor((Date.now() - started) / 1000); setSeconds(elapsed); if (elapsed >= 180)
                void stop(); }, 1000);
        }
        catch {
            if (mounted.current && attempt === generation.current) {
                setError('تعذر بدء المحادثة. تحقق من إذن الميكروفون وتوفر الخدمة.');
                await stop();
            }
        }
    }
    return <section className="discussion panel" aria-labelledby="discussion-heading">
    <p className="eyebrow">{'محادثة مباشرة مسندة إلى المصادر'}</p><h2 id="discussion-heading">{'تحدث مع بصيرة'}</h2>
    <p>{'أهلاً بك! اسأل بالعربية عن موضوع عام حول الإسلام، ثم تابع الحديث. يجيب المساعد دون قراءة أسماء المراجع، وتبقى المصادر متاحة على الشاشة.'}</p>
    <p className="hint">{'يُرسل صوت المحادثة إلى إليفن لابز. تتوقف الجلسة بعد ثلاث دقائق. ابدأ عندما تكون مستعداً للسماح بالميكروفون.'}</p>
    <div className="discussion-controls">{phase === 'idle' ? <button type="button" className="button voice-action" disabled={!available} onClick={start}>{'ابدأ المحادثة'}</button> : <><button type="button" className="button secondary" onClick={() => void stop()}>{'إنهاء المحادثة'}</button>{session.current && <button type="button" className="button secondary" aria-pressed={muted} onClick={() => { session.current?.setMicMuted(!muted); setMuted(!muted); }}>{(muted ? 'تشغيل الميكروفون' : 'كتم الميكروفون')}</button>}</>}</div>
    {!available && <p className="hint">{'المحادثة المباشرة غير متاحة حالياً. التحقق من النصوص متاح في القسم الآخر.'}</p>}
    {phase !== 'idle' && <p role="status" className="notice">{phase === 'connecting' ? ('جارٍ الاتصال…') : phase === 'speaking' ? ('بصيرة تتحدث') : ('بصيرة تستمع')} <span dir="ltr">· {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} / 3:00</span></p>}
    {error && <p role="alert" className="voice-notice">{error}</p>}
    <ol className="discussion-messages" aria-live="polite">{entries.map((entry, index) => <li className={`discussion-message ${entry.role}`} key={index}><span className="eyebrow">{entry.role === 'agent' ? ('بصيرة') : ('أنت')}</span><p dir="auto">{entry.text}</p>{entry.sources.map(source => <details className="evidence" key={source.id}><summary>{source.id} · {sourceLabel(source.source)}</summary><p dir="auto" className="source-snippet">{source.quote}</p><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></details>)}</li>)}</ol>
  </section>;
}
