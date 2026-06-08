import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ayracTokens, ThemeTokens } from '@/constants/tokens';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  t: ThemeTokens;
  toggle: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  t: ayracTokens.dark,
  toggle: () => {},
  isDark: true,
});

const STORAGE_KEY = '@ayrac_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setMode(saved);
    });
  }, []);

  const toggle = () => {
    setMode((m) => {
      const next = m === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider
      value={{ mode, t: ayracTokens[mode], toggle, isDark: mode === 'dark' }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
