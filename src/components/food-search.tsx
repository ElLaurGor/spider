import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { T } from '@/components/ui';
import { C } from '@/constants/theme';
import { loadFoods, searchFoods, type Food } from '@/lib/food-db';

/** Livsmedelsverket matches for what's typed in the food field. Tapping one fills in its nutrition. */
export function FoodSuggestions({ query, onPick }: { query: string; onPick: (food: Food) => void }) {
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [failed, setFailed] = useState(false);
  const wanted = query.trim().length >= 2;

  useEffect(() => {
    if (!wanted || foods) return;
    let alive = true;
    loadFoods()
      .then((list) => {
        if (alive) setFoods(list);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [wanted, foods]);

  const matches = useMemo(() => (foods ? searchFoods(foods, query, 5) : []), [foods, query]);

  if (!wanted) return null;
  if (!foods) {
    return failed ? (
      <T dim small>
        Food search needs internet. Type kcal and protein yourself.
      </T>
    ) : (
      <ActivityIndicator color={C.green} />
    );
  }
  if (matches.length === 0) return null; // free text like "3 eggs + toast" gets logged as typed
  return (
    <View style={{ gap: 4 }}>
      {matches.map((f) => (
        <Pressable key={f.id} onPress={() => onPick(f)} style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}>
          <Text style={styles.name} numberOfLines={1}>
            {f.name}
          </Text>
        </Pressable>
      ))}
      <T dim small>
        Livsmedelsverket · tap one to fill in kcal and protein
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border },
  name: { color: C.text, fontSize: 14 },
});
