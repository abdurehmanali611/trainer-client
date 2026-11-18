import { router, useFocusEffect, type Href } from 'expo-router';
import { Image } from 'expo-image';
import {
  AwardIcon,
  BellIcon,
  BookOpenIcon,
  CameraIcon,
  ChevronRightIcon,
  CreditCardIcon,
  DropletsIcon,
  LogOutIcon,
  MessageSquareQuoteIcon,
  RulerIcon,
  TrophyIcon,
  UserRoundIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Gradient, powerGradient } from '@/components/gradient';
import { alpha, Chip, COLORS, IconBubble, Panel, SectionHeader } from '@/components/kit';
import { Screen } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { shortDate } from '@/lib/dates';
import type { ClientProfile, TodayData } from '@/lib/types';

function href(path: string): Href {
  return path as Href;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

interface Row {
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
  color: string;
}

const LOG_TILES: { label: string; href: string; icon: LucideIcon; color: string }[] = [
  { label: 'Food diary', href: '/more/diary', icon: BookOpenIcon, color: COLORS.orange },
  { label: 'Water', href: '/more/water', icon: DropletsIcon, color: COLORS.cyan },
  { label: 'Measure', href: '/more/measurements', icon: RulerIcon, color: COLORS.green },
  { label: 'Photos', href: '/more/photos', icon: CameraIcon, color: COLORS.pink },
  { label: 'Records', href: '/more/records', icon: AwardIcon, color: COLORS.amber },
  { label: 'Badges', href: '/more/achievements', icon: TrophyIcon, color: COLORS.violet },
];

export default function MoreScreen() {
  const { client, signOut } = useAuth();
  const [profile, setProfile] = React.useState<ClientProfile | null>(null);
  const [today, setToday] = React.useState<TodayData | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      void Promise.all([
        api<ClientProfile>('client/me/').catch(() => null),
        api<TodayData>('client/today/').catch(() => null),
      ]).then(([me, t]) => {
        if (cancelled) return;
        setProfile(me);
        setToday(t);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  async function handleSignOut() {
    await signOut();
    router.replace('/auth/login');
  }

  const name = profile?.name ?? client?.name ?? '';
  const avatar = profile?.avatar_url || client?.avatar_url;
  const mode = today?.billing.mode ?? client?.mode ?? 'paid';
  const period = today?.billing.active_period;
  const invoice = today?.billing.invoice;
  const owes = invoice !== null && invoice !== undefined && (invoice.status === 'pending' || invoice.status === 'overdue');
  const daysLeft = today?.billing.payment_requirement.days_left;

  const accountRows: Row[] = [
    { label: 'Profile', hint: 'Details, goals and photo', href: '/more/profile', icon: UserRoundIcon, color: COLORS.green },
    {
      label: 'Billing',
      hint: owes ? `Payment due ${shortDate(invoice!.due_date)}` : 'Invoices and payments',
      href: '/more/billing',
      icon: CreditCardIcon,
      color: owes ? COLORS.amber : COLORS.sky,
    },
    { label: 'Notifications', hint: 'Sessions, payments and badges', href: '/more/notifications', icon: BellIcon, color: COLORS.rose },
    { label: 'Trainer feedback', hint: 'Rate and message your trainer', href: '/more/feedback', icon: MessageSquareQuoteIcon, color: COLORS.violet },
  ];

  return (
    <Screen>
      {/* Profile hero */}
      <Gradient colors={powerGradient} style={{ borderRadius: 28, overflow: 'hidden', marginBottom: 16 }}>
        <View className="gap-4 p-5">
          <View className="flex-row items-center gap-4">
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={{ width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 34,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.5)',
                }}>
                <Text className="text-2xl font-black text-white">{initialsOf(name) || '?'}</Text>
              </View>
            )}
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-xl font-black tracking-tight text-white" numberOfLines={1}>
                {name}
              </Text>
              {profile?.trainer_name ? (
                <Text className="text-xs font-semibold text-white/80">
                  Trainer · {profile.trainer_name}
                </Text>
              ) : null}
              {profile?.goal_label && profile.goal_label !== '—' ? (
                <Text className="text-xs font-medium text-white/70" numberOfLines={1}>
                  {profile.goal_label}
                </Text>
              ) : null}
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <View className="rounded-full bg-black/20 px-3 py-1.5">
              <Text className="text-xs font-bold capitalize text-white">{mode} plan</Text>
            </View>
            {period ? (
              <View className="rounded-full bg-black/20 px-3 py-1.5">
                <Text className="text-xs font-bold text-white">
                  {period.package_name ?? 'Subscription'} · until {shortDate(period.end_date)}
                </Text>
              </View>
            ) : null}
            {daysLeft != null && daysLeft <= 7 ? (
              <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(251,191,36,0.9)' }}>
                <Text className="text-xs font-black" style={{ color: '#2A1B02' }}>
                  {daysLeft === 0 ? 'Last day' : `${daysLeft} days left`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Gradient>

      {/* Account */}
      <SectionHeader title="Account" />
      <Panel className="mb-4 gap-1 p-2">
        {accountRows.map((row) => (
          <Pressable
            key={row.href}
            onPress={() => router.push(href(row.href))}
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl px-2 py-2.5 active:opacity-70">
            <IconBubble icon={row.icon} color={row.color} size={40} />
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-bold">{row.label}</Text>
              {row.hint ? (
                <Text variant="muted" className="text-xs" numberOfLines={1}>
                  {row.hint}
                </Text>
              ) : null}
            </View>
            {row.label === 'Billing' && owes ? <Chip label="Due" color={COLORS.amber} /> : null}
            <Icon as={ChevronRightIcon} size={18} color={COLORS.muted} />
          </Pressable>
        ))}
      </Panel>

      {/* Quick access to every tracker */}
      <SectionHeader title="Log & track" subtitle="Also on your Progress and Train tabs" />
      <View className="mb-6 flex-row flex-wrap gap-2.5">
        {LOG_TILES.map((tile) => (
          <Pressable
            key={tile.href}
            onPress={() => router.push(href(tile.href))}
            accessibilityRole="button"
            className="w-[31%] items-center gap-2 rounded-3xl p-3.5 active:opacity-70"
            style={{ backgroundColor: alpha(tile.color, 0.1), borderWidth: 1, borderColor: alpha(tile.color, 0.3) }}>
            <IconBubble icon={tile.icon} color={tile.color} size={42} />
            <Text className="text-xs font-bold" numberOfLines={1}>
              {tile.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleSignOut}
        accessibilityRole="button"
        className="h-12 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80"
        style={{ backgroundColor: alpha(COLORS.rose, 0.12), borderWidth: 1, borderColor: alpha(COLORS.rose, 0.4) }}>
        <Icon as={LogOutIcon} size={17} color={COLORS.rose} />
        <Text className="text-sm font-bold" style={{ color: COLORS.rose }}>
          Sign out
        </Text>
      </Pressable>
    </Screen>
  );
}
