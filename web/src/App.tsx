import { useEffect, useRef, useState, type FormEvent } from 'react';

type Status = 'SUPPORTED' | 'NEEDS_MORE_VERIFICATION' | 'REFER_TO_SPECIALIST' | 'SYSTEM_ERROR';
type Claim = { id: string; text: string; status: Status; evidence: { id: string; title: string; url: string; snippet: string }[]; note: string; retrieval?: { count: number; sources: string[] } };
const copy = {
  ar: { title: 'بصيرة', subtitle: 'التحقق من الادعاءات • IslamicAIch • المسار 04', demo: 'نتائج التحقق تستند إلى الأدلة المسترجعة، ولا تُعد فتوى. النتائج الموسومة بأنها تجريبية ليست تحققًا.', label: 'النص المراد التحقق منه', placeholder: 'أدخل النص هنا…', verify: 'تحقق', busy: 'جارٍ التحقق…', results: 'النتائج', empty: 'ستظهر الادعاءات والأدلة هنا بعد الضغط على تحقق.', error: 'تعذر إكمال الطلب. حاول مرة أخرى؛ لم يصدر حكم تحقق.', statuses: { SUPPORTED: 'مدعوم', NEEDS_MORE_VERIFICATION: 'يحتاج إلى مزيد من التحقق', REFER_TO_SPECIALIST: 'يُحال إلى مختص', SYSTEM_ERROR: 'تعذر التحقق — خطأ في الخدمة' } },
  en: { title: 'Basira', subtitle: 'Claim verification • IslamicAIch • Track 04', demo: 'Verification uses retrieved evidence and does not provide religious rulings. Results marked MOCK DATA are demonstrations only.', label: 'Text to verify', placeholder: 'Enter text here…', verify: 'Verify', busy: 'Verifying…', results: 'Results', empty: 'Claims and evidence will appear here after you select Verify.', error: 'The request failed. Try again; no verification judgment was made.', statuses: { SUPPORTED: 'Supported', NEEDS_MORE_VERIFICATION: 'Needs more verification', REFER_TO_SPECIALIST: 'Refer to specialist', SYSTEM_ERROR: 'Verification failed — service error' } },
};
const badges: Record<Status, string> = { SUPPORTED: 'bg-emerald-100 text-emerald-900', NEEDS_MORE_VERIFICATION: 'bg-amber-100 text-amber-900', REFER_TO_SPECIALIST: 'bg-blue-100 text-blue-900', SYSTEM_ERROR: 'bg-red-100 text-red-900' };
const extras = {
  ar: { hero: 'من الادعاء إلى الدليل.', intro: 'تحقق من النصوص حول الإسلام، واقرأ ما يسندها من المصادر. حين لا تكفي الأدلة، تتوقف بصيرة عن إصدار حكم.', examples: 'ابدأ بمثال', samples: ['إنما الأعمال بالنيات.', 'الصلاة من أركان الإسلام الخمسة.', 'هل عادي إني ما أصلي؟'], sampleLabels: ['حديث', 'ادعاء معرفي', 'سؤال شخصي'], clear: 'مسح', cancel: 'إلغاء الانتظار', cancelled: 'أُلغي الانتظار؛ لم يصدر تقرير جديد.', wait: 'قد يستغرق التحقق وقتاً حسب استجابة الخدمات.', seconds: 'ثانية', all: 'الكل', copy: 'نسخ التقرير', download: 'تنزيل التقرير', copied: 'تم نسخ التقرير', copyError: 'تعذر النسخ. يمكنك تنزيل التقرير.', source: 'فتح المصدر الأصلي ↗', how: 'كيف تعمل بصيرة؟', steps: ['تقسيم النص إلى ادعاءات', 'استرجاع أدلة من المصادر', 'مطابقة كل ادعاء بالدليل'], sources: 'مصادر الاسترجاع', sourceNote: 'الاسترجاع عبر Islamic Content MCP مع موصلات QuranEnc وHadeethEnc عند الحاجة. وجود مصدر لا يعني أنه يسند الادعاء.', limits: 'حتى 10,000 حرف · تحليل حتى 5 ادعاءات', privacy: 'التقرير يبقى في هذه الجلسة ما لم تنسخه أو تنزّله. يُرسل النص لخدمات التحقق عند الضغط على تحقق.' },
  en: { hero: 'From a claim to its evidence.', intro: 'Check statements about Islam and inspect their sources. When evidence is insufficient, Basira abstains from a judgment.', examples: 'Try an example', samples: ['Actions are judged by intentions.', 'Prayer is one of the five pillars of Islam.', 'Is it permissible for me to stop praying?'], sampleLabels: ['Hadith', 'Knowledge claim', 'Personal question'], clear: 'Clear', cancel: 'Cancel waiting', cancelled: 'Waiting cancelled; no new report was produced.', wait: 'Verification time depends on upstream services.', seconds: 'seconds', all: 'All', copy: 'Copy report', download: 'Download report', copied: 'Report copied', copyError: 'Could not copy. Download the report instead.', source: 'Open original source ↗', how: 'How does Basira work?', steps: ['Split text into claims', 'Retrieve source evidence', 'Check each claim against evidence'], sources: 'Retrieval sources', sourceNote: 'Islamic Content MCP with QuranEnc and HadeethEnc fallback adapters. Finding a source does not mean it supports the claim.', limits: 'Up to 10,000 characters · up to 5 claims', privacy: 'Reports stay in this session unless you copy or download them. Selecting Verify sends text to verification services.' },
};

