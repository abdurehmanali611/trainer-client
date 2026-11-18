import { useRouter } from 'expo-router';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DumbbellIcon,
  FlameIcon,
  PlayIcon,
  TimerIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Gradient, powerGradient } from '@/components/gradient';
import { alpha, Chip, COLORS, IconBubble, Panel } from '@/components/kit';
import { EmptyView, ErrorView } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api } from '@/lib/api';
import { shortDate } from '@/lib/dates';
import type { ClientWorkoutDay, TodayData, WorkoutPlan } from '@/lib/types';

const GROUP_COLOR: Record<string, string> = {
  Chest: COLORS.sky,
  Back: COLORS.violet,
  Legs: COLORS.green,
  Shoulders: COLORS.amber,
  Arms: COLORS.pink,
  Core: COLORS.orange,
  Cardio: COLORS.rose,
};

function dayGroups(day: ClientWorkoutDay): string[] {
  return Array.from(new Set(day.exercises.map((e) => e.exercise_detail.muscle_group).filter(Boolean)));
}

/** Workouts tab of Train: every assigned plan, today's day highlighted. */
export function WorkoutsPanel({ refreshKey, onDone }: { refreshKey: number; onDone: () => void }) {
  const router = useRouter();
  const [plans, setPlans] = React.useState<WorkoutPlan[] | null>(null);
  const [todayDayId, setTodayDayId] = React.useState<number | null>(null);
  const [todayDayName, setTodayDayName] = React.useState<string | null>(null);
  const [openDay, setOpenDay] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [list, today] = await Promise.all([
        api<WorkoutPlan[]>('client/plans/'),
        api<TodayData>('client/today/').catch(() => null),
      ]);
      setPlans(list);
      setTodayDayId(today?.today_workout?.id ?? null);
      setTodayDayName(today?.today_workout?.day_name ?? null);
      setOpenDay((prev) => prev ?? today?.today_workout?.id ?? list[0]?.days[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load workouts.');
    } finally {
      setLoading(false);
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const isToday = (day: ClientWorkoutDay) =>
    (todayDayId !== null && day.id === todayDayId) ||
    (todayDayName !== null && day.day_name === todayDayName);

  function start(plan: WorkoutPlan, day?: ClientWorkoutDay) {
    if (day) {
      router.push({
        pathname: '/workout/[id]',
        params: { id: String(day.id), kind: 'day', dayName: day.day_name },
      });
    } else {
      router.push({ pathname: '/workout/[id]', params: { id: String(plan.id) } });
    }
  }

  if (loading) return null;
  if (error && !plans) return <ErrorView error={error} onRetry={load} />;
  if (!plans || plans.length === 0) {
    return (
      <EmptyView
        icon={DumbbellIcon}
        title="No workout plan yet"
        subtitle="Your trainer hasn't assigned a workout plan to you."
      />
    );
  }

  return (
    <View className="gap-4">
      {plans.map((plan) => {
        const todayDay = plan.days.find(isToday);
        const total = plan.days.reduce((n, d) => n + d.exercises.length, 0);
        return (
          <View key={plan.id} className="gap-3">
            {/* Plan header */}
            <Gradient colors={powerGradient} style={{ borderRadius: 28, overflow: 'hidden' }}>
              <View className="gap-3 p-5">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-black/20">
                    <Icon as={DumbbellIcon} size={22} color="#FFFFFF" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-lg font-black tracking-tight text-white" numberOfLines={1}>
                      {plan.name}
                    </Text>
                    <Text className="text-xs font-medium text-white/75">
                      {plan.days.length} days · {total} exercises · since {shortDate(plan.created_at)}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => start(plan, todayDay)}
                  accessibilityRole="button"
                  className="h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-white active:opacity-85">
                  <Icon as={PlayIcon} size={16} color="#065F46" />
                  <Text className="text-sm font-black" style={{ color: '#065F46' }}>
                    {todayDay ? `Start ${todayDay.day_name}` : 'Start workout'}
                  </Text>
                </Pressable>
              </View>
            </Gradient>

            {/* Days */}
            {plan.days.map((day) => {
              const today = isToday(day);
              const open = openDay === day.id;
              const groups = dayGroups(day);
              return (
                <Panel key={day.id} tint={today ? COLORS.green : undefined} className="gap-3 p-0">
                  <Pressable
                    onPress={() => setOpenDay(open ? null : day.id)}
                    accessibilityRole="button"
                    className="flex-row items-center gap-3 p-4 active:opacity-80">
                    <IconBubble icon={today ? FlameIcon : DumbbellIcon} color={today ? COLORS.green : COLORS.sky} size={40} />
                    <View className="min-w-0 flex-1 gap-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="shrink text-base font-bold tracking-tight" numberOfLines={1}>
                          {day.day_name}
                        </Text>
                        {today ? <Chip label="Today" color={COLORS.green} /> : null}
                      </View>
                      <View className="flex-row flex-wrap gap-1.5">
                        <Text variant="muted" className="text-xs">
                          {day.exercises.length} exercises
                        </Text>
                        {groups.slice(0, 3).map((g) => (
                          <Text key={g} className="text-xs font-semibold" style={{ color: GROUP_COLOR[g] ?? COLORS.muted }}>
                            · {g}
                          </Text>
                        ))}
                      </View>
                    </View>
                    <Icon as={open ? ChevronUpIcon : ChevronDownIcon} size={18} color={COLORS.muted} />
                  </Pressable>

                  {open ? (
                    <View className="gap-2 px-4 pb-4">
                      {day.exercises.length === 0 ? (
                        <Text variant="muted" className="text-sm">
                          No exercises yet.
                        </Text>
                      ) : (
                        day.exercises.map((exercise, index) => {
                          const group = exercise.exercise_detail.muscle_group;
                          const color = GROUP_COLOR[group] ?? COLORS.muted;
                          return (
                            <View
                              key={exercise.id}
                              className="flex-row items-center gap-3 rounded-2xl border border-border bg-background/60 p-3">
                              <View
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 10,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: alpha(color, 0.16),
                                }}>
                                <Text className="text-xs font-black" style={{ color }}>
                                  {index + 1}
                                </Text>
                              </View>
                              <View className="min-w-0 flex-1 gap-0.5">
                                <Text className="text-sm font-bold" numberOfLines={1}>
                                  {exercise.exercise_detail.name}
                                </Text>
                                <View className="flex-row items-center gap-1.5">
                                  <Text className="text-xs font-semibold" style={{ color }}>
                                    {group}
                                  </Text>
                                  <Icon as={TimerIcon} size={11} color={COLORS.muted} />
                                  <Text variant="muted" className="text-xs">
                                    {exercise.rest_seconds}s rest
                                  </Text>
                                </View>
                              </View>
                              <View className="items-end">
                                <Text className="text-sm font-black">
                                  {exercise.sets}×{exercise.reps}
                                </Text>
                                {exercise.target_weight ? (
                                  <Text variant="muted" className="text-xs">
                                    {exercise.target_weight} kg
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  ) : null}
                </Panel>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
