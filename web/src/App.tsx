import { useEffect, useRef, useState, type FormEvent } from 'react';
import VoiceInput from './VoiceInput';
import ReportAudio from './ReportAudio';
import LiveDiscussion from './LiveDiscussion';
import { sourceLabel } from './sourceLabel';
type Status = 'SUPPORTED' | 'NEEDS_MORE_VERIFICATION' | 'REFER_TO_SPECIALIST' | 'SYSTEM_ERROR';
type Claim = {
    id: string;
    text: string;
    status: Status;
    evidence: {
        id: string;
        title: string;
        url: string;
        snippet: string;
    }[];
    note: string;
    retrieval?: {
        count: number;
        sources: string[];
    };
};
const copy = {
    ar: { title: 'بصيرة', subtitle: 'التحقق من الادعاءات • تحدي الذكاء الاصطناعي • المسار 04', demo: 'نتائج التحقق تستند إلى الأدلة المسترجعة، ولا تُعد فتوى. النتائج الموسومة بأنها تجريبية ليست تحققًا.', label: 'النص المراد التحقق منه', placeholder: 'أدخل النص هنا…', verify: 'تحقق', busy: 'جارٍ التحقق…', results: 'النتائج', empty: 'ستظهر الادعاءات والأدلة هنا بعد الضغط على تحقق.', error: 'تعذر إكمال الطلب. حاول مرة أخرى؛ لم يصدر حكم تحقق.', statuses: { SUPPORTED: 'مدعوم', NEEDS_MORE_VERIFICATION: 'يحتاج إلى مزيد من التحقق', REFER_TO_SPECIALIST: 'يُحال إلى مختص', SYSTEM_ERROR: 'تعذر التحقق — خطأ في الخدمة' } }
};
const badges: Record<Status, string> = { SUPPORTED: 'bg-emerald-100 text-emerald-900', NEEDS_MORE_VERIFICATION: 'bg-amber-100 text-amber-900', REFER_TO_SPECIALIST: 'bg-blue-100 text-blue-900', SYSTEM_ERROR: 'bg-red-100 text-red-900' };
const extras = {
    ar: { hero: 'من الادعاء إلى الدليل.', intro: 'تحقق من النصوص حول الإسلام، واقرأ ما يسندها من المصادر. حين لا تكفي الأدلة، تتوقف بصيرة عن إصدار حكم.', examples: 'ابدأ بمثال', samples: ['إنما الأعمال بالنيات.', 'الصلاة من أركان الإسلام الخمسة.', 'هل عادي إني ما أصلي؟'], sampleLabels: ['حديث', 'ادعاء معرفي', 'سؤال شخصي'], clear: 'مسح', cancel: 'إلغاء الانتظار', cancelled: 'أُلغي الانتظار؛ لم يصدر تقرير جديد.', wait: 'قد يستغرق التحقق وقتاً حسب استجابة الخدمات.', seconds: 'ثانية', all: 'الكل', copy: 'نسخ التقرير', download: 'تنزيل التقرير', copied: 'تم نسخ التقرير', copyError: 'تعذر النسخ. يمكنك تنزيل التقرير.', source: 'فتح المصدر الأصلي ↗', how: 'كيف تعمل بصيرة؟', steps: ['تقسيم النص إلى ادعاءات', 'استرجاع أدلة من المصادر', 'مطابقة كل ادعاء بالدليل'], sources: 'مصادر الاسترجاع', sourceNote: 'الاسترجاع عبر موصل المحتوى الإسلامي مع موصلات موسوعة القرآن الكريم وموسوعة الأحاديث النبوية عند الحاجة. وجود مصدر لا يعني أنه يسند الادعاء.', limits: 'حتى 10,000 حرف · تحليل حتى 5 ادعاءات', privacy: 'التقرير يبقى في هذه الجلسة ما لم تنسخه أو تنزّله. يُرسل النص لخدمات التحقق عند الضغط على تحقق.' }
};
export default function App() {
    const language = 'ar' as const;
    const [text, setText] = useState('');
    const [claims, setClaims] = useState<Claim[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState<Status | 'ALL'>('ALL');
    const [notice, setNotice] = useState('');
    const [elapsed, setElapsed] = useState(0);
    const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
    const [voiceBusy, setVoiceBusy] = useState(false);
    const [voiceAvailable, setVoiceAvailable] = useState(false);
    const [transcriptReview, setTranscriptReview] = useState(false);
    const [speechToken, setSpeechToken] = useState<string | undefined>();
    const [view, setView] = useState<'verify' | 'discussion'>('verify');
    const controller = useRef<AbortController | null>(null);
    const input = useRef<HTMLTextAreaElement | null>(null);
    const t = copy[language];
    const x = extras[language];
    useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = 'rtl'; }, [language]);
    useEffect(() => { if (!busy)
        return; const timer = window.setInterval(() => setElapsed(n => n + 1), 1000); return () => window.clearInterval(timer); }, [busy]);
    useEffect(() => () => controller.current?.abort(), []);
    useEffect(() => { if (transcriptReview)
        input.current?.focus(); }, [transcriptReview]);
    useEffect(() => { const request = new AbortController(); fetch('/api/voice/config', { signal: request.signal }).then(r => r.json()).then(data => { if (!request.signal.aborted)
        setVoiceAvailable(data.transcribe === true); }).catch(() => { }); return () => request.abort(); }, []);
    function updateText(value: string) { setText(value); setClaims([]); setSpeechToken(undefined); setTranscriptReview(false); setError(false); setNotice(''); setFilter('ALL'); }
    function report() { return `${t.title}\n${t.demo}\n\n${claims.map(c => `${c.id}: ${c.text}\n${t.statuses[c.status]}\n${c.note}\n${c.evidence.map(e => `${e.id}: ${e.title}\n${e.snippet}\n${e.url}`).join('\n\n')}`).join('\n\n')}\n`; }
    async function copyReport() { try {
        await navigator.clipboard.writeText(report());
        setNotice(x.copied);
    }
    catch {
        setNotice(x.copyError);
    } }
    function downloadReport() { const url = URL.createObjectURL(new Blob([report()], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'basira-report.txt'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
    async function verify(event: FormEvent) {
        event.preventDefault();
        if (!/\p{Script=Arabic}/u.test(text) || /\p{Script=Latin}/u.test(text)) {
            setNotice('تدعم بصيرة التحقق بالعربية فقط. أعد كتابة الادعاء بالعربية دون نص إنجليزي.');
            return;
        }
        const request = new AbortController();
        controller.current = request;
        const timeout = window.setTimeout(() => request.abort('timeout'), 180000);
        setBusy(true);
        setError(false);
        setClaims([]);
        setSpeechToken(undefined);
        setNotice('');
        setFilter('ALL');
        setElapsed(0);
        try {
            const response = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang: language }), signal: request.signal });
            const data: {
                claims: Claim[];
                speechToken?: string;
            } = await response.json();
            if (!Array.isArray(data.claims) || !data.claims.length || data.claims.some(claim => !Object.hasOwn(badges, claim.status) || !Array.isArray(claim.evidence)))
                throw new Error('Invalid response');
            if (!response.ok && !data.claims.every(claim => claim.status === 'SYSTEM_ERROR'))
                throw new Error('Request failed');
            setClaims(data.claims);
            setSpeechToken(typeof data.speechToken === 'string' ? data.speechToken : undefined);
        }
        catch {
            if (request.signal.reason === 'user')
                setNotice(x.cancelled);
            else
                setError(true);
        }
        finally {
            window.clearTimeout(timeout);
            controller.current = null;
            setBusy(false);
        }
    }
    return <main className="app-shell">
    <header className="topbar">
      <a href="#" className="brand">{t.title}</a>
    </header>
    <nav className="app-tabs" aria-label={'أقسام بصيرة'}><button type="button" className={`button ${view === 'verify' ? 'primary' : 'secondary'}`} disabled={busy || voiceBusy} aria-pressed={view === 'verify'} onClick={() => setView('verify')}>{'تحقق من نص'}</button><button type="button" className={`button ${view === 'discussion' ? 'primary' : 'secondary'}`} disabled={busy || voiceBusy} aria-pressed={view === 'discussion'} onClick={() => setView('discussion')}>{'محادثة مباشرة'}</button></nav>
    {view === 'discussion' ? <LiveDiscussion language={language} onBusyChange={setVoiceBusy}/> : <>
    <section className="hero"><p className="eyebrow">{'المعرفة تبدأ بالدليل'}</p><h1>{<>كل ادعاء،<br />بصيرة أوضح.</>}</h1><p>{'اكتب أو تحدث. راجع النتيجة ومصدرها قبل أن تشاركها.'}</p></section>
    <div className="workspace"><div>
    <form onSubmit={verify} className="panel composer">
      <div className="input-tabs" role="group" aria-label={'طريقة الإدخال'}><button type="button" className={`button ${inputMode === 'text' ? 'primary' : 'secondary'}`} aria-pressed={inputMode === 'text'} disabled={busy || voiceBusy} onClick={() => setInputMode('text')}>{'كتابة النص'}</button><button type="button" className={`button ${inputMode === 'voice' ? 'voice-action' : 'secondary'}`} aria-pressed={inputMode === 'voice'} disabled={busy || voiceBusy} onClick={() => setInputMode('voice')}>{'تسجيل صوتي'}</button></div>
      <div hidden={inputMode !== 'voice'}><VoiceInput language={language} available={voiceAvailable} disabled={busy} onBusyChange={setVoiceBusy} onTranscript={value => { updateText(value); setInputMode('text'); setTranscriptReview(true); input.current?.focus(); }}/></div>
      <div hidden={inputMode !== 'text'}>
      {transcriptReview && <h2 className="transcript-heading">{'راجع النص قبل التحقق'}</h2>}
      <label htmlFor="claim-text" className="sr-only">{t.label}</label>
      <textarea ref={input} id="claim-text" dir={text.trim() ? 'auto' : 'rtl'} required={inputMode === 'text'} maxLength={10000} rows={6} value={text} onChange={event => updateText(event.target.value)} disabled={busy || voiceBusy} placeholder={'الصق ادعاءً أو نصاً قصيراً هنا…'}/>
      <div className="editor-meta"><span dir="ltr">{text.length.toLocaleString(language)} / 10,000</span><button type="button" className="text-button" disabled={busy || !text} onClick={() => { updateText(''); input.current?.focus(); }}>{x.clear}</button></div>
      <div className="examples"><span>{x.examples}</span>{x.samples.map((sample, i) => <button key={sample} type="button" disabled={busy} onClick={() => { updateText(sample); input.current?.focus(); }}>{x.sampleLabels[i]}</button>)}</div>
      <p className="hint limits">{x.limits}</p>
      <div className="form-actions"><button disabled={busy || voiceBusy || !text.trim()} className="button primary">{busy ? t.busy : 'تحقق من النص'}</button>{busy && <button className="button secondary" type="button" onClick={() => controller.current?.abort('user')}>{x.cancel}</button>}</div>
      </div>
      {busy && <p className="hint" role="status"><span className="spinner" aria-hidden="true"/> {elapsed} {x.seconds} · {x.wait}</p>}
    </form>
    <section className="results" hidden={!claims.length && !error && !notice} aria-labelledby="results-title" aria-busy={busy} aria-live="polite">
      <div className="results-heading"><h2 id="results-title">{t.results}</h2>{claims.length > 0 && <div className="report-actions"><button className="button secondary" onClick={copyReport}>{x.copy}</button><button className="button secondary" onClick={downloadReport}>{x.download}</button></div>}</div>
      {notice && <p role="status" className="notice">{notice}</p>}
      {claims.length > 0 && <ReportAudio token={speechToken} language={language}/>}
      {error ? <p role="alert" className="error-box">{t.error}</p> : claims.length === 0 ? <div className="panel empty-state"><span aria-hidden="true">◎</span><p>{t.empty}</p><small>{'الأمثلة تُرسل للتحقق الفعلي؛ النتائج ليست جاهزة مسبقاً.'}</small></div> : <><div className="filters" role="group" aria-label={t.results}><button aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}>{x.all} · {claims.length}</button>{(Object.keys(badges) as Status[]).filter(s => claims.some(c => c.status === s)).map(s => <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>{t.statuses[s]} · {claims.filter(c => c.status === s).length}</button>)}</div><ul className="claim-list">{claims.filter(c => filter === 'ALL' || c.status === filter).map(claim => <li key={claim.id} className={`panel claim-card ${claim.status}`}>
        <div className="claim-meta"><span>{claim.id}</span><span className={`badge ${badges[claim.status]}`}>{t.statuses[claim.status]}</span></div><h3 dir="auto">{claim.text}</h3><p className="claim-note" role={claim.status === 'SYSTEM_ERROR' ? 'alert' : undefined} dir="auto">{claim.note}</p>
        {claim.retrieval && <p className="hint">{`استُرجع ${claim.retrieval.count} نصاً للفحص`}{claim.retrieval.sources.length > 0 && <> · <span dir="ltr">{claim.retrieval.sources.map(sourceLabel).join('، ')}</span></>}. {'عدد النصوص لا يثبت دعم الادعاء.'}</p>}
        {claim.evidence.map(evidence => <details className="evidence" key={evidence.id}><summary dir="auto"><b>{evidence.id}</b> {evidence.title}</summary><p className="source-snippet" dir="auto">{evidence.snippet}</p><a href={evidence.url} target="_blank" rel="noreferrer">{x.source}</a></details>)}
      </li>)}</ul></>}
    </section>
    </div><aside><section className="panel how"><p className="eyebrow">01 / {t.title}</p><h2>{<>الدليل في قلب<br />كل نتيجة</>}</h2><p className="method-copy">{'نقسم النص إلى ادعاءات، ونسترجع المصادر، ثم نفحص دلالة كل دليل.'}</p><div className="source-tags"><a href="https://quranenc.com" target="_blank" rel="noreferrer">موسوعة القرآن الكريم ↗</a><a href="https://hadeethenc.com" target="_blank" rel="noreferrer">موسوعة الأحاديث النبوية ↗</a><span>Islamic Content MCP</span></div><p className="boundary">{t.demo}</p></section></aside></div>
    </>}
    <footer><span>{t.title} · IslamicAIch 2026</span><p>{x.privacy}</p></footer>
  </main>;
}
