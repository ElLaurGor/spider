import { Chip, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { addDays, dayKey, WEEKDAYS } from '@/lib/dates';

/** Today and the 6 days before it, newest first. Past days can be fixed; they earn no XP. */
export function DayPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const today = dayKey();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), -i);
    return { key: dayKey(d), label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : WEEKDAYS[d.getDay()] };
  });
  return (
    <>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {days.map((d) => (
          <Chip key={d.key} label={d.label} active={value === d.key} color={C.cyan} onPress={() => onChange(d.key)} />
        ))}
      </Row>
      {value !== today ? (
        <T small style={{ color: C.cyan }}>
          Fixing {days.find((d) => d.key === value)?.label.toLowerCase() ?? 'a past day'}. Back-dated entries earn no XP.
        </T>
      ) : null}
    </>
  );
}
