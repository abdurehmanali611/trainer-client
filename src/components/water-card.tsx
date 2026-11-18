import { DropletsIcon, PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Pressable, View } from 'react-native';

import { alpha, Bar, COLORS, IconBubble, Panel } from '@/components/kit';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api } from '@/lib/api';
import type { WaterLog } from '@/lib/types';

export const WATER_GOAL_ML = 2000;

/**
 * Today's water: progress toward the daily goal with one-tap +250 / +500 ml.
 * Shared by Home and the Diet tab so both always show the same number.
 */
export function WaterCard({
  water,
  onUpdated,
  goal = WATER_GOAL_ML,
}: {
  water: WaterLog | null;
  onUpdated: (log: WaterLog) => void;
  goal?: number;
}) {
  const [busy, setBusy] = React.useState(false);
  const amount = water?.amount_ml ?? 0;
  const pct = Math.min(1, amount / goal);

  async function add(ml: number) {
    if (busy) return;
    setBusy(true);
    try {
      const log = await api<WaterLog>('client/water/', { method: 'POST', body: { amount_ml: ml } });
      onUpdated(log);
    } catch (e) {
      Alert.alert('Could not add water', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel tint={COLORS.cyan} className="gap-3">
      <View className="flex-row items-center gap-3">
        <IconBubble icon={DropletsIcon} color={COLORS.cyan} size={40} />
        <View className="flex-1">
          <Text className="text-base font-bold tracking-tight">Water</Text>
          <Text variant="muted" className="text-xs">
            {pct >= 1 ? 'Goal reached — great job!' : `${Math.max(0, goal - amount)} ml to go`}
          </Text>
        </View>
        <Text className="text-lg font-black" style={{ color: COLORS.cyan }}>
          {amount}
          <Text variant="muted" className="text-xs font-semibold">
            {' '}
            / {goal} ml
          </Text>
        </Text>
      </View>
      <Bar value={pct} color={COLORS.cyan} height={10} />
      <View className="flex-row gap-2">
        {[250, 500].map((ml) => (
          <Pressable
            key={ml}
            disabled={busy}
            onPress={() => void add(ml)}
            accessibilityRole="button"
            className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl active:opacity-70"
            style={{
              backgroundColor: alpha(COLORS.cyan, 0.14),
              borderWidth: 1,
              borderColor: alpha(COLORS.cyan, 0.35),
              opacity: busy ? 0.6 : 1,
            }}>
            <Icon as={PlusIcon} size={14} color={COLORS.cyan} />
            <Text className="text-sm font-bold" style={{ color: COLORS.cyan }}>
              {ml} ml
            </Text>
          </Pressable>
        ))}
      </View>
      {water?.reviewed && water.trainer_feedback ? (
        <Text variant="muted" className="text-xs">
          Trainer: {water.trainer_feedback}
        </Text>
      ) : null}
    </Panel>
  );
}
