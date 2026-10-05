# Live demo deployment

The production deployment serves the Vite website and verification API from one Cloudflare Worker. No custom domain is required. `api/wrangler.production.toml` uses real verification; local development still defaults to mock mode.

## Accounts

Use your Cloudflare account and a Gemini API key from Google AI Studio. Keep credentials in local backend variables or Cloudflare secrets. Never paste keys into chat, frontend code, or GitHub.

## Local real verification first

Create the ignored file `api/.dev.vars` using these names and your own key:

```dotenv
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-3.8-flash
MOCK_MODE=false
```

Choose a model available to your Google project. Run `pnpm dev:api` and `pnpm dev:web` in separate terminals. Check actual source-backed claims and referral cases before publishing results. `/api/health` reports mode and configuration readiness only; it does not test the key, quota, model access or retrieval services.

## Publish

From the repository root:

```powershell
pnpm check:deploy
pnpm --dir api exec wrangler login
pnpm --dir api exec wrangler secret put GEMINI_API_KEY --config wrangler.production.toml
pnpm --dir api exec wrangler secret put GEMINI_MODEL --config wrangler.production.toml
pnpm deploy
```

Enter the key and model at the secret prompts. Wrangler may offer to create the `basira` Worker when adding its first secret. The production Worker is named `basira`; secrets added to the old `basira-api` Worker will not configure it. Never put secrets directly in command arguments.

Copy the HTTPS `workers.dev` URL printed by the successful deployment. That is the live demo link. Do not substitute localhost or an assumed URL.

## Verify after deployment

- Open the URL in a private browser window and on a phone.
- Confirm `/api/health` reports `mode: real` and `configured: true`.
- Submit real Arabic and English claims; open evidence links and compare source text.
- Confirm specialist requests produce referrals.
- Confirm failures appear as service errors, not insufficient evidence or support.
- Keep the collaborator's 40-claim gold set independent and run it only once the app is ready. Offline mock tests are not measured verification accuracy.

## Continue on GitHub

Work on a small branch, run `pnpm test` and `pnpm check:deploy`, and open a pull request into `main`. Review and merge the change, then deploy that version. The deployment is an explicit command; pushing to GitHub alone does not publish it.

Official routing reference: https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
