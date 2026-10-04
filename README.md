# Basira (بصيرة)

Claim-verification web app scaffold for the IslamicAIch challenge, Track 04.

**Task 1 only:** the API returns visibly marked mock data. It does not split claims, retrieve evidence, call Gemini, verify Islamic content, or provide fatwas/personal rulings.

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

Open http://127.0.0.1:5173. Vite proxies `/api` to the Worker at http://127.0.0.1:8787. Switch between Arabic RTL and English LTR in the header. Enter text and select Verify to see the mock response.

## Structure

- `web/`: React, Vite, TypeScript, Tailwind, responsive single page and PWA manifest/icon. Offline caching/service worker and production hosting are not included.
- `api/`: TypeScript Cloudflare Worker. Build typechecks and bundles with Wrangler dry-run; it does not deploy or require a Cloudflare account.
- `eval/`: plan for a future 40-claim gold benchmark.
- `AGENTS.md`: verification and secret-handling rules.
- `SOURCES.md`: evidence-source register; no religious sources approved yet.

## API contract

`POST /api/verify`, `Content-Type: application/json`, body `{ "text": "Text to verify" }` (1–10000 characters after requiring non-whitespace text).

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

Public claim statuses are `SUPPORTED`, `NEEDS_MORE_VERIFICATION`, `REFER_TO_SPECIALIST`. The scaffold always returns the same mock status; it makes no judgment. SYSTEM_ERROR is internal and represented by an HTTP 500 `{ "error": "SYSTEM_ERROR" }`, never converted into a claim needing verification. The web app renders request failures separately. Invalid input is HTTP 400, unsupported content type 415, method 405, and route 404.

## Secrets and production boundary

No API key is needed for the scaffold. `.env.example` contains only `GEMINI_API_KEY=`. Future backend secrets belong in environment variables: local Wrangler secrets may be supplied through ignored `api/.dev.vars`; deployed secrets through `wrangler secret put GEMINI_API_KEY`. Never add secrets to browser code or `VITE_*` variables, and never commit `.env` or `.dev.vars`.

Future hosting must route `/api` to the Worker on the same origin. No production deployment or AI logic is included here.

## License

MIT; see LICENSE. Third-party evidence remains subject to its own terms.
