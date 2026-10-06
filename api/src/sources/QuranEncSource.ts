import { getJson, type Fetcher } from '../http';
import { object, string, type Evidence, type EvidenceSource, type Lang } from '../types';
export function quranReference(query: string): RegExpMatchArray | null {
  const normalized = query.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  return normalized.match(/(?:القرآن|قرآن|سورة|آية)\s*(?:[\s\S]*?)\b(\d{1,3})\s*[:：]\s*(\d{1,3})\b/i);
}
export class QuranEncSource implements EvidenceSource {
  constructor(private fetcher: Fetcher = (url, init) => fetch(url, init)) {}
  async search(query: string, lang: Lang): Promise<Evidence[]> {
    // Public API: explicit verse lookup, not full-text search. No invented refs.
    const match = quranReference(query);
    if (!match) return [];
    const sura = Number(match[1]), aya = Number(match[2]);
    if (sura < 1 || sura > 114 || aya < 1 || aya > 286) throw new Error('Invalid Quran reference');
    // The API catalogue lists translations, not the Arabic original. Every
    // verse response includes arabic_text; use an explicitly labelled English
    // translation edition for Arabic requests rather than an empty /list/ar.
    const translationLang = 'en';
    const translations = object(await getJson(`https://quranenc.com/api/v1/translations/list/${translationLang}?localization=${lang}`, this.fetcher));
    if (!Array.isArray(translations.translations) || !translations.translations.length) throw new Error('No translation available');
    const translation = object(translations.translations[0]), key = string(translation.key), version = string(translation.version);
    const result = object(object(await getJson(`https://quranenc.com/api/v1/translation/aya/${encodeURIComponent(key)}/${sura}/${aya}`, this.fetcher)).result);
    if (Number(result.sura) !== sura || Number(result.aya) !== aya) throw new Error('Mismatched Quran verse');
    // Catalogue selection is internal; expose only the original Arabic verse.
    const snippet = string(result.arabic_text);
    return [{ source: 'QuranEnc', title: `القرآن الكريم — ${sura}:${aya} (الإصدار ${version})`, url: `https://quranenc.com/ar/browse/${encodeURIComponent(key)}/${sura}#${aya}`, snippet }];
  }
}
