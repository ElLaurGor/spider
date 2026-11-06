import { Card, Chip, H, Row, T } from '@/components/ui';
import { EVENT_CATEGORIES, VISIT_CREDIT } from '@/lib/sthlm-events';
import { useStore } from '@/lib/store';

/** Settings: the Visit Stockholm categories behind HQ's weekend card. None picked = no card. */
export function WeekendSettings() {
  const { state, actions } = useStore();
  const picked = state.settings.sthlmEvents ?? [];
  const toggle = (slug: string) =>
    actions.updateSettings({ sthlmEvents: picked.includes(slug) ? picked.filter((x) => x !== slug) : [...picked, slug] });
  return (
    <Card>
      <H>This weekend in Stockholm</H>
      <T dim small>
        {picked.length
          ? `Thursday to Saturday, HQ shows three weekend events from ${picked.length} categor${picked.length === 1 ? 'y' : 'ies'}, with the nearest station and an Add to Plan button.`
          : 'Pick what you like and HQ shows three weekend events from Thursday to Saturday, with the nearest station and an Add to Plan button. Nothing picked, no card.'}
      </T>
      <Row style={{ flexWrap: 'wrap' }} gap={8}>
        {EVENT_CATEGORIES.map((c) => (
          <Chip key={c.slug} label={c.label} active={picked.includes(c.slug)} onPress={() => toggle(c.slug)} />
        ))}
      </Row>
      <T dim small>
        Events from {VISIT_CREDIT}, open data (CC BY 4.0).
      </T>
    </Card>
  );
}
