export function sourceLabel(source: string): string {
  return ({ QuranEnc: 'موسوعة القرآن الكريم', HadeethEnc: 'موسوعة الأحاديث النبوية', IslamHouse: 'دار الإسلام' } as Record<string, string>)[source] ?? source;
}
