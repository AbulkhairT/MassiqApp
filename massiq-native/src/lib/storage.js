import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PROFILE: 'massiq:profile',
  STATS: 'massiq:stats',
  MEALS: 'massiq:meals',
  HISTORY: 'massiq:history',
  COMPLETED: 'massiq:completed',
  MEAL_PLAN: 'massiq:mealplan',
  ONBOARDED: 'massiq:onboarded',
};

export async function getProfile() {
  const v = await AsyncStorage.getItem(KEYS.PROFILE);
  return v ? JSON.parse(v) : null;
}
export async function saveProfile(data) {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(data));
}

export async function getStats() {
  const v = await AsyncStorage.getItem(KEYS.STATS);
  return v ? JSON.parse(v) : { weight: 180, lbm: 150, fatPct: 15 };
}
export async function saveStats(data) {
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(data));
}

export async function getMeals(dateKey) {
  const v = await AsyncStorage.getItem(`${KEYS.MEALS}:${dateKey}`);
  return v ? JSON.parse(v) : [];
}
export async function saveMeals(dateKey, meals) {
  await AsyncStorage.setItem(`${KEYS.MEALS}:${dateKey}`, JSON.stringify(meals));
}

export async function getHistory() {
  const v = await AsyncStorage.getItem(KEYS.HISTORY);
  return v ? JSON.parse(v) : [];
}
export async function saveHistory(history) {
  await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(history.slice(-60)));
}

export async function getCompleted() {
  const v = await AsyncStorage.getItem(KEYS.COMPLETED);
  return v ? JSON.parse(v) : [];
}
export async function saveCompleted(ids) {
  await AsyncStorage.setItem(KEYS.COMPLETED, JSON.stringify(ids));
}

export async function getMealPlan() {
  const v = await AsyncStorage.getItem(KEYS.MEAL_PLAN);
  return v ? JSON.parse(v) : null;
}
export async function saveMealPlan(plan) {
  await AsyncStorage.setItem(KEYS.MEAL_PLAN, JSON.stringify(plan));
}

export async function isOnboarded() {
  const v = await AsyncStorage.getItem(KEYS.ONBOARDED);
  return v === 'true';
}
export async function setOnboarded() {
  await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
}

export async function clearAll() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
