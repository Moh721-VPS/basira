import type { IdentifiedEvidence, ClaimResult, Lang } from './types';
import { publisherLabel } from './types';
import type { Verdict } from './verify';
export const notes = {
    ar: { supported: 'تدعم الأدلة المسترجعة جميع أجزاء الادعاء مباشرة.', insufficient: 'لا تدعم الأدلة المسترجعة جميع أجزاء الادعاء مباشرة.', referral: 'يرجى الرجوع إلى مختص مؤهل لهذا الحكم الشخصي أو التفسير الفقهي.', error: 'تعذر إكمال التحقق بسبب فشل خدمة. يرجى المحاولة مرة أخرى.' }
};
export function gate(id: string, text: string, evidence: IdentifiedEvidence[], result: Verdict, lang: Lang): ClaimResult {
    const supported = result.verdict === 'entails' && result.evidenceIds.length > 0 && result.missing.length === 0 && result.evidenceIds.every(evidenceId => evidence.some(item => item.id === evidenceId));
    // Retrieved search hits are not established evidence for an unsupported claim.
    const selected = supported ? evidence.filter(item => result.evidenceIds.includes(item.id)) : [];
    return { id, text, status: supported ? 'SUPPORTED' : 'NEEDS_MORE_VERIFICATION', evidence: selected.map(({ id, title, url, snippet, source }) => ({ id, title: `${publisherLabel(source)}: ${title}`, url, snippet })), note: supported ? notes[lang].supported : notes[lang].insufficient };
}
