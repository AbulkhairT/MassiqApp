import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, Modal, TextInput, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../src/hooks/useApp.js';
import useHealth from '../../src/hooks/useHealth.js';
import { C, GOALS, calcTargets } from '../../src/lib/constants.js';
import { analyzeBodyPhoto } from '../../src/lib/api.js';

export default function BodyScreen() {
  const { profile, stats, meals, score, saveStats } = useApp();
  const { healthData, authorized, refresh, loading } = useHealth();
  const [refreshing, setRefreshing] = useState(false);
  const [scanModal, setScanModal] = useState(false);
  const [scanPhase, setScanPhase] = useState('upload'); // upload | scanning | results
  const [analysis, setAnalysis] = useState(null);
  const [analysisImg, setAnalysisImg] = useState(null);

  const targets = profile ? calcTargets(profile) : { calories: 2200, protein: 160 };
  const totCal = meals.reduce((s, m) => s + (m.cal || m.calories || 0), 0);
  const totP = meals.reduce((s, m) => s + (m.protein || m.p || 0), 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleBodyScan = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access in Settings.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setAnalysisImg(asset.uri);
    setScanPhase('scanning');

    try {
      const b64 = asset.base64 || await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const mime = asset.mimeType || 'image/jpeg';
      const res = await analyzeBodyPhoto(b64, mime, profile);
      setAnalysis(res);
      setScanPhase('results');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Analysis failed', e.message);
      setScanPhase('upload');
    }
  };

  const saveAnalysis = async () => {
    if (!analysis) return;
    const w = stats.weight;
    await saveStats({
      weight: w,
      lbm: analysis.leanMass || Math.round(w * (1 - analysis.bodyFatPct / 100) * 10) / 10,
      fatPct: analysis.bodyFatPct,
    });
    setScanModal(false);
    setScanPhase('upload');
    setAnalysis(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const goalInfo = GOALS.find(g => g.id === profile?.goal) || GOALS[2];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.terra} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>MassIQ</Text>
            <Text style={styles.subLine}>{goalInfo.emoji} {goalInfo.label} · {profile?.name || 'You'}</Text>
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={() => { setScanPhase('upload'); setScanModal(true); }} activeOpacity={0.8}>
            <Text style={{ fontSize: 14 }}>📸</Text>
            <Text style={styles.scanBtnText}>Scan Body</Text>
          </TouchableOpacity>
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <View style={styles.scoreBall}>
            <Text style={styles.scoreNum}>{score}</Text>
            <Text style={styles.scoreLabel}>your score</Text>
          </View>
          <Text style={styles.scoreCaption}>
            {score >= 85 ? 'Elite territory 🔥' : score >= 70 ? 'Great progress ↑' : score >= 50 ? 'Building momentum →' : 'Start logging to score ↑'}
          </Text>
        </View>

        {/* Body stats */}
        <View style={styles.statsRow}>
          {[
            { l: 'Weight', v: stats.weight || healthData.weight || '—', u: 'lbs', c: C.terra },
            { l: 'Lean Mass', v: stats.lbm, u: 'lbs', c: C.sage },
            { l: 'Body Fat', v: stats.fatPct, u: '%', c: C.gold },
          ].map(s => (
            <TouchableOpacity key={s.l} style={styles.statCard} onPress={() => setScanModal(true)} activeOpacity={0.8}>
              <Text style={[styles.statVal, { color: s.c }]}>{s.v}</Text>
              <Text style={styles.statUnit}>{s.u}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Health data from phone */}
        {authorized && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Live from Apple Health</Text>
            <View style={styles.healthGrid}>
              <HealthTile icon="👟" label="Steps" value={healthData.steps?.toLocaleString() || '—'} />
              <HealthTile icon="🔥" label="Active Cal" value={healthData.activeCalories ? `${healthData.activeCalories}` : '—'} />
              <HealthTile icon="❤️" label="Heart Rate" value={healthData.heartRate ? `${healthData.heartRate} bpm` : '—'} />
              <HealthTile icon="💜" label="HRV" value={healthData.hrv ? `${healthData.hrv} ms` : '—'} />
              <HealthTile icon="🌙" label="Sleep" value={healthData.sleepHours ? `${healthData.sleepHours}h` : '—'} />
              <HealthTile icon="💧" label="Water" value={healthData.water ? `${healthData.water}L` : '—'} />
            </View>
            {!loading && healthData.workouts?.length > 0 && (
              <View style={styles.workoutRow}>
                <Text style={styles.workoutLabel}>Today's workout: </Text>
                <Text style={styles.workoutVal}>{healthData.workouts[0].type} · {healthData.workouts[0].duration}min · {healthData.workouts[0].calories}kcal</Text>
              </View>
            )}
          </View>
        )}

        {!authorized && Platform.OS === 'ios' && (
          <View style={[styles.card, { backgroundColor: `${C.terra}10`, borderColor: `${C.terra}30` }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.terra, marginBottom: 6 }}>Connect Apple Health</Text>
            <Text style={{ fontSize: 12, color: C.inkLight, lineHeight: 18 }}>
              Allow Apple Health access to sync real steps, sleep, heart rate, and HRV automatically.
            </Text>
          </View>
        )}

        {/* Today's progress */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Today's Targets</Text>
          <ProgressBar label="Calories" cur={totCal} target={targets.calories} unit="kcal" color={C.terra} />
          <ProgressBar label="Protein" cur={totP} target={targets.protein} unit="g" color={C.sage} />
          <Text style={styles.aiNote}>
            {targets.protein - totP > 0
              ? `${targets.protein - totP}g protein remaining. Prioritize lean protein at your next meal.`
              : `Protein target hit! ${targets.calories - totCal > 0 ? `${targets.calories - totCal} kcal remaining.` : 'Stay within your limit.'}`}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Body Scan Modal */}
      <Modal visible={scanModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setScanModal(false)}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHandle} />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <Text style={styles.modalTitle}>Body Analysis</Text>
            <Text style={styles.modalSub}>AI estimates body composition from your photo</Text>

            {scanPhase === 'upload' && (
              <>
                <View style={styles.uploadBox}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>🔬</Text>
                  <Text style={styles.uploadTitle}>Upload a physique photo</Text>
                  <Text style={styles.uploadDesc}>Best: good lighting, fitted clothing, facing camera. Front pose gives most accurate results.</Text>
                  <View style={styles.uploadBtns}>
                    <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: C.terra }]} onPress={() => handleBodyScan(true)} activeOpacity={0.8}>
                      <Text style={{ fontSize: 22, marginBottom: 4 }}>📸</Text>
                      <Text style={{ color: C.cream, fontSize: 12 }}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: C.ink }]} onPress={() => handleBodyScan(false)} activeOpacity={0.8}>
                      <Text style={{ fontSize: 22, marginBottom: 4 }}>🖼️</Text>
                      <Text style={{ color: C.cream, fontSize: 12 }}>Upload</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <ManualStatsEntry profile={profile} stats={stats} onSave={s => { saveStats(s); setScanModal(false); }} />
              </>
            )}

            {scanPhase === 'scanning' && (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Text style={{ fontSize: 48, marginBottom: 20 }}>⏳</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: C.ink, marginBottom: 8 }}>Analyzing your physique…</Text>
                <Text style={{ fontSize: 13, color: C.dust, textAlign: 'center' }}>Estimating body fat, lean mass, muscle groups & symmetry</Text>
              </View>
            )}

            {scanPhase === 'results' && analysis && (
              <ScanResults analysis={analysis} onSave={saveAnalysis} onRetry={() => { setScanPhase('upload'); setAnalysis(null); }} />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function HealthTile({ icon, label, value }) {
  return (
    <View style={styles.healthTile}>
      <Text style={{ fontSize: 20, marginBottom: 4 }}>{icon}</Text>
      <Text style={styles.healthVal}>{value}</Text>
      <Text style={styles.healthLabel}>{label}</Text>
    </View>
  );
}

function ProgressBar({ label, cur, target, unit, color }) {
  const pct = Math.min(cur / (target || 1), 1);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, color: C.inkLight }}>{label}</Text>
        <Text style={{ fontSize: 12, color, fontWeight: '600' }}>{cur}<Text style={{ color: C.dust, fontWeight: '400' }}>/{target}{unit}</Text></Text>
      </View>
      <View style={{ height: 7, backgroundColor: C.border, borderRadius: 99, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: color, borderRadius: 99 }} />
      </View>
    </View>
  );
}

