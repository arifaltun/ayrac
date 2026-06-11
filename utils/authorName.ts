// Open Library katalog formatını okunur hâle getirir:
// "Tolstoy, Leo, graf, 1828-1910" → "Leo Tolstoy"
// "Atay, Oğuz" → "Oğuz Atay"
// "Saint-Exupéry, Antoine de, 1900-1944" → "Antoine de Saint-Exupéry"
// Virgülsüz adlar olduğu gibi döner.

const HONORIFICS = new Set([
  'graf', 'gräfin', 'sir', 'dame', 'lord', 'lady', 'baron', 'baroness',
  'count', 'countess', 'comte', 'comtesse', 'freiherr', 'ritter',
  'jr', 'sr', 'dr', 'prof', 'mr', 'mrs', 'ms', 'saint', 'st',
  'bey', 'paşa', 'pasha', 'efendi', 'hoca',
]);

function isDatePart(part: string): boolean {
  // "1828-1910", "1828-", "d. 1950", "ö. 1910", "b. 1828", "1828?"
  return (
    /^\d{3,4}\??\s*[-–]?\s*(\d{3,4}\??)?\.?$/.test(part) ||
    /^(b\.|d\.|doğ\.|ö\.|ca\.|approximately)\s*\d{3,4}/i.test(part)
  );
}

function isHonorific(part: string): boolean {
  return HONORIFICS.has(part.toLowerCase().replace(/\.+$/, ''));
}

export function normalizeAuthorName(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (!trimmed.includes(',')) return trimmed.replace(/\s+/g, ' ');

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !isDatePart(p))
    .filter((p) => !isHonorific(p));

  if (parts.length === 0) return trimmed;
  if (parts.length === 1) return parts[0].replace(/\s+/g, ' ');

  // "Soyad, Ad" → "Ad Soyad" (kalan ek parçalar atılır)
  const [last, first] = parts;
  return `${first} ${last}`.replace(/\s+/g, ' ').trim();
}
