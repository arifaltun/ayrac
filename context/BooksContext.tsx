import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeAuthorName } from '@/utils/authorName';

export type Book = {
  id: string;
  title: string;
  author: string;
  pages: number;
  rating: number;
  status: 'reading' | 'finished' | 'want';
  color: string;
  genre: string;
  coverImage?: string;
  readingTime?: number;
  review?: string;
  quote?: string;
  createdAt: number;
  finishedAt?: number;
};

export type ReadingSession = {
  id: string;
  bookId: string;
  duration: number;
  date: number;
};

type BooksContextValue = {
  books: Book[];
  sessions: ReadingSession[];
  addBook: (data: Omit<Book, 'id' | 'createdAt'>) => void;
  updateBook: (book: Book) => void;
  deleteBook: (id: string) => void;
  addSession: (data: Omit<ReadingSession, 'id'>) => void;
  resetAll: () => Promise<void>;
};

const BOOKS_KEY = '@ayrac_books';
const SESSIONS_KEY = '@ayrac_sessions';
// Puan ölçeği v2: 0–10 arası, 0.5 adımlı (eski 5 yıldız ×2 ile taşınır)
const RATING_V2_KEY = '@ayrac_rating_v2';
// Yazar adı temizliği: "Tolstoy, Leo, graf, 1828-1910" → "Leo Tolstoy" (tek seferlik)
const AUTHOR_NORM_KEY = '@ayrac_author_norm_v1';

const BooksContext = createContext<BooksContextValue>({
  books: [],
  sessions: [],
  addBook: () => {},
  updateBook: () => {},
  deleteBook: () => {},
  addSession: () => {},
  resetAll: async () => {},
});

export function BooksProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([BOOKS_KEY, SESSIONS_KEY, RATING_V2_KEY, AUTHOR_NORM_KEY])
      .then(([booksEntry, sessionsEntry, ratingV2Entry, authorNormEntry]) => {
        try {
          if (booksEntry[1]) {
            let parsed: Book[] = JSON.parse(booksEntry[1]);
            // Güvenli migration: eski 0–5 yıldız → 0–10 (4★ → 8.0), tek seferlik
            if (ratingV2Entry[1] !== 'true') {
              parsed = parsed.map((b) => ({
                ...b,
                rating: Math.min(10, Math.max(0, Math.round((b.rating ?? 0) * 2 * 2) / 2)),
              }));
            }
            // Eski kayıtlardaki ham katalog yazar adlarını temizle, tek seferlik
            if (authorNormEntry[1] !== 'true') {
              parsed = parsed.map((b) => ({ ...b, author: normalizeAuthorName(b.author) }));
            }
            setBooks(parsed);
          }
          if (ratingV2Entry[1] !== 'true') {
            AsyncStorage.setItem(RATING_V2_KEY, 'true').catch(() => {});
          }
          if (authorNormEntry[1] !== 'true') {
            AsyncStorage.setItem(AUTHOR_NORM_KEY, 'true').catch(() => {});
          }
        } catch {}
        try {
          if (sessionsEntry[1]) setSessions(JSON.parse(sessionsEntry[1]));
        } catch {}
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books)).catch(() => {});
  }, [books, loaded]);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)).catch(() => {});
  }, [sessions, loaded]);

  const addBook = useCallback((data: Omit<Book, 'id' | 'createdAt'>) => {
    const now = Date.now();
    const book: Book = {
      ...data,
      id: now.toString(),
      createdAt: now,
      finishedAt: data.status === 'finished' ? now : undefined,
    };
    setBooks((prev) => [book, ...prev]);
  }, []);

  const updateBook = useCallback((updated: Book) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== updated.id) return b;
        // finishedAt: bitti'ye geçişte damgala, bitti'den çıkışta temizle
        const finishedAt =
          updated.status === 'finished'
            ? b.status === 'finished'
              ? (b.finishedAt ?? b.createdAt)
              : Date.now()
            : undefined;
        return { ...updated, finishedAt };
      }),
    );
  }, []);

  const deleteBook = useCallback((id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addSession = useCallback((data: Omit<ReadingSession, 'id'>) => {
    const session: ReadingSession = { ...data, id: Date.now().toString() };
    setSessions((prev) => [...prev, session]);
  }, []);

  const resetAll = useCallback(async () => {
    await AsyncStorage.multiRemove([BOOKS_KEY, SESSIONS_KEY]);
    setBooks([]);
    setSessions([]);
  }, []);

  const value = useMemo(
    () => ({ books, sessions, addBook, updateBook, deleteBook, addSession, resetAll }),
    [books, sessions, addBook, updateBook, deleteBook, addSession, resetAll],
  );

  return <BooksContext.Provider value={value}>{children}</BooksContext.Provider>;
}

export const useBooks = () => useContext(BooksContext);
