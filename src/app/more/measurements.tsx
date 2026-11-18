import { PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { EmptyView, ErrorView, LoadingView } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { DateField } from '@/components/ui/calendar';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { shortDate, todayISO } from '@/lib/dates';
import type { Measurement } from '@/lib/types';

const FIELDS: { key: keyof Omit<Measurement, 'id' | 'date'>; label: string }[] = [
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'body_fat', label: 'Body fat (%)' },
  { key: 'chest', label: 'Chest (cm)' },
  { key: 'waist', label: 'Waist (cm)' },
  { key: 'arms', label: 'Arms (cm)' },
  { key: 'thighs', label: 'Thighs (cm)' },
];

function formatValue(value: number | null): string {
  return value === null ? '—' : String(value);
}

function parseOptionalNumber(raw: string): number | undefined | null {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function MeasurementsScreen() {
  const [measurements, setMeasurements] = React.useState<Measurement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(todayISO());
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const rows = await api<Measurement[]>('client/measurements/');
      setMeasurements([...rows].reverse());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load measurements.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function openDialog() {
    setDate(todayISO());
    setValues({});
    setDialogError(null);
    setOpen(true);
  }

  async function submit() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setDialogError('Pick a date.');
      return;
    }
    const body: Record<string, unknown> = { date: date.trim() };
    for (const field of FIELDS) {
      const parsed = parseOptionalNumber(values[field.key] ?? '');
      if (parsed === null) {
        setDialogError(`${field.label} must be a number.`);
        return;
      }
      if (parsed !== undefined) body[field.key] = parsed;
    }
    setSubmitting(true);
    setDialogError(null);
    try {
      await api('client/measurements/', { method: 'POST', body });
      setOpen(false);
      await load();
    } catch (e) {
      setDialogError(e instanceof ApiError ? e.message : 'Failed to save measurements.');
    } finally {
      setSubmitting(false);
    }
  }

  const trend = React.useMemo(() => {
    const withWeight = measurements.filter((m) => m.weight !== null).slice(0, 10).reverse();
    if (withWeight.length < 2) return null;
    const weights = withWeight.map((m) => m.weight as number);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const span = max - min || 1;
    return weights.map((w) => ({ weight: w, ratio: (w - min) / span }));
  }, [measurements]);

  if (loading) return <LoadingView label="Loading measurements…" />;
  if (error) return <ErrorView error={error} onRetry={load} />;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-12">
      <Button className="my-3" onPress={openDialog}>
        <Icon as={PlusIcon} size={16} />
        <Text>Add measurement</Text>
      </Button>

      {measurements.length === 0 ? (
        <EmptyView title="No measurements" subtitle="Log your body metrics to track progress." />
      ) : (
        <View className="gap-3">
          {trend ? (
            <View className="border-border mb-2 gap-2 rounded-xl border p-4">
              <Text variant="h4">Weight trend</Text>
              <View className="h-24 flex-row items-end gap-1.5">
                {trend.map((bar, i) => (
                  <View key={i} className="flex-1 items-center gap-1">
                    <View
                      className="w-full rounded-t bg-primary"
                      style={{ height: `${Math.max(8, bar.ratio * 100)}%` }}
                    />
                    <Text className="text-muted-foreground text-[10px]">{bar.weight}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {measurements.map((m) => (
            <View key={m.id} className="border-border gap-2 rounded-xl border p-3">
              <Text className="font-semibold">{shortDate(m.date)}</Text>
              <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                <Text variant="muted">Weight: {formatValue(m.weight)}</Text>
                <Text variant="muted">Fat: {formatValue(m.body_fat)}</Text>
                <Text variant="muted">Chest: {formatValue(m.chest)}</Text>
                <Text variant="muted">Waist: {formatValue(m.waist)}</Text>
                <Text variant="muted">Arms: {formatValue(m.arms)}</Text>
                <Text variant="muted">Thighs: {formatValue(m.thighs)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add measurement</DialogTitle>
          </DialogHeader>
          <View className="gap-3">
            <DateField label="Date" value={date} onChange={setDate} maxDate={todayISO()} />
            {FIELDS.map((field) => (
              <Input
                key={field.key}
                placeholder={field.label}
                value={values[field.key] ?? ''}
                onChangeText={(t) => setValues((prev) => ({ ...prev, [field.key]: t }))}
                keyboardType="decimal-pad"
              />
            ))}
            {dialogError ? <Text className="text-red-600 dark:text-red-400">{dialogError}</Text> : null}
            <Button onPress={submit} disabled={submitting}>
              <Text>{submitting ? 'Saving…' : 'Save'}</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}
