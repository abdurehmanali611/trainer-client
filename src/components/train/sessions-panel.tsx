import {
  CalendarClockIcon,
  CheckCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DumbbellIcon,
  MapPinIcon,
  SaladIcon,
  UserXIcon,
  VideoIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { alpha, Chip, COLORS, Panel, Ring, SectionHeader } from '@/components/kit';
import { Badge, EmptyView, ErrorView, toneForRequest } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { DateField, TimeField } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { clockTime, format, parseISO, todayISO } from '@/lib/dates';
import type {
  PermissionRequest,
  RequestStatus,
  RescheduleRequest,
  Session,
  SessionStatus,
} from '@/lib/types';

function shiftDay(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
}

interface RequestsPayload {
  reschedules: RescheduleRequest[];
  permissions: PermissionRequest[];
}

interface AttendanceSummary {
  summary: { completed: number; no_show: number; canceled: number; scheduled: number };
}

const REQUEST_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
};

/** One colour per session status, used for the date block and accents. */
const STATUS_COLOR: Record<SessionStatus, string> = {
  scheduled: COLORS.sky,
  completed: COLORS.green,
  approved: COLORS.green,
  rescheduling: COLORS.amber,
  no_show: COLORS.rose,
  canceled: COLORS.muted,
};

const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  approved: 'Approved',
  rescheduling: 'Rescheduling',
  no_show: 'No-show',
  canceled: 'Canceled',
};

