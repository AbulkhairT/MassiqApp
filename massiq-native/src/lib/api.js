// Replace with your actual API key - use environment variables in production
// For Expo, use EXPO_PUBLIC_ prefix in .env
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_KEY || '';
const API_URL = 'https://api.anthropic.com/v1/messages';

export async function callClaude(messages, system, maxTokens = 800) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API Error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Empty response');
  return text;
}

export function extractJSON(raw) {
  if (!raw) throw new Error('No response');
  try { const j = JSON.parse(raw.trim()); if (j && typeof j === 'object') return j; } catch {}
  const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenced) { try { const j = JSON.parse(fenced[1].trim()); if (j && typeof j === 'object') return j; } catch {} }
  let depth = 0, start = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (raw[i] === '}') { depth--; if (depth === 0 && start >= 0) { try { return JSON.parse(raw.slice(start, i + 1)); } catch {} start = -1; } }
  }
  // Try array
  depth = 0; start = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '[') { if (depth === 0) start = i; depth++; }
    else if (raw[i] === ']') { depth--; if (depth === 0 && start >= 0) { try { return JSON.parse(raw.slice(start, i + 1)); } catch {} start = -1; } }
  }
  throw new Error('Could not parse response');
}

export async function analyzeFood(text, imageBase64, imageMime) {
  const content = imageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
        { type: 'text', text: `Identify this food and estimate nutrition. Return ONLY JSON:\n{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number}` },
      ]
    : `Nutrition facts for: "${text}"\nReturn ONLY JSON:\n{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number}`;

  const raw = await callClaude(
    [{ role: 'user', content }],
    'You are a nutrition database. Return ONLY a raw JSON object. No markdown, no explanation.',
    200
  );
  return extractJSON(raw);
}

export async function analyzeBodyPhoto(base64, mime, profile) {
  const raw = await callClaude(
    [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
        { type: 'text', text: `Analyze this physique photo. Person: ${profile.age}y ${profile.gender}, ${profile.height}" tall, ~${profile.weight}lbs.
Return ONLY JSON:
{"bodyFatPct":number,"leanMass":number,"muscleMass":number,"overallPhysiqueScore":number,"symmetryScore":number,
"muscleGroups":{"chest":"underdeveloped|average|well-developed","shoulders":"underdeveloped|average|well-developed","back":"underdeveloped|average|well-developed","arms":"underdeveloped|average|well-developed","core":"underdeveloped|average|well-developed","legs":"underdeveloped|average|well-developed"},
"primaryStrengths":["string","string"],"areasToImprove":["string","string","string"],"asymmetries":["string"],
"recommendation":"2-3 sentence specific recommendation","disclaimer":"brief accuracy note"}` }
      ]
    }],
    'You are an expert physique analyst. Return accurate JSON assessments. Be specific and honest.',
    700
  );
  return extractJSON(raw);
}

export async function generateWeeklyMealPlan(profile) {
  const { calcTargets } = await import('./constants.js');
  const targets = calcTargets(profile);
  const dietLabel = profile.dietaryPrefs?.join(', ') || 'no restrictions';
  const cuisines = profile.cuisinePrefs?.join(', ') || 'any cuisine';
  const dislikes = profile.dislikedFoods?.join(', ') || 'none';
  const goalLabel = { cut: 'fat loss', bulk: 'muscle gain', recomp: 'body recomposition', maintain: 'maintenance' }[profile.goal] || profile.goal;

  const raw = await callClaude(
    [{
      role: 'user',
      content: `Generate a 7-day meal plan (breakfast, lunch, dinner) for someone with these specs:
- Goal: ${goalLabel}
- Daily targets: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat
- Dietary: ${dietLabel}
- Preferred cuisines: ${cuisines}
- Dislikes/avoid: ${dislikes}
- Name: ${profile.name}

Return ONLY a JSON array of 7 day objects:
[{
  "day": "Monday",
  "breakfast": {"name":"string","calories":number,"protein":number,"carbs":number,"fat":number,"ingredients":["string"],"instructions":["string"],"prepTime":"string"},
  "lunch": {"name":"string","calories":number,"protein":number,"carbs":number,"fat":number,"ingredients":["string"],"instructions":["string"],"prepTime":"string"},
  "dinner": {"name":"string","calories":number,"protein":number,"carbs":number,"fat":number,"ingredients":["string"],"instructions":["string"],"prepTime":"string"}
}]

Make meals realistic, delicious, and hitting the macro targets across the day. Vary cuisines based on preferences.`
    }],
    `You are an elite sports nutritionist. Create personalized meal plans optimized for the user's goal. Return ONLY valid JSON arrays.`,
    4000
  );
  return extractJSON(raw);
}
