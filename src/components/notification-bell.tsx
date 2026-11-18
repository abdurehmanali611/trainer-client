import { useRouter } from 'expo-router';
import { BellIcon } from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Badge } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/dates';

type NotificationRow = {
  id: number;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
};

type Payload = { results: NotificationRow[]; unread: number };

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<NotificationRow[]>([]);
  const [unread, setUnread] = React.useState(0);

  const load = React.useCallback(async () => {
    try {
      const data = await api<Payload>('client/notifications/');
      setRows(data.results.slice(0, 8));
      setUnread(data.unread ?? data.results.filter((n) => !n.read).length);
    } catch {
      /* banner/poll still works */
    }
  }, []);

  React.useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function markRead(id: number) {
    try {
      await api('client/notifications/', { method: 'POST', body: { id } });
      setRows((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <Pressable
        hitSlop={10}
        onPress={() => {
          setOpen(true);
          void load();
        }}
        className="relative rounded-lg p-2">
        <Icon as={BellIcon} size={22} />
        {unread > 0 ? (
          <View className="absolute right-0.5 top-0.5 min-w-4 items-center rounded-full bg-destructive px-1">
            <Text className="text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setOpen(false)}>
          <View className="mx-4 mt-16 max-h-[70%] overflow-hidden rounded-2xl bg-background p-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-semibold">Notifications</Text>
              {unread > 0 ? <Badge label={`${unread} new`} tone="info" /> : null}
            </View>
            <ScrollView className="max-h-80">
              {rows.length === 0 ? (
                <Text variant="muted" className="py-6 text-center text-sm">
                  No notifications yet.
                </Text>
              ) : (
                rows.map((n) => (
                  <Pressable
                    key={n.id}
                    className="border-border gap-1 border-b py-3"
                    onPress={() => {
                      if (!n.read) void markRead(n.id);
                      setOpen(false);
                      router.push('/more/notifications');
                    }}>
                    <Text className={n.read ? 'text-sm' : 'text-sm font-semibold'}>{n.title}</Text>
                    <Text variant="muted" className="text-xs" numberOfLines={2}>
                      {n.body}
                    </Text>
                    <Text variant="muted" className="text-[10px]">
                      {relativeTime(n.created_at)}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Button
              variant="outline"
              className="mt-2"
              onPress={() => {
                setOpen(false);
                router.push('/more/notifications');
              }}>
              <Text>Open all</Text>
            </Button>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
