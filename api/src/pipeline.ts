import { splitClaims } from './splitClaims';
import { retrieve } from './retrieve';
import { route } from './route';
import { verify } from './verify';
import { gate, notes } from './gate';
import type { ClaimResult, EvidenceSource, JsonModel, Lang, VerifyResponse } from './types';
export type Dependencies = { model: JsonModel; primary: EvidenceSource; fallbacks: EvidenceSource[] };
export async function pipeline(text: string, lang: Lang, deps: Dependencies): Promise<VerifyResponse> {
  const result = (id: string, claim: string, status: 'SYSTEM_ERROR' | 'REFER_TO_SPECIALIST'): ClaimResult => ({ id, text: claim, status, evidence: [], note: status === 'SYSTEM_ERROR' ? notes[lang].error : notes[lang].referral });
  // Preserve personal context even if extraction were to lose a pronoun.
  if (route(text)) return { claims: [result('C1', text, 'REFER_TO_SPECIALIST')] };
  let claims: string[];
  try { claims = await splitClaims(text, deps.model); } catch { return { claims: [result('C1', text, 'SYSTEM_ERROR')] }; }
  const results = await Promise.all(claims.map(async (claim, index): Promise<ClaimResult> => {
    const id = `C${index + 1}`;
    if (route(claim)) return result(id, claim, 'REFER_TO_SPECIALIST');
    try {
      const evidence = await retrieve(claim, lang, deps.primary, deps.fallbacks);
      const verdict = evidence.length ? await verify(claim, evidence, deps.model) : { verdict: 'not_entails' as const, evidenceIds: [], missing: ['INSUFFICIENT_EVIDENCE'] };
      return gate(id, claim, evidence, verdict, lang);
    } catch { return result(id, claim, 'SYSTEM_ERROR'); }
  }));
  return { claims: results };
}
