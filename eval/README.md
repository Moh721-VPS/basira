# Verification checks and planned independent benchmark

`cases.json` contains seven developer-selected regression cases, not human-reviewed gold data. Do not present its pass rate as semantic accuracy or as a 40-claim benchmark.

From the repository root:

```sh
node eval/run.mjs https://basira.basira-api.workers.dev 2
pnpm --dir api exec tsx ../eval/retrieval.ts
pnpm --dir api exec tsx ../eval/adversarial.ts
```

- The runner refuses mock/unconfigured mode, checks the whole response (one expected atomic claim), exact expected citation URLs where supplied, valid approved URLs and nonempty supporting source text, separate service failures, false support on negative cases, and repeated-run status consistency. A domain match alone is not a retrieval-relevance measure.
- Retrieval diagnostics call real source adapters without an LLM, recording source URLs, text lengths and SHA-256 hashes. They prove text was retrieved, not that it entails a claim. Output includes complete-source counts; errors remain SYSTEM_ERROR.
- Adversarial checks call the actual configured Gemini model with synthetic source injection, title-only support, and incomplete qualifications. They read ignored `api/.dev.vars`; no credentials are printed. Synthetic evidence is never served to users. Passing these cases is not proof of general injection resistance.
- Raw diagnostic results are saved locally under ignored `eval/results/`. Review source text via its citation; quote only what the source actually supports. Share a dated summary rather than claiming accuracy from unreviewed labels.

## Human-reviewed benchmark (not completed)

- Have the teammate review claims independently before seeing app results. Start with `review-template.json`, fill `reviewer` and `reviewed_at`, then supply `claims` with `id,text,language,expected_status,expected_urls,reviewer_note`. Use exact publisher URLs, not run-specific E IDs. Set `reviewed: true` only after review. Keep this set hidden from implementation work until the app is ready. A smaller reviewed set may be reported using its actual size.
- Include supported, insufficient-evidence, and specialist-referral atomic cases and source-provided hadith grading. Human reviewers must approve gold labels and evidence. Test compound-input splitting separately: this runner deliberately expects one atomic result per reviewed case and will reject additional claims.
- The existing run script can accept a reviewed file as its fourth argument. Automated exact-status/citation checks do not establish evidence entailment; the teammate must also inspect supporting passages and source-provided grades. A manual-search or generic-chatbot comparison requires separate recorded comparator results, and is not claimed by this runner.
- API/retrieval failures are recorded separately as SYSTEM_ERROR and never scored as NEEDS_MORE_VERIFICATION. No benchmark scores may be reported from the current mock endpoint.
