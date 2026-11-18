import {
  BellIcon,
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  MessageCircleIcon,
  TrophyIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Badge, EmptyView, ErrorView, LoadingView, ScreenHeader } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { relativeTime } from '@/lib/dates';
import type { AppNotification } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NotificationsPayload {
  unread: number;
  results: AppNotification[];
}

const typeIcons: Record<AppNotification['type'], LucideIcon> = {
  booking: CalendarIcon,
  payment: CreditCardIcon,
  message: MessageCircleIcon,
  alert: TriangleAlertIcon,
  achievement: TrophyIcon,
  request: ClockIcon,
};

export default function NotificationsScreen() {
  const [data, setData] = React.useState<NotificationsPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const rows = await api<NotificationsPayload>('client/notifications/');
      setData(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
  }

  async function markAllRead() {
    try {
      await api('client/notifications/', { method: 'POST', body: { all: true } });
      setData((prev) =>
        prev ? { unread: 0, results: prev.results.map((n) => ({ ...n, read: true })) } : prev
      );
    } catch {
      // ignore
    }
  }

  async function markRead(id: number) {
    setData((prev) =>
      prev
        ? {
            unread: Math.max(0, prev.unread - 1),
            results: prev.results.map((n) => (n.id === id ? { ...n, read: true } : n)),
          }
        : prev
    );
    try {
      await api('client/notifications/', { method: 'POST', body: { id } });
    } catch {
      // ignore
    }
  }

  if (loading) return <LoadingView label="Loading notifications…" />;
  if (error) return <ErrorView error={error} onRetry={load} />;

  const results = data?.results ?? [];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pb-12"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <ScreenHeader
        title="Notifications"
        right={
          data && data.unread > 0 ? (
            <Button size="sm" variant="outline" onPress={markAllRead}>
              <Text>Mark all read</Text>
            </Button>
          ) : undefined
        }
      />
      {results.length === 0 ? (
        <EmptyView title="No notifications" subtitle="Updates from your trainer will appear here." />
      ) : (
        <View className="gap-2">
          {results.map((notification) => {
            const TypeIcon = typeIcons[notification.type] ?? BellIcon;
            return (
              <Pressable
                key={notification.id}
                disabled={notification.read}
                onPress={() => markRead(notification.id)}
                className={cn(
                  'border-border flex-row gap-3 rounded-xl border p-3',
                  !notification.read && 'border-l-primary border-l-2 bg-secondary/60'
                )}>
                <Icon as={TypeIcon} size={20} className="mt-0.5 text-muted-foreground" />
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className={cn('flex-1', !notification.read && 'font-semibold')}>
                      {notification.title}
                    </Text>
                    {!notification.read ? <Badge label="New" tone="info" /> : null}
                  </View>
                  <Text variant="muted">{notification.body}</Text>
                  <Text variant="muted" className="text-xs">
                    {relativeTime(notification.created_at)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