export default function App() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [text, setText] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL');
  const [notice, setNotice] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const t = copy[language];
  const x = extras[language];
  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; }, [language]);
  useEffect(() => { if (!busy) return; const timer = window.setInterval(() => setElapsed(n => n + 1), 1000); return () => window.clearInterval(timer); }, [busy]);
  useEffect(() => () => controller.current?.abort(), []);
  function updateText(value: string) { setText(value); setClaims([]); setError(false); setNotice(''); setFilter('ALL'); }
  function report() { return `${t.title}\n${t.demo}\n\n${claims.map(c => `${c.id}: ${c.text}\n${t.statuses[c.status]}\n${c.note}\n${c.evidence.map(e => `${e.id}: ${e.title}\n${e.snippet}\n${e.url}`).join('\n\n')}`).join('\n\n')}\n`; }
  async function copyReport() { try { await navigator.clipboard.writeText(report()); setNotice(x.copied); } catch { setNotice(x.copyError); } }
  function downloadReport() { const url = URL.createObjectURL(new Blob([report()], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'basira-report.txt'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }

  async function verify(event: FormEvent) {
    event.preventDefault();
    const request = new AbortController(); controller.current = request;
    const timeout = window.setTimeout(() => request.abort('timeout'), 180000);
    setBusy(true); setError(false); setClaims([]); setNotice(''); setFilter('ALL'); setElapsed(0);
    try {
      const response = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang: language }), signal: request.signal });
      const data: { claims: Claim[] } = await response.json();
      if (!Array.isArray(data.claims) || !data.claims.length || data.claims.some(claim => !Object.hasOwn(badges, claim.status) || !Array.isArray(claim.evidence))) throw new Error('Invalid response');
      if (!response.ok && !data.claims.every(claim => claim.status === 'SYSTEM_ERROR')) throw new Error('Request failed');
      setClaims(data.claims);
    } catch { if (request.signal.reason === 'user') setNotice(x.cancelled); else setError(true); }
    finally { window.clearTimeout(timeout); controller.current = null; setBusy(false); }
  }

  return <main className="app-shell">
    <header className="topbar">
      <a href="#" className="brand"><span className="brand-mark" aria-hidden="true">◎</span>{t.title}</a><span className="track">IslamicAIch · 04</span>
      <button disabled={busy} type="button" className="button secondary" onClick={() => { setLanguage(language === 'ar' ? 'en' : 'ar'); setNotice(''); }} lang={language === 'ar' ? 'en' : 'ar'}>{language === 'ar' ? 'English' : 'العربية'}</button>
    </header>
    <section className="hero"><p className="eyebrow">{t.subtitle}</p><h1>{x.hero}</h1><p>{x.intro}</p><div className="hero-line" aria-hidden="true" /></section>
    <div className="workspace"><div>
    <form onSubmit={verify} className="panel composer">
      <div className="panel-heading"><label htmlFor="claim-text">{t.label}</label><span>01</span></div><p className="hint">{x.limits}</p>
      <textarea ref={input} id="claim-text" dir="auto" required maxLength={10000} rows={6} value={text} onChange={event => updateText(event.target.value)} disabled={busy} placeholder={t.placeholder} />
      <div className="editor-meta"><span>{text.length.toLocaleString(language)} / 10,000</span><button type="button" className="text-button" disabled={busy || !text} onClick={() => { updateText(''); input.current?.focus(); }}>{x.clear}</button></div>
      <div className="examples"><span>{x.examples}</span>{x.samples.map((sample, i) => <button key={sample} type="button" disabled={busy} onClick={() => { updateText(sample); input.current?.focus(); }}>{x.sampleLabels[i]}</button>)}</div>
      <div className="form-actions"><button disabled={busy || !text.trim()} className="button primary">{busy ? t.busy : t.verify}<span aria-hidden="true">↗</span></button>{busy && <button className="button secondary" type="button" onClick={() => controller.current?.abort('user')}>{x.cancel}</button>}</div>
      {busy && <p className="hint" role="status"><span className="spinner" aria-hidden="true" /> {elapsed} {x.seconds} · {x.wait}</p>}
    </form>
    <section className="results" aria-labelledby="results-title" aria-busy={busy} aria-live="polite">
      <div className="results-heading"><h2 id="results-title">{t.results}</h2>{claims.length > 0 && <div className="report-actions"><button className="button secondary" onClick={copyReport}>{x.copy}</button><button className="button secondary" onClick={downloadReport}>{x.download}</button></div>}</div>
      {notice && <p role="status" className="notice">{notice}</p>}
      {error ? <p role="alert" className="error-box">{t.error}</p> : claims.length === 0 ? <div className="panel empty-state"><span aria-hidden="true">◎</span><p>{t.empty}</p><small>{language === 'ar' ? 'الأمثلة تُرسل للتحقق الفعلي؛ النتائج ليست جاهزة مسبقاً.' : 'Examples run a real check; results are not prewritten.'}</small></div> : <><div className="filters" role="group" aria-label={t.results}><button aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}>{x.all} · {claims.length}</button>{(Object.keys(badges) as Status[]).filter(s => claims.some(c => c.status === s)).map(s => <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>{t.statuses[s]} · {claims.filter(c => c.status === s).length}</button>)}</div><ul className="claim-list">{claims.filter(c => filter === 'ALL' || c.status === filter).map(claim => <li key={claim.id} className={`panel claim-card ${claim.status}`}>
        <div className="claim-meta"><span>{claim.id}</span><span className={`badge ${badges[claim.status]}`}>{t.statuses[claim.status]}</span></div><h3 dir="auto">{claim.text}</h3><p className="claim-note" role={claim.status === 'SYSTEM_ERROR' ? 'alert' : undefined} dir="auto">{claim.note}</p>
        {claim.retrieval && <p className="hint">{language === 'ar' ? `استُرجع ${claim.retrieval.count} نصاً للفحص` : `${claim.retrieval.count} source passages retrieved for checking`}{claim.retrieval.sources.length > 0 && <> · <span dir="ltr">{claim.retrieval.sources.join(', ')}</span></>}. {language === 'ar' ? 'عدد النصوص لا يثبت دعم الادعاء.' : 'Retrieval count does not establish support.'}</p>}
        {claim.evidence.map(evidence => <details className="evidence" key={evidence.id}><summary dir="auto"><b>{evidence.id}</b> {evidence.title}</summary><p className="source-snippet" dir="auto">{evidence.snippet}</p><a href={evidence.url} target="_blank" rel="noreferrer">{x.source}</a></details>)}
      </li>)}</ul></>}
    </section>
    </div><aside><section className="panel how"><p className="eyebrow">BASIRA / {language === 'ar' ? 'المنهج' : 'METHOD'}</p><h2>{x.how}</h2><ol>{x.steps.map((step, i) => <li key={step}><span>0{i + 1}</span>{step}</li>)}</ol><p className="boundary">{t.demo}</p></section><section className="source-panel"><h2>{x.sources}</h2><div className="source-tags"><a href="https://quranenc.com" target="_blank" rel="noreferrer">QuranEnc ↗</a><a href="https://hadeethenc.com" target="_blank" rel="noreferrer">HadeethEnc ↗</a><span>Islamic Content MCP</span></div><p>{x.sourceNote}</p></section></aside></div>
    <footer><span>{t.title} · IslamicAIch 2026</span><p>{x.privacy}</p></footer>
  </main>;
}
