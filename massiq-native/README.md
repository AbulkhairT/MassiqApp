# MassIQ — Native iOS App

A React Native (Expo) app with real HealthKit integration, AI body analysis, AI meal logging, and AI-generated weekly meal plans.

---

## What's New vs. Web Version

| Feature | Web (Vercel) | Native (Expo) |
|---|---|---|
| Real step count | ❌ Fake/manual | ✅ Live from Apple Health |
| Sleep tracking | ❌ Manual | ✅ Live from Apple Health |
| HRV / Heart Rate | ❌ Manual | ✅ Live from Apple Health |
| Water intake | ❌ Manual | ✅ Syncs from Apple Health |
| Workout detection | ❌ No | ✅ Auto-detected |
| Body weight sync | ❌ Manual | ✅ From Apple Health |
| Body fat sync | ❌ Manual | ✅ From Apple Health if available |
| AI body scan | ✅ Web | ✅ Camera + library |
| AI meal logging | ✅ Web | ✅ Camera + library |
| Weekly meal plan | ❌ No | ✅ AI-generated, updates weekly |
| Recipe with instructions | ❌ No | ✅ Full ingredients + steps |
| Onboarding with food prefs | ✅ Basic | ✅ Full: diet, cuisine, dislikes |
| Offline data | ✅ localStorage | ✅ AsyncStorage |

---

## Setup (5 minutes)

### 1. Install Expo CLI

```bash
npm install -g expo-cli eas-cli
```

### 2. Install dependencies

```bash
cd massiq-native
npm install
```

### 3. Add your API key

```bash
cp .env.example .env
# Edit .env and add your Anthropic API key from console.anthropic.com
```

### 4. Run on your iPhone

```bash
npx expo start
```

Then either:
- **Expo Go app** (fastest): Install "Expo Go" from App Store → Scan QR code
- **Simulator**: Press `i` in terminal to open iOS Simulator

> **Note**: Apple Health integration requires a physical iPhone. The Simulator will show the UI but Health data will be zeros.

---

## Building for App Store

### Setup EAS (Expo Application Services)

```bash
eas login
eas build:configure
```

### Build iOS IPA

```bash
eas build --platform ios --profile preview
```

This creates a `.ipa` you can install via TestFlight or distribute directly.

### Submit to App Store

```bash
eas submit --platform ios
```

---

## Apple Health Permissions

The app requests these permissions automatically on first launch:

**Read:**
- Steps & distance
- Active & resting calories
- Heart rate & resting heart rate  
- Heart Rate Variability (HRV)
- Sleep analysis (Core, Deep, REM)
- Body weight, body fat %, lean mass
- Water intake
- Workouts

**Write:**
- Water intake (when you log it)
- Body weight (future feature)

---

## File Structure

```
massiq-native/
├── app/
│   ├── _layout.jsx          # Root layout + providers
│   ├── index.jsx            # Route guard (onboarding vs app)
│   ├── onboarding.jsx       # 9-step onboarding flow
│   └── (tabs)/
│       ├── _layout.jsx      # Bottom tab bar
│       ├── body.jsx         # Score, stats, body scan, Health data
│       ├── fuel.jsx         # Meal logging with AI
│       ├── rhythm.jsx       # Vitals from Apple Health
│       ├── meals.jsx        # Weekly AI meal plan + recipes
│       └── progress.jsx     # History charts + challenges
├── src/
│   ├── hooks/
│   │   ├── useHealth.js     # Apple Health integration
│   │   └── useApp.js        # Global state context
│   └── lib/
│       ├── constants.js     # Colors, goals, calculations
│       ├── storage.js       # AsyncStorage wrapper
│       └── api.js           # Claude API calls
├── app.json                 # Expo config with Health permissions
└── package.json
```

---

## Key Architecture Decisions

### Real Health Data
`useHealth.js` uses `react-native-health` to read from HealthKit. Data refreshes on app open and every 5 minutes. Users can override any value manually by tapping it in the Rhythm tab.

### AI Meal Plans
Generated weekly via Claude. The prompt includes the user's:
- Goal (cut/bulk/recomp/maintain)
- Exact calorie + macro targets (calculated from real BMR)
- Dietary restrictions
- Preferred cuisines
- Foods to avoid

Plans update automatically each week (detected via `getWeekKey()`).

### Data Persistence
All user data stored in `AsyncStorage` — persists between app launches. No backend required. Profile, stats, meals, history, challenges, and meal plans all persist locally.

---

## Android Support

The app is built for iOS-first. Android:
- Google Fit integration requires additional setup in `useHealth.js`
- All UI and AI features work identically
- Health sync needs `com.google.android.apps.fitness` integration

To add Android Health Connect support, replace the HealthKit calls in `useHealth.js` with `@kingstinct/react-native-healthkit` or Google Health Connect SDK.

---

## Troubleshooting

**"HealthKit is not available"** → You're on Simulator. Use a physical iPhone.

**API key error** → Check `.env` has `EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-...`

**Meal plan not generating** → Check API key has available credits at console.anthropic.com

**Health data showing zeros** → Allow Health permissions in Settings → Health → Data Access → MassIQ
