import { useEffect, useRef, useState } from 'react';
type Props = { language: 'ar' | 'en'; available: boolean; disabled: boolean; onTranscript: (value: string) => void; onBusyChange: (busy: boolean) => void };
const copy = {
  ar: { start: 'ابدأ التسجيل', stop: 'إيقاف ومراجعة النص', discard: 'حذف التسجيل', listening: 'نستمع إليك', converting: 'جارٍ تحويل التسجيل إلى نص…', privacy: 'بعد الإيقاف، يُرسل التسجيل إلى ElevenLabs لتحويله إلى نص. راجع النص قبل التحقق.', unavailable: 'الإدخال الصوتي غير متاح حالياً. يمكنك كتابة النص.', unsupported: 'هذا المتصفح لا يدعم التسجيل. يمكنك كتابة النص.', denied: 'تعذر الوصول إلى الميكروفون. اسمح بالوصول من إعدادات المتصفح أو اكتب النص.', failed: 'تعذر تحويل الصوت إلى نص. حاول مرة أخرى أو اكتب النص.', cancelled: 'أُلغي التسجيل. لم يصدر طلب تحقق.', limit: 'تسجيل حتى دقيقة واحدة' },
  en: { start: 'Start recording', stop: 'Stop and review', discard: 'Discard recording', listening: 'Listening to you', converting: 'Transcribing your recording…', privacy: 'After stopping, your recording is sent to ElevenLabs for transcription. Review the text before verifying.', unavailable: 'Voice input is currently unavailable. You can type your text.', unsupported: 'This browser does not support recording. You can type your text.', denied: 'Could not access the microphone. Allow access in browser settings or type your text.', failed: 'Could not transcribe the recording. Retry or type your text.', cancelled: 'Recording discarded. No verification was requested.', limit: 'Record up to one minute' },
};
export async function recordingToWav(blob: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = Math.floor(Math.min(decoded.duration, 60) * 16000);
    if (samples < 1600) throw new Error('Recording too short');
    const offline = new OfflineAudioContext(1, samples, 16000), source = offline.createBufferSource();
    source.buffer = decoded; source.connect(offline.destination); source.start();
    const data = (await offline.startRendering()).getChannelData(0);
    const bytes = new ArrayBuffer(44 + samples * 2), view = new DataView(bytes);
    const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i++) { const sample = Math.max(-1, Math.min(1, data[i])); view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true); }
    return new Blob([bytes], { type: 'audio/wav' });
  } finally { await context.close(); }
}
export default function VoiceInput({ language, available, disabled, onTranscript, onBusyChange }: Props) {
  const t = copy[language], [state, setState] = useState<'idle' | 'preparing' | 'recording' | 'sending'>('idle'), [seconds, setSeconds] = useState(0), [message, setMessage] = useState(''), [levels, setLevels] = useState<number[]>(Array(22).fill(4));
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), context = useRef<AudioContext | null>(null), timer = useRef<number | undefined>(undefined), animation = useRef<number | undefined>(undefined), abort = useRef<AbortController | null>(null), discard = useRef(false), mounted = useRef(true), locked = useRef(false);
  const generation = useRef(0);
  function release() { if (timer.current) window.clearInterval(timer.current); if (animation.current) cancelAnimationFrame(animation.current); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; void context.current?.close().catch(() => {}); context.current = null; }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; discard.current = true; abort.current?.abort(); if (recorder.current?.state === 'recording') recorder.current.stop(); release(); }; }, []);
  function cancel() { generation.current++; discard.current = true; abort.current?.abort(); if (recorder.current?.state === 'recording') recorder.current.stop(); recorder.current = null; release(); setState('idle'); setMessage(t.cancelled); locked.current = false; onBusyChange(false); }
  async function start() {
    if (locked.current || !available || disabled) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined' || typeof AudioContext === 'undefined') { setMessage(t.unsupported); return; }
    locked.current = true; discard.current = false; setMessage(''); setState('preparing'); onBusyChange(true);
    const attempt = ++generation.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
      if (!mounted.current || discard.current || attempt !== generation.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const recording = new MediaRecorder(media, mime ? { mimeType: mime } : undefined); recorder.current = recording;
      const chunks: Blob[] = []; recording.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recording.onstop = async () => {
        if (!mounted.current || discard.current || attempt !== generation.current) return; release();
        setState('sending'); const controller = new AbortController(); abort.current = controller;
        const timeout = window.setTimeout(() => controller.abort(), 65000);
        try {
          const raw = new Blob(chunks, { type: recording.mimeType }); if (raw.size > 8000000) throw new Error('Recording too large');
          const wav = await recordingToWav(raw); if (discard.current || controller.signal.aborted || attempt !== generation.current) return;
          const response = await fetch(`/api/transcribe?lang=${language}`, { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: wav, signal: controller.signal });
          const data = await response.json();
          if (!response.ok || typeof data.text !== 'string' || !data.text.trim() || data.text.length > 10000) throw new Error('Transcription failed');
          if (mounted.current && !discard.current && attempt === generation.current) onTranscript(data.text);
        } catch { if (mounted.current && !discard.current && attempt === generation.current) setMessage(t.failed); }
        finally { window.clearTimeout(timeout); if (mounted.current && attempt === generation.current) { recorder.current = null; setState('idle'); locked.current = false; onBusyChange(false); } }
      };
      context.current = new AudioContext(); await context.current.resume(); const analyser = context.current.createAnalyser(); analyser.fftSize = 256; context.current.createMediaStreamSource(media).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const draw = () => { if (!mounted.current || discard.current || attempt !== generation.current || recording.state !== 'recording') return; analyser.getByteTimeDomainData(samples); setLevels(Array.from({ length: 22 }, (_, i) => Math.max(4, Math.abs(samples[Math.floor(i * samples.length / 22)] - 128) / 128 * 68))); animation.current = requestAnimationFrame(draw); };
      recording.start(); setState('recording'); setSeconds(0); draw(); const startTime = Date.now();
      timer.current = window.setInterval(() => { const elapsed = Math.min(60, Math.floor((Date.now() - startTime) / 1000)); setSeconds(elapsed); if (elapsed >= 60 && recording.state === 'recording') recording.stop(); }, 250);
    } catch { if (attempt === generation.current) { release(); locked.current = false; onBusyChange(false); if (mounted.current) { setState('idle'); setMessage(t.denied); } } }
  }
  return <div className="voice-input">
    {!available ? <p className="hint">{t.unavailable}</p> : state === 'preparing' ? <p role="status">{language === 'ar' ? 'جارٍ طلب الوصول إلى الميكروفون…' : 'Requesting microphone access…'}</p> : state === 'recording' ? <><h3>{t.listening}</h3><div className="waveform" aria-hidden="true">{levels.map((height, i) => <span key={i} style={{ height }} />)}</div><p className="voice-time" dir="ltr">00:{String(seconds).padStart(2, '0')} / 01:00</p><button type="button" className="button voice-action" onClick={() => { if (recorder.current?.state === 'recording') recorder.current.stop(); }}>{t.stop}</button></> : state === 'sending' ? <p role="status"><span className="spinner" aria-hidden="true" /> {t.converting}</p> : <><p className="hint">{t.limit}</p><button type="button" className="button voice-action" disabled={disabled} onClick={start}>{t.start}</button></>}
    {state !== 'idle' && <button type="button" className="text-button" onClick={cancel}>{t.discard}</button>}
    <p className="hint">{t.privacy}</p>{message && <p role="status" className="voice-notice">{message}</p>}
  </div>;
}
