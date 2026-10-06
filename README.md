# Basira (بصيرة)

Claim-verification web app for the IslamicAIch challenge, Track 04.

Live demo: https://basira.basira-api.workers.dev

The deployed demo uses real verification with Gemini 3.1 Flash-Lite, selected after persistent overload errors from 3.8/3.7 Flash. Local development still defaults to mock mode unless configured. Free-tier quotas and upstream availability can cause service errors; the independent 40-claim evaluation remains pending.

Basira retrieves source evidence and checks whether it directly supports each complete claim. It does not answer from model memory or provide fatwas/personal rulings. Local mock mode allows development without credentials; the public demo uses real services.

Repository: https://github.com/Moh721-VPS/basira

The bilingual interface includes example inputs, status counts and filters, expandable source passages, copy/download reports, and cancellation of client-side waiting. The Figma-guided interface includes opt-in ElevenLabs voice input/report narration, enabled after limited real-service checks. See [VOICE.md](VOICE.md). A source-only live discussion interface/backend is implemented; hosted-agent setup is pending the provider's `convai_write` permission. See [LIVE-DISCUSSION.md](LIVE-DISCUSSION.md). Cancellation does not guarantee an already-running upstream request stops. Social-media link analysis, offline verification, native mobile apps, and alternate model-provider failover are not implemented.

## Requirements and local setup

Use Node.js 22.12+ (Node 24 recommended) and pnpm 11.25.0. If pnpm is unavailable, install it with `npm install --global pnpm@11.25.0`.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Run the Worker in terminal 1:

```sh
pnpm dev:api
```

Run the web app in terminal 2:

```sh
pnpm dev:web
```

Open http://127.0.0.1:5173. Vite proxies `/api` to the Worker at http://127.0.0.1:8787. Switch between Arabic RTL and English LTR in the header. Enter text and select Verify. Mock responses remain visibly labelled.

## Enable real verification

Create the ignored file `api/.dev.vars` locally with these three variables (supply your own key):

```dotenv
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-3.1-flash-lite
MOCK_MODE=false
```

Restart the Worker after changing configuration. `GEMINI_MODEL` has no runtime default. The example uses the deployed model; choose a model available to your Google project and validate it with real-service checks. Availability and quotas depend on the project. Missing configuration or an API quota/error produces SYSTEM_ERROR, never a mock result or insufficient-evidence judgment. `.env.example` lists variable names with blank values; Wrangler reads `api/.dev.vars`, not the root `.env`.

For production deployment, run these commands from the repository root:

```sh
pnpm --dir api exec wrangler secret put GEMINI_API_KEY --config wrangler.production.toml
pnpm --dir api exec wrangler secret put GEMINI_MODEL --config wrangler.production.toml
pnpm check:deploy
pnpm deploy
```

`api/wrangler.production.toml` selects real mode and serves the website and `/api` on one origin. `api/wrangler.toml` remains the local mock configuration. See [DEPLOY.md](DEPLOY.md) for authentication and deployment details.

## Structure

- `web/`: React, Vite, TypeScript, Tailwind, responsive single page and PWA manifest/icon. Production hosting uses Worker assets. Offline caching/service worker is not implemented.
- `api/`: TypeScript Cloudflare Worker. Build typechecks and bundles with Wrangler dry-run; it does not deploy or require a Cloudflare account.
- `eval/`: live regression, retrieval, and adversarial checks plus a plan for a human-reviewed 40-claim benchmark. Starter checks are not independent gold labels or measured accuracy.
- `AGENTS.md`: verification and secret-handling rules.
- `SOURCES.md`: approved source adapters, terms, and retrieval limitations.
- `api/src/`: separate splitClaims, retrieve, route, verify, and gate modules; adapters in `sources/`. JSON-schema Gemini outputs are validated again in code. Tests inject mocked models and fetchers and make no live network calls.

## API contract

`POST /api/verify`, `Content-Type: application/json`, body `{ "text": "Text to verify", "lang": "en" }`. `lang` is `ar` or `en` (defaults to `ar` for older clients); non-whitespace text must be at most 10000 characters. Up to five atomic claims and five evidence records per claim are returned. The example below is the unchanged mock mode response:

```json
{
  "claims": [{
    "id": "C1",
    "text": "Text to verify",
    "status": "NEEDS_MORE_VERIFICATION",
    "evidence": [{ "id": "E1", "title": "Mock evidence — example only", "url": "https://example.com/", "snippet": "Placeholder evidence. This does not support or refute the submitted text." }],
    "note": "MOCK DATA: no verification was performed. بيانات تجريبية: لم يُجرَ أي تحقق."
  }]
}
```

