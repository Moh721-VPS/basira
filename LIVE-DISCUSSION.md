# Live source discussion

Basira's live discussion is a research companion, using publisher commentary retrieved from approved sources. It is separate from atomic claim verification and does not provide personal rulings.

## Architecture

- The official ElevenLabs browser SDK establishes a private WebRTC conversation after explicit microphone permission. Controls include stop, mute, transcript and citations. Client and provider session limits are three minutes.
- ElevenLabs calls the protected `/api/agent/chat/completions` endpoint. This is a compatibility adapter, not a separate model answering from memory.
- The backend uses recent user questions to retrieve approved-source records. It extracts original publisher commentary, then asks Gemini to return only a relevant evidence ID or an empty list. It never accepts generated religious prose or model-generated links. Retrieved quotations are shown with backend-mapped source URLs.
- A `display_sources` client tool receives a backend-signed reply token and displays citations. The next model request validates that signed token and returns the exact backend-authored attribution plus source quotation. Client tool output cannot replace the spoken reply with a forged answer.
- Personal/juristic requests refer before source/model calls. Empty evidence abstains; service failure stays SYSTEM_ERROR. Routing and relevance selection remain imperfect; no measured semantic accuracy is claimed.
- The hosted agent is configured with custom-model fallback disabled. It has private session authentication, one concurrent session, three sessions per day, no bursting, no voice recording, and limited retention for new conversations. These controls are configured at agent creation, not assumed before creation succeeds.

## Setup status — 2026-10-06

Basic ElevenLabs speech and transcription are validated and enabled. Arabic and English speech generation passed, English round-trip transcription matched a synthetic connection test, and the deployed signed-report endpoint returned Arabic audio.

Live discussion implementation is ready, but hosted-agent creation is currently rejected by ElevenLabs because the key lacks `convai_write`. Enable ElevenAgents/Conversational AI Write and Read permissions in the existing API key. Do not paste the key into chat. The live session button remains unavailable until the private agent is created, validated and deployed.

Backend variables: `BASIRA_AGENT_TOKEN` (private random secret), `ELEVENLABS_AGENT_ID`, `LIVE_AGENT_ENABLED=true`. The setup stores the custom-model credential in an ElevenLabs workspace secret; keys never enter browser code. Preserve the existing Gemini and voice variables.

## Verification

45 automated tests pass, including exact source quotation, ID-only selection, unknown/generated output rejection, abstention vs service failure, personal referral, signed quote integrity/expiry, private bridge authentication, source tool acknowledgement and session contracts. The production build/typecheck/dry-run passes.

A real Arabic question about الإحسان selected original HadeethEnc commentary with its actual URL. Source-only tests do not measure general accuracy. Browser tests with an isolated mock SDK passed citation display, mute, stop, language unlock and mobile overflow; these were not real provider sessions. Actual WebRTC/agent behaviour remains to be validated after hosted-agent setup succeeds.

References: [custom model integration](https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm), [JavaScript SDK](https://elevenlabs.io/docs/eleven-agents/libraries/java-script), [API-key controls](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys).
