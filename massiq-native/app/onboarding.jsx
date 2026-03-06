import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions,
  SafeAreaView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/hooks/useApp.js';
import { C, GOALS, ACTIVITY_LEVELS, DIETARY_PREFS, CUISINE_PREFS, DISLIKED_FOODS } from '../src/lib/constants.js';
import * as Storage from '../src/lib/storage.js';

const { width } = Dimensions.get('window');

const STEPS = [
  'welcome',
  'basics',
  'body',
  'goal',
  'activity',
  'dietary',
  'cuisine',
  'dislikes',
  'complete',
];

export default function Onboarding() {
  const router = useRouter();
  const { saveProfile } = useApp();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    goal: 'recomp',
    activityLevel: 'moderate',
    dietaryPrefs: [],
    cuisinePrefs: [],
    dislikedFoods: [],
  });
  const slideAnim = useRef(new Animated.Value(0)).current;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleArray = (key, val) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val)
        ? f[key].filter(x => x !== val)
        : [...f[key], val],
    }));
  };

  const canProceed = () => {
    switch (STEPS[step]) {
      case 'welcome': return form.name.trim().length > 0;
      case 'basics': return form.age && form.gender;
      case 'body': return form.weight && form.height;
      default: return true;
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    }
  };

  const finish = async () => {
    const profile = {
      ...form,
      age: +form.age,
      weight: +form.weight,
      height: +form.height,
    };
    await saveProfile(profile);
    await Storage.setOnboarded();
    router.replace('/(tabs)/body');
  };

  const progress = step / (STEPS.length - 1);

  return (
    <SafeAreaView style={styles.root}>
      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {STEPS[step] === 'welcome' && (
            <Step title="Welcome to MassIQ" sub="Your AI body composition coach">
              <View style={styles.hero}>
                <Text style={styles.heroEmoji}>💪</Text>
                <Text style={styles.heroDesc}>Track body composition, macros, and habits. Built for people serious about results.</Text>
              </View>
              <Label>Your name</Label>
              <Input value={form.name} onChangeText={v => set('name', v)} placeholder="First name" autoFocus />
            </Step>
          )}

          {STEPS[step] === 'basics' && (
            <Step title="About You" sub="Used to calculate your calorie targets">
              <Label>Age</Label>
              <Input value={form.age} onChangeText={v => set('age', v)} placeholder="e.g. 27" keyboardType="number-pad" style={{ marginBottom: 20 }} />
              <Label>Gender</Label>
              <View style={styles.row}>
                {['male', 'female'].map(g => (
                  <Chip key={g} label={g === 'male' ? '♂ Male' : '♀ Female'} selected={form.gender === g} onPress={() => set('gender', g)} flex />
                ))}
              </View>
            </Step>
          )}

          {STEPS[step] === 'body' && (
            <Step title="Body Stats" sub="Calculates your baseline accurately">
              <Label>Current weight (lbs)</Label>
              <Input value={form.weight} onChangeText={v => set('weight', v)} placeholder='e.g. 180' keyboardType="decimal-pad" style={{ marginBottom: 20 }} />
              <Label>Height (inches)</Label>
              <Input value={form.height} onChangeText={v => set('height', v)} placeholder='e.g. 70 for 5\'10"' keyboardType="number-pad" />
              <Text style={styles.hint}>We use these to calculate your exact TDEE and macro targets using the Mifflin-St Jeor formula.</Text>
            </Step>
          )}

          {STEPS[step] === 'goal' && (
            <Step title="Your Goal" sub="Your challenges and meal plans adapt to this">
              <View style={styles.goalGrid}>
                {GOALS.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.goalCard, form.goal === g.id && styles.goalCardActive]}
                    onPress={() => set('goal', g.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.goalEmoji}>{g.emoji}</Text>
                    <Text style={[styles.goalLabel, form.goal === g.id && { color: C.terra }]}>{g.label}</Text>
                    <Text style={styles.goalDesc}>{g.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Step>
          )}

          {STEPS[step] === 'activity' && (
            <Step title="Activity Level" sub="Fine-tunes your calorie calculation">
              {ACTIVITY_LEVELS.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.optRow, form.activityLevel === a.id && styles.optRowActive]}
                  onPress={() => set('activityLevel', a.id)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optLabel, form.activityLevel === a.id && { color: C.terra }]}>{a.label}</Text>
                    <Text style={styles.optDesc}>{a.desc}</Text>
                  </View>
                  {form.activityLevel === a.id && <Text style={{ color: C.terra, fontSize: 20 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </Step>
          )}

          {STEPS[step] === 'dietary' && (
            <Step title="Dietary Preferences" sub="Your meal plans will follow these — skip to use any food">
              <View style={styles.chipGrid}>
                {DIETARY_PREFS.map(p => (
                  <Chip
                    key={p.id}
                    label={`${p.emoji} ${p.label}`}
                    selected={form.dietaryPrefs.includes(p.id)}
                    onPress={() => toggleArray('dietaryPrefs', p.id)}
                  />
                ))}
              </View>
              <Text style={styles.hint}>Select all that apply. This customizes every recipe generated for you.</Text>
            </Step>
          )}

          {STEPS[step] === 'cuisine' && (
            <Step title="Favorite Cuisines" sub="We'll lean into these when planning your meals">
              <View style={styles.chipGrid}>
                {CUISINE_PREFS.map(p => (
                  <Chip
                    key={p.id}
                    label={`${p.emoji} ${p.label}`}
                    selected={form.cuisinePrefs.includes(p.id)}
                    onPress={() => toggleArray('cuisinePrefs', p.id)}
                  />
                ))}
              </View>
            </Step>
          )}

          {STEPS[step] === 'dislikes' && (
            <Step title="Foods to Avoid" sub="We'll make sure these never show up in your meal plan">
              <View style={styles.chipGrid}>
                {DISLIKED_FOODS.map(f => (
                  <Chip
                    key={f}
                    label={f}
                    selected={form.dislikedFoods.includes(f)}
                    onPress={() => toggleArray('dislikedFoods', f)}
                    danger
                  />
                ))}
              </View>
            </Step>
          )}

          {STEPS[step] === 'complete' && (
            <Step title={`Ready, ${form.name}!`} sub="Your personalized plan is set">
              <View style={styles.completeBox}>
                <Text style={styles.completeEmoji}>🚀</Text>
                <View style={styles.summaryRow}>
                  <SumItem label="Goal" value={GOALS.find(g => g.id === form.goal)?.label} />
                  <SumItem label="Activity" value={ACTIVITY_LEVELS.find(a => a.id === form.activityLevel)?.label} />
                </View>
                {form.dietaryPrefs.length > 0 && (
                  <Text style={styles.summaryNote}>Diet: {form.dietaryPrefs.join(', ')}</Text>
                )}
                {form.cuisinePrefs.length > 0 && (
                  <Text style={styles.summaryNote}>Cuisines: {form.cuisinePrefs.join(', ')}</Text>
                )}
                <Text style={styles.summaryNote2}>We'll generate your first weekly meal plan right away.</Text>
              </View>
            </Step>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !canProceed() && styles.primaryBtnDisabled]}
          onPress={STEPS[step] === 'complete' ? finish : next}
          disabled={!canProceed()}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>
            {STEPS[step] === 'complete' ? "Let's Go 🚀" : 'Continue →'}
          </Text>
        </TouchableOpacity>
        {step > 0 && STEPS[step] !== 'complete' && (
          <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function Step({ title, sub, children }) {
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSub}>{sub}</Text>
      <View style={{ marginTop: 28 }}>{children}</View>
    </View>
  );
}

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Input({ style, ...props }) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={C.dust}
      returnKeyType="done"
      {...props}
    />
  );
}

function Chip({ label, selected, onPress, flex, danger }) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        flex && { flex: 1 },
        selected && (danger ? styles.chipDangerActive : styles.chipActive),
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && (danger ? { color: C.red } : { color: C.terra })]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SumItem({ label, value }) {
  return (
    <View style={styles.sumItem}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  scroll: { flexGrow: 1, paddingBottom: 120 },
  progressBg: { height: 3, backgroundColor: C.border },
  progressFill: { height: '100%', backgroundColor: C.terra, borderRadius: 99, transition: 'width 0.3s' },
  stepTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 26, fontWeight: '700', color: C.ink, marginBottom: 6 },
  stepSub: { fontSize: 13, color: C.dust },
  hero: { alignItems: 'center', marginBottom: 28 },
  heroEmoji: { fontSize: 64, marginBottom: 12 },
  heroDesc: { fontSize: 14, color: C.dust, textAlign: 'center', lineHeight: 22 },
  label: { fontSize: 10, color: C.dust, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: C.warm, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 15, color: C.ink, marginBottom: 4 },
  hint: { fontSize: 11, color: C.dust, marginTop: 12, lineHeight: 17 },
  row: { flexDirection: 'row', gap: 10 },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  goalCard: { width: (width - 60) / 2, backgroundColor: C.warm, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: C.border },
  goalCardActive: { borderColor: C.terra, backgroundColor: `${C.terra}12` },
  goalEmoji: { fontSize: 28, marginBottom: 8 },
  goalLabel: { fontSize: 15, fontWeight: '600', color: C.ink, marginBottom: 4 },
  goalDesc: { fontSize: 11, color: C.dust, lineHeight: 16 },
  optRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.warm, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: C.border },
  optRowActive: { borderColor: C.terra, backgroundColor: `${C.terra}10` },
  optLabel: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 3 },
  optDesc: { fontSize: 12, color: C.dust },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.warm },
  chipActive: { borderColor: C.terra, backgroundColor: `${C.terra}12` },
  chipDangerActive: { borderColor: C.red, backgroundColor: `${C.red}10` },
  chipText: { fontSize: 12, color: C.dust },
  completeBox: { backgroundColor: C.warm, borderRadius: 20, padding: 24, alignItems: 'center' },
  completeEmoji: { fontSize: 56, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  sumItem: { alignItems: 'center' },
  sumLabel: { fontSize: 10, color: C.dust, letterSpacing: 1, marginBottom: 4 },
  sumValue: { fontSize: 16, fontWeight: '700', color: C.terra },
  summaryNote: { fontSize: 12, color: C.inkLight, marginBottom: 6, textTransform: 'capitalize' },
  summaryNote2: { fontSize: 12, color: C.dust, marginTop: 8, textAlign: 'center', lineHeight: 18 },
  footer: { padding: 20, paddingBottom: 36, backgroundColor: C.paper, borderTopWidth: 1, borderTopColor: C.border },
  primaryBtn: { backgroundColor: C.ink, borderRadius: 99, padding: 16, alignItems: 'center' },
  primaryBtnDisabled: { backgroundColor: '#ccc' },
  primaryBtnText: { color: C.cream, fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  backBtn: { alignItems: 'center', marginTop: 14 },
  backBtnText: { fontSize: 13, color: C.dust },
});
