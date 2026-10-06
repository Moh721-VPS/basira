> سجل تاريخي قبل اعتماد العربية وحدها؛ لا يصف دعم اللغات الحالي. انظر README.md وvalidation-arabic-2026-10-06.md.

# Validation — 2026-10-06

These are developer-selected regression and service checks, not an independent benchmark, semantic accuracy estimate, or guarantee of uptime. The user confirmed the teammate's reviewed 40-claim set is not completed.

## Contract and browser checks

- `pnpm test`: 33 offline tests passed, including source retry bounds, persistent partial failures, code-assigned citation IDs, URL allowlist, input/schema validation, partial entailment rejection, Arabic historical-text routing, personal referral, and synthetic source-injection contract handling.
- `pnpm check:deploy`: frontend/API typechecks, production build and Wrangler production dry-run passed.
- Headless Edge: actual public Arabic referral, report download, Arabic/English direction switch, cancellation, and synthetic result filtering/evidence expansion passed. At 390px width, no document overflow; no browser page errors. Synthetic fixtures were injected only in the test browser, never deployed as real evidence.
- GitHub API reported `Moh721-VPS/basira` public, default branch `main`. Only `.env.example` is tracked among environment/secret configuration files; diagnostic credentials remain in ignored backend variables.

## Real service checks

Seven atomic cases: intentions (Arabic/English), prayer among the five pillars, the 200-surahs negative claim, personal fasting/prayer questions, and an input instruction attempting to force support for a false claim.

- The two-round run with corrected citation expectations passed 13/14 requests, with one SYSTEM_ERROR on the second five-pillars request and zero SUPPORTED labels on the negative cases. Six of seven cases had matching statuses between rounds; the failed request must remain a reliability failure. Supported citation sets may differ even when statuses match.
- After the Arabic Quran correction and bounded MCP notice retry were deployed, the final one-round smoke run passed 7/7 requests, with zero service errors and zero support labels on the negative cases. This final pass does not erase the earlier failure or measure repeated-run consistency of the final version. Deployed Worker version: `03ffb248-1d7f-4d8d-b030-b9a0ded9efb0`.
- The expected five-pillars citation includes HadeethEnc 4303: its publisher's Benefits section explicitly lists prayer among the five pillars. This is a checked alternate source, not acceptance based solely on a matching domain.
- After fixing the Arabic Quran catalogue lookup, all four retrieval-only probes succeeded: English and Arabic MCP claims, the negative claim's retrieved candidate set, and a direct HadeethEnc reference. Recorded source URLs, nonzero text lengths and SHA-256 hashes establish that real text was fetched. They do not establish relevance. The negative claim's candidates were largely topical and must not be treated as proof.
- Three real Gemini checks with synthetic evidence abstained: injected source instructions, title-only support, and a claim with an unsupported qualification. This finite test does not establish general prompt-injection resistance.

The Arabic MCP failure was traced to requesting `/translations/list/ar`, which returns an empty list. The corrected adapter obtains source-provided Arabic text from an available English translation edition and labels that edition's language. Source failures remain separate from insufficient evidence. HTTP network/gateway failures and MCP corpus-unavailable notices each have one bounded recovery attempt; no partial response is silently treated as complete.

Raw results are stored locally under ignored `eval/results/`; published summaries omit source bodies and credentials. Run `node eval/run.mjs https://basira.basira-api.workers.dev 2` to reproduce checks against current service availability.

## Still pending

Human-reviewed claim labels, passage-level entailment review, source-provided grading review, manual-search comparison and a generic-chatbot comparison have not been completed. No 40-claim score or benefit percentage is claimed. An actual demonstration video and its accessible link remain needed; the repository contains a recording script, not a completed video.
