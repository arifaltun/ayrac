import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    AsyncStorage.multiGet([BOOKS_KEY, SESSIONS_KEY])
      .then(([booksEntry, sessionsEntry]) => {
        try {
          if (booksEntry[1]) setBooks(JSON.parse(booksEntry[1]));
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
