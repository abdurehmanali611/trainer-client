import { ChevronLeftIcon, ChevronRightIcon, DropletsIcon, PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Badge, EmptyView, ErrorView, LoadingView } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { format, parseISO, todayISO } from '@/lib/dates';
import type { WaterLog } from '@/lib/types';

function shiftDay(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
}

const QUICK_AMOUNTS = [250, 500, 1000];

export default function WaterScreen() {
  const [date, setDate] = React.useState(todayISO());
  const [logs, setLogs] = React.useState<WaterLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [custom, setCustom] = React.useState('');
  const [adding, setAdding] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api<WaterLog[]>('client/water/', { query: { date } });
      setLogs(rows);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setLogs([]);
        setError(null);
      } else {
        setError(e instanceof ApiError ? e.message : 'Failed to load water log.');
      }
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function addWater(amountMl: number) {
    if (!Number.isFinite(amountMl) || amountMl <= 0) return;
    setAdding(true);
    try {
      await api('client/water/', { method: 'POST', body: { date, amount_ml: amountMl } });
      setCustom('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to add water.');
    } finally {
      setAdding(false);
    }
  }

  const totalMl = logs.reduce((sum, log) => sum + log.amount_ml, 0);
  const reviewed = logs.some((log) => log.reviewed);
  const feedback = logs.find((log) => log.trainer_feedback)?.trainer_feedback ?? '';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-12">
      <View className="flex-row items-center justify-between py-3">
        <Pressable onPress={() => setDate((d) => shiftDay(d, -1))} className="p-2" hitSlop={8}>
          <Icon as={ChevronLeftIcon} size={22} />
        </Pressable>
        <View className="items-center">
          <Text variant="h4">{date === todayISO() ? 'Today' : format(parseISO(date), 'EEE, MMM d, yyyy')}</Text>
          {date !== todayISO() ? (
            <Pressable onPress={() => setDate(todayISO())}>
              <Text className="text-primary font-medium">Back to today</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => setDate((d) => shiftDay(d, 1))} className="p-2" hitSlop={8}>
          <Icon as={ChevronRightIcon} size={22} />
        </Pressable>
      </View>

      <View className="border-border mb-4 items-center gap-1 rounded-xl border p-4">
        <Icon as={DropletsIcon} size={26} className="text-blue-500" />
        <Text variant="h2">{totalMl.toLocaleString()} ml</Text>
        <Text variant="muted">Total for {date === todayISO() ? 'today' : format(parseISO(date), 'MMM d')}</Text>
        {reviewed ? <Badge label="Reviewed" tone="success" className="mt-1" /> : null}
        {feedback ? <Text variant="muted">Trainer: {feedback}</Text> : null}
      </View>

      <Text variant="h4" className="mb-2">
        Quick add
      </Text>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <Button key={amount} variant="outline" disabled={adding} onPress={() => addWater(amount)}>
            <Text>+{amount} ml</Text>
          </Button>
        ))}
      </View>
      <View className="mb-6 flex-row gap-2">
        <Input
          placeholder="Custom amount (ml)"
          value={custom}
          onChangeText={setCustom}
          keyboardType="number-pad"
          className="flex-1"
        />
        <Button
          disabled={adding || !custom.trim()}
          onPress={() => addWater(Number(custom.trim()))}>
          <Icon as={PlusIcon} size={16} />
          <Text>Add</Text>
        </Button>
      </View>

      {loading ? (
        <LoadingView label="Loading water…" />
      ) : error ? (
        <ErrorView error={error} onRetry={load} />
      ) : logs.length === 0 ? (
        <EmptyView title="No water logged" subtitle="Use the buttons above to log a drink." />
      ) : (
        <View className="gap-2">
          <Text variant="h4">Entries</Text>
          {logs.map((log) => (
            <View key={log.id} className="border-border flex-row items-center justify-between rounded-xl border p-3">
              <Text className="font-medium">{log.amount_ml} ml</Text>
              {log.reviewed ? <Badge label="Reviewed" tone="success" /> : <Badge label="Pending" tone="default" />}
            </View>
          ))}
          <Text variant="muted">Only the selected day is shown.</Text>
        </View>
      )}
    </ScrollView>
  );
}
