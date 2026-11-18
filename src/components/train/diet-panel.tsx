import { useRouter } from 'expo-router';
import {
  BookOpenIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  PencilLineIcon,
  SaladIcon,
  UtensilsIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { alpha, Bar, Chip, COLORS, IconBubble, Panel, Ring, SectionHeader } from '@/components/kit';
import { EmptyView, ErrorView } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { WaterCard } from '@/components/water-card';
import { api, ApiError } from '@/lib/api';
import { clockTime } from '@/lib/dates';
import type { DietPlan, TodayData, WaterLog } from '@/lib/types';

type DietWithAdherence = DietPlan & {
  my_adherence?: { id: number; status: string; reason: string }[];
};

function MacroBar({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View className="flex-1 gap-1.5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
          {label}
        </Text>
        <Text className="text-xs font-black">{grams}g</Text>
      </View>
      <Bar value={1} color={color} height={6} />
    </View>
  );
}

/**
 * Diet tab of Train — one nutrition view: the plan's daily targets next to what
 * you've actually logged today, your water, the meals, and the adherence check.
 */
export function DietPanel({ refreshKey, onDone }: { refreshKey: number; onDone: () => void }) {
  const router = useRouter();
  const [diet, setDiet] = React.useState<DietWithAdherence | null>(null);
  const [today, setToday] = React.useState<TodayData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [plan, t] = await Promise.all([
        api<DietWithAdherence>('client/diet/').catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) return null;
          throw e;
        }),
        api<TodayData>('client/today/').catch(() => null),
      ]);
      setDiet(plan);
      setToday(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your diet.');
    } finally {
      setLoading(false);
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function submitAdherence(status: 'approved' | 'declined') {
    if (!reason.trim()) {
      setFormError('Add a short reason first — your trainer reads it.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await api('client/diet/adherence/', {
        method: 'POST',
        body: { status, reason: reason.trim(), diet_plan: diet?.id },
      });
      setReason('');
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;
  if (error && !diet) return <ErrorView error={error} onRetry={load} />;
  if (!diet) {
    return (
      <EmptyView
        icon={SaladIcon}
        color={COLORS.amber}
        title="No diet plan yet"
        subtitle="Your trainer hasn't assigned a diet plan to you."
      />
    );
  }

  const logged = today?.diary.calories ?? 0;
  const target = diet.daily_calories || 1;
  const pct = logged / target;
  const left = Math.max(0, target - logged);
  const entries = today?.diary.entries ?? [];

  return (
    <View className="gap-4">
      {/* Targets vs. what you logged today */}
      <Panel tint={COLORS.amber} className="gap-4">
        <View className="flex-row items-center gap-4">
          <Ring progress={pct} size={112} stroke={12} color={pct > 1.05 ? COLORS.rose : COLORS.amber}>
            <Text className="text-2xl font-black">{logged}</Text>
            <Text variant="muted" className="text-[10px] font-bold uppercase tracking-wide">
              kcal today
            </Text>
          </Ring>
          <View className="min-w-0 flex-1 gap-1.5">
            <Text className="text-base font-bold tracking-tight" numberOfLines={2}>
              {diet.name}
            </Text>
            <Text variant="muted" className="text-xs">
              Target {diet.daily_calories} kcal
            </Text>
            <Chip
              label={pct > 1.05 ? `${logged - target} kcal over` : `${left} kcal left`}
              color={pct > 1.05 ? COLORS.rose : COLORS.green}
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <MacroBar label="Protein" grams={diet.protein} color={COLORS.rose} />
          <MacroBar label="Carbs" grams={diet.carbs} color={COLORS.sky} />
          <MacroBar label="Fats" grams={diet.fats} color={COLORS.lime} />
        </View>
      </Panel>

      <WaterCard
        water={today?.water ?? null}
        onUpdated={(log: WaterLog) => setToday((t) => (t ? { ...t, water: log } : t))}
      />

      {/* Today's food diary, right next to the plan */}
      <View>
        <SectionHeader
          title="Eaten today"
          subtitle="From your food diary"
          icon={BookOpenIcon}
          color={COLORS.orange}
          actionLabel="Open diary"
          onAction={() => router.push('/more/diary')}
        />
        <Panel className="gap-2 p-3">
          {entries.length === 0 ? (
            <View className="items-center gap-2 py-3">
              <Text variant="muted" className="text-sm">
                Nothing logged yet today.
              </Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View
                key={entry.id}
                className="flex-row items-center gap-3 rounded-2xl border border-border bg-background/60 px-3 py-2.5">
                <IconBubble icon={UtensilsIcon} color={COLORS.orange} size={32} />
                <Text className="flex-1 text-sm font-bold" numberOfLines={1}>
                  {entry.meal_name}
                </Text>
                {entry.status === 'reviewed' ? (
                  <Icon as={CircleCheckIcon} size={15} color={COLORS.green} />
                ) : null}
                <Text className="text-sm font-black">{entry.calories ?? '—'}</Text>
                <Text variant="muted" className="text-xs">
                  kcal
                </Text>
              </View>
            ))
          )}
          <Pressable
            onPress={() => router.push('/more/diary')}
            accessibilityRole="button"
            className="mt-1 h-11 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80"
            style={{ backgroundColor: COLORS.orange }}>
            <Icon as={PencilLineIcon} size={16} color="#1A0A02" />
            <Text className="text-sm font-black" style={{ color: '#1A0A02' }}>
              Log a meal
            </Text>
          </Pressable>
        </Panel>
      </View>

      {/* The planned meals */}
      <View>
        <SectionHeader title="Meal plan" icon={SaladIcon} color={COLORS.green} />
        {diet.meals.length === 0 ? (
          <EmptyView title="No meals yet" subtitle="This plan has no meals defined." />
        ) : (
          <View className="gap-3">
            {diet.meals.map((meal) => {
              const kcal = meal.items.reduce((n, i) => n + i.calories, 0);
              return (
                <Panel key={meal.id} className="gap-3">
                  <View className="flex-row items-center gap-3">
                    <IconBubble icon={UtensilsIcon} color={COLORS.green} size={38} />
                    <View className="flex-1">
                      <Text className="text-base font-bold tracking-tight">{meal.name}</Text>
                      <View className="flex-row items-center gap-1">
                        <Icon as={ClockIcon} size={12} color={COLORS.muted} />
                        <Text variant="muted" className="text-xs">
                          {clockTime(meal.time)}
                        </Text>
                      </View>
                    </View>
                    <Chip label={`${kcal} kcal`} color={COLORS.amber} />
                  </View>
                  <View className="gap-1.5">
                    {meal.items.map((item) => (
                      <View
                        key={item.id}
                        className="flex-row items-center gap-2 rounded-xl bg-background/60 px-3 py-2">
                        <Text className="min-w-0 flex-1 text-sm font-semibold" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text className="text-xs font-bold" style={{ color: COLORS.amber }}>
                          {item.calories}
                        </Text>
                        <Text className="text-xs font-bold" style={{ color: COLORS.rose }}>
                          P{Math.round(item.protein)}
                        </Text>
                        <Text className="text-xs font-bold" style={{ color: COLORS.sky }}>
                          C{Math.round(item.carbs)}
                        </Text>
                        <Text className="text-xs font-bold" style={{ color: COLORS.lime }}>
                          F{Math.round(item.fats)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Panel>
              );
            })}
          </View>
        )}
      </View>

      {/* Adherence self-report (a reason is required) */}
      <Panel className="gap-3">
        <View>
          <Text className="text-base font-bold tracking-tight">Did you follow this diet?</Text>
          <Text variant="muted" className="text-xs">
            Tell your trainer how it went today.
          </Text>
        </View>
        <Input placeholder="Reason (required)" value={reason} onChangeText={setReason} />
        {formError ? (
          <Text className="text-xs" style={{ color: COLORS.rose }}>
            {formError}
          </Text>
        ) : null}
        <View className="flex-row gap-2">
          <Pressable
            disabled={busy}
            onPress={() => void submitAdherence('approved')}
            accessibilityRole="button"
            className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80"
            style={{ backgroundColor: COLORS.green, opacity: busy ? 0.6 : 1 }}>
            <Icon as={CircleCheckIcon} size={17} color="#04110A" />
            <Text className="text-sm font-black" style={{ color: '#04110A' }}>
              I followed it
            </Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => void submitAdherence('declined')}
            accessibilityRole="button"
            className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80"
            style={{
              backgroundColor: alpha(COLORS.rose, 0.14),
              borderWidth: 1,
              borderColor: alpha(COLORS.rose, 0.4),
              opacity: busy ? 0.6 : 1,
            }}>
            <Icon as={CircleXIcon} size={17} color={COLORS.rose} />
            <Text className="text-sm font-black" style={{ color: COLORS.rose }}>
              I didn&apos;t
            </Text>
          </Pressable>
        </View>
        {(diet.my_adherence ?? []).slice(0, 3).map((row) => (
          <Text key={row.id} variant="muted" className="text-xs">
            {row.status}: {row.reason}
          </Text>
        ))}
      </Panel>
    </View>
  );
}
