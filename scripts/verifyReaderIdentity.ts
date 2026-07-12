// Okur Kimliği birim doğrulaması — saf fonksiyonu örnek verilerle konsolda sınar.
// Çalıştır: npx tsx scripts/verifyReaderIdentity.ts
import type { Book, ReadingSession } from '../context/BooksContext';
import { computeReaderIdentity } from '../utils/readerIdentity';

const MONTH = 6; // Temmuz
const YEAR = 2026;

const ts = (day: number, hour: number, minute = 0) => new Date(YEAR, MONTH, day, hour, minute).getTime();

let bookSeq = 0;
function book(overrides: Partial<Book>): Book {
  bookSeq++;
  return {
    id: `b${bookSeq}`,
    title: `Kitap ${bookSeq}`,
    author: `Yazar ${bookSeq}`,
    pages: 300,
    rating: 0,
    status: 'finished',
    color: '#000',
    genre: 'Roman',
    createdAt: ts(1, 10),
    finishedAt: ts(10 + bookSeq, 10),
    ...overrides,
  };
}

let sessSeq = 0;
function session(day: number, hour: number, minutes: number): ReadingSession {
  sessSeq++;
  return { id: `s${sessSeq}`, bookId: 'b1', duration: minutes * 60, date: ts(day, hour) };
}

const cases: { name: string; books: Book[]; sessions: ReadingSession[]; expected: string | null }[] = [
  {
    name: 'Boş ay → null (satır gizli)',
    books: [], sessions: [], expected: null,
  },
  {
    name: 'Gece Okuru — sürenin %80\'i 23:00\'te',
    books: [],
    sessions: [session(3, 23, 120), session(4, 14, 30)],
    expected: 'Gece Okuru',
  },
  {
    name: 'Şafak Okuru — sürenin %50\'si 06:00\'da',
    books: [],
    sessions: [session(3, 6, 60), session(4, 12, 60)],
    expected: 'Şafak Okuru',
  },
  {
    name: 'Maratoncu — tek seansta 130 dk',
    books: [],
    sessions: [session(5, 14, 130)],
    expected: 'Maratoncu',
  },
  {
    name: 'İstikrarlı — 7 gün üst üste öğlen okumaları',
    books: [],
    sessions: [1, 2, 3, 4, 5, 6, 7].map((d) => session(d, 12, 20)),
    expected: 'İstikrarlı',
  },
  {
    name: 'Çeşnici — 12 farklı (aralıklı) günde 10\'ar dk',
    books: [],
    sessions: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].map((d) => session(d, 12, 10)),
    expected: 'Çeşnici',
  },
  {
    name: 'Tuğla Deviren — 600 sayfalık bitirme',
    books: [book({ pages: 600 })],
    sessions: [],
    expected: 'Tuğla Deviren',
  },
  {
    name: 'Klasik Avcısı — 2 bitirmenin 1\'i 1866 ilk baskı (%50)',
    books: [book({ firstPublishYear: 1866 }), book({ firstPublishYear: 2005 })],
    sessions: [],
    expected: 'Klasik Avcısı',
  },
  {
    name: 'Klasik atlanır — basım yılı verisi yok, tek tür → Okur',
    books: [book({}), book({})],
    sessions: [],
    expected: 'Okur',
  },
  {
    name: 'Gezgin Okur — 3 farklı türde bitirme',
    books: [book({ genre: 'Roman' }), book({ genre: 'Deneme' }), book({ genre: 'Şiir' })],
    sessions: [],
    expected: 'Gezgin Okur',
  },
  {
    name: 'Sadık Okur — aynı yazardan üst üste 2 bitirme',
    books: [book({ author: 'Oğuz Atay' }), book({ author: 'Oğuz Atay' })],
    sessions: [],
    expected: 'Sadık Okur',
  },
  {
    name: 'Not Düşen — bitirilenlerin hepsinde not var',
    books: [book({ review: 'Çok iyiydi.' }), book({ quote: 'Bir cümle.' })],
    sessions: [],
    expected: 'Not Düşen',
  },
  {
    name: 'Zor Beğenen — 2 bitirme, ortalama 4.5',
    books: [book({ rating: 4 }), book({ rating: 5 })],
    sessions: [],
    expected: 'Zor Beğenen',
  },
  {
    name: 'Cömert Puancı — 3 bitirme, ortalama 9.5',
    books: [book({ rating: 9, genre: 'Roman' }), book({ rating: 9.5, genre: 'Roman' }), book({ rating: 10, genre: 'Deneme' })],
    sessions: [],
    expected: 'Cömert Puancı',
  },
  {
    name: 'Öncelik — gece okuması tuğlayı yener (listede üstte)',
    books: [book({ pages: 700 })],
    sessions: [session(3, 23, 90)],
    expected: 'Gece Okuru',
  },
  {
    name: 'Eşik tutmuyor → Okur',
    books: [book({ rating: 7 })],
    sessions: [session(3, 12, 15)],
    expected: 'Okur',
  },
  {
    name: 'Başka ayın verisi sayılmaz → null',
    books: [book({ finishedAt: new Date(YEAR, MONTH + 1, 5).getTime() })],
    sessions: [{ id: 'sx', bookId: 'b1', duration: 600, date: new Date(YEAR, MONTH - 1, 5).getTime() }],
    expected: null,
  },
];

let failed = 0;
for (const c of cases) {
  const got = computeReaderIdentity(c.books, c.sessions, MONTH, YEAR);
  const ok = got === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${c.name} → ${JSON.stringify(got)}${ok ? '' : ` (beklenen: ${JSON.stringify(c.expected)})`}`);
}

console.log(failed === 0 ? `\nHepsi geçti (${cases.length} senaryo).` : `\n${failed} senaryo BAŞARISIZ.`);
process.exit(failed === 0 ? 0 : 1);
