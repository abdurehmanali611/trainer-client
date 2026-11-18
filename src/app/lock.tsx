import { useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Badge } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { BillingPayload, PaymentChannel } from '@/lib/types';

const CHANNELS: { key: PaymentChannel; label: string }[] = [
  { key: 'telebirr', label: 'Telebirr' },
  { key: 'cbe', label: 'CBE' },
  { key: 'others', label: 'Others' },
];

export default function LockScreen() {
  const { blockedBilling, blockedReason, blockedPhone, signOut } = useAuth();
  const router = useRouter();
  const billing: BillingPayload | null = blockedBilling;
  const [channel, setChannel] = React.useState<PaymentChannel>('telebirr');
  const [transactionId, setTransactionId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const instructions = billing?.payment_instructions;

  function instructionFor(ch: PaymentChannel): string {
    if (!instructions) return '';
    // Feature 12 channels: Telebirr / CBE / Others.
    if (ch === 'telebirr') return instructions.telebirr_number || '—';
    if (ch === 'cbe')
      return [instructions.bank_name, instructions.bank_account_name, instructions.bank_account_number]
        .filter(Boolean)
        .join(' • ') || '—';
    return instructions.cash_note || 'Pay through any channel your trainer accepts.';
  }

  async function onSubmit() {
    if (!transactionId.trim()) {
      Alert.alert('Missing transaction ID', 'Enter the transaction ID from your payment.');
      return;
    }
    setLoading(true);
    try {
      await api('auth/lock-payment-submit/', {
        method: 'POST',
        body: { phone: blockedPhone ?? '', transaction_id: transactionId.trim(), channel },
        auth: false,
      });
      setSubmitted(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const reasonText =
    blockedReason === 'blocked_unpaid'
      ? 'Your subscription payment is pending.'
      : 'You have no active subscription period.';

  return (
    <AuthShell
      title="Account locked"
      subtitle={reasonText}
      tagline="Submit your payment to get back to training."
      footer={
        <Button variant="link" size="sm" onPress={() => signOut().then(() => router.replace('/auth/login'))}>
          <Text className="text-sm font-semibold text-white/90">Back to sign in</Text>
        </Button>
      }>
      {billing?.invoice ? (
        <View className="gap-1 rounded-2xl border border-border/60 bg-muted/50 p-4">
          <View className="flex-row items-center justify-between">
            <Text variant="muted">Amount due</Text>
            <Text className="font-semibold">{billing.invoice.amount}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text variant="muted">Due date</Text>
            <Text>{billing.invoice.due_date}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text variant="muted">Status</Text>
            <Badge label={billing.invoice.status} tone="warning" />
          </View>
        </View>
      ) : null}

      {submitted ? (
        <View className="items-center gap-2 rounded-2xl bg-success/10 p-5">
          <Text variant="h4">Payment submitted</Text>
          <Text variant="muted" className="text-center">
            Your trainer will review it. Access will be restored once it is approved.
          </Text>
        </View>
      ) : (
        <View className="gap-4">
          <View className="gap-2">
            <Text variant="muted">Payment channel</Text>
            <View className="flex-row gap-2">
              {CHANNELS.map((c) => (
                <Button
                  key={c.key}
                  variant={channel === c.key ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setChannel(c.key)}>
                  <Text className="text-sm">{c.label}</Text>
                </Button>
              ))}
            </View>
            <View className="mt-2 rounded-xl bg-secondary p-3">
              <Text variant="muted">Send payment to</Text>
              <Text className="mt-1 font-medium">{instructionFor(channel)}</Text>
            </View>
          </View>

          <Input
            placeholder="Transaction ID"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            value={transactionId}
            onChangeText={setTransactionId}
          />
          <Button disabled={loading} onPress={onSubmit}>
            <Text className="text-sm font-semibold text-primary-foreground">
              {loading ? 'Submitting…' : 'Submit payment'}
            </Text>
          </Button>
        </View>
      )}
    </AuthShell>
  );
}
