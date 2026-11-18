import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { ChevronDownIcon, ChevronRightIcon, PlayIcon, TrophyIcon } from 'lucide-react-native';

import { EmptyView, ErrorView, LoadingView, Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { format, todayISO } from '@/lib/dates';
import type { Achievement, ClientWorkoutDay, Streak, WorkoutPlan } from '@/lib/types';

interface SetLog {
  weight: string;
  reps: string;
  completed: boolean;
  touched: boolean;
}

interface LogEntry {
  planned_exercise: number;
  exercise_name: string;
  set_index: number;
  weight: number;
  reps: number;
  completed: boolean;
}

interface CompleteResult {
  streak: Streak;
  new_achievements: Achievement[];
  total_workouts: number;
}

const EMPTY_SET: SetLog = { weight: '', reps: '', completed: false, touched: false };

function weekdayName(): string {
  return format(new Date(), 'EEEE');
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-lg bg-muted px-1 py-2">
      <Text className="text-sm font-semibold">{value}</Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

export default function WorkoutScreen() {
  const router = useRouter();
  const { id, kind, dayName } = useLocalSearchParams<{ id: string; kind?: string; dayName?: string }>();

  const [plan, setPlan] = React.useState<WorkoutPlan | null>(null);
  const [selectedDayId, setSelectedDayId] = React.useState<number | null>(null);
  const [logs, setLogs] = React.useState<Record<string, SetLog>>({});
  const [openDescriptions, setOpenDescriptions] = React.useState<Record<number, boolean>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notAssigned, setNotAssigned] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const [result, setResult] = React.useState<CompleteResult | null>(null);

  function applyPlan(next: WorkoutPlan) {
    setPlan(next);
    const preferred =
      (kind === 'day' ? next.days.find((day) => day.id === Number(id)) : undefined) ??
      next.days.find((day) => day.day_name === weekdayName()) ??
      next.days[0];
    setSelectedDayId(preferred ? preferred.id : null);
  }

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotAssigned(false);
    try {
      if (kind === 'day') {
        const plans = await api<WorkoutPlan[]>('client/plans/');
        if (plans.length === 0) {
          setPlan(null);
          setNotAssigned(true);
          return;
        }
        let found: WorkoutPlan | undefined = plans.find((item) =>
          item.days.some((day) => day.id === Number(id))
        );
        if (!found && dayName) {
          found = plans.find((item) => item.days.some((day) => day.day_name === dayName));
        }
        if (!found) throw new ApiError(404, { detail: 'No workout plan assigned for today.' });
        applyPlan(found);
      } else {
        applyPlan(await api<WorkoutPlan>(`client/plans/${id}/`));
      }
    } catch (e) {
      setPlan(null);
      if (e instanceof ApiError && e.status === 404) {
        setNotAssigned(true);
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  }, [id, kind, dayName]);

  React.useEffect(() => {
    load();
  }, [load]);

  function updateSet(exerciseId: number, setIndex: number, patch: Partial<SetLog>) {
    const key = `${exerciseId}:${setIndex}`;
    setLogs((prev) => ({
      ...prev,
      [key]: { ...EMPTY_SET, ...prev[key], ...patch, touched: true },
    }));
  }

  function collectEntries(): LogEntry[] {
    if (!plan) return [];
    const entries: LogEntry[] = [];
    for (const day of plan.days) {
      for (const exercise of day.exercises) {
        for (let setIndex = 1; setIndex <= exercise.sets; setIndex += 1) {
          const entry = logs[`${exercise.id}:${setIndex}`];
          if (!entry || !entry.touched) continue;
          if (!entry.completed && !entry.weight.trim() && !entry.reps.trim()) continue;
          entries.push({
            planned_exercise: exercise.id,
            exercise_name: exercise.exercise_detail.name,
            set_index: setIndex,
            weight: Number(entry.weight) || 0,
            reps: Number(entry.reps) || 0,
            completed: entry.completed,
          });
        }
      }
    }
    return entries;
  }

  async function saveLog(): Promise<number> {
    const entries = collectEntries();
    if (entries.length === 0) return 0;
    const res = await api<{ logged: number }>('client/workout/log/', {
      method: 'POST',
      body: { date: todayISO(), entries },
    });
    return res.logged;
  }

  async function onSave() {
    if (saving || finishing) return;
    setSaving(true);
    try {
      const logged = await saveLog();
      Alert.alert('Progress saved', logged > 0 ? `${logged} sets logged.` : 'No new sets to save.');
    } catch (e) {
      Alert.alert('Could not save', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onFinish() {
    if (saving || finishing) return;
    setFinishing(true);
    try {
      await saveLog();
      const res = await api<CompleteResult>('client/workout/complete/', {
        method: 'POST',
        body: { date: todayISO() },
      });
      setLogs({});
      setResult(res);
    } catch (e) {
      Alert.alert('Could not finish workout', errorMessage(e));
    } finally {
      setFinishing(false);
    }
  }

  function exitCelebration(open: boolean) {
    if (!open) {
      setResult(null);
      router.back();
    }
  }

  if (loading) return <LoadingView label="Loading workout…" />;

  if (notAssigned) {
    return (
      <Screen>
        <EmptyView
          title="No workout plan yet"
          subtitle="Your trainer hasn’t assigned a workout plan to you."
          action={
            <Button onPress={() => router.push('/plans')}>
              <Text className="text-sm font-medium">View my plans</Text>
            </Button>
          }
        />
      </Screen>
    );
  }

  if (error || !plan) {
    return (
      <Screen>
        <ErrorView error={error ?? 'Something went wrong.'} onRetry={load} />
      </Screen>
    );
  }

  const day: ClientWorkoutDay | undefined =
    plan.days.find((item) => item.id === selectedDayId) ?? plan.days[0];
  const busy = saving || finishing;

  return (
    <>
      <Screen>
        <View className="mb-4 gap-1">
          <Text variant="h4">{plan.name}</Text>
          <Text variant="muted">Log each set as you go, then finish your workout.</Text>
        </View>

        {plan.days.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
            contentContainerStyle={{ paddingRight: 16 }}>
            {plan.days.map((item) => {
              const active = day ? item.id === day.id : false;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedDayId(item.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5',
                    active ? 'border-primary bg-primary' : 'border-border bg-card'
                  )}>
                  <Text
                    className={cn('text-sm', active ? 'text-primary-foreground' : 'text-foreground')}>
                    {item.day_name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {day ? (
          <View className="mt-4 gap-3">
            {day.exercises.map((exercise) => {
              const detail = exercise.exercise_detail;
              const descriptionOpen = openDescriptions[exercise.id] ?? false;
              return (
                <Card key={exercise.id} className="gap-3 py-4">
                  <CardHeader className="gap-1.5">
                    <Text className="text-base font-semibold">{detail.name}</Text>
                    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
                      <Text variant="muted" className="text-sm">
                        {exercise.sets} × {exercise.reps}
                      </Text>
                      <Text variant="muted" className="text-sm">
                        {exercise.target_weight} kg
                      </Text>
                      <Text variant="muted" className="text-sm">
                        Rest {exercise.rest_seconds}s
                      </Text>
                      {detail.muscle_group ? (
                        <Text variant="muted" className="text-sm">
                          {detail.muscle_group}
                        </Text>
                      ) : null}
                    </View>
                  </CardHeader>
                  <CardContent className="gap-3">
                    {detail.video_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => WebBrowser.openBrowserAsync(detail.video_url)}>
                        <Icon as={PlayIcon} size={14} className="text-primary" />
                        <Text className="text-sm font-medium">Watch video</Text>
                      </Button>
                    ) : null}

                    {detail.description ? (
                      <View className="gap-1">
                        <Pressable
                          onPress={() =>
                            setOpenDescriptions((prev) => ({
                              ...prev,
                              [exercise.id]: !descriptionOpen,
                            }))
                          }
                          className="flex-row items-center gap-1">
                          <Text className="text-sm font-medium text-primary">Description</Text>
                          <Icon
                            as={descriptionOpen ? ChevronDownIcon : ChevronRightIcon}
                            size={14}
                            className="text-primary"
                          />
                        </Pressable>
                        {descriptionOpen ? (
                          <Text variant="muted">{detail.description}</Text>
                        ) : null}
                      </View>
                    ) : null}

                    <View className="gap-1.5">
                      {Array.from({ length: exercise.sets }, (_, index) => index + 1).map(
                        (setIndex) => {
                          const entry = logs[`${exercise.id}:${setIndex}`] ?? EMPTY_SET;
                          return (
                            <View key={setIndex} className="flex-row items-center gap-2">
                              <Text className="w-10 text-sm text-muted-foreground">Set {setIndex}</Text>
                              <Input
                                className="h-11 flex-1 text-center"
                                placeholder="kg"
                                keyboardType="decimal-pad"
                                value={entry.weight}
                                onChangeText={(text) => updateSet(exercise.id, setIndex, { weight: text })}
                              />
                              <Input
                                className="h-11 flex-1 text-center"
                                placeholder="reps"
                                keyboardType="decimal-pad"
                                value={entry.reps}
                                onChangeText={(text) => updateSet(exercise.id, setIndex, { reps: text })}
                              />
                              <Checkbox
                                checked={entry.completed}
                                onCheckedChange={(checked) =>
                                  updateSet(exercise.id, setIndex, { completed: checked })
                                }
                              />
                            </View>
                          );
                        }
                      )}
                    </View>
                  </CardContent>
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyView title="Empty plan" subtitle="This plan has no workout days yet." />
        )}

        <View className="mt-6 gap-2">
          <Button variant="outline" disabled={busy} onPress={onSave}>
            <Text className="text-sm font-medium">{saving ? 'Saving…' : 'Save log'}</Text>
          </Button>
          <Button disabled={busy} onPress={onFinish}>
            <Text className="text-sm font-medium">{finishing ? 'Finishing…' : 'Finish workout'}</Text>
          </Button>
        </View>
      </Screen>

      <Dialog open={result !== null} onOpenChange={exitCelebration}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workout complete!</DialogTitle>
            <DialogDescription>Great session — here is your progress.</DialogDescription>
          </DialogHeader>
          {result ? (
            <View className="gap-3">
              <View className="flex-row gap-2">
                <Stat label="Streak" value={`${result.streak.current}d`} />
                <Stat label="Best streak" value={`${result.streak.longest}d`} />
                <Stat label="Workouts" value={String(result.total_workouts)} />
              </View>
              {result.new_achievements.length > 0 ? (
                <View className="gap-2 rounded-lg border border-border p-3">
                  <View className="flex-row items-center gap-2">
                    <Icon as={TrophyIcon} size={16} className="text-amber-500" />
                    <Text className="text-sm font-semibold">New achievements</Text>
                  </View>
                  {result.new_achievements.map((achievement) => (
                    <Text key={achievement.id} variant="muted">
                      {achievement.label}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
          <DialogFooter>
            <Button onPress={() => exitCelebration(false)}>
              <Text className="text-sm font-medium">Done</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
