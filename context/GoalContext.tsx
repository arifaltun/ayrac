import { createContext, useContext, useState, useEffect } from 'react';
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
  const [yearlyGoal, setYearlyGoalState] = useState<number | null>(null);
  const [monthlyGoal, setMonthlyGoalState] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(GOAL_KEY).then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.yearly != null) setYearlyGoalState(parsed.yearly);
        if (parsed.monthly != null) setMonthlyGoalState(parsed.monthly);
      }
    });
  }, []);

  const persist = (yearly: number | null, monthly: number | null) => {
    AsyncStorage.setItem(GOAL_KEY, JSON.stringify({ yearly, monthly }));
  };

  const setYearlyGoal = (n: number | null) => {
    setYearlyGoalState(n);
    persist(n, monthlyGoal);
  };

  const setMonthlyGoal = (n: number | null) => {
    setMonthlyGoalState(n);
    persist(yearlyGoal, n);
  };

  return (
    <GoalContext.Provider value={{ yearlyGoal, monthlyGoal, setYearlyGoal, setMonthlyGoal }}>
      {children}
    </GoalContext.Provider>
  );
}

export const useGoal = () => useContext(GoalContext);
