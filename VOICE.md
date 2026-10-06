# Voice input and report narration

## Current state

The interface and backend adapters are implemented. Production voice is off until ElevenLabs credentials and `VOICE_ENABLED=true` are configured and real-service checks pass. Text verification remains available. Configuration readiness is not proof that a key, quota, model, voice or upstream service works.

Editable design: [Basira verification and voice](https://www.figma.com/design/JPT2ECVyHsTo7q4MfiwM35). The implementation adapts the design's Noto Sans Arabic/Manrope typography, product tokens and reusable controls to the existing React/Vite app. Fonts are hosted locally with their OFL licences. Existing examples, result filters, evidence inspection and report export remain available.

## User flow

- Select Record voice and explicitly start recording. Basira shows microphone activity, elapsed time and signal levels. Stop to transcribe, or discard without uploading.
- After stopping, the browser converts the recording to bounded mono 16kHz PCM WAV and sends it to ElevenLabs through the backend. The server validates the WAV format and duration (0.1–60 seconds) and limits upload size before provider calls. Basira does not store recordings; provider processing/retention follows ElevenLabs' terms.
- The transcript is editable. Verification happens only after the user reviews it and selects Verify; transcription is not a verification result.
- Report narration reads claim numbers, backend-authored outcomes/notes and publisher attribution. It does not read raw submitted claims, retrieved sacred text or model-authored explanations. The backend signs a short report token valid for 15 minutes; the speech endpoint rejects unsigned/tampered/expired reports before provider calls. The client cannot request narration of a forged supported verdict.
- Native audio controls support playback and pause. Audio is cached only in the current browser report session. Voice failures do not alter verification outcomes. Provider POST calls are not retried automatically, avoiding duplicate generations.

## Configure ElevenLabs

1. Create an account and select a free option if it is offered. No paid subscription or overage is required or authorized by this implementation.
2. In [API-key settings](https://elevenlabs.io/app/settings/api-keys), create a restricted Basira key. Enable speech-to-text, text-to-speech and read access to voices for setup. Set a credit limit within the account's included allowance. See [official key restrictions](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys).
3. Save credentials in ignored `api/.dev.vars`, never frontend variables or GitHub:

```dotenv
ELEVENLABS_API_KEY=your-private-key
ELEVENLABS_VOICE_ID=an-available-voice-id
ELEVENLABS_STT_MODEL=scribe_v2
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2
VOICE_ENABLED=true
```

The model names match the documented API examples; validate availability for your actual account. Do not automatically switch to a paid model or enable overage when a request fails. Voice ID must come from an available account voice, not an invented value. Do not overwrite the existing Gemini fields.

4. Test a short Arabic/English transcript and a signed report locally; inspect actual accuracy and pronunciation. Local mock/fixture tests do not establish real ElevenLabs functionality.
5. Only after those checks, add the key/voice ID as Cloudflare secrets using `wrangler.production.toml`, set `VOICE_ENABLED=true`, and redeploy. Keep API keys restricted and quotas bounded because public demo requests consume the account's allowance.

## API

| Endpoint | Contract |
| --- | --- |
| `GET /api/voice/config` | Public readiness flags `transcribe`, `speak`, and `maxSeconds`; no credentials |
| `POST /api/transcribe?lang=ar\|en` | `audio/wav`, canonical mono 16kHz 16-bit PCM header, bounded body; returns editable `{text}` |
| `POST /api/speak` | JSON `{token}` from a real verification response; streams report audio |
| `POST /api/verify` | Existing verification contract plus optional backend-signed `speechToken` when narration is configured |

Voice endpoint errors are HTTP errors such as `VOICE_NOT_CONFIGURED`, `INVALID_RECORDING` or `VOICE_SERVICE_FAILED`. They do not become claim-level insufficient-evidence judgments. Keys and voice IDs remain backend environment values. No user audio or provider response bodies are logged by these adapters.

## Validation

39 automated tests pass, including signed narration integrity/expiry, PCM duration/format limits, no-key/mock-mode opt-out, transcription contracts, provider errors and no arbitrary-text narration. Browser checks exercised actual recording and WAV conversion with a fake test microphone, mocked voice responses, editable transcript review, microphone release, discard-without-upload, no auto-verification, playback/error wiring, cache reuse, RTL/LTR, loaded local fonts and mobile overflow. A real local personal-ruling request still returned REFER_TO_SPECIALIST.

Live ElevenLabs transcription, Arabic pronunciation, provider quota behaviour and a real selected voice remain untested until the account is configured.

References: [speech-to-text API](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [text-to-speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).
