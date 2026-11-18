import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Badge, EmptyView, ErrorView, LoadingView } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { format, parseISO, todayISO } from '@/lib/dates';
import type { FoodDiaryEntry } from '@/lib/types';

function shiftDay(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
}

export default function DiaryScreen() {
  const [date, setDate] = React.useState(todayISO());
  const [entries, setEntries] = React.useState<FoodDiaryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [mealName, setMealName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [calories, setCalories] = React.useState('');
  const [photoUri, setPhotoUri] = React.useState<string | null>(null);
  const [intent, setIntent] = React.useState<'actual' | 'intended'>('actual');
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api<FoodDiaryEntry[]>('client/diary/', { query: { date } });
      setEntries(rows);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setEntries([]);
        setError(null);
      } else {
        setError(e instanceof ApiError ? e.message : 'Failed to load diary.');
      }
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    load();
  }, [load]);

  function openDialog() {
    setMealName('');
    setDescription('');
    setCalories('');
    setPhotoUri(null);
    setIntent('actual');
    setDialogError(null);
    setOpen(true);
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function submit() {
    if (!mealName.trim()) {
      setDialogError('Meal name is required.');
      return;
    }
    setSubmitting(true);
    setDialogError(null);
    try {
      let photo_url: string | undefined;
      if (photoUri) {
        photo_url = await uploadToCloudinary(photoUri);
      }
      const parsedCalories = calories.trim() ? Number(calories.trim()) : undefined;
      if (parsedCalories !== undefined && !Number.isFinite(parsedCalories)) {
        setDialogError('Calories must be a number.');
        return;
      }
      await api('client/diary/', {
        method: 'POST',
        body: {
          date,
          meal_name: mealName.trim(),
          description: description.trim(),
          calories: parsedCalories,
          photo_url,
          intent,
        },
      });
      setOpen(false);
      await load();
    } catch (e) {
      setDialogError(e instanceof ApiError || e instanceof Error ? e.message : 'Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  }

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

      <Button className="mb-4" onPress={openDialog}>
        <Icon as={PlusIcon} size={16} />
        <Text>Add entry</Text>
      </Button>

      {loading ? (
        <LoadingView label="Loading diary…" />
      ) : error ? (
        <ErrorView error={error} onRetry={load} />
      ) : entries.length === 0 ? (
        <EmptyView title="No entries" subtitle="Log what you eat so your trainer can review it." />
      ) : (
        <View className="gap-3">
          {entries.map((entry) => (
            <View key={entry.id} className="border-border gap-2 rounded-xl border p-3">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 font-semibold">{entry.meal_name}</Text>
                <Badge
                  label={entry.intent === 'intended' ? 'Intended' : 'Actual'}
                  tone={entry.intent === 'intended' ? 'info' : 'default'}
                />
                <Badge
                  label={entry.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                  tone={entry.status === 'reviewed' ? 'success' : 'warning'}
                />
              </View>
              {entry.description ? <Text variant="muted">{entry.description}</Text> : null}
              {entry.calories !== null ? <Text variant="muted">{entry.calories} kcal</Text> : null}
              {entry.photo_url ? (
                <Image source={{ uri: entry.photo_url }} className="h-48 w-full rounded-lg" contentFit="cover" />
              ) : null}
              {entry.status === 'reviewed' && entry.trainer_feedback ? (
                <Text variant="muted">Trainer: {entry.trainer_feedback}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add diary entry</DialogTitle>
          </DialogHeader>
          <View className="gap-3">
            <View className="flex-row gap-2">
              {(['actual', 'intended'] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={intent === value ? 'default' : 'outline'}
                  onPress={() => setIntent(value)}>
                  <Text className="text-sm">
                    {value === 'actual' ? 'Actually used' : 'Intend to use'}
                  </Text>
                </Button>
              ))}
            </View>
            <Input placeholder="Meal name (e.g. Breakfast)" value={mealName} onChangeText={setMealName} />
            <Textarea placeholder="What did you eat?" value={description} onChangeText={setDescription} />
            <Input
              placeholder="Calories (optional)"
              value={calories}
              onChangeText={setCalories}
              keyboardType="number-pad"
            />
            {photoUri ? (
              <View className="relative self-start">
                <Image source={{ uri: photoUri }} className="h-24 w-24 rounded-lg" contentFit="cover" />
                <Pressable
                  onPress={() => setPhotoUri(null)}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-0.5">
                  <Icon as={XIcon} size={12} className="text-background" />
                </Pressable>
              </View>
            ) : null}
            <Button variant="outline" onPress={pickPhoto}>
              <Text>{photoUri ? 'Change photo' : 'Add photo'}</Text>
            </Button>
            {dialogError ? <Text className="text-red-600 dark:text-red-400">{dialogError}</Text> : null}
            <Button onPress={submit} disabled={submitting}>
              <Text>{submitting ? 'Saving…' : 'Save entry'}</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}
