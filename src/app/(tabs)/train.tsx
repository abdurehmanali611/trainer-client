import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDaysIcon, DumbbellIcon, SaladIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Segmented } from '@/components/kit';
import { Screen, ScreenHeader } from '@/components/screen';
import { DietPanel } from '@/components/train/diet-panel';
import { SessionsPanel } from '@/components/train/sessions-panel';
import { WorkoutsPanel } from '@/components/train/workouts-panel';

type Segment = 'sessions' | 'workout' | 'diet';

function normalize(value: string | undefined): Segment {
  return value === 'workout' || value === 'diet' ? value : 'sessions';
}

/**
 * Train — sessions, workouts and diet in one place. A session lists the plans
 * its trainer attached (tap one to jump straight to it), and requests show on
 * the session they belong to.
 */
export default function TrainScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const router = useRouter();
  const [segment, setSegment] = React.useState<Segment>(() => normalize(tab));
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (tab) setSegment(normalize(tab));
  }, [tab]);

  const onDone = React.useCallback(() => setRefreshing(false), []);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  function openPlan(kind: 'workout' | 'diet') {
    setSegment(kind);
    router.setParams({ tab: kind } as never);
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader title="Train" subtitle="Sessions, workouts and nutrition together" />
      <Segmented<Segment>
        value={segment}
        onChange={setSegment}
        options={[
          { key: 'sessions', label: 'Sessions', icon: CalendarDaysIcon },
          { key: 'workout', label: 'Workouts', icon: DumbbellIcon },
          { key: 'diet', label: 'Diet', icon: SaladIcon },
        ]}
      />
      <View className="mt-4">
        {segment === 'sessions' ? (
          <SessionsPanel refreshKey={refreshKey} onDone={onDone} onOpenPlan={openPlan} />
        ) : segment === 'workout' ? (
          <WorkoutsPanel refreshKey={refreshKey} onDone={onDone} />
        ) : (
          <DietPanel refreshKey={refreshKey} onDone={onDone} />
        )}
      </View>
    </Screen>
  );
}