function ManualStatsEntry({ profile, stats, onSave }) {
  const [form, setForm] = useState({ weight: String(stats.weight || ''), lbm: String(stats.lbm || ''), fatPct: String(stats.fatPct || '') });
  return (
    <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 20 }}>
      <Text style={{ fontSize: 13, color: C.dust, marginBottom: 16 }}>Or enter stats manually (from DEXA/calipers)</Text>
      {[{ l: 'Weight (lbs)', k: 'weight' }, { l: 'Lean Body Mass (lbs)', k: 'lbm' }, { l: 'Body Fat %', k: 'fatPct' }].map(({ l, k }) => (
        <View key={k} style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 10, color: C.dust, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{l}</Text>
          <TextInput value={form[k]} onChangeText={v => setForm(f => ({ ...f, [k]: v }))} keyboardType="decimal-pad" placeholderTextColor={C.dust} placeholder="Enter value"
            style={{ backgroundColor: C.warm, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 18, color: C.terra, textAlign: 'center', fontWeight: '700' }} />
        </View>
      ))}
      <TouchableOpacity style={{ backgroundColor: C.ink, borderRadius: 99, padding: 16, alignItems: 'center' }}
        onPress={() => onSave({ weight: +form.weight, lbm: +form.lbm, fatPct: +form.fatPct })}
        disabled={!form.weight || !form.lbm || !form.fatPct}>
        <Text style={{ color: C.cream, fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>Save Stats</Text>
      </TouchableOpacity>
    </View>
  );
}

