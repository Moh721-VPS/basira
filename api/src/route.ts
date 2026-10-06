// Conservative referral rules: this is routing, never a religious ruling.
export function route(claim: string): boolean {
  const normalized = claim.toLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا');
  return /\b(fatwa|fatwas|fatawa|madhhab|juristic|ijtihad|divorce|inheritance|apostasy|takfir)\b/.test(normalized)
    || /فتوى|فتاوى|افتني|طلاق|طلقت|ميراث|مواريث|تكفير|اجتهاد|خلاف فقهي|حكم شرعي|(?:ما|ما هو|ماهو)\s+حكم\s|حكم (?:الصلاة|الصيام|الزكاة|الحج|القرض|الربا|البيع|الزواج)|هل (يجوز|يحل|يحرم)|صحة (صلاتي|صومي)/.test(normalized)
    || /\b(is it|am i|can i|may i|should i|must i|do i|is my)\b/.test(normalized)
    || /\b(my|our|i|we)\b[\s\S]*\b(halal|haram|permissible|forbidden|sin|ruling|prayer|fast|zakat|marriage|wudu|interest|valid|invalid)\b/.test(normalized)
    || /\b(halal|haram|permissible|forbidden|ruling)\b[\s\S]*\b(me|my|us|our)\b/.test(normalized)
    || /صلاتي|صومي|زكاتي|زواجي|وضوئي|زوجي|زوجتي|حرام علي|حلال لي|يجوز لي|يجب علي/.test(normalized)
    // Colloquial requests for permission are personal rulings too.
    || /(?:هل\s+)?(?:عادي|ينفع|يصير|مسموح)\s+(?:اني|انا|لي|ما|ان|ا\S+)/.test(normalized)
    // Declaring someone a disbeliever requires juristic interpretation.
    || /(?:كافر|يكفر|كفارا|كفر|مرتد)/.test(normalized)
    || /\b(kafir|kaafir|kuffar|disbeliever|disbelief|unbeliever)\b/.test(normalized);
}
