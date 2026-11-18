import { BanknoteIcon, LandmarkIcon, SmartphoneIcon } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Badge, ErrorView, LoadingView } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import type { BillingPayload, PaymentChannel } from '@/lib/types';

/** Feature 12: the payment channel is a radio group with exactly these three. */
const CHANNELS: {
  key: PaymentChannel;
  label: string;
  hint: string;
  icon: typeof SmartphoneIcon;
}[] = [
  { key: 'telebirr', label: 'Telebirr', hint: 'Pay to your trainer’s Telebirr number.', icon: SmartphoneIcon },
  { key: 'cbe', label: 'CBE', hint: 'Commercial Bank of Ethiopia transfer.', icon: LandmarkIcon },
  { key: 'others', label: 'Others', hint: 'Any other payment channel.', icon: BanknoteIcon },
];

/** Where to send the money for the selected channel. */
function instructionFor(billing: BillingPayload, channel: PaymentChannel): string {
  const instructions = billing.payment_instructions;
  if (channel === 'telebirr') return instructions.telebirr_number || '—';
  if (channel === 'cbe') {
    return (
      [instructions.bank_name, instructions.bank_account_name, instructions.bank_account_number]
        .filter(Boolean)
        .join(' • ') || '—'
    );
  }
  return instructions.cash_note || 'Pay through any channel your trainer accepts.';
}

export default function PaymentPortalScreen() {
  const [billing, setBilling] = React.useState<BillingPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [channel, setChannel] = React.useState<PaymentChannel>('telebirr');
  const [transactionId, setTransactionId] = React.useState('');
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const payload = await api<BillingPayload>('client/billing/');
      setBilling(payload);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load payment details.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    // Required validation: no transaction id, no submission.
    if (!transactionId.trim()) {
      setFieldError('Transaction ID is required.');
      return;
    }
    setSubmitting(true);
    setFieldError(null);
    try {
      await api('client/billing/', {
        method: 'POST',
        body: {
          transaction_id: transactionId.trim(),
          channel,
          invoice_id: billing?.invoice?.id ?? billing?.access.invoice_id ?? undefined,
        },
      });
      setSubmitted(true);
      setTransactionId('');
      await load();
    } catch (e) {
      setFieldError(e instanceof ApiError ? e.message : 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingView label="Loading payment portal…" />;
  if (error) return <ErrorView error={error} onRetry={load} />;
  if (!billing) return <ErrorView error="Payment details unavailable." onRetry={load} />;

  const requirement = billing.payment_requirement;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-12">
      {/* What is owed right now (feature-10 resolver). */}
      <View className="border-border mt-3 gap-1 rounded-xl border p-4">
        <View className="flex-row items-center justify-between">
          <Text variant="h4">Amount due</Text>
          <Badge
            label={requirement.required ? 'Payment required' : 'None due'}
            tone={requirement.required ? 'warning' : 'success'}
          />
        </View>
        <Text className="font-semibold">
          {requirement.required ? `${requirement.amount ?? '—'} ETB` : 'Nothing to pay right now'}
        </Text>
        {requirement.required ? (
          <Text variant="muted">
            {requirement.source === 'period'
              ? 'As set by your trainer for the current period.'
              : 'Your standard payment instruction.'}
          </Text>
        ) : null}
      </View>

      {submitted ? (
        <View className="mt-4 items-center gap-2 rounded-xl bg-success/10 p-5">
          <Text variant="h4">Payment submitted</Text>
          <Text variant="muted" className="text-center">
            Your trainer will review it. You will be notified once it is approved.
          </Text>
        </View>
      ) : (
        <View className="mt-4 gap-4">
          {/* Feature 12: channel as radio buttons — exactly three options. */}
          <View className="border-border gap-3 rounded-xl border p-4">
            <Text variant="h4">Payment channel</Text>
            <RadioGroup value={channel} onValueChange={(v) => setChannel(v as PaymentChannel)}>
              {CHANNELS.map((option) => (
                <Label
                  key={option.key}
                  className="flex-row items-center gap-3"
                  onPress={() => setChannel(option.key)}>
                  <RadioGroupItem value={option.key} />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Icon as={option.icon} size={16} className="text-muted-foreground" />
                      <Text className="font-medium">{option.label}</Text>
                    </View>
                    <Text variant="muted" className="text-xs">
                      {option.hint}
                    </Text>
                  </View>
                </Label>
              ))}
            </RadioGroup>

            <View className="mt-1 rounded-xl bg-secondary p-3">
              <Text variant="muted">Send payment to</Text>
              <Text className="mt-1 font-medium">{instructionFor(billing, channel)}</Text>
            </View>
          </View>

          <View className="gap-2">
            <Text variant="muted" className="text-sm font-medium">
              Transaction ID / number
            </Text>
            <Input
              placeholder="e.g. 852913476501"
              autoCapitalize="characters"
              value={transactionId}
              onChangeText={(t) => {
                setTransactionId(t);
                setFieldError(null);
              }}
            />
            {fieldError ? (
              <Text className="text-red-600 dark:text-red-400">{fieldError}</Text>
            ) : (
              <Text variant="muted" className="text-xs">
                The transaction ID from your payment is your proof of payment.
              </Text>
            )}
          </View>

          <Button disabled={submitting} onPress={submit}>
            <Text>{submitting ? 'Submitting…' : 'Submit payment'}</Text>
          </Button>
        </View>
      )}
    </ScrollView>
  );
}
