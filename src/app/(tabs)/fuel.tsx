import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EntryEditor } from '@/components/entry-editor';
import { PhotoViewer } from '@/components/photo-viewer';
import { Bar, Big, Btn, Card, Chip, Field, H, Icon, Row, Screen, SpiderSays, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { addDays, dayKey, fmtTime, WEEKDAYS } from '@/lib/dates';
import { caffeineMg, coffeeOf, dayOf, kcalOf, nextWaterReminder, proteinOf, recentFoods, waterMl } from '@/lib/selectors';
import { deletePhoto, getPhoto, type PhotoSource } from '@/lib/photos';
import { useStore } from '@/lib/store';

export default function Fuel() {
  const { state, actions, quip } = useStore();
  const s = state.settings;
  const today = dayOf(state);
  const water = waterMl(today);
  const pct = water / s.waterGoalMl;
  const next = nextWaterReminder(state);

  const hour = new Date().getHours();
  const lineKey = today.food.length === 0 && hour >= 11 ? 'foodNone' : pct >= 1 ? 'waterGoal' : 'waterRemind';
  const spiderLine = useMemo(() => quip(lineKey), [quip, lineKey]);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i - 6);
    return { label: WEEKDAYS[d.getDay()][0], ml: waterMl(dayOf(state, dayKey(d))) };
  });

  return (
    <Screen title="FUEL" subtitle="Water · coffee · food">
      <SpiderSays text={spiderLine} />

      <Card accent={C.water}>
        <H right={<T dim small>{s.notify.water && next && pct < 1 ? `next nag ${fmtTime(next)}` : ''}</T>}>Water</H>
        <Row gap={16}>
          <View style={styles.tank}>
            <View style={[styles.tankFill, { height: `${Math.min(1, pct) * 100}%` }]} />
            <Text style={styles.tankPct}>{Math.round(pct * 100)}%</Text>
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <View>
              <Big color={C.water}>{water}</Big>
              <T dim small mono>
                / {s.waterGoalMl} ml
              </T>
            </View>
            <Btn label={`Glass +${s.glassMl}`} icon="water_drop" kind="blue" onPress={() => actions.addWater(s.glassMl)} />
            <Row>
              <Btn label="Bottle +500" kind="ghost" small onPress={() => actions.addWater(500)} style={{ flex: 1 }} />
              <Btn icon="undo" kind="ghost" small onPress={actions.undoWater} disabled={today.water.length === 0} />
            </Row>
          </View>
        </Row>
        <Row gap={6} style={{ alignItems: 'flex-end', height: 60 }}>
          {week.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: '70%',
                  height: Math.max(3, Math.min(1, d.ml / s.waterGoalMl) * 40),
                  borderRadius: 4,
                  backgroundColor: d.ml >= s.waterGoalMl ? C.water : C.blueDim,
                }}
              />
              <Text style={styles.weekLabel}>{d.label}</Text>
            </View>
          ))}
        </Row>
      </Card>

      <CoffeeCard />
      <FoodCard />
    </Screen>
  );
}

