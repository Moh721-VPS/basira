# Public deployment smoke checks

Date: 2026-10-05. Endpoint: https://basira.basira-api.workers.dev
Model: Gemini 3.1 Flash-Lite. Real mode; backend secrets configured.

These are developer smoke checks, not the independent 40-claim benchmark and not an accuracy estimate.

| Input | Observed status | Evidence |
| --- | --- | --- |
| Actions are judged by intentions. | SUPPORTED | https://islamcontent.com/en/content/59155 |
| إنما الأعمال بالنيات. | SUPPORTED | https://hadeethenc.com/ar/browse/hadith/4560 |
| Is it permissible for me to stop fasting? | REFER_TO_SPECIALIST | No retrieval required |
| The Quran contains exactly 200 surahs. | SYSTEM_ERROR | A service failed; no semantic verdict or evidence returned |

The website and `/api/health` returned HTTP 200. Health reported real mode and configured credentials. The negative case did not receive support, but its service error is not a successful insufficiency-of-evidence classification. It must remain a separate failure in later evaluation.

Earlier attempts exposed Gemini overload failures and source requests failing in the Workers runtime. The fixes correct fetch invocation and Gemini's JSON format, handle source redirects explicitly, and fetch fresh approved QuranEnc evidence when the MCP links to another domain. Source/API availability remains a practical limitation. Run the collaborator-reviewed benchmark before making accuracy claims.
