import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  CalendarClockIcon,
  ChevronRightIcon,
  ClockIcon,
  DumbbellIcon,
  FlameIcon,
  MapPinIcon,
  PlayIcon,
  ReceiptIcon,
  SaladIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  TrophyIcon,
  UserXIcon,
  VideoIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Gradient, HeroCard, powerGradient } from '@/components/gradient';
import {
  alpha,
  Chip,
  COLORS,
  IconBubble,
  Panel,
  Ring,
  SectionHeader,
  Sparkline,
} from '@/components/kit';
import { NotificationBell } from '@/components/notification-bell';
import { PaymentWarningBadge } from '@/components/payment-warning';
import { ErrorView, LoadingView, Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/calendar';
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
import { WaterCard } from '@/components/water-card';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { clockTime, dayLabel, format, parseISO, shortDate, todayISO } from '@/lib/dates';
import type { Session, TodayData, WaterLog, WorkoutDay } from '@/lib/types';

function greetingForHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function accessMessage(state: string): string {
  if (state === 'blocked_unpaid') {
    return 'A payment is waiting for your trainer to review it. Update your payment to keep training.';
  }
  if (state === 'blocked_no_period') {
    return 'Your subscription period has ended. Renew or contact your trainer to restore access.';
  }
  return 'Your account needs attention to keep full access.';
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

function href(path: string): Href {
  return path as Href;
}

/** "in 2h 15m" / "in 3 days" style hint for a session start. */
function startsIn(session: Session): string {
  const start = new Date(`${session.date}T${session.time}`);
  const mins = Math.round((start.getTime() - Date.now()) / 60000);
  if (Number.isNaN(mins)) return '';
  if (mins <= 0) return mins > -session.duration_minutes ? 'Happening now' : 'Started';
  if (mins < 60) return `in ${mins} min`;
  if (mins < 24 * 60) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  const days = Math.round(mins / (24 * 60));
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { client } = useAuth();

  const [data, setData] = React.useState<TodayData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [rescheduleDate, setRescheduleDate] = React.useState('');
  const [rescheduleReason, setRescheduleReason] = React.useState('');
  const [permissionOpen, setPermissionOpen] = React.useState(false);
  const [permissionKind, setPermissionKind] = React.useState<'late' | 'absent'>('late');
  const [permissionReason, setPermissionReason] = React.useState('');
  const [requestBusy, setRequestBusy] = React.useState(false);

  const loadedRef = React.useRef(false);

  const load = React.useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    try {
      setData(await api<TodayData>('client/today/'));
      setError(null);
      loadedRef.current = true;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load(true);
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      if (loadedRef.current) void load(false);
    }, [load])
  );

  function openWorkout(day: WorkoutDay) {
    router.push({
      pathname: '/workout/[id]',
      params: { id: String(day.id), kind: 'day', dayName: day.day_name },
    });
  }

  function openReschedule() {
    setRescheduleDate('');
    setRescheduleReason('');
    setRescheduleOpen(true);
  }

  function openPermission(kind: 'late' | 'absent') {
    setPermissionKind(kind);
    setPermissionReason('');
    setPermissionOpen(true);
  }

  async function submitReschedule() {
    if (!data?.next_session) return;
    const date = rescheduleDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Pick a date', 'Choose the new date for your session.');
      return;
    }
    setRequestBusy(true);
    try {
      await api('client/requests/reschedule/', {
        method: 'POST',
        body: {
          session_id: data.next_session.id,
          requested_date: date,
          reason: rescheduleReason.trim(),
        },
      });
      setRescheduleOpen(false);
      Alert.alert('Request sent', 'Your trainer will review the reschedule request.');
    } catch (e) {
      Alert.alert('Could not send request', errorMessage(e));
    } finally {
      setRequestBusy(false);
    }
  }

  async function submitPermission() {
    if (!data?.next_session) return;
    setRequestBusy(true);
    try {
      await api('client/requests/permission/', {
        method: 'POST',
        body: {
          kind: permissionKind,
          date: data.next_session.date,
          reason: permissionReason.trim(),
        },
      });
      setPermissionOpen(false);
      Alert.alert(
        'Request sent',
        permissionKind === 'late'
          ? 'Your trainer has been notified that you will be late.'
          : 'Your trainer has been notified that you cannot attend.'
      );
    } catch (e) {
      Alert.alert('Could not send request', errorMessage(e));
    } finally {
      setRequestBusy(false);
    }
  }

  if (loading) return <LoadingView label="Loading your day…" />;
  if (!data) return <ErrorView error={error ?? 'Something went wrong.'} onRetry={() => load(true)} />;

  const name = client?.name?.split(' ')[0] ?? '';
  const access = data.billing.access;
  const invoice = data.billing.invoice;
  const daysLeft = data.billing.payment_requirement.days_left;
  const invoicePending =
    invoice !== null && (invoice.status === 'pending' || invoice.status === 'overdue');
  const workout = data.today_workout;
  const session = data.next_session;
  const later = data.upcoming_sessions.filter((s) => s.id !== session?.id).slice(0, 3);
  const diet = data.diet;
  const target = diet?.macros?.daily_calories ?? 0;
  const logged = data.diary.calories;
  const progress = data.progress;
  const change =
    progress.start_weight != null && progress.current_weight != null
      ? progress.current_weight - progress.start_weight
      : null;
  const attendancePct =
    data.attendance.total > 0 ? Math.round((data.attendance.attended / data.attendance.total) * 100) : null;
  const latestBadge = data.recent_achievements[0];

  return (
    <>
      <Screen
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load(false);
        }}>
        {/* Hero */}
        <HeroCard colors={powerGradient} className="mb-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-white/70">
                {format(new Date(), 'EEEE, MMM d')}
              </Text>
              <Text className="mt-1 text-[26px] font-black leading-8 tracking-tight text-white">
                {greetingForHour()}
                {name ? `,\n${name}` : ''}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <NotificationBell />
              <PaymentWarningBadge daysLeft={daysLeft} />
            </View>
          </View>
          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="flex-row items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
              <Icon as={FlameIcon} color="#FDE68A" size={14} />
              <Text className="text-xs font-bold text-white">{data.streak.current} day streak</Text>
            </View>
            {attendancePct !== null ? (
              <View className="flex-row items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
                <Icon as={DumbbellIcon} color="#BBF7D0" size={14} />
                <Text className="text-xs font-bold text-white">{attendancePct}% attendance</Text>
              </View>
            ) : null}
            {latestBadge ? (
              <View className="flex-row items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
                <Icon as={TrophyIcon} color="#FDE68A" size={14} />
                <Text className="text-xs font-bold text-white" numberOfLines={1}>
                  {latestBadge.label}
                </Text>
              </View>
            ) : null}
          </View>
        </HeroCard>

        {/* Billing alerts */}
        {access.state === 'blocked_unpaid' ? (
          <Panel tint={COLORS.amber} className="mb-3 gap-3">
            <View className="flex-row items-start gap-3">
              <IconBubble icon={TriangleAlertIcon} color={COLORS.amber} size={38} />
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-bold" style={{ color: COLORS.amber }}>
                  Account on hold
                </Text>
                <Text variant="muted" className="text-sm leading-5">
                  {accessMessage(access.state)}
                </Text>
              </View>
            </View>
            <Button size="sm" onPress={() => router.push('/more/billing')}>
              <Text className="text-sm font-bold">Go to billing</Text>
            </Button>
          </Panel>
        ) : null}

        {invoicePending ? (
          <Panel
            tint={invoice.status === 'overdue' ? COLORS.rose : COLORS.amber}
            className="mb-3 flex-row items-center gap-3">
            <IconBubble
              icon={ReceiptIcon}
              color={invoice.status === 'overdue' ? COLORS.rose : COLORS.amber}
              size={40}
            />
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-bold">
                {invoice.status === 'overdue' ? 'Payment overdue' : 'Payment due'}
              </Text>
              <Text variant="muted" className="text-xs">
                {invoice.amount} · due {shortDate(invoice.due_date)}
              </Text>
            </View>
            <Button size="sm" onPress={() => router.push('/more/billing')}>
              <Text className="text-sm font-bold">Pay</Text>
            </Button>
          </Panel>
        ) : null}

        {/* Next session — with the plans attached to it */}
        <SectionHeader title="Next session" icon={CalendarClockIcon} color={COLORS.sky} />
        {session ? (
          <Panel tint={COLORS.sky} className="mb-4 gap-3">
            <View className="flex-row items-center gap-3">
              <View
                style={{
                  width: 58,
                  height: 64,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: alpha(COLORS.sky, 0.18),
                  borderWidth: 1,
                  borderColor: alpha(COLORS.sky, 0.4),
                }}>
                <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: COLORS.sky }}>
                  {format(parseISO(session.date), 'EEE')}
                </Text>
                <Text className="text-2xl font-black leading-7">{format(parseISO(session.date), 'd')}</Text>
                <Text className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {format(parseISO(session.date), 'MMM')}
                </Text>
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-lg font-black tracking-tight">
                  {dayLabel(session.date)} · {clockTime(session.time)}
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  <Chip
                    label={session.is_online ? 'Online' : 'In person'}
                    icon={session.is_online ? VideoIcon : MapPinIcon}
                    color={session.is_online ? COLORS.violet : COLORS.cyan}
                  />
                  <Chip label={`${session.duration_minutes} min`} icon={ClockIcon} color={COLORS.muted} />
                </View>
              </View>
              <Chip label={startsIn(session)} color={COLORS.sky} />
            </View>

            {session.recommended_workouts.length > 0 || session.recommended_diets.length > 0 ? (
              <View className="gap-1.5">
                <Text variant="muted" className="text-[11px] font-bold uppercase tracking-wide">
                  Bring your plan
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {session.recommended_workouts.map((plan) => (
                    <Pressable
                      key={`w-${plan.id}`}
                      onPress={() => router.push(href('/train?tab=workout'))}
                      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-70"
                      style={{ backgroundColor: alpha(COLORS.green, 0.14), borderWidth: 1, borderColor: alpha(COLORS.green, 0.32) }}>
                      <Icon as={DumbbellIcon} size={13} color={COLORS.green} />
                      <Text className="text-xs font-bold" style={{ color: COLORS.green }} numberOfLines={1}>
                        {plan.name}
                      </Text>
                    </Pressable>
                  ))}
                  {session.recommended_diets.map((plan) => (
                    <Pressable
                      key={`d-${plan.id}`}
                      onPress={() => router.push(href('/train?tab=diet'))}
                      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-70"
                      style={{ backgroundColor: alpha(COLORS.amber, 0.14), borderWidth: 1, borderColor: alpha(COLORS.amber, 0.32) }}>
                      <Icon as={SaladIcon} size={13} color={COLORS.amber} />
                      <Text className="text-xs font-bold" style={{ color: COLORS.amber }} numberOfLines={1}>
                        {plan.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {session.notes ? (
              <Text variant="muted" className="text-sm leading-5">
                {session.notes}
              </Text>
            ) : null}

            {session.status === 'scheduled' ? (
              <View className="flex-row flex-wrap gap-2">
                {[
                  { icon: CalendarClockIcon, label: 'Reschedule', color: COLORS.sky, run: openReschedule },
                  { icon: ClockIcon, label: "I'll be late", color: COLORS.amber, run: () => openPermission('late') },
                  { icon: UserXIcon, label: "Can't attend", color: COLORS.rose, run: () => openPermission('absent') },
                ].map((action) => (
                  <Pressable
                    key={action.label}
                    onPress={action.run}
                    accessibilityRole="button"
                    className="h-9 flex-row items-center gap-1.5 rounded-full px-3.5 active:opacity-70"
                    style={{ backgroundColor: alpha(action.color, 0.12), borderWidth: 1, borderColor: alpha(action.color, 0.35) }}>
                    <Icon as={action.icon} size={14} color={action.color} />
                    <Text className="text-xs font-bold" style={{ color: action.color }}>
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Panel>
        ) : (
          <Panel className="mb-4 flex-row items-center gap-3">
            <IconBubble icon={CalendarClockIcon} color={COLORS.sky} size={44} />
            <View className="flex-1">
              <Text className="text-sm font-bold">No session booked</Text>
              <Text variant="muted" className="text-xs">
                Your trainer will schedule your next one.
              </Text>
            </View>
          </Panel>
        )}

        {/* Today's training */}
        <SectionHeader
          title="Today's training"
          icon={DumbbellIcon}
          color={COLORS.green}
          actionLabel="All plans"
          onAction={() => router.push(href('/train?tab=workout'))}
        />
        {workout ? (
          <Pressable onPress={() => openWorkout(workout)} className="mb-4 active:opacity-90">
            <Gradient colors={['#0F3D2A', '#14532D']} style={{ borderRadius: 28, overflow: 'hidden' }}>
              <View className="gap-3 p-5">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.lime }}>
                      {workout.exercises.length} exercises
                    </Text>
                    <Text className="text-xl font-black tracking-tight text-white" numberOfLines={1}>
                      {workout.day_name}
                    </Text>
                  </View>
                  <View
                    className="items-center justify-center rounded-full"
                    style={{ width: 48, height: 48, backgroundColor: COLORS.lime }}>
                    <Icon as={PlayIcon} size={20} color="#14290A" />
                  </View>
                </View>
                <View className="gap-1.5">
                  {workout.exercises.slice(0, 3).map((ex) => (
                    <View key={ex.id} className="flex-row items-center justify-between gap-3">
                      <Text className="flex-1 text-sm font-semibold text-white/90" numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Text className="text-xs font-bold text-white/60">
                        {ex.sets}×{ex.reps}
                      </Text>
                    </View>
                  ))}
                  {workout.exercises.length > 3 ? (
                    <Text className="text-xs font-semibold text-white/55">
                      +{workout.exercises.length - 3} more
                    </Text>
                  ) : null}
                </View>
              </View>
            </Gradient>
          </Pressable>
        ) : (
          <Panel className="mb-4 flex-row items-center gap-3">
            <IconBubble icon={DumbbellIcon} color={COLORS.muted} size={44} />
            <View className="flex-1">
              <Text className="text-sm font-bold">Rest day</Text>
              <Text variant="muted" className="text-xs">
                No workout scheduled — recover well.
              </Text>
            </View>
          </Panel>
        )}

        {/* Nutrition + water */}
        <SectionHeader
          title="Nutrition"
          icon={SaladIcon}
          color={COLORS.amber}
          actionLabel="Meal plan"
          onAction={() => router.push(href('/train?tab=diet'))}
        />
        <Panel tint={COLORS.amber} onPress={() => router.push(href('/train?tab=diet'))} className="mb-3 flex-row items-center gap-4">
          <Ring progress={target ? logged / target : 0} size={92} stroke={10} color={COLORS.amber}>
            <Text className="text-lg font-black">{logged}</Text>
            <Text variant="muted" className="text-[9px] font-bold uppercase tracking-wide">
              kcal
            </Text>
          </Ring>
          <View className="min-w-0 flex-1 gap-2">
            <Text className="text-sm font-bold" numberOfLines={1}>
              {diet?.macros?.name ?? 'No diet plan yet'}
            </Text>
            {diet?.macros ? (
              <>
                <Text variant="muted" className="text-xs">
                  {Math.max(0, target - logged)} of {target} kcal left today
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  <Chip label={`P ${diet.macros.protein}g`} color={COLORS.rose} />
                  <Chip label={`C ${diet.macros.carbs}g`} color={COLORS.sky} />
                  <Chip label={`F ${diet.macros.fats}g`} color={COLORS.lime} />
                </View>
              </>
            ) : (
              <Text variant="muted" className="text-xs">
                Your trainer hasn&apos;t assigned one.
              </Text>
            )}
          </View>
        </Panel>
        <View className="mb-4">
          <WaterCard
            water={data.water}
            onUpdated={(log: WaterLog) => setData((d) => (d ? { ...d, water: log } : d))}
          />
        </View>

        {/* Progress snapshot */}
        <SectionHeader
          title="Your progress"
          icon={TrendingDownIcon}
          color={COLORS.violet}
          actionLabel="Details"
          onAction={() => router.push(href('/progress'))}
        />
        <Panel tint={COLORS.violet} onPress={() => router.push(href('/progress'))} className="mb-4 gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="gap-1">
              <Text variant="muted" className="text-[11px] font-bold uppercase tracking-wide">
                Weight
              </Text>
              <Text className="text-3xl font-black tracking-tight">
                {progress.current_weight != null ? progress.current_weight.toFixed(1) : '—'}
                <Text variant="muted" className="text-sm">
                  {' '}
                  kg
                </Text>
              </Text>
              {change != null ? (
                <View className="flex-row items-center gap-1">
                  <Icon
                    as={change <= 0 ? TrendingDownIcon : TrendingUpIcon}
                    size={13}
                    color={COLORS.green}
                  />
                  <Text className="text-xs font-bold" style={{ color: COLORS.green }}>
                    {change > 0 ? '+' : ''}
                    {change.toFixed(1)} kg since start
                  </Text>
                </View>
              ) : null}
            </View>
            <Sparkline data={progress.trend} color={COLORS.violet} width={140} height={56} />
          </View>
          {progress.target_weight != null ? (
            <Text variant="muted" className="text-xs">
              Goal: {progress.target_weight} kg
            </Text>
          ) : null}
        </Panel>

        {/* Coming up */}
        {later.length > 0 ? (
          <View className="mb-2">
            <SectionHeader
              title="Coming up"
              icon={CalendarClockIcon}
              color={COLORS.cyan}
              actionLabel="Schedule"
              onAction={() => router.push(href('/train?tab=sessions'))}
            />
            <Panel className="gap-1 p-2">
              {later.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(href('/train?tab=sessions'))}
                  className="flex-row items-center gap-3 rounded-2xl px-2 py-2.5 active:opacity-70">
                  <IconBubble icon={s.is_online ? VideoIcon : DumbbellIcon} color={s.is_online ? COLORS.violet : COLORS.cyan} size={36} />
                  <View className="flex-1">
                    <Text className="text-sm font-bold">
                      {dayLabel(s.date)} · {clockTime(s.time)}
                    </Text>
                    <Text variant="muted" className="text-xs">
                      {s.duration_minutes} min · {s.is_online ? 'Online' : 'In person'}
                    </Text>
                  </View>
                  <Icon as={ChevronRightIcon} size={16} color={COLORS.muted} />
                </Pressable>
              ))}
            </Panel>
          </View>
        ) : null}
      </Screen>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a reschedule</DialogTitle>
            <DialogDescription>
              {session
                ? `Pick a new date for your ${dayLabel(session.date)} session.`
                : 'Pick a new date for your session.'}
            </DialogDescription>
          </DialogHeader>
          <View className="gap-3">
            <DateField label="New date" value={rescheduleDate} onChange={setRescheduleDate} minDate={todayISO()} />
            <Input placeholder="Reason (optional)" value={rescheduleReason} onChangeText={setRescheduleReason} />
          </View>
          <DialogFooter>
            <Button variant="outline" disabled={requestBusy} onPress={() => setRescheduleOpen(false)}>
              <Text className="text-sm font-medium">Cancel</Text>
            </Button>
            <Button disabled={requestBusy} onPress={submitReschedule}>
              <Text className="text-sm font-medium">{requestBusy ? 'Sending…' : 'Send request'}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionOpen} onOpenChange={setPermissionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{permissionKind === 'late' ? 'Running late' : 'Cannot attend'}</DialogTitle>
            <DialogDescription>
              {session
                ? `Let your trainer know about ${dayLabel(session.date)} at ${clockTime(session.time)}.`
                : 'Let your trainer know.'}
            </DialogDescription>
          </DialogHeader>
          <Input placeholder="Reason (optional)" value={permissionReason} onChangeText={setPermissionReason} />
          <DialogFooter>
            <Button variant="outline" disabled={requestBusy} onPress={() => setPermissionOpen(false)}>
              <Text className="text-sm font-medium">Cancel</Text>
            </Button>
            <Button disabled={requestBusy} onPress={submitPermission}>
              <Text className="text-sm font-medium">{requestBusy ? 'Sending…' : 'Send request'}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
