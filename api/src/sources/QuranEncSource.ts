import { getJson, type Fetcher } from '../http';
import { object, string, type Evidence, type EvidenceSource, type Lang } from '../types';
export class QuranEncSource implements EvidenceSource {
  constructor(private fetcher: Fetcher = fetch) {}
  async search(query: string, lang: Lang): Promise<Evidence[]> {
    // Public API: explicit verse lookup, not full-text search. No invented refs.
    const normalized = query.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
    const match = normalized.match(/(?:qur['’]?an|surah|verse|القرآن|قرآن|سورة|آية)\s*(?:[\s\S]*?)\b(\d{1,3})\s*[:：]\s*(\d{1,3})\b/i);
    if (!match) return [];
    const sura = Number(match[1]), aya = Number(match[2]);
    if (sura < 1 || sura > 114 || aya < 1 || aya > 286) throw new Error('Invalid Quran reference');
    const translations = object(await getJson(`https://quranenc.com/api/v1/translations/list/${lang}?localization=${lang}`, this.fetcher));
    if (!Array.isArray(translations.translations) || !translations.translations.length) throw new Error('No translation available');
    const translation = object(translations.translations[0]), key = string(translation.key), version = string(translation.version);
    const result = object(object(await getJson(`https://quranenc.com/api/v1/translation/aya/${encodeURIComponent(key)}/${sura}/${aya}`, this.fetcher)).result);
    if (Number(result.sura) !== sura || Number(result.aya) !== aya) throw new Error('Mismatched Quran verse');
    const snippet = [string(result.arabic_text), string(result.translation), typeof result.footnotes === 'string' ? result.footnotes : ''].filter(Boolean).join('\n\n');
    return [{ source: 'QuranEnc', title: `${string(translation.title)} — ${sura}:${aya} (v${version})`, url: `https://quranenc.com/${lang}/browse/${encodeURIComponent(key)}/${sura}#${aya}`, snippet }];
  }
}
