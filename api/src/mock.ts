import type { VerifyResponse } from './types';
export function mock(text: string): VerifyResponse {
  return { claims: [{ id: 'C1', text: text.trim(), status: 'NEEDS_MORE_VERIFICATION', evidence: [{ id: 'E1', title: 'Mock evidence — example only', url: 'https://example.com/', snippet: 'Placeholder evidence. This does not support or refute the submitted text.' }], note: 'MOCK DATA: no verification was performed. بيانات تجريبية: لم يُجرَ أي تحقق.' }] };
}
