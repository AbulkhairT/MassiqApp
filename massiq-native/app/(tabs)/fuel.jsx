import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Modal, TextInput, Platform, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../src/hooks/useApp.js';
import { C, calcTargets, MEAL_TAGS } from '../../src/lib/constants.js';
import { analyzeFood } from '../../src/lib/api.js';

export default function FuelScreen() {
  const { profile, meals, addMeal, deleteMeal } = useApp();
  const [logModal, setLogModal] = useState(false);
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', tag: 'Lunch', time: new Date().toTimeString().slice(0, 5) });
  const [aiTab, setAiTab] = useState('text');
  const [query, setQuery] = useState('');
  const [imgUri, setImgUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ ok: null, msg: '' });

  const targets = profile ? calcTargets(profile) : { protein: 160, carbs: 200, fat: 60, calories: 2200 };
  const totals = {
    p: meals.reduce((s, m) => s + (m.protein || 0), 0),
    c: meals.reduce((s, m) => s + (m.carbs || 0), 0),
    f: meals.reduce((s, m) => s + (m.fat || 0), 0),
    cal: meals.reduce((s, m) => s + (m.calories || 0), 0),
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const applyNutrition = (json) => {
    setForm(prev => ({
      ...prev,
      name: json.name || prev.name,
      calories: String(Math.round(json.calories || 0)),
      protein: String(Math.round(json.protein || 0)),
      carbs: String(Math.round(json.carbs || 0)),
      fat: String(Math.round(json.fat || 0)),
    }));
    setStatus({ ok: true, msg: '✓ Macros filled — adjust if needed' });
  };

  const analyzeText = async () => {
    if (!query.trim()) return;
    setLoading(true); setStatus({ ok: null, msg: 'Analyzing…' });
    try {
      const res = await analyzeFood(query);
      applyNutrition(res);
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally { setLoading(false); }
  };

  const analyzePhoto = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setImgUri(asset.uri);
    setLoading(true); setStatus({ ok: null, msg: 'Analyzing photo…' });
    try {
      const b64 = asset.base64 || await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const res = await analyzeFood(null, b64, asset.mimeType || 'image/jpeg');
      applyNutrition(res);
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally { setLoading(false); }
  };

  const submitMeal = async () => {
    if (!form.name || !form.calories) return;
    await addMeal({ name: form.name, calories: +form.calories, protein: +form.protein, carbs: +form.carbs, fat: +form.fat, tag: form.tag, time: form.time });
    setLogModal(false);
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '', tag: 'Lunch', time: new Date().toTimeString().slice(0, 5) });
    setQuery(''); setImgUri(null); setStatus({ ok: null, msg: '' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 }}>
          <Text style={styles.pageTitle}>Fuel</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setLogModal(true)} activeOpacity={0.8}>
            <Text style={{ color: C.cream, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>+ ADD MEAL</Text>
          </TouchableOpacity>
        </View>

        {/* Macro orbs */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <MacroOrb label="Protein" current={totals.p} target={targets.protein} color={C.terra} emoji="🥩" />
            <MacroOrb label="Carbs" current={totals.c} target={targets.carbs} color={C.gold} emoji="🌾" />
            <MacroOrb label="Fat" current={totals.f} target={targets.fat} color={C.sage} emoji="🥑" />
          </View>
          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-between' }}>
            <CalTotal label="Eaten" val={totals.cal} color={C.terra} />
            <CalTotal label="Target" val={targets.calories} color={C.dust} />
            <CalTotal label="Remaining" val={targets.calories - totals.cal} color={targets.calories - totals.cal >= 0 ? C.sage : C.red} />
          </View>
        </View>

        {/* Meals list */}
        <View style={[styles.card, { padding: 0 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 }}>
            <Text style={styles.sectionTitle}>Today's Meals</Text>
          </View>
          {meals.length === 0 && (
            <View style={{ padding: 28, alignItems: 'center' }}>
              <Text style={{ fontSize: 32, marginBottom: 10 }}>🍽️</Text>
              <Text style={{ fontSize: 13, color: C.dust, textAlign: 'center' }}>No meals logged yet. Tap + Add Meal to start.</Text>
            </View>
          )}
          {meals.map((m, i) => (
            <View key={m.id} style={[styles.mealRow, i === 0 && { borderTopWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealName}>{m.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                  <TagPill label={m.tag} />
                  <Text style={{ fontSize: 9, color: C.dust }}>{m.time}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                <Text style={styles.mealCal}>{m.calories}</Text>
                <Text style={{ fontSize: 9, color: C.dust }}>P{m.protein} C{m.carbs} F{m.fat}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteMeal(m.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 22, color: C.dust, lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Daily targets breakdown */}
        <View style={[styles.card, { backgroundColor: C.ink }]}>
          <Text style={[styles.sectionTitle, { color: C.terra }]}>◆ Daily Targets</Text>
          {[{ l: 'Calories', v: `${targets.calories} kcal` }, { l: 'Protein', v: `${targets.protein}g` }, { l: 'Carbs', v: `${targets.carbs}g` }, { l: 'Fat', v: `${targets.fat}g` }].map(x => (
            <View key={x.l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.06)' }}>
              <Text style={{ fontSize: 12, color: 'rgba(245,239,228,.5)' }}>{x.l}</Text>
              <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 14, fontWeight: '700', color: C.cream }}>{x.v}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Log Meal Modal */}
      <Modal visible={logModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLogModal(false)}>
        <SafeAreaView style={styles.root}>
          <View style={styles.modalHandle} />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <Text style={styles.pageTitle}>Log a Meal</Text>

            {/* AI Section */}
            <View style={{ backgroundColor: C.warm, borderRadius: 18, padding: 16, marginBottom: 20 }}>
              <Text style={{ fontSize: 10, color: C.terra, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>◆ AI ANALYZE</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {[{ id: 'text', label: '📝 Describe' }, { id: 'photo', label: '📷 Photo' }].map(t => (
                  <TouchableOpacity key={t.id} onPress={() => { setAiTab(t.id); setStatus({ ok: null, msg: '' }); }}
                    style={{ flex: 1, padding: 9, borderRadius: 99, borderWidth: 1.5, borderColor: aiTab === t.id ? C.terra : C.border, backgroundColor: aiTab === t.id ? `${C.terra}15` : C.paper, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: aiTab === t.id ? C.terra : C.dust }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {aiTab === 'text' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={query} onChangeText={setQuery} onSubmitEditing={analyzeText}
                    placeholder='"2 eggs and toast"' placeholderTextColor={C.dust}
                    style={{ flex: 1, backgroundColor: C.paper, borderWidth: 1, borderColor: C.border, borderRadius: 99, padding: 11, fontSize: 13, color: C.ink }} />
                  <TouchableOpacity onPress={analyzeText} disabled={loading || !query.trim()}
                    style={{ backgroundColor: C.ink, borderRadius: 99, paddingHorizontal: 16, justifyContent: 'center', opacity: loading || !query.trim() ? 0.5 : 1 }}>
                    <Text style={{ color: C.cream, fontSize: 11, fontWeight: '700' }}>{loading ? '…' : 'Go'}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {aiTab === 'photo' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => analyzePhoto(true)} style={styles.photoBtn}>
                    <Text style={{ fontSize: 26, marginBottom: 4 }}>📸</Text>
                    <Text style={{ fontSize: 11, color: C.terra }}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => analyzePhoto(false)} style={[styles.photoBtn, { borderColor: C.border }]}>
                    <Text style={{ fontSize: 26, marginBottom: 4 }}>🖼️</Text>
                    <Text style={{ fontSize: 11, color: C.dust }}>Library</Text>
                  </TouchableOpacity>
                </View>
              )}
              {status.msg && !loading && (
                <Text style={{ marginTop: 10, fontSize: 12, color: status.ok === false ? C.red : status.ok ? C.sage : C.dust }}>{status.msg}</Text>
              )}
            </View>

            {/* Fields */}
            <FLabel>Meal Name</FLabel>
            <FInput value={form.name} onChangeText={v => setField('name', v)} placeholder="e.g. Chicken & Rice" style={{ marginBottom: 14 }} />
            <FLabel>Calories</FLabel>
            <FInput value={form.calories} onChangeText={v => setField('calories', v)} placeholder="e.g. 650" keyboardType="number-pad" style={{ marginBottom: 14 }} />
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              {[{ l: 'Protein (g)', k: 'protein' }, { l: 'Carbs (g)', k: 'carbs' }, { l: 'Fat (g)', k: 'fat' }].map(({ l, k }) => (
                <View key={k} style={{ flex: 1 }}>
                  <FLabel>{l}</FLabel>
                  <FInput value={form[k]} onChangeText={v => setField(k, v)} placeholder="0" keyboardType="number-pad" style={{ textAlign: 'center' }} />
                </View>
              ))}
            </View>
            <FLabel>Category</FLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {MEAL_TAGS.map(t => (
                  <TouchableOpacity key={t} onPress={() => setField('tag', t)}
                    style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1.5, borderColor: form.tag === t ? C.terra : C.border, backgroundColor: form.tag === t ? `${C.terra}15` : C.warm }}>
                    <Text style={{ fontSize: 12, color: form.tag === t ? C.terra : C.dust }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={[styles.addBtn, { borderRadius: 99, padding: 16 }]} onPress={submitMeal} disabled={!form.name || !form.calories}>
              <Text style={{ color: C.cream, fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>ADD MEAL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 14 }} onPress={() => setLogModal(false)}>
              <Text style={{ color: C.dust, fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function MacroOrb({ label, current, target, color, emoji }) {
  const pct = Math.min(current / (target || 1), 1);
  const size = 72; const r = 28; const circ = 2 * Math.PI * r;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ position: 'relative', width: size, height: size }}>
        <Text style={{ position: 'absolute', zIndex: 1, alignSelf: 'center', top: 24, fontSize: 22 }}>{emoji}</Text>
      </View>
      <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 17, fontWeight: '700', color: C.ink }}>{current}<Text style={{ fontSize: 10, color: C.dust }}>g</Text></Text>
      <Text style={{ fontSize: 9, color: C.dust, letterSpacing: 2, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontSize: 9, color: pct >= 1 ? C.sage : C.dust }}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

function CalTotal({ label, val, color }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 18, fontWeight: '700', color }}>{val}</Text>
      <Text style={{ fontSize: 9, color: C.dust, letterSpacing: 1, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function TagPill({ label }) {
  return (
    <View style={{ backgroundColor: C.warm, borderRadius: 99, paddingVertical: 2, paddingHorizontal: 8 }}>
      <Text style={{ fontSize: 9, color: C.dust }}>{label}</Text>
    </View>
  );
}

function FLabel({ children }) {
  return <Text style={{ fontSize: 10, color: C.dust, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{children}</Text>;
}

function FInput({ style, ...props }) {
  return (
    <TextInput placeholderTextColor={C.dust} style={[{ backgroundColor: C.warm, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 13, fontSize: 14, color: C.ink, marginBottom: 4 }, style]} {...props} />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  pageTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 26, fontWeight: '900', color: C.ink },
  addBtn: { backgroundColor: C.terra, borderRadius: 99, paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center' },
  card: { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 20, marginBottom: 16 },
  sectionTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 15, fontStyle: 'italic', color: C.inkLight, marginBottom: 14 },
  mealRow: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: C.border },
  mealName: { fontSize: 13, fontWeight: '500', color: C.ink },
  mealCal: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 17, fontWeight: '700', color: C.terra },
  modalHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 99, margin: 14, alignSelf: 'center' },
  photoBtn: { flex: 1, backgroundColor: C.paper, borderWidth: 2, borderColor: `${C.terra}60`, borderStyle: 'dashed', borderRadius: 14, padding: 20, alignItems: 'center' },
});