function CoffeeCard() {
  const { state, actions } = useStore();
  const s = state.settings;
  const cups = coffeeOf(dayOf(state));
  const over = cups.length > s.coffeeLimit;
  const [editing, setEditing] = useState<string | null>(null);
  const cup = cups.find((c) => c.id === editing);
  return (
    <Card accent={over ? C.red : C.yellow}>
      <H right={<T dim small mono>{caffeineMg(dayOf(state))} mg caffeine</T>}>Coffee</H>
      <Row gap={4} style={{ flexWrap: 'wrap', minHeight: 36 }}>
        {Array.from({ length: Math.max(s.coffeeLimit, cups.length) }, (_, i) => (
          <Icon key={i} name="coffee" size={32} color={i < cups.length ? (i >= s.coffeeLimit ? C.red : C.yellow) : C.card2} />
        ))}
      </Row>
      {cups.length === 0 ? (
        <T dim small>
          Limit {s.coffeeLimit} cups. Coffee after {s.coffeeCutoffHour}:00 will be judged.
        </T>
      ) : (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {cups.map((c, i) => (
            <Chip key={c.id} label={`☕ ${fmtTime(c.at)}`} active={i >= s.coffeeLimit} onPress={() => setEditing(c.id)} />
          ))}
        </Row>
      )}
      <Row>
        <Btn label="+1 coffee" icon="coffee" onPress={actions.addCoffee} style={{ flex: 1 }} />
        <Btn icon="undo" kind="ghost" small onPress={actions.undoCoffee} disabled={cups.length === 0} />
      </Row>
      {cups.length > 0 ? (
        <T dim small>
          Tap a cup to change its time or delete it.
        </T>
      ) : null}
      {cup ? (
        <EntryEditor
          key={cup.id}
          title="Edit coffee"
          at={cup.at}
          onSave={(at) => actions.updateCoffee(cup.id, at)}
          onDelete={() => actions.removeCoffee(cup.id)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Card>
  );
}

function FoodCard() {
  const { state, actions } = useStore();
  const s = state.settings;
  const today = dayOf(state);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const meals = [...today.food].sort((a, b) => a.at - b.at);
  const meal = meals.find((f) => f.id === editing);
  const recent = recentFoods(state);
  const k = kcalOf(today);
  const p = proteinOf(today);

  const canLog = !!name.trim() || !!photo;
  const log = () => {
    if (!canLog) return;
    actions.addFood({ name: name.trim() || 'Meal', kcal: Number(kcal) || 0, protein: Number(protein) || 0, photo: photo ?? undefined });
    setName('');
    setKcal('');
    setProtein('');
    setPhoto(null);
  };

  const snap = async (source: PhotoSource) => {
    const uri = await getPhoto('meal', source);
    if (!uri) return;
    deletePhoto(photo ?? undefined); // replacing an unsaved photo
    setPhoto(uri);
  };

  return (
    <Card accent={C.green}>
      <H>Food</H>
      <View style={{ gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T small>Protein</T>
          <T small mono dim>
            {p} / {s.proteinGoal} g
          </T>
        </Row>
        <Bar pct={p / s.proteinGoal} color={C.green} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T small>Calories</T>
          <T small mono dim>
            {k} / {s.kcalGoal} kcal
          </T>
        </Row>
        <Bar pct={k / s.kcalGoal} color={C.yellow} />
      </View>

      {recent.length > 0 ? (
        <View style={{ gap: 6 }}>
          <T dim small>
            Quick add
          </T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {recent.map((f) => (
              <Chip key={f.name} label={`${f.name} · ${f.protein}g`} onPress={() => actions.addFood({ name: f.name, kcal: f.kcal, protein: f.protein })} />
            ))}
          </Row>
        </View>
      ) : null}

      <Row>
        {photo ? (
          <Pressable
            onPress={() => setViewing(photo)}
            onLongPress={() => {
              deletePhoto(photo);
              setPhoto(null);
            }}>
            <Image source={{ uri: photo }} style={styles.pending} contentFit="cover" />
          </Pressable>
        ) : null}
        <Field value={name} onChangeText={setName} placeholder="What did you eat? (e.g. 3 eggs + toast)" style={{ flex: 1 }} />
        <Btn icon="barcode_scanner" kind="ghost" small onPress={() => router.push('/scan')} />
        <Btn icon="photo_camera" kind="ghost" small onPress={() => snap('camera')} />
        <Btn icon="photo_library" kind="ghost" small onPress={() => snap('library')} />
      </Row>
      <Row>
        <Field value={kcal} onChangeText={setKcal} placeholder="kcal" keyboardType="numeric" style={{ flex: 1 }} />
        <Field value={protein} onChangeText={setProtein} placeholder="protein g" keyboardType="numeric" style={{ flex: 1 }} />
        <Btn icon="add" onPress={log} disabled={!canLog} />
      </Row>

      {today.food.length === 0 ? (
        <T dim small>
          Nothing logged today.
        </T>
      ) : (
        meals.map((f) => (
          <Row key={f.id}>
            {f.photo ? (
              <Pressable onPress={() => setViewing(f.photo ?? null)}>
                <Image source={{ uri: f.photo }} style={styles.thumb} contentFit="cover" />
              </Pressable>
            ) : null}
            <Pressable onPress={() => setEditing(f.id)} style={styles.foodRow}>
              <Text style={styles.foodTime}>{fmtTime(f.at)}</Text>
              <T style={{ flex: 1 }}>{f.name}</T>
              <T small dim mono>
                {f.kcal} kcal · {f.protein}g
              </T>
            </Pressable>
            <Pressable onPress={() => actions.removeFood(f.id)} hitSlop={8}>
              <Icon name="close" size={18} color={C.faint} />
            </Pressable>
          </Row>
        ))
      )}
      {today.food.length > 0 ? (
        <T dim small>
          Tap a meal to change its time or amounts.
        </T>
      ) : null}
      <PhotoViewer uri={viewing} onClose={() => setViewing(null)} />
      {meal ? (
        <EntryEditor
          key={meal.id}
          title="Edit meal"
          at={meal.at}
          name={meal.name}
          numbers={[
            { key: 'kcal', label: 'Calories', value: meal.kcal, step: 10, min: 0, max: 5000, suffix: 'kcal' },
            { key: 'protein', label: 'Protein', value: meal.protein, step: 1, min: 0, max: 300, suffix: 'g' },
          ]}
          onSave={(at, v) => actions.updateFood(meal.id, { at, name: v.name, kcal: v.numbers.kcal, protein: v.numbers.protein })}
          onDelete={() => actions.removeFood(meal.id)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tank: {
    width: 86,
    height: 150,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: C.water,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: C.blueDim,
  },
  tankFill: { backgroundColor: C.water, width: '100%' },
  tankPct: {
    position: 'absolute',
    alignSelf: 'center',
    top: 62,
    color: C.text,
    fontWeight: '900',
    fontFamily: MONO,
    fontSize: 18,
  },
  weekLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
  foodTime: { color: C.dim, fontFamily: MONO, fontSize: 12 },
  foodRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.card2 },
  pending: { width: 44, height: 44, borderRadius: 10, borderWidth: 2, borderColor: C.green },
});
