import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Platform,
} from 'react-native';
import { useApp } from '../../src/hooks/useApp.js';
import { useRouter } from 'expo-router';
import { C, GOALS } from '../../src/lib/constants.js';

// Challenge definitions by goal
function getChallenges(goal) {
  const base = [
    { id: 'log_first', tier: 'bronze', emoji: '🍽️', title: 'First Log', desc: 'Log your first meal', key: 'meals_logged', requiresIds: [] },
    { id: 'water_start', tier: 'bronze', emoji: '💧', title: 'Hydration Init', desc: 'Drink 2L of water', key: 'water_2l', requiresIds: [] },
    { id: 'sleep_7', tier: 'bronze', emoji: '🌙', title: 'Sleep Starter', desc: 'Get 7 hours of sleep', key: 'sleep_7', requiresIds: [] },
    { id: 'steps_7k', tier: 'bronze', emoji: '👟', title: 'Get Moving', desc: 'Hit 7,000 steps', key: 'steps_7k', requiresIds: [] },
  ];

  const byGoal = {
    cut: [
      { id: 'deficit', tier: 'silver', emoji: '⚖️', title: 'In the Deficit', desc: 'Stay under your calorie target', key: 'in_deficit', requiresIds: ['log_first'] },
      { id: 'protein_cut', tier: 'silver', emoji: '🥩', title: 'Protein Shield', desc: 'Hit 90% protein to preserve muscle', key: 'protein_90', requiresIds: ['log_first'] },
      { id: 'steps_12k', tier: 'silver', emoji: '🔥', title: 'Fat Burner', desc: '12,000 steps - maximize calorie burn', key: 'steps_12k', requiresIds: ['steps_7k'] },
      { id: 'cut_streak', tier: 'gold', emoji: '🔥', title: '3-Day Cut Streak', desc: 'Maintain deficit 3 days in a row', key: 'streak_3', requiresIds: ['deficit'] },
      { id: 'fat_drop', tier: 'gold', emoji: '📉', title: 'Fat Loss Confirmed', desc: 'Log a drop in body fat percentage', key: 'fat_dropped', requiresIds: ['cut_streak'] },
      { id: 'cut_week', tier: 'platinum', emoji: '👑', title: '7-Day Cut', desc: 'Deficit every day for a week', key: 'streak_7', requiresIds: ['cut_streak'] },
      { id: 'transform', tier: 'legendary', emoji: '🏆', title: 'Transformation', desc: 'Complete 8 cutting challenges', key: 'legend_8', requiresIds: ['fat_drop', 'cut_week'] },
    ],
    bulk: [
      { id: 'surplus', tier: 'silver', emoji: '📈', title: 'In the Surplus', desc: 'Hit your calorie surplus target', key: 'in_surplus', requiresIds: ['log_first'] },
      { id: 'protein_bulk', tier: 'silver', emoji: '🥩', title: 'Anabolic Window', desc: 'Hit 100% protein target', key: 'protein_100', requiresIds: ['log_first'] },
      { id: 'bulk_streak', tier: 'gold', emoji: '💪', title: '3-Day Surplus', desc: 'Hit surplus 3 days straight', key: 'streak_3', requiresIds: ['surplus'] },
      { id: 'lbm_gain', tier: 'gold', emoji: '⬆️', title: 'Lean Gains', desc: 'Log an increase in lean body mass', key: 'lbm_up', requiresIds: ['bulk_streak'] },
      { id: 'bulk_week', tier: 'platinum', emoji: '👑', title: '7-Day Surplus', desc: 'Hit surplus every day for a week', key: 'streak_7', requiresIds: ['bulk_streak'] },
      { id: 'mass_legend', tier: 'legendary', emoji: '🏆', title: 'Mass Monster', desc: 'Complete 8 bulking challenges', key: 'legend_8', requiresIds: ['lbm_gain', 'bulk_week'] },
    ],
    recomp: [
      { id: 'protein_recomp', tier: 'silver', emoji: '🥩', title: 'Protein Priority', desc: 'Hit 100% protein - essential for recomp', key: 'protein_100', requiresIds: ['log_first'] },
      { id: 'cal_precise', tier: 'silver', emoji: '⚖️', title: 'Calorie Precision', desc: 'Hit maintenance within 5%', key: 'at_maintenance', requiresIds: ['log_first'] },
      { id: 'steps_10k', tier: 'silver', emoji: '🚶', title: 'NEAT Machine', desc: '10,000 steps maximizes recomp', key: 'steps_10k', requiresIds: ['steps_7k'] },
      { id: 'sleep_8', tier: 'silver', emoji: '🌙', title: 'Recovery King', desc: '8hrs sleep - recomp happens here', key: 'sleep_8', requiresIds: ['sleep_7'] },
      { id: 'recomp_streak', tier: 'gold', emoji: '🔄', title: '3-Day Precision', desc: 'Hit macros exactly 3 days in a row', key: 'streak_3', requiresIds: ['protein_recomp', 'cal_precise'] },
      { id: 'score_80', tier: 'gold', emoji: '📊', title: 'Optimizer', desc: 'Score 80+ - recomp demands consistency', key: 'score_80', requiresIds: ['protein_recomp'] },
      { id: 'recomp_confirmed', tier: 'platinum', emoji: '🔬', title: 'Recomp Confirmed', desc: 'LBM up AND fat% down same week', key: 'recomp', requiresIds: ['recomp_streak'] },
      { id: 'recomp_week', tier: 'platinum', emoji: '👑', title: '7-Day Recomp', desc: 'Perfect macros 7 straight days', key: 'streak_7', requiresIds: ['recomp_streak'] },
      { id: 'recomp_legend', tier: 'legendary', emoji: '🏆', title: 'Recomp Legend', desc: 'Complete 8 recomp challenges', key: 'legend_8', requiresIds: ['recomp_confirmed', 'recomp_week'] },
    ],
    maintain: [
      { id: 'cal_balance', tier: 'silver', emoji: '⚖️', title: 'Balanced Day', desc: 'Stay within 100 calories of maintenance', key: 'at_maintenance', requiresIds: ['log_first'] },
      { id: 'protein_main', tier: 'silver', emoji: '🥩', title: 'Protein Foundation', desc: 'Hit 80% protein to maintain muscle', key: 'protein_80', requiresIds: ['log_first'] },
      { id: 'main_streak', tier: 'gold', emoji: '🔄', title: '3-Day Balance', desc: 'Stay balanced 3 days in a row', key: 'streak_3', requiresIds: ['cal_balance'] },
      { id: 'main_week', tier: 'platinum', emoji: '👑', title: '7-Day Balance', desc: 'Stay balanced for a full week', key: 'streak_7', requiresIds: ['main_streak'] },
      { id: 'main_legend', tier: 'legendary', emoji: '🏆', title: 'Lifestyle Master', desc: 'Complete 7 maintenance challenges', key: 'legend_8', requiresIds: ['main_week'] },
    ],
  };
  return [...base, ...(byGoal[goal] || byGoal.recomp)];
}

