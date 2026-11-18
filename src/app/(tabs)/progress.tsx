import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Image } from 'expo-image';
import {
  AwardIcon,
  CameraIcon,
  CrownIcon,
  DropletsIcon,
  DumbbellIcon,
  FlameIcon,
  MedalIcon,
  PercentIcon,
  PlusIcon,
  RulerIcon,
  SaladIcon,
  ScaleIcon,
  StarIcon,
  TargetIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TrophyIcon,
  ZapIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Gradient, powerGradient } from '@/components/gradient';
import {
  alpha,
  Bar,
  Chip,
  COLORS,
  IconBubble,
  Panel,
  Ring,
  SectionHeader,
  Sparkline,
  StatTile,
} from '@/components/kit';
import { ErrorView, LoadingView, Screen, ScreenHeader } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { WATER_GOAL_ML } from '@/components/water-card';
import { api } from '@/lib/api';
import { shortDate } from '@/lib/dates';
import type { ClientProfile, TodayData } from '@/lib/types';

interface AchievementsPayload {
  streak: { current: number; longest: number };
  achievements: { id: number; key: string; label: string; unlocked_at: string }[];
  all_keys: { key: string; label: string }[];
}

const BADGE_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  first_workout: { icon: DumbbellIcon, color: COLORS.green },
  ten_workouts: { icon: MedalIcon, color: COLORS.sky },
  fifty_workouts: { icon: CrownIcon, color: COLORS.amber },
  streak_7: { icon: FlameIcon, color: COLORS.orange },
  streak_30: { icon: ZapIcon, color: COLORS.violet },
  first_weight_log: { icon: ScaleIcon, color: COLORS.cyan },
  first_photo: { icon: CameraIcon, color: COLORS.pink },
  perfect_week: { icon: StarIcon, color: COLORS.lime },
};

type MeasureKey = 'waist' | 'chest' | 'arms' | 'thighs';
const MEASURES: { key: MeasureKey; label: string; color: string; lowerIsBetter: boolean }[] = [
  { key: 'waist', label: 'Waist', color: COLORS.green, lowerIsBetter: true },
  { key: 'chest', label: 'Chest', color: COLORS.sky, lowerIsBetter: false },
  { key: 'arms', label: 'Arms', color: COLORS.pink, lowerIsBetter: false },
  { key: 'thighs', label: 'Thighs', color: COLORS.violet, lowerIsBetter: false },
];

function href(path: string): Href {
  return path as Href;
}

/**
 * Progress — everything that used to be scattered across More (measurements,
 * photos, personal records, badges, food diary and water) as one dashboard.
 */
