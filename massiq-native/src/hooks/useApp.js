import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Storage from '../lib/storage.js';
import { calcScore, formatDate } from '../lib/constants.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState(null);
  const [stats, setStatsState] = useState({ weight: 180, lbm: 150, fatPct: 15 });
  const [meals, setMealsState] = useState([]);
  const [history, setHistoryState] = useState([]);
  const [completedIds, setCompletedIdsState] = useState([]);
  const [mealPlan, setMealPlanState] = useState(null);
  const [todayKey] = useState(formatDate());

  // Load all data on mount
  useEffect(() => {
    (async () => {
      const [p, s, m, h, c, mp] = await Promise.all([
        Storage.getProfile(),
        Storage.getStats(),
        Storage.getMeals(formatDate()),
        Storage.getHistory(),
        Storage.getCompleted(),
        Storage.getMealPlan(),
      ]);
      if (p) setProfileState(p);
      if (s) setStatsState(s);
      if (m) setMealsState(m);
      if (h) setHistoryState(h);
      if (c) setCompletedIdsState(c);
      if (mp) setMealPlanState(mp);
      setReady(true);
    })();
  }, []);

  const saveProfile = useCallback(async (p) => {
    setProfileState(p);
    await Storage.saveProfile(p);
  }, []);

  const addMeal = useCallback(async (meal) => {
    const updated = [...meals, { ...meal, id: Date.now() }];
    setMealsState(updated);
    await Storage.saveMeals(todayKey, updated);
  }, [meals, todayKey]);

  const deleteMeal = useCallback(async (id) => {
    const updated = meals.filter(m => m.id !== id);
    setMealsState(updated);
    await Storage.saveMeals(todayKey, updated);
  }, [meals, todayKey]);

  const saveStats = useCallback(async (s) => {
    setStatsState(s);
    await Storage.saveStats(s);
    const today = formatDate();
    const updated = [...history.filter(e => e.date !== today), { date: today, ...s }].slice(-60);
    setHistoryState(updated);
    await Storage.saveHistory(updated);
  }, [history]);

  const addCompleted = useCallback(async (id) => {
    if (completedIds.includes(id)) return;
    const updated = [...completedIds, id];
    setCompletedIdsState(updated);
    await Storage.saveCompleted(updated);
  }, [completedIds]);

  const saveMealPlan = useCallback(async (plan) => {
    setMealPlanState(plan);
    await Storage.saveMealPlan(plan);
  }, []);

  const score = profile ? calcScore(meals, [], stats, profile) : 0;

  return (
    <AppContext.Provider value={{
      ready, profile, stats, meals, history, completedIds, mealPlan, score,
      saveProfile, addMeal, deleteMeal, saveStats, addCompleted, saveMealPlan,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
