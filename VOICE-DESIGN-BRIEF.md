# Basira design and voice brief

Requested on 2026-10-06: involve Figma in improving the interface, and ElevenLabs in both voice input and spoken verification reports. Editable Figma screens, the React implementation and voice API adapters are implemented. Real ElevenLabs access is not configured or tested yet, so production voice remains disabled.

Figma file: https://www.figma.com/design/JPT2ECVyHsTo7q4MfiwM35

## Product flow

1. Choose Arabic or English. Paste text or explicitly start a short recording.
2. Show recording/stop/discard states. After transcription, show an editable transcript; the user reviews it before selecting Verify. Transcription does not itself verify the claim.
3. Run the existing source-backed verification pipeline. Preserve the distinction between support, insufficient evidence, specialist referral and service failure.
4. Provide an optional Listen action on the completed report with native playback controls. Read the claim number, fixed outcome and note, and publisher attribution. The raw claim and source passages remain visual, separately inspectable text.

## Figma design direction

Design mobile-first Arabic RTL and matching English LTR screens. Give the input, recording state and report a clear hierarchy. Replace the current generic form appearance with stronger typography and deliberate spacing; keep emerald/ink as brand anchors, with restrained warm accents. Status colors accompany words and icons rather than carry meaning alone.

Required states: empty composer, typing, recording, transcript review, verification in progress, mixed claim results, evidence expansion, report playback, microphone denied, unavailable voice service, and cancelled requests. Include a 390px mobile layout and a wide desktop layout. Do not invent confidence percentages or show fictional evidence as a real result.

Figma output should be an editable design that can be inspected and implemented in the existing React/Vite app. Preserve the existing backend verification rules.

## ElevenLabs integration boundary

- Use speech-to-text for recording transcription and text-to-speech for report playback. Avoid a separate conversational religious agent that invents answers.
- Credentials belong in Worker environment variables, never browser code or chat. Use a backend proxy for provider requests.
- Generate report speech from backend-authored report fields and actual stored evidence, not client-supplied verdicts or an additional model explanation. Evidence IDs and approved URLs remain backend-controlled.
- Do not synthesize Quran recitation in the first version. Read status, fixed explanation and publisher attribution; evaluate source-passage narration separately to avoid implying a verified recitation or pronunciation.
- Record only after an explicit user action. Show the microphone state, allow discard, bound recording length and upload size, and stop microphone tracks after recording/cancellation.
- Keep voice-service failures separate from verification results. A failed transcription or playback request must not change a claim's status.
- Show when audio is sent to ElevenLabs. Do not persist recordings by default. Verify provider quota availability before enabling production voice requests; no paid subscription or automatic overage is authorized.

## Connection requirements

Figma is connected; the new file contains Arabic/English desktop screens, four mobile voice states, failure states, reusable action controls, product variables and text styles. Real account-backed ElevenLabs transcription and speech checks still require credentials. No ElevenLabs plugin was returned by the directory search in this session; the app uses its documented API through the Worker.

## Acceptance checks

Arabic and English transcripts are editable before verification; cancel/discard stops the microphone; no provider key appears in browser assets; report audio matches backend status and attribution; voice failures do not mutate verification results; controls work on mobile; the existing verification regression suite remains passing.
