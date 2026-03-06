import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Platform, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../src/hooks/useApp.js';
import useHealth from '../../src/hooks/useHealth.js';
import { C, calcTargets } from '../../src/lib/constants.js';

const STEP_TARGET = 10000;
const WATER_TARGET = 3.5;
const SLEEP_TARGET = 8;
const HRV_TARGET = 70;

export default function RhythmScreen() {
  const { profile, meals, stats, score } = useApp();
  const { healthData, authorized, refresh, loading } = useHealth();
  const [refreshing, setRefreshing] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [editing, setEditing] = useState(null);

  const targets = profile ? calcTargets(profile) : { protein: 160, calories: 2200 };
  const totals = {
    p: meals.reduce((s, m) => s + (m.protein || m.p || 0), 0),
    cal: meals.reduce((s, m) => s + (m.cal || m.calories || 0), 0),
  };

  // Merge real health data with manual overrides
  const vitals = [
    {
      id: 'steps', label: 'Steps', emoji: '👟', color: C.sage,
      value: overrides.steps ?? healthData.steps ?? 0,
      target: STEP_TARGET, unit: 'steps',
      source: healthData.steps ? 'Health' : 'Manual',
    },
    {
      id: 'water', label: 'Water', emoji: '💧', color: C.terra,
      value: overrides.water ?? healthData.water ?? 0,
      target: WATER_TARGET, unit: 'L',
      source: healthData.water ? 'Health' : 'Manual',
    },
    {
      id: 'sleep', label: 'Sleep', emoji: '🌙', color: C.purple,
      value: overrides.sleep ?? healthData.sleepHours ?? 0,
      target: SLEEP_TARGET, unit: 'hrs',
      source: healthData.sleepHours ? 'Health' : 'Manual',
    },
    {
      id: 'hrv', label: 'HRV', emoji: '❤️', color: C.blush,
      value: overrides.hrv ?? healthData.hrv ?? 0,
      target: HRV_TARGET, unit: 'ms',
      source: healthData.hrv ? 'Health' : 'Manual',
    },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const setOverride = (id, val) => {
    setOverrides(o => ({ ...o, [id]: parseFloat(val) || 0 }));
    setEditing(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const nutritionBreakdown = [
    { label: 'Nutrition', val: Math.round(Math.min(totals.p / (targets.protein || 1), 1) * 100), color: C.terra },
    { label: 'Hydration', val: Math.round(Math.min((overrides.water ?? healthData.water ?? 0) / WATER_TARGET, 1) * 100), color: C.sage },
    { label: 'Recovery', val: Math.round(Math.min((overrides.sleep ?? healthData.sleepHours ?? 0) / SLEEP_TARGET, 1) * 100), color: C.purple },
    { label: 'Activity', val: Math.round(Math.min((overrides.steps ?? healthData.steps ?? 0) / STEP_TARGET, 1) * 100), color: C.blush },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.terra} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      >
        <Text style={styles.pageTitle}>Daily Rhythm</Text>

        {/* Source badge */}
        {authorized && (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>🍎 Syncing from Apple Health · Pull to refresh</Text>
          </View>
        )}
        {!authorized && Platform.OS === 'ios' && (
          <View style={[styles.sourceBadge, { backgroundColor: `${C.gold}15`, borderColor: `${C.gold}30` }]}>
            <Text style={[styles.sourceBadgeText, { color: C.gold }]}>⚠ Apple Health not connected — tap values to enter manually</Text>
          </View>
        )}

        {/* Vitals */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily Vitals</Text>
          {vitals.map((h, i) => (
            <View key={h.id} style={{ marginBottom: i < vitals.length - 1 ? 22 : 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>{h.emoji}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.inkLight }}>{h.label}</Text>
                  <View style={[styles.sourcePill, h.source === 'Health' ? styles.sourceHealth : styles.sourceManual]}>
                    <Text style={[styles.sourcePillText, h.source === 'Health' ? { color: C.sage } : { color: C.dust }]}>
                      {h.source}
                    </Text>
                  </View>
                </View>
                {editing === h.id ? (
                  <TextInput
                    defaultValue={String(h.value)}
                    keyboardType="decimal-pad"
                    autoFocus
                    onBlur={e => setOverride(h.id, e.nativeEvent.text)}
                    onSubmitEditing={e => setOverride(h.id, e.nativeEvent.text)}
                    style={{ backgroundColor: C.warm, borderWidth: 1, borderColor: h.color, borderRadius: 8, padding: 6, fontSize: 13, width: 80, textAlign: 'right', color: C.ink }}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setEditing(h.id)} activeOpacity={0.8}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: h.value >= h.target ? C.sage : h.color }}>
                      {h.value}
                    </Text>
                    <Text style={{ fontSize: 9, color: C.dust, textAlign: 'right' }}>/ {h.target}{h.unit} ✎</Text>
                  </TouchableOpacity>
                )}
              </View>
              <WaveBar val={h.value} max={h.target} color={h.value >= h.target ? C.sage : h.color} />
            </View>
          ))}
        </View>

        {/* Active + resting calories from Health */}
        {authorized && (healthData.activeCalories > 0 || healthData.restingCalories > 0) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Calorie Balance</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <CalTile label="Eaten" val={totals.cal} color={C.terra} />
              <CalTile label="Active Burn" val={healthData.activeCalories} color={C.sage} />
              <CalTile label="Net" val={totals.cal - (healthData.activeCalories + (healthData.restingCalories || 0))} color={totals.cal > 0 ? C.gold : C.dust} />
            </View>
          </View>
        )}

        {/* Score breakdown */}
        <View style={[styles.card, { backgroundColor: C.ink }]}>
          <Text style={[styles.sectionTitle, { color: C.terra }]}>◆ Score Breakdown</Text>
          {nutritionBreakdown.map((s, i) => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: i < 3 ? 14 : 0 }}>
              <Text style={{ fontSize: 10, color: 'rgba(245,239,228,.45)', width: 72 }}>{s.label}</Text>
              <View style={{ flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,.08)', borderRadius: 99 }}>
                <View style={{ height: '100%', width: `${s.val}%`, backgroundColor: s.color, borderRadius: 99 }} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: s.color, width: 30, textAlign: 'right' }}>{s.val}</Text>
            </View>
          ))}
          <View style={{ marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: 'rgba(245,239,228,.4)', letterSpacing: 1 }}>OVERALL SCORE</Text>
            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 32, fontWeight: '900', color: score >= 80 ? C.terra : C.gold }}>{score}</Text>
          </View>
        </View>

        {/* Heart data from Health */}
        {authorized && (healthData.heartRate > 0 || healthData.restingHeartRate > 0) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Heart Health</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {healthData.heartRate > 0 && <CalTile label="Current HR" val={`${healthData.heartRate} bpm`} color={C.blush} />}
              {healthData.restingHeartRate > 0 && <CalTile label="Resting HR" val={`${healthData.restingHeartRate} bpm`} color={C.terra} />}
              {healthData.hrv > 0 && <CalTile label="HRV" val={`${healthData.hrv} ms`} color={C.sage} />}
            </View>
            {healthData.hrv > 0 && (
              <Text style={{ fontSize: 11, color: C.dust, marginTop: 12, lineHeight: 17 }}>
                {healthData.hrv >= 70 ? '✓ HRV is strong — your body is recovering well.' :
                  healthData.hrv >= 50 ? '→ HRV is moderate — prioritize sleep and stress management.' :
                    '⚠ HRV is low — consider a lighter training day and extra recovery.'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WaveBar({ val, max, color }) {
  const pct = Math.min(val / (max || 1), 1);
  return (
    <View style={{ height: 7, backgroundColor: C.border, borderRadius: 99, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: color, borderRadius: 99 }} />
    </View>
  );
}

function CalTile({ label, val, color }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.warm, borderRadius: 14, padding: 12, alignItems: 'center' }}>
      <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 16, fontWeight: '700', color }}>{typeof val === 'number' ? val.toLocaleString() : val}</Text>
      <Text style={{ fontSize: 9, color: C.dust, letterSpacing: 1, marginTop: 3, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  pageTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 26, fontWeight: '900', color: C.ink, padding: 20, paddingBottom: 8 },
  sourceBadge: { marginHorizontal: 20, marginBottom: 12, backgroundColor: `${C.sage}12`, borderWidth: 1, borderColor: `${C.sage}30`, borderRadius: 10, padding: 10 },
  sourceBadgeText: { fontSize: 11, color: C.sage, textAlign: 'center' },
  card: { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 20, marginBottom: 16 },
  sectionTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 15, fontStyle: 'italic', color: C.inkLight, marginBottom: 16 },
  sourcePill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, borderWidth: 1 },
  sourceHealth: { backgroundColor: `${C.sage}15`, borderColor: `${C.sage}30` },
  sourceManual: { backgroundColor: C.warm, borderColor: C.border },
  sourcePillText: { fontSize: 9, letterSpacing: 1 },
});
