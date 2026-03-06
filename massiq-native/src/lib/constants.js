// ── COLORS ──────────────────────────────────────────────────────────────────
export const C = {
  cream: '#F5EFE4',
  warm: '#EDE4D4',
  paper: '#FAF6EE',
  ink: '#1A1410',
  inkLight: '#3D3530',
  terra: '#C4622D',
  sage: '#5C7A5A',
  dust: '#A89880',
  blush: '#E8A598',
  gold: '#C4952D',
  purple: '#7B68C8',
  cardBg: '#F0E8D8',
  border: 'rgba(100,80,60,0.12)',
  red: '#D94040',
  green: '#4CAF50',
};

// ── GOALS ────────────────────────────────────────────────────────────────────
export const GOALS = [
  { id: 'cut', label: 'Cut', emoji: '📉', desc: 'Lose fat, preserve muscle' },
  { id: 'bulk', label: 'Bulk', emoji: '📈', desc: 'Gain mass, minimize fat' },
  { id: 'recomp', label: 'Recomp', emoji: '🔄', desc: 'Lose fat & gain muscle' },
  { id: 'maintain', label: 'Maintain', emoji: '⚖️', desc: 'Stay lean & healthy' },
];

// ── ACTIVITY LEVELS ──────────────────────────────────────────────────────────
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little exercise', multiplier: 1.2 },
  { id: 'light', label: 'Light', desc: '1–3 workouts/week', multiplier: 1.375 },
  { id: 'moderate', label: 'Moderate', desc: '3–5 workouts/week', multiplier: 1.55 },
  { id: 'active', label: 'Active', desc: '6+ workouts/week', multiplier: 1.725 },
];

// ── DIETARY PREFERENCES ──────────────────────────────────────────────────────
export const DIETARY_PREFS = [
  { id: 'none', label: 'No restrictions', emoji: '🍽️' },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥗' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
  { id: 'keto', label: 'Keto', emoji: '🥩' },
  { id: 'paleo', label: 'Paleo', emoji: '🫎' },
  { id: 'gluten_free', label: 'Gluten-Free', emoji: '🚫🌾' },
  { id: 'dairy_free', label: 'Dairy-Free', emoji: '🚫🥛' },
];

export const CUISINE_PREFS = [
  { id: 'american', label: 'American', emoji: '🍔' },
  { id: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
  { id: 'asian', label: 'Asian', emoji: '🍜' },
  { id: 'mexican', label: 'Mexican', emoji: '🌮' },
  { id: 'italian', label: 'Italian', emoji: '🍝' },
  { id: 'middle_eastern', label: 'Middle Eastern', emoji: '🧆' },
  { id: 'japanese', label: 'Japanese', emoji: '🍱' },
  { id: 'indian', label: 'Indian', emoji: '🍛' },
];

export const DISLIKED_FOODS = [
  'Liver & Organ Meat', 'Tofu', 'Tempeh', 'Raw Onion', 'Mushrooms',
  'Shellfish', 'Eggs', 'Brussels Sprouts', 'Beets', 'Anchovies',
  'Cilantro', 'Blue Cheese', 'Olives', 'Lamb', 'Game Meat',
];

export const MEAL_TAGS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'];

// ── CALCULATIONS ─────────────────────────────────────────────────────────────
export function calcTargets(profile) {
  const w = parseFloat(profile.weight) || 180;
  const h = parseFloat(profile.height) || 70;
  const age = parseFloat(profile.age) || 25;
  const mult = ACTIVITY_LEVELS.find(a => a.id === profile.activityLevel)?.multiplier || 1.55;

  // Mifflin-St Jeor
  const bmr = profile.gender === 'female'
    ? 447.593 + (9.247 * w * 0.453592) - (3.098 * h * 2.54) + (4.330 * age)
    : 88.362 + (13.397 * w * 0.453592) + (4.799 * h * 2.54) - (5.677 * age);

  const tdee = Math.round(bmr * mult);
  const cal = profile.goal === 'cut' ? Math.round(tdee - 400)
    : profile.goal === 'bulk' ? Math.round(tdee + 300) : tdee;

  const protein = Math.round(w * (profile.goal === 'cut' ? 1.1 : profile.goal === 'bulk' ? 1.0 : 0.9));
  const fat = Math.round(cal * 0.25 / 9);
  const carbs = Math.round((cal - protein * 4 - fat * 9) / 4);

  return { protein, carbs, fat, calories: cal, tdee };
}

export function calcScore(meals, habits, stats, profile) {
  if (!profile) return 0;
  const t = calcTargets(profile);
  const totP = meals.reduce((s, m) => s + (m.protein || m.p || 0), 0);
  const nutrition = Math.round(Math.min(totP / (t.protein || 1), 1) * 35);
  const habitScore = Math.round(
    habits.reduce((s, h) => s + Math.min(h.value / (h.target || 1), 1), 0) / Math.max(habits.length, 1) * 35
  );
  const bodyScore = Math.round(Math.max(0, (25 - (stats.fatPct || 15)) / 25) * 30);
  return Math.min(nutrition + habitScore + bodyScore, 100);
}

// Week key for meal plan rotation
export function getWeekKey() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
  return `${now.getFullYear()}-W${week}`;
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
