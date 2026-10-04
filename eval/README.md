# Planned 40-claim benchmark

This folder intentionally contains only this plan. No benchmark data or evaluator is implemented yet.

- `gold.csv`: 40 reviewed Arabic and English atomic claims with columns `id,text,language,expected_status,approved_evidence_ids,reviewer_note`.
- Include supported, insufficient-evidence, and specialist-referral cases, compound claims, and source-provided hadith grading. Human reviewers must approve gold labels and evidence.
- A future run script will submit each claim to `/api/verify`, save responses, and report status accuracy, evidence entailment, unsupported SUPPORTED labels, abstention, and specialist referral.
- API/retrieval failures are recorded separately as SYSTEM_ERROR and never scored as NEEDS_MORE_VERIFICATION. No benchmark scores may be reported from the current mock endpoint.
