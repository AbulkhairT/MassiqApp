import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Modal, ActivityIndicator, Platform, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../src/hooks/useApp.js';
import { C, GOALS, calcTargets, getWeekKey } from '../../src/lib/constants.js';
import { generateWeeklyMealPlan } from '../../src/lib/api.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

export default function MealsScreen() {
  const { profile, mealPlan, saveMealPlan, addMeal } = useApp();
  const [generating, setGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeModal, setRecipeModal] = useState(false);
  const targets = profile ? calcTargets(profile) : { calories: 2200, protein: 160 };

  const currentDay = new Date().getDay(); // 0=Sun, 1=Mon, etc.
  const todayIndex = currentDay === 0 ? 6 : currentDay - 1; // Convert to Mon=0

  useEffect(() => {
    setSelectedDay(todayIndex);
  }, []);

  useEffect(() => {
    // Auto-generate if no plan or plan is from a different week
    if (!mealPlan || mealPlan.weekKey !== getWeekKey()) {
      if (profile) handleGenerate(true);
    }
  }, [profile]);

  const handleGenerate = async (silent = false) => {
    if (!profile) return;
    if (!silent) {
      const confirmed = await new Promise(resolve =>
        Alert.alert('Generate New Meal Plan', 'This will create a fresh 7-day meal plan based on your goal and food preferences.', [
          { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
          { text: 'Generate', onPress: () => resolve(true) },
        ])
      );
      if (!confirmed) return;
    }

    setGenerating(true);
    try {
      const plan = await generateWeeklyMealPlan(profile);
      await saveMealPlan({ weekKey: getWeekKey(), days: plan, generatedAt: new Date().toISOString() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Generation failed', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const logMealFromPlan = async (meal) => {
    await addMeal({
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      tag: 'Breakfast', // Will be set by meal type context
      time: new Date().toTimeString().slice(0, 5),
    });
    Alert.alert('Logged!', `${meal.name} added to today's log.`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const goalInfo = GOALS.find(g => g.id === profile?.goal) || GOALS[2];
  const todayPlan = mealPlan?.days?.[selectedDay];

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Weekly Meals</Text>
          <Text style={styles.sub}>{goalInfo.emoji} {goalInfo.label} · {targets.calories} kcal/day</Text>
        </View>
        <TouchableOpacity style={styles.genBtn} onPress={() => handleGenerate(false)} disabled={generating} activeOpacity={0.8}>
          {generating
            ? <ActivityIndicator color={C.terra} size="small" />
            : <Text style={styles.genBtnText}>↺ Refresh</Text>
          }
        </TouchableOpacity>
      </View>

      {generating && (
        <View style={styles.generatingBanner}>
          <ActivityIndicator color={C.terra} size="small" style={{ marginRight: 10 }} />
          <Text style={styles.generatingText}>Generating your personalized meal plan…</Text>
        </View>
      )}

      {!generating && !mealPlan && (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>👨‍🍳</Text>
          <Text style={styles.emptyTitle}>No meal plan yet</Text>
          <Text style={styles.emptySub}>Generate your personalized 7-day meal plan based on your goal, dietary preferences, and favorite cuisines.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => handleGenerate(false)} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Generate Meal Plan →</Text>
          </TouchableOpacity>
        </View>
      )}

      {!generating && mealPlan && (
        <>
          {/* Day selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
            <View style={styles.dayRow}>
              {DAYS.map((day, i) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayPill, selectedDay === i && styles.dayPillActive, i === todayIndex && styles.dayPillToday]}
                  onPress={() => setSelectedDay(i)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayAbbr, selectedDay === i && { color: C.cream }]}>
                    {day.slice(0, 3)}
                  </Text>
                  {i === todayIndex && <View style={styles.todayDot} />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Day's meals */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
            {/* Day summary */}
            {todayPlan && (
              <View style={styles.daySummary}>
                <Text style={styles.dayFull}>{DAYS[selectedDay]}</Text>
                {mealPlan.days?.[selectedDay] && (() => {
                  const day = mealPlan.days[selectedDay];
                  const totalCal = (day.breakfast?.calories || 0) + (day.lunch?.calories || 0) + (day.dinner?.calories || 0);
                  const totalP = (day.breakfast?.protein || 0) + (day.lunch?.protein || 0) + (day.dinner?.protein || 0);
                  return (
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <MiniStat label="Calories" val={totalCal} color={C.terra} />
                      <MiniStat label="Protein" val={`${totalP}g`} color={C.sage} />
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Meals */}
            {todayPlan && MEAL_TYPES.map(type => {
              const meal = todayPlan[type];
              if (!meal) return null;
              return (
                <MealCard
                  key={type}
                  meal={meal}
                  type={type}
                  onView={() => { setSelectedRecipe({ ...meal, type }); setRecipeModal(true); }}
                  onLog={() => logMealFromPlan(meal)}
                />
              );
            })}

            {/* Plan metadata */}
            {mealPlan.generatedAt && (
              <Text style={styles.generatedNote}>
                Generated {new Date(mealPlan.generatedAt).toLocaleDateString()} · Updates weekly · Based on your {profile?.goal} goal
              </Text>
            )}

            {/* Food preferences summary */}
            {(profile?.dietaryPrefs?.length > 0 || profile?.cuisinePrefs?.length > 0) && (
              <View style={styles.prefsBox}>
                <Text style={styles.prefsTitle}>Your Preferences Applied</Text>
                {profile?.dietaryPrefs?.length > 0 && (
                  <Text style={styles.prefsText}>Diet: {profile.dietaryPrefs.join(', ')}</Text>
                )}
                {profile?.cuisinePrefs?.length > 0 && (
                  <Text style={styles.prefsText}>Cuisines: {profile.cuisinePrefs.join(', ')}</Text>
                )}
                {profile?.dislikedFoods?.length > 0 && (
                  <Text style={styles.prefsText}>Avoiding: {profile.dislikedFoods.join(', ')}</Text>
                )}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Recipe Modal */}
      <Modal visible={recipeModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRecipeModal(false)}>
        <SafeAreaView style={styles.root}>
          <View style={styles.modalHandle} />
          {selectedRecipe && (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
              <Text style={styles.recipeType}>{MEAL_ICONS[selectedRecipe.type]} {selectedRecipe.type?.toUpperCase()}</Text>
              <Text style={styles.recipeName}>{selectedRecipe.name}</Text>

              {/* Macros */}
              <View style={styles.macroRow}>
                {[
                  { l: 'Calories', v: selectedRecipe.calories, c: C.terra },
                  { l: 'Protein', v: `${selectedRecipe.protein}g`, c: C.sage },
                  { l: 'Carbs', v: `${selectedRecipe.carbs}g`, c: C.gold },
                  { l: 'Fat', v: `${selectedRecipe.fat}g`, c: C.dust },
                ].map(m => (
                  <View key={m.l} style={styles.macroTile}>
                    <Text style={[styles.macroVal, { color: m.c }]}>{m.v}</Text>
                    <Text style={styles.macroLabel}>{m.l}</Text>
                  </View>
                ))}
              </View>

              {selectedRecipe.prepTime && (
                <View style={styles.prepTimePill}>
                  <Text style={styles.prepTimeText}>⏱ Prep time: {selectedRecipe.prepTime}</Text>
                </View>
              )}

              {/* Ingredients */}
              {selectedRecipe.ingredients?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Ingredients</Text>
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <View key={i} style={styles.ingredientRow}>
                      <Text style={styles.ingredientDot}>•</Text>
                      <Text style={styles.ingredientText}>{ing}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Instructions */}
              {selectedRecipe.instructions?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Instructions</Text>
                  {selectedRecipe.instructions.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.logBtn} onPress={() => { logMealFromPlan(selectedRecipe); setRecipeModal(false); }} activeOpacity={0.8}>
                <Text style={styles.logBtnText}>+ Log This Meal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', marginTop: 14 }} onPress={() => setRecipeModal(false)}>
                <Text style={{ color: C.dust, fontSize: 13 }}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function MealCard({ meal, type, onView, onLog }) {
  return (
    <View style={styles.mealCard}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Text style={{ fontSize: 28 }}>{MEAL_ICONS[type]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.mealType}>{type.toUpperCase()}</Text>
          <Text style={styles.mealName}>{meal.name}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <MacroChip label={`${meal.calories} kcal`} color={C.terra} />
            <MacroChip label={`P ${meal.protein}g`} color={C.sage} />
            <MacroChip label={`C ${meal.carbs}g`} color={C.gold} />
          </View>
          {meal.prepTime && <Text style={{ fontSize: 10, color: C.dust, marginTop: 6 }}>⏱ {meal.prepTime}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <TouchableOpacity style={styles.viewBtn} onPress={onView} activeOpacity={0.8}>
          <Text style={styles.viewBtnText}>View Recipe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logMiniBtn} onPress={onLog} activeOpacity={0.8}>
          <Text style={styles.logMiniBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MacroChip({ label, color }) {
  return (
    <View style={{ paddingVertical: 3, paddingHorizontal: 8, backgroundColor: `${color}15`, borderRadius: 99 }}>
      <Text style={{ fontSize: 10, color, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function MiniStat({ label, val, color }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 18, fontWeight: '700', color }}>{val}</Text>
      <Text style={{ fontSize: 9, color: C.dust, letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8 },
  pageTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 24, fontWeight: '900', color: C.ink, letterSpacing: -0.5 },
  sub: { fontSize: 11, color: C.dust, marginTop: 2 },
  genBtn: { backgroundColor: C.warm, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 },
  genBtnText: { fontSize: 12, color: C.terra, fontWeight: '600' },
  generatingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${C.terra}10`, borderWidth: 1, borderColor: `${C.terra}25`, borderRadius: 12, padding: 14, marginHorizontal: 20, marginBottom: 12 },
  generatingText: { fontSize: 12, color: C.terra, flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 10 },
  emptySub: { fontSize: 13, color: C.dust, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  primaryBtn: { backgroundColor: C.ink, borderRadius: 99, paddingVertical: 14, paddingHorizontal: 28 },
  primaryBtnText: { color: C.cream, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  dayScroll: { paddingLeft: 20, marginBottom: 4, maxHeight: 60 },
  dayRow: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  dayPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: C.warm, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  dayPillActive: { backgroundColor: C.terra, borderColor: C.terra },
  dayPillToday: { borderColor: C.terra },
  dayAbbr: { fontSize: 12, fontWeight: '600', color: C.dust },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.terra, marginTop: 4 },
  daySummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 16 },
  dayFull: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 22, fontWeight: '700', color: C.ink },
  mealCard: { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18, marginBottom: 14 },
  mealType: { fontSize: 9, color: C.dust, letterSpacing: 2, marginBottom: 4 },
  mealName: { fontSize: 16, fontWeight: '700', color: C.ink, lineHeight: 22 },
  viewBtn: { flex: 1, backgroundColor: C.ink, borderRadius: 99, padding: 11, alignItems: 'center' },
  viewBtnText: { color: C.cream, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  logMiniBtn: { backgroundColor: `${C.terra}15`, borderWidth: 1.5, borderColor: C.terra, borderRadius: 99, paddingVertical: 11, paddingHorizontal: 20, alignItems: 'center' },
  logMiniBtnText: { color: C.terra, fontSize: 12, fontWeight: '700' },
  generatedNote: { fontSize: 10, color: C.dust, textAlign: 'center', marginTop: 8, marginBottom: 16, lineHeight: 16 },
  prefsBox: { backgroundColor: C.warm, borderRadius: 16, padding: 16 },
  prefsTitle: { fontSize: 11, color: C.inkLight, fontWeight: '600', marginBottom: 8 },
  prefsText: { fontSize: 11, color: C.dust, marginBottom: 4, textTransform: 'capitalize' },
  modalHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 99, margin: 14, alignSelf: 'center' },
  recipeType: { fontSize: 10, color: C.terra, letterSpacing: 2, marginBottom: 6 },
  recipeName: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 26, fontWeight: '700', color: C.ink, marginBottom: 16 },
  macroRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  macroTile: { flex: 1, backgroundColor: C.warm, borderRadius: 14, padding: 12, alignItems: 'center' },
  macroVal: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 16, fontWeight: '700' },
  macroLabel: { fontSize: 9, color: C.dust, letterSpacing: 1, marginTop: 3 },
  prepTimePill: { backgroundColor: `${C.gold}15`, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 14, alignSelf: 'flex-start', marginBottom: 20 },
  prepTimeText: { fontSize: 12, color: C.gold, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHeader: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 14 },
  ingredientRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  ingredientDot: { fontSize: 14, color: C.terra, marginTop: 1 },
  ingredientText: { fontSize: 14, color: C.inkLight, flex: 1, lineHeight: 20 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.terra, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepNumText: { fontSize: 12, fontWeight: '700', color: C.cream },
  stepText: { fontSize: 14, color: C.inkLight, flex: 1, lineHeight: 22 },
  logBtn: { backgroundColor: C.terra, borderRadius: 99, padding: 16, alignItems: 'center', marginTop: 8 },
  logBtnText: { color: C.cream, fontSize: 13, fontWeight: '700', letterSpacing: 2 },
});
