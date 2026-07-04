// "Roman" / "roman" / " roman " aynı tür sayılsın — öneriler ve tür analitiği
// aynı türü ayrı saymasın diye kaydederken normalize edilir.
export function normalizeGenre(raw: string): string {
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return s[0].toLocaleUpperCase('tr-TR') + s.slice(1).toLocaleLowerCase('tr-TR');
}
