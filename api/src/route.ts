// Conservative referral rules: this is routing, never a religious ruling.
export function route(claim: string): boolean {
  const normalized = claim.toLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا');
  return /فتوى|فتاوى|افتني|طلاق|طلقت|ميراث|مواريث|تكفير|اجتهاد|خلاف فقهي|حكم شرعي|(?:ما|ما هو|ماهو)\s+حكم\s|حكم (?:الصلاة|الصيام|الزكاة|الحج|القرض|الربا|البيع|الزواج)|هل (يجوز|يحل|يحرم)|صحة (صلاتي|صومي)/.test(normalized)
    || /صلاتي|صومي|زكاتي|زواجي|وضوئي|زوجي|زوجتي|حرام علي|حلال لي|يجوز لي|يجب علي/.test(normalized)
    // Colloquial requests for permission are personal rulings too.
    || /(?:هل\s+)?(?:عادي|ينفع|يصير|مسموح)\s+(?:اني|انا|لي|ما|ان|ا\S+)/.test(normalized)
    // Declaring someone a disbeliever requires juristic interpretation.
    || /(?:كافر|يكفر|كفارا|كفر|مرتد)/.test(normalized);
}
