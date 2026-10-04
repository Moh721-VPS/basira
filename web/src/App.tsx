import { useEffect, useState, type FormEvent } from 'react';

type Status = 'SUPPORTED' | 'NEEDS_MORE_VERIFICATION' | 'REFER_TO_SPECIALIST';
type Claim = { id: string; text: string; status: Status; evidence: { id: string; title: string; url: string; snippet: string }[]; note: string };
const copy = {
  ar: { title: 'بصيرة', subtitle: 'التحقق من الادعاءات • IslamicAIch • المسار 04', demo: 'نموذج تجريبي: النتائج بيانات وهمية، ولا تمثل تحققًا أو فتوى.', label: 'النص المراد التحقق منه', placeholder: 'أدخل النص هنا…', verify: 'تحقق', busy: 'جارٍ التحميل…', results: 'النتائج', empty: 'ستظهر الادعاءات والأدلة هنا بعد الضغط على تحقق.', error: 'تعذر إكمال الطلب. حاول مرة أخرى؛ لم يصدر حكم تحقق.', statuses: { SUPPORTED: 'مدعوم', NEEDS_MORE_VERIFICATION: 'يحتاج إلى مزيد من التحقق', REFER_TO_SPECIALIST: 'يُحال إلى مختص' } },
  en: { title: 'Basira', subtitle: 'Claim verification • IslamicAIch • Track 04', demo: 'Scaffold demo: results are mock data, not verification or a religious ruling.', label: 'Text to verify', placeholder: 'Enter text here…', verify: 'Verify', busy: 'Loading…', results: 'Results', empty: 'Claims and evidence will appear here after you select Verify.', error: 'The request failed. Try again; no verification judgment was made.', statuses: { SUPPORTED: 'Supported', NEEDS_MORE_VERIFICATION: 'Needs more verification', REFER_TO_SPECIALIST: 'Refer to specialist' } },
};

export default function App() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [text, setText] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const t = copy[language];
  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; }, [language]);

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(false); setClaims([]);
    try {
      const response = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Request failed');
      const data: { claims: Claim[] } = await response.json();
      if (!Array.isArray(data.claims)) throw new Error('Invalid response');
      setClaims(data.claims);
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-14">
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-4xl font-bold text-emerald-800">{t.title}</h1><p className="mt-2 text-sm text-slate-600">{t.subtitle}</p></div>
      <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 focus-visible:outline-emerald-700" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} lang={language === 'ar' ? 'en' : 'ar'}>{language === 'ar' ? 'English' : 'العربية'}</button>
    </header>
    <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">{t.demo}</p>
    <form onSubmit={verify} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <label htmlFor="claim-text" className="mb-3 block font-semibold">{t.label}</label>
      <textarea id="claim-text" required maxLength={10000} rows={7} value={text} onChange={event => { setText(event.target.value); setClaims([]); setError(false); }} disabled={busy} placeholder={t.placeholder} className="w-full resize-y rounded-lg border border-slate-300 p-3 focus:outline-emerald-700" />
      <button disabled={busy || !text.trim()} className="mt-4 w-full rounded-lg bg-emerald-800 px-6 py-3 font-semibold text-white focus-visible:outline-emerald-700 disabled:opacity-50 sm:w-auto">{busy ? t.busy : t.verify}</button>
    </form>
    <section className="mt-8" aria-labelledby="results-title" aria-busy={busy} aria-live="polite">
      <h2 id="results-title" className="mb-4 text-xl font-semibold">{t.results}</h2>
      {error ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{t.error}</p> : claims.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-6 text-slate-500">{t.empty}</p> : <ul className="space-y-4">{claims.map(claim => <li key={claim.id} className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-semibold" dir="auto">{claim.text}</p><p className="mt-2 text-sm font-medium text-emerald-800">{t.statuses[claim.status]}</p><p className="mt-2 text-sm text-slate-600" dir="auto">{claim.note}</p>
        <ul className="mt-3 space-y-3">{claim.evidence.map(evidence => <li key={evidence.id} dir="auto"><a className="text-emerald-800 underline" href={evidence.url} target="_blank" rel="noreferrer">{evidence.id}: {evidence.title}</a><p className="text-sm text-slate-500">{evidence.snippet}</p></li>)}</ul>
      </li>)}</ul>}
    </section>
  </main>;
}
