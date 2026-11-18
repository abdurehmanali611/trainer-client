import { TriangleAlertIcon } from 'lucide-react-native';
import { router, type Href } from 'expo-router';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

/**
 * Feature 13: warning icon in the app header while the active payment
 * instruction is inside its final 7 days (the feature-11 resolver boundary).
 *
 * Renders nothing when `daysLeft` is null (no period applies) or when there
 * are more than 7 days left, so it can never conflict with the blocked/lock
 * screen (feature 15) — that screen replaces the header entirely.
 *
 * Tap → payment portal (feature 12).
 */
export function PaymentWarningBadge({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null || daysLeft > 7) return null;

  const label = daysLeft <= 0 ? 'today' : `${daysLeft}d`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        daysLeft <= 0
          ? 'Payment warning: your period ends today. Open payment portal.'
          : `Payment warning: your period ends in ${daysLeft} days. Open payment portal.`
      }
      onPress={() => router.push('/more/payment-portal' as Href)}
      className="h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 shadow-sm">
      <Icon as={TriangleAlertIcon} color="#ffffff" size={18} />
      <Text className="text-xs font-bold text-white">{label}</Text>
    </Pressable>
  );
}