function PillAction({
  icon,
  label,
  color = COLORS.muted,
  filled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  label: string;
  color?: string;
  filled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="h-9 flex-row items-center gap-1.5 rounded-full px-3.5 active:opacity-70"
      style={{
        backgroundColor: filled ? color : alpha(color, 0.12),
        borderWidth: 1,
        borderColor: filled ? color : alpha(color, 0.35),
      }}>
      <Icon as={icon} size={14} color={filled ? '#04110A' : color} />
      <Text className="text-xs font-bold" style={{ color: filled ? '#04110A' : color }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SessionCard({
  session,
  requests,
  onFinish,
  onReschedule,
  onPermission,
  onOpenPlan,
}: {
  session: Session;
  requests: { key: string; label: string; detail: string; status: RequestStatus; note: string }[];
  onFinish: (s: Session) => void;
  onReschedule: (s: Session) => void;
  onPermission: (s: Session, kind: 'late' | 'absent') => void;
  onOpenPlan: (kind: 'workout' | 'diet') => void;
}) {
  const color = STATUS_COLOR[session.status] ?? COLORS.sky;
  const date = parseISO(session.date);
  const open = session.status === 'scheduled';
  const range = session.end_time
    ? `${clockTime(session.time)} – ${clockTime(session.end_time)}`
    : `${clockTime(session.time)} · ${session.duration_minutes} min`;

  return (
    <Panel tint={open ? color : undefined} className="gap-3">
      <View className="flex-row items-center gap-3">
        <View
          style={{
            width: 56,
            height: 62,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(color, 0.16),
            borderWidth: 1,
            borderColor: alpha(color, 0.38),
          }}>
          <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
            {format(date, 'EEE')}
          </Text>
          <Text className="text-2xl font-black leading-7">{format(date, 'd')}</Text>
          <Text className="text-[10px] font-semibold uppercase text-muted-foreground">
            {format(date, 'MMM')}
          </Text>
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-bold tracking-tight" numberOfLines={1}>
            {range}
          </Text>
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Chip
              label={session.is_online ? 'Online' : 'In person'}
              icon={session.is_online ? VideoIcon : MapPinIcon}
              color={session.is_online ? COLORS.violet : COLORS.cyan}
            />
            <Chip label={`${session.duration_minutes} min`} icon={ClockIcon} color={COLORS.muted} />
          </View>
        </View>
        <Badge
          label={STATUS_LABEL[session.status] ?? session.status}
          tone={
            session.status === 'completed' || session.status === 'approved'
              ? 'success'
              : session.status === 'no_show'
                ? 'danger'
                : session.status === 'rescheduling'
                  ? 'warning'
                  : session.status === 'canceled'
                    ? 'default'
                    : 'info'
          }
        />
      </View>

      {/* The plans the trainer attached to this very session */}
      {session.recommended_workouts.length > 0 || session.recommended_diets.length > 0 ? (
        <View className="gap-1.5">
          <Text variant="muted" className="text-[11px] font-bold uppercase tracking-wide">
            This session includes
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {session.recommended_workouts.map((plan) => (
              <Pressable
                key={`w-${plan.id}`}
                onPress={() => onOpenPlan('workout')}
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
                onPress={() => onOpenPlan('diet')}
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

      {/* Requests the client already sent about this session */}
      {requests.length > 0 ? (
        <View className="gap-2">
          {requests.map((req) => (
            <View
              key={req.key}
              className="gap-0.5 rounded-2xl border border-border bg-background/60 px-3 py-2.5">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-sm font-semibold">{req.label}</Text>
                <Badge label={REQUEST_LABELS[req.status]} tone={toneForRequest[req.status]} />
              </View>
              <Text variant="muted" className="text-xs">
                {req.detail}
              </Text>
              {req.note ? (
                <Text className="text-xs" style={{ color: COLORS.cyan }}>
                  Trainer: {req.note}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {open ? (
        <View className="flex-row flex-wrap gap-2">
          {!session.is_online ? (
            <PillAction icon={CheckCheckIcon} label="Mark finished" color={COLORS.green} filled onPress={() => onFinish(session)} />
          ) : null}
          <PillAction icon={CalendarClockIcon} label="Reschedule" color={COLORS.sky} onPress={() => onReschedule(session)} />
          <PillAction icon={ClockIcon} label="I'll be late" color={COLORS.amber} onPress={() => onPermission(session, 'late')} />
          <PillAction icon={UserXIcon} label="Can't attend" color={COLORS.rose} onPress={() => onPermission(session, 'absent')} />
        </View>
      ) : null}
    </Panel>
  );
}

/**
 * Sessions tab of Train: attendance ring, every session with the plans it
 * includes, and the requests you sent shown on the session they belong to.
 */
export function SessionsPanel({
  refreshKey,
  onDone,
  onOpenPlan,
}: {
  refreshKey: number;
  onDone: () => void;
  onOpenPlan: (kind: 'workout' | 'diet') => void;
}) {
  const today = todayISO();
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [requests, setRequests] = React.useState<RequestsPayload | null>(null);
  const [attendance, setAttendance] = React.useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showPast, setShowPast] = React.useState(false);

  const [rescheduleFor, setRescheduleFor] = React.useState<Session | null>(null);
  const [permissionFor, setPermissionFor] = React.useState<Session | null>(null);
  const [permissionKind, setPermissionKind] = React.useState<'late' | 'absent'>('late');
  const [resDate, setResDate] = React.useState('');
  const [resTime, setResTime] = React.useState('');
  const [resReason, setResReason] = React.useState('');
  const [permDate, setPermDate] = React.useState('');
  const [permReason, setPermReason] = React.useState('');
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [schedule, reqs, att] = await Promise.all([
        api<Session[]>('client/schedule/', {
          query: { from: shiftDay(today, -14), to: shiftDay(today, 60) },
        }),
        api<RequestsPayload>('client/requests/'),
        api<AttendanceSummary>('client/attendance/'),
      ]);
      setSessions(schedule);
      setRequests(reqs);
      setAttendance(att);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load schedule.');
    } finally {
      setLoading(false);
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  React.useEffect(() => {
    void load();
  }, [load, refreshKey]);

  function openReschedule(session: Session) {
    setRescheduleFor(session);
    setResDate(session.date);
    setResTime('');
    setResReason('');
    setDialogError(null);
  }

  function openPermission(session: Session, kind: 'late' | 'absent') {
    setPermissionFor(session);
    setPermissionKind(kind);
    setPermDate(session.date);
    setPermReason('');
    setDialogError(null);
  }

  async function finish(session: Session) {
    try {
      await api(`client/sessions/${session.id}/finish/`, { method: 'POST' });
      await load();
    } catch {
      /* surfaced on next refresh */
    }
  }

  async function submitReschedule() {
    if (!rescheduleFor) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(resDate.trim())) {
      setDialogError('Pick the date you want to move the session to.');
      return;
    }
    setSubmitting(true);
    setDialogError(null);
    try {
      await api('client/requests/reschedule/', {
        method: 'POST',
        body: {
          session_id: rescheduleFor.id,
          requested_date: resDate.trim(),
          requested_time: resTime.trim() || undefined,
          reason: resReason.trim() || undefined,
        },
      });
      setRescheduleFor(null);
      setRequests(await api<RequestsPayload>('client/requests/'));
    } catch (e) {
      setDialogError(e instanceof ApiError ? e.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPermission() {
    if (!permissionFor) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(permDate.trim())) {
      setDialogError('Pick a date.');
      return;
    }
    setSubmitting(true);
    setDialogError(null);
    try {
      await api('client/requests/permission/', {
        method: 'POST',
        body: { kind: permissionKind, date: permDate.trim(), reason: permReason.trim() || undefined },
      });
      setPermissionFor(null);
      setRequests(await api<RequestsPayload>('client/requests/'));
    } catch (e) {
      setDialogError(e instanceof ApiError ? e.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  // Requests grouped by the session they refer to; the rest are "other".
  const { bySession, other } = React.useMemo(() => {
    const map = new Map<number, { key: string; label: string; detail: string; status: RequestStatus; note: string }[]>();
    const orphans: { key: string; label: string; detail: string; status: RequestStatus; note: string }[] = [];
    const push = (sessionId: number | null, row: (typeof orphans)[number]) => {
      if (sessionId !== null && sessions.some((s) => s.id === sessionId)) {
        map.set(sessionId, [...(map.get(sessionId) ?? []), row]);
      } else {
        orphans.push(row);
      }
    };
    for (const r of requests?.reschedules ?? []) {
      push(r.session, {
        key: `res-${r.id}`,
        label: 'Reschedule request',
        detail: `Move to ${r.requested_date}${r.requested_time ? ` · ${clockTime(r.requested_time)}` : ''}${r.reason ? ` — ${r.reason}` : ''}`,
        status: r.status,
        note: r.trainer_note,
      });
    }
    for (const r of requests?.permissions ?? []) {
      push(r.session, {
        key: `perm-${r.id}`,
        label: r.kind === 'late' ? 'Running late' : "Can't attend",
        detail: `${r.date}${r.reason ? ` — ${r.reason}` : ''}`,
        status: r.status,
        note: r.trainer_note,
      });
    }
    return { bySession: map, other: orphans };
  }, [requests, sessions]);

  const upcoming = sessions.filter((s) => s.date >= today);
  const past = sessions.filter((s) => s.date < today).reverse();

  if (loading) return null;
  if (error) return <ErrorView error={error} onRetry={load} />;

  const sum = attendance?.summary ?? { completed: 0, no_show: 0, canceled: 0, scheduled: 0 };
  const finished = sum.completed + sum.no_show;
  const rate = finished > 0 ? sum.completed / finished : 0;

  return (
    <View className="gap-4">
      <Panel tint={COLORS.green} className="flex-row items-center gap-4">
        <Ring progress={rate} size={92} stroke={10} color={COLORS.green}>
          <Text className="text-xl font-black">{Math.round(rate * 100)}%</Text>
          <Text variant="muted" className="text-[9px] font-bold uppercase tracking-wide">
            attended
          </Text>
        </Ring>
        <View className="flex-1 gap-2">
          <Text className="text-base font-bold tracking-tight">Your attendance</Text>
          <View className="flex-row flex-wrap gap-1.5">
            <Chip label={`${sum.completed} completed`} color={COLORS.green} />
            <Chip label={`${sum.scheduled} upcoming`} color={COLORS.sky} />
            <Chip label={`${sum.no_show} no-show`} color={COLORS.rose} />
            <Chip label={`${sum.canceled} canceled`} color={COLORS.muted} />
          </View>
        </View>
      </Panel>

      <View>
        <SectionHeader title="Upcoming sessions" icon={CalendarClockIcon} color={COLORS.sky} />
        {upcoming.length === 0 ? (
          <EmptyView
            icon={CalendarClockIcon}
            color={COLORS.sky}
            title="No upcoming sessions"
            subtitle="Your trainer hasn't scheduled anything yet."
          />
        ) : (
          <View className="gap-3">
            {upcoming.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                requests={bySession.get(session.id) ?? []}
                onFinish={finish}
                onReschedule={openReschedule}
                onPermission={openPermission}
                onOpenPlan={onOpenPlan}
              />
            ))}
          </View>
        )}
      </View>

      {past.length > 0 ? (
        <View>
          <Pressable
            onPress={() => setShowPast((v) => !v)}
            className="mb-3 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 active:opacity-80">
            <Text className="text-sm font-bold">Recent sessions ({past.length})</Text>
            <Icon as={showPast ? ChevronUpIcon : ChevronDownIcon} size={18} color={COLORS.muted} />
          </Pressable>
          {showPast ? (
            <View className="gap-3">
              {past.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  requests={bySession.get(session.id) ?? []}
                  onFinish={finish}
                  onReschedule={openReschedule}
                  onPermission={openPermission}
                  onOpenPlan={onOpenPlan}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {other.length > 0 ? (
        <View className="gap-2">
          <SectionHeader title="Other requests" subtitle="Not tied to a listed session" icon={CalendarClockIcon} color={COLORS.violet} />
          {other.map((req) => (
            <Panel key={req.key} className="gap-1 p-3.5">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 font-semibold">{req.label}</Text>
                <Badge label={REQUEST_LABELS[req.status]} tone={toneForRequest[req.status]} />
              </View>
              <Text variant="muted" className="text-xs">
                {req.detail}
              </Text>
              {req.note ? (
                <Text className="text-xs" style={{ color: COLORS.cyan }}>
                  Trainer: {req.note}
                </Text>
              ) : null}
            </Panel>
          ))}
        </View>
      ) : null}

      <Dialog open={rescheduleFor !== null} onOpenChange={(open) => !open && setRescheduleFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request reschedule</DialogTitle>
          </DialogHeader>
          <View className="gap-3">
            <DateField label="Requested date" value={resDate} onChange={setResDate} minDate={todayISO()} />
            <TimeField label="Requested time (optional)" value={resTime} onChange={setResTime} clearable />
            <Input placeholder="Reason (optional)" value={resReason} onChangeText={setResReason} />
            {dialogError ? <Text style={{ color: COLORS.rose }}>{dialogError}</Text> : null}
            <Button onPress={submitReschedule} disabled={submitting}>
              <Text>{submitting ? 'Sending…' : 'Send request'}</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionFor !== null} onOpenChange={(open) => !open && setPermissionFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{permissionKind === 'late' ? "I'll be late" : "I can't attend"}</DialogTitle>
          </DialogHeader>
          <View className="gap-3">
            <View className="flex-row gap-2">
              <Button
                size="sm"
                variant={permissionKind === 'late' ? 'default' : 'outline'}
                onPress={() => setPermissionKind('late')}>
                <Text>Late</Text>
              </Button>
              <Button
                size="sm"
                variant={permissionKind === 'absent' ? 'default' : 'outline'}
                onPress={() => setPermissionKind('absent')}>
                <Text>Absent</Text>
              </Button>
            </View>
            <DateField label="Date" value={permDate} onChange={setPermDate} />
            <Input placeholder="Reason (optional)" value={permReason} onChangeText={setPermReason} />
            {dialogError ? <Text style={{ color: COLORS.rose }}>{dialogError}</Text> : null}
            <Button onPress={submitPermission} disabled={submitting}>
              <Text>{submitting ? 'Sending…' : 'Send'}</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
}
