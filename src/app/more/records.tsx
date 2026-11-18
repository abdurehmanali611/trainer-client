import { MedalIcon } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { EmptyView, ErrorView, LoadingView } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { shortDate } from '@/lib/dates';
import type { PersonalRecord } from '@/lib/types';

export default function RecordsScreen() {
  const [records, setRecords] = React.useState<PersonalRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const rows = await api<PersonalRecord[]>('client/records/');
      setRecords(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, PersonalRecord[]>();
    for (const record of records) {
      const arr = map.get(record.exercise) ?? [];
      arr.push(record);
      map.set(record.exercise, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [records]);

  if (loading) return <LoadingView label="Loading records…" />;
  if (error) return <ErrorView error={error} onRetry={load} />;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-12">
      {records.length === 0 ? (
        <EmptyView
          title="No personal records yet"
          subtitle="Records are created automatically from your logged workouts."
        />
      ) : (
        <View className="gap-4 py-3">
          {grouped.map(([exercise, rows]) => (
            <View key={exercise} className="border-border gap-2 rounded-xl border p-3">
              <View className="flex-row items-center gap-2">
                <Icon as={MedalIcon} size={18} className="text-amber-500" />
                <Text className="font-semibold">{exercise}</Text>
              </View>
              {rows.map((record) => (
                <View key={record.id} className="flex-row items-center justify-between">
                  <Text>
                    {record.weight} kg × {record.reps}
                  </Text>
                  <Text variant="muted">{shortDate(record.date)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