export default function ProgressScreen() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<ClientProfile | null>(null);
  const [ach, setAch] = React.useState<AchievementsPayload | null>(null);
  const [today, setToday] = React.useState<TodayData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const loaded = React.useRef(false);

  const load = React.useCallback(async (initial: boolean) => {
    if (initial) setLoading(true);
    try {
      const [me, a, t] = await Promise.all([
        api<ClientProfile>('client/me/'),
        api<AchievementsPayload>('client/achievements/').catch(() => null),
        api<TodayData>('client/today/').catch(() => null),
      ]);
      setProfile(me);
      setAch(a);
      setToday(t);
      setError(null);
      loaded.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your progress.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load(true);
  }, [load]);

  // Come back from Measurements / Photos / Records with fresh numbers.
  useFocusEffect(
    React.useCallback(() => {
      if (loaded.current) void load(false);
    }, [load])
  );

  if (loading) return <LoadingView label="Loading your progress…" />;
  if (!profile) return <ErrorView error={error ?? 'Something went wrong.'} onRetry={() => load(true)} />;

  // ---- body ---------------------------------------------------------------
  const measurements = [...profile.measurements].sort((a, b) => a.date.localeCompare(b.date));
  const weightSeries = measurements.map((m) => m.weight).filter((w): w is number => w != null);
  const start = weightSeries[0] ?? profile.current_weight;
  const current = profile.current_weight ?? weightSeries[weightSeries.length - 1] ?? null;
  const target = profile.target_weight;
  let goalPct = 0;
  if (start != null && current != null && target != null && start !== target) {
    goalPct = Math.max(0, Math.min(1, (start - current) / (start - target)));
  }
  const change = start != null && current != null ? current - start : null;

  const last = measurements[measurements.length - 1];
  const prev = measurements[measurements.length - 2];

  // ---- strength -----------------------------------------------------------
  const records = [...profile.records].sort((a, b) => b.weight - a.weight).slice(0, 3);

  // ---- badges -------------------------------------------------------------
  const unlockedKeys = new Set((ach?.achievements ?? profile.achievements).map((a) => a.key));
  const allBadges = ach?.all_keys ?? [];
  const streak = ach?.streak ?? profile.streak ?? { current: 0, longest: 0 };

  // ---- nutrition ----------------------------------------------------------
  const kcalLogged = today?.diary.calories ?? 0;
  const kcalTarget = today?.diet?.macros?.daily_calories ?? 0;
  const water = today?.water?.amount_ml ?? 0;

  const photos = profile.photos.slice(0, 8);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load(false);
      }}>
      <ScreenHeader title="Progress" subtitle="Your body, strength and habits in one place" />

      {/* Goal hero */}
      <Gradient colors={powerGradient} style={{ borderRadius: 28, overflow: 'hidden', marginBottom: 16 }}>
        <View className="gap-4 p-5">
          <View className="flex-row items-center gap-4">
            <Ring progress={goalPct} size={112} stroke={12} color="#FFFFFF">
              <Text className="text-2xl font-black text-white">{Math.round(goalPct * 100)}%</Text>
              <Text className="text-[9px] font-bold uppercase tracking-wide text-white/75">to goal</Text>
            </Ring>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-white/70">Current weight</Text>
              <Text className="text-4xl font-black tracking-tight text-white">
                {current != null ? current.toFixed(1) : '—'}
                <Text className="text-base font-bold text-white/80"> kg</Text>
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Icon as={TargetIcon} size={13} color="#FFFFFF" />
                <Text className="text-xs font-semibold text-white/85">
                  Goal {target != null ? `${target} kg` : 'not set'}
                  {start != null ? ` · from ${start} kg` : ''}
                </Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-end justify-between">
            <View className="gap-1.5">
              {change != null ? (
                <View className="flex-row items-center gap-1.5 self-start rounded-full bg-black/20 px-3 py-1.5">
                  <Icon as={change <= 0 ? TrendingDownIcon : TrendingUpIcon} size={14} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white">
                    {change > 0 ? '+' : ''}
                    {change.toFixed(1)} kg since start
                  </Text>
                </View>
              ) : null}
              {profile.body_fat != null ? (
                <Text className="text-xs font-semibold text-white/80">Body fat {profile.body_fat}%</Text>
              ) : null}
            </View>
            <Sparkline data={weightSeries.slice(-8)} color="#FFFFFF" width={130} height={46} />
          </View>
        </View>
      </Gradient>

      {/* Key numbers */}
      <View className="mb-4 flex-row flex-wrap gap-3">
        <StatTile
          icon={FlameIcon}
          label="Day streak"
          value={String(streak.current)}
          hint={`Best ${streak.longest}`}
          color={COLORS.orange}
          className="w-[48%]"
          onPress={() => router.push(href('/more/achievements'))}
        />
        <StatTile
          icon={DumbbellIcon}
          label="Attendance"
          value={
            today && today.attendance.total > 0
              ? `${Math.round((today.attendance.attended / today.attendance.total) * 100)}%`
              : '—'
          }
          hint={today ? `${today.attendance.attended}/${today.attendance.total} in 30 days` : undefined}
          color={COLORS.green}
          className="w-[48%]"
          onPress={() => router.push(href('/train?tab=sessions'))}
        />
        <StatTile
          icon={TrophyIcon}
          label="Badges"
          value={`${unlockedKeys.size}${allBadges.length ? `/${allBadges.length}` : ''}`}
          hint="Unlocked"
          color={COLORS.amber}
          className="w-[48%]"
          onPress={() => router.push(href('/more/achievements'))}
        />
        <StatTile
          icon={PercentIcon}
          label="Body fat"
          value={profile.body_fat != null ? `${profile.body_fat}%` : '—'}
          hint={last ? `Measured ${shortDate(last.date)}` : 'No data yet'}
          color={COLORS.violet}
          className="w-[48%]"
          onPress={() => router.push(href('/more/measurements'))}
        />
      </View>

      {/* Measurements */}
      <SectionHeader
        title="Body measurements"
        icon={RulerIcon}
        color={COLORS.cyan}
        actionLabel="History"
        onAction={() => router.push(href('/more/measurements'))}
      />
      <Panel className="mb-4 gap-3">
        {last ? (
          <View className="flex-row flex-wrap gap-2.5">
            {MEASURES.map((m) => {
              const now = last[m.key];
              const before = prev?.[m.key];
              const delta = now != null && before != null ? now - before : null;
              const good = delta == null ? true : m.lowerIsBetter ? delta <= 0 : delta >= 0;
              return (
                <View
                  key={m.key}
                  className="w-[48%] gap-0.5 rounded-2xl p-3"
                  style={{ backgroundColor: alpha(m.color, 0.1), borderWidth: 1, borderColor: alpha(m.color, 0.28) }}>
                  <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: m.color }}>
                    {m.label}
                  </Text>
                  <Text className="text-xl font-black">
                    {now != null ? now : '—'}
                    <Text variant="muted" className="text-xs">
                      {' '}
                      cm
                    </Text>
                  </Text>
                  {delta != null && delta !== 0 ? (
                    <Text className="text-[11px] font-bold" style={{ color: good ? COLORS.green : COLORS.amber }}>
                      {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} cm
                    </Text>
                  ) : (
                    <Text variant="muted" className="text-[11px]">
                      No change
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text variant="muted" className="text-sm">
            No measurements yet — add your first to start tracking.
          </Text>
        )}
        <Pressable
          onPress={() => router.push(href('/more/measurements'))}
          accessibilityRole="button"
          className="h-11 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80"
          style={{ backgroundColor: alpha(COLORS.cyan, 0.14), borderWidth: 1, borderColor: alpha(COLORS.cyan, 0.38) }}>
          <Icon as={PlusIcon} size={16} color={COLORS.cyan} />
          <Text className="text-sm font-bold" style={{ color: COLORS.cyan }}>
            Add measurement
          </Text>
        </Pressable>
      </Panel>

      {/* Photos */}
      <SectionHeader
        title="Progress photos"
        icon={CameraIcon}
        color={COLORS.pink}
        actionLabel="All photos"
        onAction={() => router.push(href('/more/photos'))}
      />
      <View className="mb-4">
        {photos.length === 0 ? (
          <Panel onPress={() => router.push(href('/more/photos'))} tint={COLORS.pink} className="flex-row items-center gap-3">
            <IconBubble icon={CameraIcon} color={COLORS.pink} size={44} />
            <View className="flex-1">
              <Text className="text-sm font-bold">Add your first photo</Text>
              <Text variant="muted" className="text-xs">
                Photos make your changes easy to see.
              </Text>
            </View>
            <Icon as={PlusIcon} size={18} color={COLORS.pink} />
          </Panel>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {photos.map((photo) => (
              <View key={photo.id} style={{ width: 112 }}>
                <Image
                  source={{ uri: photo.url }}
                  style={{ width: 112, height: 144, borderRadius: 18, backgroundColor: '#101826' }}
                  contentFit="cover"
                />
                <Text variant="muted" className="mt-1 text-center text-[11px]">
                  {shortDate(photo.date)}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Strength */}
      <SectionHeader
        title="Personal records"
        icon={AwardIcon}
        color={COLORS.amber}
        actionLabel="All records"
        onAction={() => router.push(href('/more/records'))}
      />
      <Panel className="mb-4 gap-2 p-3">
        {records.length === 0 ? (
          <Text variant="muted" className="px-1 py-2 text-sm">
            No records yet — log a heavy set to set your first PR.
          </Text>
        ) : (
          records.map((record, index) => (
            <View
              key={record.id}
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-background/60 px-3 py-2.5">
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: alpha(index === 0 ? COLORS.amber : COLORS.muted, 0.18),
                }}>
                <Icon as={index === 0 ? CrownIcon : MedalIcon} size={16} color={index === 0 ? COLORS.amber : COLORS.muted} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-bold" numberOfLines={1}>
                  {record.exercise}
                </Text>
                <Text variant="muted" className="text-xs">
                  {shortDate(record.date)}
                </Text>
              </View>
              <Text className="text-base font-black" style={{ color: COLORS.amber }}>
                {record.weight}
                <Text variant="muted" className="text-xs">
                  {' '}
                  kg × {record.reps}
                </Text>
              </Text>
            </View>
          ))
        )}
      </Panel>

      {/* Badges */}
      <SectionHeader
        title="Badges"
        subtitle={`${unlockedKeys.size} unlocked`}
        icon={TrophyIcon}
        color={COLORS.orange}
        actionLabel="See all"
        onAction={() => router.push(href('/more/achievements'))}
      />
      <View className="mb-4 flex-row flex-wrap gap-2.5">
        {(allBadges.length > 0
          ? allBadges
          : (ach?.achievements ?? profile.achievements).map((a) => ({ key: a.key, label: a.label }))
        ).map((badge) => {
          const meta = BADGE_ICON[badge.key] ?? { icon: AwardIcon, color: COLORS.amber };
          const unlocked = unlockedKeys.has(badge.key);
          return (
            <View
              key={badge.key}
              className="w-[31%] items-center gap-1.5 rounded-2xl p-2.5"
              style={{
                backgroundColor: unlocked ? alpha(meta.color, 0.12) : 'rgba(148,163,184,0.06)',
                borderWidth: 1,
                borderColor: unlocked ? alpha(meta.color, 0.35) : 'rgba(148,163,184,0.14)',
                opacity: unlocked ? 1 : 0.55,
              }}>
              <IconBubble icon={meta.icon} color={unlocked ? meta.color : COLORS.muted} size={38} />
              <Text className="text-center text-[10.5px] font-bold leading-3" numberOfLines={3}>
                {badge.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Nutrition snapshot — links into the Diet tab */}
      <SectionHeader title="Nutrition today" icon={SaladIcon} color={COLORS.amber} />
      <Panel onPress={() => router.push(href('/train?tab=diet'))} tint={COLORS.amber} className="gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Icon as={SaladIcon} size={16} color={COLORS.amber} />
            <Text className="text-sm font-bold">Calories</Text>
          </View>
          <Text className="text-sm font-black">
            {kcalLogged}
            <Text variant="muted" className="text-xs">
              {kcalTarget ? ` / ${kcalTarget} kcal` : ' kcal'}
            </Text>
          </Text>
        </View>
        <Bar value={kcalTarget ? kcalLogged / kcalTarget : 0} color={COLORS.amber} height={9} />
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Icon as={DropletsIcon} size={16} color={COLORS.cyan} />
            <Text className="text-sm font-bold">Water</Text>
          </View>
          <Text className="text-sm font-black">
            {water}
            <Text variant="muted" className="text-xs">
              {` / ${WATER_GOAL_ML} ml`}
            </Text>
          </Text>
        </View>
        <Bar value={water / WATER_GOAL_ML} color={COLORS.cyan} height={9} />
        <Chip label="Open nutrition →" color={COLORS.amber} />
      </Panel>
    </Screen>
  );
}
