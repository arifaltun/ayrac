import { createContext, useContext, useState, useEffect } from 'react';
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
  createdAt: number;
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
});

export function BooksProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);

  useEffect(() => {
    AsyncStorage.multiGet([BOOKS_KEY, SESSIONS_KEY]).then(([booksEntry, sessionsEntry]) => {
      if (booksEntry[1]) setBooks(JSON.parse(booksEntry[1]));
      if (sessionsEntry[1]) setSessions(JSON.parse(sessionsEntry[1]));
    });
  }, []);

  const persistBooks = (next: Book[]) => {
    setBooks(next);
    AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(next));
  };

  const persistSessions = (next: ReadingSession[]) => {
    setSessions(next);
    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  };

  const addBook = (data: Omit<Book, 'id' | 'createdAt'>) => {
    const book: Book = { ...data, id: Date.now().toString(), createdAt: Date.now() };
    persistBooks([book, ...books]);
  };

  const updateBook = (updated: Book) => {
    persistBooks(books.map((b) => (b.id === updated.id ? updated : b)));
  };

  const deleteBook = (id: string) => {
    persistBooks(books.filter((b) => b.id !== id));
  };

  const addSession = (data: Omit<ReadingSession, 'id'>) => {
    const session: ReadingSession = { ...data, id: Date.now().toString() };
    persistSessions([...sessions, session]);
  };

  return (
    <BooksContext.Provider value={{ books, sessions, addBook, updateBook, deleteBook, addSession }}>
      {children}
    </BooksContext.Provider>
  );
}

export const useBooks = () => useContext(BooksContext);
