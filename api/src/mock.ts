import type { VerifyResponse } from './types';
export function mock(text: string): VerifyResponse {
  return { claims: [{ id: 'C1', text: text.trim(), status: 'NEEDS_MORE_VERIFICATION', evidence: [], note: 'بيانات تجريبية: لم يُجرَ أي تحقق.' }] };
}
