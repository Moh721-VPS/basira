import { useEffect, useRef, useState } from 'react';
export default function ReportAudio({ token, language }: { token?: string; language: 'ar' | 'en' }) {
  const [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const currentUrl = useRef(''), controller = useRef<AbortController | null>(null), audio = useRef<HTMLAudioElement | null>(null);
  const generation = useRef(0), loading = useRef(false);
  useEffect(() => { generation.current++; loading.current = false; setUrl(''); setError(false); setBusy(false); return () => { generation.current++; controller.current?.abort(); audio.current?.pause(); if (currentUrl.current) URL.revokeObjectURL(currentUrl.current); currentUrl.current = ''; }; }, [token]);
  async function load() {
    if (!token || loading.current) return; loading.current = true; const attempt = ++generation.current; const request = new AbortController(); controller.current = request; setBusy(true); setError(false);
    const timeout = window.setTimeout(() => request.abort('timeout'), 65000);
    try {
      const response = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), signal: request.signal });
      if (!response.ok || !response.headers.get('Content-Type')?.startsWith('audio/')) throw new Error('Speech unavailable');
      const blob = await response.blob(); if (!blob.size || request.signal.aborted) throw new Error('Empty audio');
      const next = URL.createObjectURL(blob); currentUrl.current = next; setUrl(next);
    } catch { if (attempt === generation.current) setError(true); }
    finally { window.clearTimeout(timeout); if (attempt === generation.current) { loading.current = false; setBusy(false); } }
  }
  const ar = language === 'ar';
  return <div className="report-audio">
    {url ? <audio ref={audio} controls src={url} aria-label={ar ? 'قراءة التقرير' : 'Report narration'} /> : <button className="button voice-action" type="button" disabled={!token || busy} onClick={load}>{busy ? (ar ? 'جارٍ إعداد القراءة…' : 'Preparing audio…') : (ar ? 'استمع إلى التقرير الكامل' : 'Listen to the full report')}</button>}
    <p className="hint">{token ? (ar ? 'تقرأ ElevenLabs الحالات والإيضاحات ونسبة المصادر.' : 'ElevenLabs reads outcomes, fixed notes and publisher attribution.') : (ar ? 'القراءة الصوتية غير متاحة لهذا التقرير حالياً.' : 'Audio playback is currently unavailable for this report.')}</p>
    {error && <p role="alert" className="voice-notice">{ar ? 'تعذر تشغيل القراءة. نتيجة التحقق لم تتغير.' : 'Audio could not be prepared. The verification result has not changed.'}</p>}
  </div>;
}
