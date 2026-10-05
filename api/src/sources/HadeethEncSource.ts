import { getJson, type Fetcher } from '../http';
import { object, string, type Evidence, type EvidenceSource, type Lang } from '../types';
export class HadeethEncSource implements EvidenceSource {
  constructor(private fetcher: Fetcher = (url, init) => fetch(url, init)) {}
  async search(query: string, lang: Lang): Promise<Evidence[]> {
    const normalized = query.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
    const match = normalized.match(/(?:hadeethenc(?:\.com)?|موسوعة الأحاديث)\s*(?:id|رقم|#|:)?\s*(\d+)\b/i);
    let ids: string[];
    if (match) ids = [match[1]];
    else {
      const hits = await getJson(`https://hadeethenc.com/api/v1/hadeeths/search/?phrase=${encodeURIComponent(query)}&language=${lang}`, this.fetcher);
      if (!Array.isArray(hits)) throw new Error('Invalid hadith search');
      ids = hits.slice(0, 5).map(hit => { const id = String(object(hit).id); if (!/^\d+$/.test(id)) throw new Error('Invalid hadith ID'); return id; });
    }
    return Promise.all(ids.map(async id => {
      const result = object(await getJson(`https://hadeethenc.com/api/v1/hadeeths/one/?language=${lang}&id=${id}`, this.fetcher));
      if (String(result.id) !== id) throw new Error('Mismatched hadith');
      // Copy grading verbatim only when supplied by the source.
      const snippet = [string(result.hadeeth), typeof result.grade === 'string' && result.grade ? `Grade: ${result.grade}` : '', typeof result.attribution === 'string' ? result.attribution : '', typeof result.explanation === 'string' ? result.explanation : ''].filter(Boolean).join('\n\n');
      return { source: 'HadeethEnc', title: string(result.title), url: `https://hadeethenc.com/${lang}/browse/hadith/${id}`, snippet };
    }));
  }
}
