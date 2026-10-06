# Scope audit — 2026-10-06

Reviewed the actual repository, production configuration, deployed API, and existing Arabic deck against the supplied Basira scope. GitHub API confirmed `Moh721-VPS/basira` is public with default branch `main`.

| Scope item | Current evidence / limitation |
| --- | --- |
| Track 04 source-backed claim verification | Implemented: split → route → retrieve → verify → gate. Real services are deployed. |
| Arabic and English | Implemented; RTL/LTR browser checks passed. Fixed Arabic Quran retrieval using the source's Arabic original with a labelled English translation edition. |
| Three public outcome categories | Implemented; SYSTEM_ERROR remains a separate service-failure state. |
| Abstention and no personal rulings | Implemented in prompts, referral rules and backend gate; colloquial personal requests refer before network calls. Routing is heuristic and not exhaustive. |
| Backend source attribution | Model returns evidence IDs; backend maps approved source URLs. Hadith grade remains verbatim source text. Full source passages are shown, without claiming exact highlighted quotations. |
| Visible retrieval provenance | Source-passage counts and publisher names appear on completed checks. Reproducible source-only probes record URLs, sizes and text hashes. These are retrieval diagnostics, not semantic-relevance scores. |
| Reliability and injection | Automated contracts, real-service regressions and synthetic real-model adversarial checks are available. A repeated run recorded one service error. No guarantee of uptime, consistency, or injection resistance is claimed. |
| Independent 40-claim benchmark / manual-search comparison | Pending; user confirmed teammate's reviewed set is not completed. Review template and runner are ready. No invented gold labels or accuracy percentages. |
| Mobile access | Responsive web interface and manifest exist. Native iOS/Android apps, service-worker caching and offline verification are not implemented. |
| Social-media links / share flow | Not implemented; current input is pasted text. These were optional stretch ideas. |
| Alternate model provider | Not implemented; Gemini model ID is configurable and transient gateway retries are bounded. Source fallback adapters are separate from model-provider failover. |
| Submission | Public code and live link are available. Updated 10-slide PPTX is under 10 MB. Video script exists; an actual video of at most two minutes and its accessible link are still required. |

The core matches the verification scope. The independent benchmark and video remain submission gaps. Expanding into a general religious chatbot would conflict with the project's evidence and no-fatwa rules.
