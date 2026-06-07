import { createContext, useContext, useState } from 'react';
import { ayracTokens, ThemeTokens } from '@/constants/tokens';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  t: ThemeTokens;
  toggle: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  t: ayracTokens.light,
  toggle: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const toggle = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider
      value={{ mode, t: ayracTokens[mode], toggle, isDark: mode === 'dark' }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
