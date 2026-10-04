export type Lang = 'ar' | 'en';
export type ClaimStatus = 'SUPPORTED' | 'NEEDS_MORE_VERIFICATION' | 'REFER_TO_SPECIALIST' | 'SYSTEM_ERROR';
export type Evidence = { title: string; url: string; snippet: string; source: string };
export type IdentifiedEvidence = Evidence & { id: string };
export type ClaimResult = { id: string; text: string; status: ClaimStatus; evidence: { id: string; title: string; url: string; snippet: string }[]; note: string };
export type VerifyResponse = { claims: ClaimResult[] };
export interface EvidenceSource { search(query: string, lang: Lang): Promise<Evidence[]> }
export interface JsonModel { generate(instruction: string, input: unknown, schema: Record<string, unknown>): Promise<unknown> }
export type Env = { GEMINI_API_KEY?: string; GEMINI_MODEL?: string; MOCK_MODE?: string };
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid response');
  return value as Record<string, unknown>;
}
export function string(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid response');
  return value;
}