function ScanResults({ analysis, onSave, onRetry }) {
  const mgl = { 'well-developed': C.sage, average: C.gold, underdeveloped: C.blush };
  const mgp = { 'well-developed': 90, average: 55, underdeveloped: 22 };
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {[{ l: 'Body Fat', v: `${analysis.bodyFatPct}%`, c: C.terra }, { l: 'Lean Mass', v: `${analysis.leanMass}lbs`, c: C.sage }, { l: 'Score', v: `${analysis.overallPhysiqueScore}/100`, c: C.gold }].map(m => (
          <View key={m.l} style={{ flex: 1, backgroundColor: C.warm, borderRadius: 14, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: m.c }}>{m.v}</Text>
            <Text style={{ fontSize: 9, color: C.dust, marginTop: 3, letterSpacing: 1 }}>{m.l}</Text>
          </View>
        ))}
      </View>
      {analysis.muscleGroups && (
        <View style={{ backgroundColor: C.cardBg, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <Text style={{ fontSize: 10, color: C.terra, letterSpacing: 2, marginBottom: 12 }}>◆ MUSCLE GROUPS</Text>
          {Object.entries(analysis.muscleGroups).map(([m, l]) => (
            <View key={m} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: C.inkLight, textTransform: 'capitalize' }}>{m}</Text>
                <Text style={{ fontSize: 10, color: mgl[l] || C.dust, textTransform: 'capitalize' }}>{l?.replace('-', ' ')}</Text>
              </View>
              <View style={{ height: 5, backgroundColor: C.border, borderRadius: 99 }}>
                <View style={{ height: '100%', width: `${mgp[l] || 40}%`, backgroundColor: mgl[l] || C.dust, borderRadius: 99 }} />
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <View style={{ flex: 1, backgroundColor: `${C.sage}12`, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontSize: 9, color: C.sage, letterSpacing: 2, marginBottom: 8 }}>STRENGTHS</Text>
          {(analysis.primaryStrengths || []).map((s, i) => <Text key={i} style={{ fontSize: 11, color: C.inkLight, marginBottom: 4 }}>✓ {s}</Text>)}
        </View>
        <View style={{ flex: 1, backgroundColor: `${C.terra}10`, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontSize: 9, color: C.terra, letterSpacing: 2, marginBottom: 8 }}>FOCUS ON</Text>
          {(analysis.areasToImprove || []).map((s, i) => <Text key={i} style={{ fontSize: 11, color: C.inkLight, marginBottom: 4 }}>→ {s}</Text>)}
        </View>
      </View>
      {analysis.asymmetries?.length > 0 && (
        <View style={{ backgroundColor: `${C.gold}12`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <Text style={{ fontSize: 9, color: C.gold, letterSpacing: 2, marginBottom: 8 }}>⚠ ASYMMETRIES</Text>
          {analysis.asymmetries.map((a, i) => <Text key={i} style={{ fontSize: 11, color: C.inkLight, marginBottom: 3 }}>• {a}</Text>)}
        </View>
      )}
      {analysis.recommendation && (
        <View style={{ backgroundColor: C.ink, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <Text style={{ fontSize: 9, color: C.terra, letterSpacing: 2, marginBottom: 8 }}>◆ RECOMMENDATION</Text>
          <Text style={{ fontSize: 12, color: C.cream, lineHeight: 20 }}>{analysis.recommendation}</Text>
        </View>
      )}
      {analysis.disclaimer && <Text style={{ fontSize: 10, color: C.dust, marginBottom: 16, fontStyle: 'italic', lineHeight: 16 }}>⚠ {analysis.disclaimer}</Text>}
      <TouchableOpacity style={{ backgroundColor: C.terra, borderRadius: 99, padding: 16, alignItems: 'center', marginBottom: 12 }} onPress={onSave}>
        <Text style={{ color: C.cream, fontSize: 12, fontWeight: '700', letterSpacing: 2 }}>SAVE THESE STATS</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ alignItems: 'center' }} onPress={onRetry}>
        <Text style={{ fontSize: 12, color: C.dust }}>Scan again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 },
  appName: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 24, fontWeight: '900', color: C.ink, letterSpacing: -1 },
  subLine: { fontSize: 11, color: C.dust, marginTop: 2, letterSpacing: 0.5 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${C.terra}15`, borderWidth: 1, borderColor: `${C.terra}40`, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  scanBtnText: { fontSize: 11, color: C.terra, letterSpacing: 0.5 },
  scoreContainer: { alignItems: 'center', padding: 28 },
  scoreBall: { width: 160, height: 160, borderRadius: 80, backgroundColor: C.terra, alignItems: 'center', justifyContent: 'center', shadowColor: C.terra, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 20 },
  scoreNum: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 54, fontWeight: '900', color: C.cream, lineHeight: 60 },
  scoreLabel: { fontSize: 9, color: 'rgba(245,239,228,.6)', letterSpacing: 2, textTransform: 'uppercase' },
  scoreCaption: { marginTop: 12, fontSize: 13, color: C.dust },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 14, alignItems: 'center' },
  statVal: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 20, fontWeight: '700' },
  statUnit: { fontSize: 9, color: C.dust, letterSpacing: 1, marginTop: 2 },
  statLabel: { fontSize: 8, color: C.dust, marginTop: 1 },
  card: { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 20, marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 15, fontStyle: 'italic', color: C.inkLight, marginBottom: 14 },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  healthTile: { width: '30%', backgroundColor: C.warm, borderRadius: 12, padding: 12, alignItems: 'center' },
  healthVal: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 2 },
  healthLabel: { fontSize: 9, color: C.dust, letterSpacing: 1, textTransform: 'uppercase' },
  workoutRow: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, flexWrap: 'wrap' },
  workoutLabel: { fontSize: 11, color: C.dust },
  workoutVal: { fontSize: 11, color: C.inkLight, fontWeight: '600' },
  aiNote: { fontSize: 12, color: C.inkLight, lineHeight: 19, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: `${C.terra}20` },
  modalRoot: { flex: 1, backgroundColor: C.paper },
  modalHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 99, margin: 14, alignSelf: 'center' },
  modalTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 24, fontWeight: '700', color: C.ink, marginBottom: 4 },
  modalSub: { fontSize: 12, color: C.dust, marginBottom: 20 },
  uploadBox: { backgroundColor: `${C.terra}08`, borderWidth: 2, borderColor: `${C.terra}30`, borderStyle: 'dashed', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 4 },
  uploadTitle: { fontSize: 15, fontWeight: '600', color: C.ink, marginBottom: 8 },
  uploadDesc: { fontSize: 12, color: C.dust, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  uploadBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  uploadBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
});