Claim statuses are `SUPPORTED`, `NEEDS_MORE_VERIFICATION`, `REFER_TO_SPECIALIST`, and `SYSTEM_ERROR`. Service failures are returned as SYSTEM_ERROR claims in the same response shape; HTTP 200 allows successful and failed claims in one request. Unexpected endpoint failures use HTTP 500 with that same shape. Invalid input is HTTP 400, unsupported content type 415, method 405, and route 404. The frontend shows red service-error badges separately from amber insufficient-evidence badges.

The verifier sees source text and code-assigned IDs, without URL fields. It returns only `{ verdict, evidenceIds, missing }`; `missing` contains fixed diagnostic codes, never religious explanations. SUPPORTED requires `entails`, a non-empty list of valid retrieved IDs, and no missing parts. Other valid verdicts abstain. Malformed/failed model output is SYSTEM_ERROR. Response notes are fixed localized strings; URLs are mapped by the backend, not generated by Gemini. Source names appear in evidence titles; source-supplied grades remain in source text. Retrieved text is preserved, not rewritten by the model.

## Retrieval and routing limits

MCP endpoint: `https://mcp.islamiccontent.org/mcp` (stateless Streamable HTTP). Inspected `tools/list` on 2026-10-04: one cross-source `search({query, language, limit})` followed by `fetch({id})`. Search IDs are opaque and search results alone contain no evidence text. The adapter reads JSON or SSE, fetches full documents, and detects the observed corpus-unavailable notices even if other results were returned.

If MCP fails, HadeethEnc's documented `hadeeths/search/?phrase=...&language=...` API is used, followed by `hadeeths/one`. QuranEnc's documented API supports verse lookup, not full-text search; its fallback uses explicit `Quran 2:255` / `القرآن ٢:٢٥٥` references only. Fallbacks cannot replace an IslamHouse search. Empty fallback recovery or any fallback API failure leaves SYSTEM_ERROR; a healthy MCP search with no results yields NEEDS_MORE_VERIFICATION.

Referral rules conservatively cover Arabic/English personal rulings and juristic topics. A matching original request is referred before extraction to preserve personal context; otherwise each extracted claim is routed before retrieval/verifying. Rules may over-refer and do not constitute exhaustive intent detection. The five-claim cap processes the first five; submit longer texts separately. This pipeline has offline functional tests, not a measured 40-claim benchmark or a guarantee of semantic accuracy.

Successful retrieval adds optional `retrieval: {count, sources}` metadata to each claim result. This counts fetched passages and publisher metadata; it does not establish relevance or entailment. Referral and failed verification results do not claim retrieval success. Unsupported results omit search hits from the evidence list, while the retrieval count remains visible. `BASIRA_RETRIEVED` logs only a count, not user text.

Source HTTP requests retry once on network TypeError or 502/503/504 within a shared 15-second timeout. They reject redirects and do not retry authentication or quota errors. MCP corpus-unavailable notices and failed document fetches still trigger fallback recovery or SYSTEM_ERROR; partial failures are never silently relabelled as insufficient evidence.

An MCP corpus-unavailable notice is retried once. Only a subsequent response without that notice can count as a recovered search; if it persists, fallback recovery or SYSTEM_ERROR applies.

QuranEnc's catalogue has no Arabic translation entries. For Arabic verse requests the adapter retrieves an available English translation edition with its source-provided Arabic original and explicitly labels the translation language in the evidence title. The source text, translation, footnotes and version remain unmodified; this does not claim to retrieve Arabic tafsir.

For reproducible checks, see [eval/README.md](eval/README.md) and the dated [validation report](eval/validation-2026-10-06.md).

## Secrets and production boundary

No API key is needed in mock mode. Keys and the model configuration belong in backend environment variables. Never add secrets to browser code or `VITE_*` variables, and never commit `.env` or `.dev.vars`. The API does not log credentials, upstream response bodies, or exception details.

Production configuration and step-by-step deployment instructions are in [DEPLOY.md](DEPLOY.md). Run `pnpm check:deploy` to validate the website and Worker bundle, and `pnpm deploy` to publish after setting Cloudflare secrets. The demo was published on 2026-10-05. Do not publish benchmark scores from mock mode.

## License

MIT; see LICENSE. Third-party evidence remains subject to its own terms.
