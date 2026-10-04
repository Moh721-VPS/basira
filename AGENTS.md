# Basira project rules

- Basira never answers from model memory. It splits text into atomic claims, retrieves approved-source evidence, and labels each claim: SUPPORTED, NEEDS_MORE_VERIFICATION, REFER_TO_SPECIALIST. Internal fourth state: SYSTEM_ERROR (API/retrieval failure, never shown as NEEDS_MORE_VERIFICATION).
- The LLM must only return evidence IDs (E1, E2...). The backend maps IDs to real URLs. The model never generates URLs.
- SUPPORTED only if retrieved evidence directly entails every part of the claim. Abstain otherwise. No fatwas or personal rulings.
- Hadith grading comes from the source, never generated.
- Secrets only in environment variables. Commit .env.example, never .env.
- Keep changes small and simple. Prefer targeted fixes over redesigns.
