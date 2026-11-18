import { FlameIcon, LockIcon, TrophyIcon } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { EmptyView, ErrorView, LoadingView } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { shortDate } from '@/lib/dates';
import type { Achievement, Streak } from '@/lib/types';

interface AchievementsPayload {
  streak: Streak;
  achievements: Achievement[];
  all_keys: { key: string; label: string }[];
}

export default function AchievementsScreen() {
  const [data, setData] = React.useState<AchievementsPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const rows = await api<AchievementsPayload>('client/achievements/');
      setData(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load achievements.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingView label="Loading achievements…" />;
  if (error) return <ErrorView error={error} onRetry={load} />;
  if (!data) return <EmptyView title="No achievements" />;

  const unlockedByKey = new Map(data.achievements.map((a) => [a.key, a]));
  const locked = data.all_keys.filter((k) => !unlockedByKey.has(k.key));

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-12">
      <View className="border-border mt-3 flex-row items-center gap-4 rounded-2xl border p-6">
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <Icon as={FlameIcon} size={40} className="text-orange-500" />
        </Animated.View>
        <View className="flex-1">
          <Text className="text-4xl font-extrabold">{data.streak.current}</Text>
          <Text variant="muted">Current streak</Text>
          <Text variant="muted">Longest: {data.streak.longest}</Text>
        </View>
      </View>

      <Text variant="h4" className="mb-3 mt-6">
        Unlocked
      </Text>
      {data.achievements.length === 0 ? (
        <Text variant="muted">Complete workouts to unlock achievements.</Text>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {data.achievements.map((achievement) => (
            <View key={achievement.id} className="border-border w-[48%] gap-2 rounded-xl border p-4">
              <Icon as={TrophyIcon} size={24} className="text-amber-500" />
              <Text className="font-semibold">{achievement.label}</Text>
              <Text variant="muted">{shortDate(achievement.unlocked_at)}</Text>
            </View>
          ))}
        </View>
      )}

      {locked.length > 0 ? (
        <>
          <Text variant="h4" className="mb-3 mt-6">
            Locked
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {locked.map((item) => (
              <View
                key={item.key}
                className="border-border w-[48%] gap-2 rounded-xl border p-4 opacity-50">
                <Icon as={LockIcon} size={24} className="text-muted-foreground" />
                <Text className="font-semibold">{item.label}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
