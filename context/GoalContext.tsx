import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type GoalContextValue = {
  yearlyGoal: number | null;
  monthlyGoal: number | null;
  setYearlyGoal: (n: number | null) => void;
  setMonthlyGoal: (n: number | null) => void;
};

const GOAL_KEY = '@ayrac_goals';

const GoalContext = createContext<GoalContextValue>({
  yearlyGoal: null,
  monthlyGoal: null,
  setYearlyGoal: () => {},
  setMonthlyGoal: () => {},
});

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [yearlyGoal, setYearlyGoal] = useState<number | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(GOAL_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.yearly != null) setYearlyGoal(parsed.yearly);
          if (parsed.monthly != null) setMonthlyGoal(parsed.monthly);
        } catch {}
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(GOAL_KEY, JSON.stringify({ yearly: yearlyGoal, monthly: monthlyGoal })).catch(() => {});
    }
  }, [yearlyGoal, monthlyGoal, loaded]);

  const value = useMemo(
    () => ({ yearlyGoal, monthlyGoal, setYearlyGoal, setMonthlyGoal }),
    [yearlyGoal, monthlyGoal],
  );

  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
}

export const useGoal = () => useContext(GoalContext);