const TIER_META = {
  bronze: { label: 'Bronze', color: '#A0694A', bg: 'rgba(160,105,74,.1)', border: 'rgba(160,105,74,.3)' },
  silver: { label: 'Silver', color: '#7A8A96', bg: 'rgba(122,138,150,.1)', border: 'rgba(122,138,150,.3)' },
  gold: { label: 'Gold', color: '#C4952D', bg: 'rgba(196,149,45,.1)', border: 'rgba(196,149,45,.3)' },
  platinum: { label: 'Platinum', color: '#8A9BB5', bg: 'rgba(138,155,181,.1)', border: 'rgba(138,155,181,.3)' },
  legendary: { label: 'Legendary', color: '#B8860B', bg: 'rgba(184,134,11,.12)', border: 'rgba(184,134,11,.4)' },
};

export default function ProgressScreen() {
  const { profile, history, completedIds, score } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState('history'); // history | challenges

  const challenges = getChallenges(profile?.goal || 'recomp');
  const unlocked = c => c.requiresIds.length === 0 || c.requiresIds.every(id => completedIds.includes(id));
  const done = c => completedIds.includes(c.id);
  const tiers = ['bronze', 'silver', 'gold', 'platinum', 'legendary'];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Progress</Text>
        <View style={styles.tabRow}>
          {[{ id: 'history', label: 'History' }, { id: 'challenges', label: 'Goals' }].map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)}
              style={[styles.tabPill, tab === t.id && styles.tabPillActive]}>
              <Text style={[styles.tabText, tab === t.id && { color: C.cream }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        {tab === 'history' && (
          <>
            {history.length < 2 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📈</Text>
                <Text style={styles.emptyTitle}>No history yet</Text>
                <Text style={styles.emptySub}>Scan your body or enter stats from the Body tab to start tracking your progress.</Text>
              </View>
            ) : (
              <>
                {/* Delta cards */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {[
                    { l: 'Weight', v: (history[history.length - 1].weight - history[0].weight), u: 'lbs', good: v => v < 0 },
                    { l: 'Lean Mass', v: (history[history.length - 1].lbm - history[0].lbm), u: 'lbs', good: v => v > 0 },
                    { l: 'Body Fat', v: (history[history.length - 1].fatPct - history[0].fatPct), u: '%', good: v => v < 0 },
                  ].map(s => (
                    <View key={s.l} style={styles.deltaCard}>
                      <Text style={[styles.deltaVal, { color: s.good(s.v) ? C.sage : s.v === 0 ? C.dust : C.terra }]}>
                        {s.v > 0 ? '+' : ''}{s.v.toFixed(1)}<Text style={{ fontSize: 10 }}>{s.u}</Text>
                      </Text>
                      <Text style={styles.deltaLabel}>{s.l}</Text>
                    </View>
                  ))}
                </View>

                {/* History log */}
                <View style={[styles.card, { padding: 0 }]}>
                  <View style={{ padding: 20, paddingBottom: 12 }}>
                    <Text style={styles.sectionTitle}>Scan History</Text>
                  </View>
                  {[...history].reverse().map((h, i) => (
                    <View key={i} style={[styles.histRow, i === 0 && { borderTopWidth: 0 }]}>
                      <Text style={{ fontSize: 13, color: C.dust, width: 80 }}>{h.date}</Text>
                      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
                        {[{ l: 'W', v: h.weight }, { l: 'LBM', v: h.lbm }, { l: 'BF%', v: h.fatPct }].map(s => (
                          <View key={s.l} style={{ alignItems: 'center' }}>
                            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 14, fontWeight: '700', color: C.ink }}>{s.v}</Text>
                            <Text style={{ fontSize: 8, color: C.dust }}>{s.l}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {tab === 'challenges' && (
          <>
            {/* Header card */}
            <View style={styles.challengeHeader}>
              <Text style={{ fontSize: 9, color: C.cream, letterSpacing: 3, opacity: 0.7, marginBottom: 4 }}>
                {GOALS.find(g => g.id === profile?.goal)?.label?.toUpperCase()} CHALLENGES
              </Text>
              <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 28, fontWeight: '900', color: C.cream }}>
                {completedIds.length}<Text style={{ fontSize: 14, opacity: 0.6 }}>/{challenges.length}</Text>
              </Text>
              <Text style={{ fontSize: 11, color: C.cream, opacity: 0.7, marginBottom: 14 }}>challenges completed</Text>
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,.2)', borderRadius: 99 }}>
                <View style={{ height: '100%', width: `${(completedIds.length / challenges.length) * 100}%`, backgroundColor: C.cream, borderRadius: 99 }} />
              </View>
            </View>

            {tiers.map(tier => {
              const tc = challenges.filter(c => c.tier === tier);
              if (!tc.length) return null;
              const meta = TIER_META[tier];
              return (
                <View key={tier} style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: meta.color, letterSpacing: 1, textTransform: 'uppercase' }}>{meta.label}</Text>
                    <Text style={{ fontSize: 10, color: C.dust }}>{tc.filter(c => done(c)).length}/{tc.length}</Text>
                  </View>
                  {tc.map(c => {
                    const u = unlocked(c); const d = done(c);
                    return (
                      <View key={c.id} style={[styles.challengeCard, d && { borderColor: meta.color, backgroundColor: `${meta.color}10` }, !u && { opacity: 0.4 }]}>
                        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                          <Text style={{ fontSize: 24, filter: u ? 'none' : 'grayscale(1)' }}>{c.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: d ? meta.color : u ? C.ink : C.dust }}>{c.title}</Text>
                              {d && <Text style={{ fontSize: 16, color: meta.color }}>✓</Text>}
                            </View>
                            <Text style={{ fontSize: 11, color: C.dust, lineHeight: 17 }}>{c.desc}</Text>
                            {!u && <Text style={{ fontSize: 10, color: C.dust, marginTop: 4 }}>🔒 Complete prerequisites first</Text>}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  header: { padding: 20, paddingBottom: 8 },
  pageTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 26, fontWeight: '900', color: C.ink, marginBottom: 12 },
  tabRow: { flexDirection: 'row', backgroundColor: C.warm, borderRadius: 12, padding: 4 },
  tabPill: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabPillActive: { backgroundColor: C.ink },
  tabText: { fontSize: 13, fontWeight: '600', color: C.dust },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 10 },
  emptySub: { fontSize: 13, color: C.dust, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 24, marginBottom: 16 },
  sectionTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 15, fontStyle: 'italic', color: C.inkLight, marginBottom: 4 },
  deltaCard: { flex: 1, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, alignItems: 'center' },
  deltaVal: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 18, fontWeight: '700' },
  deltaLabel: { fontSize: 9, color: C.dust, letterSpacing: 1, marginTop: 3 },
  histRow: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: C.border },
  challengeHeader: { backgroundColor: C.terra, borderRadius: 20, padding: 20, marginBottom: 20 },
  challengeCard: { backgroundColor: C.cardBg, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 10 },
});
