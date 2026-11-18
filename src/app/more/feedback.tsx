import * as React from 'react';
import { View } from 'react-native';

import { EmptyView, ErrorView, LoadingView, Screen, ScreenHeader } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { shortDate } from '@/lib/dates';
import type { FoodDiaryEntry, WaterLog } from '@/lib/types';

type FeedbackItem = {
  id: string;
  source: string;
  body: string;
  date: string;
};

export default function FeedbackScreen() {
  const [items, setItems] = React.useState<FeedbackItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [diary, water] = await Promise.all([
        api<FoodDiaryEntry[]>('client/diary/').catch(() => [] as FoodDiaryEntry[]),
        api<WaterLog[]>('client/water/').catch(() => [] as WaterLog[]),
      ]);
      const rows: FeedbackItem[] = [];
      for (const entry of diary) {
        if (entry.trainer_feedback) {
          rows.push({
            id: `diary-${entry.id}`,
            source: `Diary · ${entry.meal_name}`,
            body: entry.trainer_feedback,
            date: entry.date,
          });
        }
      }
      for (const log of water) {
        if (log.trainer_feedback) {
          rows.push({
            id: `water-${log.id}`,
            source: 'Water log',
            body: log.trainer_feedback,
            date: log.date,
          });
        }
      }
      rows.sort((a, b) => b.date.localeCompare(a.date));
      setItems(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <ScreenHeader title="Trainer feedback" subtitle="Reviews and recommendations from your trainer" />
      {loading ? (
        <LoadingView label="Loading feedback…" />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyView
          title="No feedback yet"
          subtitle="When your trainer reviews diary or water entries, they show up here."
        />
      ) : (
        <View className="gap-3">
          {items.map((item) => (
            <View key={item.id} className="border-border gap-1 rounded-xl border p-3">
              <Text className="text-sm font-semibold">{item.source}</Text>
              <Text variant="muted" className="text-xs">
                {shortDate(item.date)}
              </Text>
              <Text className="text-sm">{item.body}</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
