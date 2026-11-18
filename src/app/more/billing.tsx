import { BanknoteIcon, FileDownIcon, LandmarkIcon, SmartphoneIcon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router, type Href } from 'expo-router';

import {
  Badge,
  ErrorView,
  LoadingView,
  toneForInvoice,
} from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { shortDate } from '@/lib/dates';
import { exportInvoicePdf } from '@/lib/pdf';
import type { BillingPayload, Invoice, PaymentStatus } from '@/lib/types';

const accessTone: Record<string, 'success' | 'warning' | 'danger'> = {
  allowed: 'success',
  blocked_unpaid: 'danger',
  blocked_no_period: 'warning',
};

const accessLabel: Record<string, string> = {
  allowed: 'Active',
  blocked_unpaid: 'Payment required',
  blocked_no_period: 'No active period',
};

const accessExplanations: Record<string, string> = {
  paid: 'Your membership is active.',
  trial: 'You are on a trial period.',
  pay_window: 'A payment window is open. Submit your payment to keep access.',
  no_invoice: 'There is no active period. Ask your trainer to set one up.',
  illustrative: 'Illustrative mode — no payment is required.',
};

const paymentStatusTone: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  forgiven: 'default',
};

export default function BillingScreen() {
  const [billing, setBilling] = React.useState<BillingPayload | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [payload, invoiceRows] = await Promise.all([
        api<BillingPayload>('client/billing/'),
        api<Invoice[]>('client/invoices/'),
      ]);
      setBilling(payload);
      setInvoices(invoiceRows);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load billing.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // Feature 12: submission lives in the payment portal (radio channel +
  // transaction id); this screen only routes there.
  const goPay = () => router.push('/more/payment-portal' as Href);

  async function exportPdf(invoice: Invoice) {
    try {
      await exportInvoicePdf(invoice);
    } catch (e) {
      Alert.alert('Could not export PDF', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  if (loading) return <LoadingView label="Loading billing…" />;
  if (error) return <ErrorView error={error} onRetry={load} />;
  if (!billing) return <ErrorView error="Billing information unavailable." onRetry={load} />;

  const instructions = billing.payment_instructions;
  const reason = billing.access.reason ?? billing.mode;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-12">
      <View className="border-border mt-3 gap-2 rounded-xl border p-4">
        <View className="flex-row items-center justify-between">
          <Text variant="h4">Access</Text>
          <Badge label={accessLabel[billing.access.state] ?? billing.access.state} tone={accessTone[billing.access.state] ?? 'default'} />
        </View>
        <Text variant="muted">{accessExplanations[reason] ?? 'Contact your trainer for details.'}</Text>
      </View>

      {billing.active_period ? (
        <View className="border-border mt-4 gap-1 rounded-xl border p-4">
          <Text variant="h4">Active period</Text>
          <Text>
            {shortDate(billing.active_period.start_date)} – {shortDate(billing.active_period.end_date)}
          </Text>
          {billing.active_period.package_name ? <Text variant="muted">{billing.active_period.package_name}</Text> : null}
          <Text variant="muted">
            {billing.active_period.is_trial ? 'Trial' : `${billing.active_period.amount} ETB`}
          </Text>
        </View>
      ) : null}

      {/* Feature 11: the warning state flips on the resolver's boundary —
          it counts down while the config is live, then the period is gone
          and the creation-time instruction applies automatically. */}
      {billing.payment_requirement.days_left !== null &&
      billing.payment_requirement.days_left <= 7 ? (
        <View className="border-border mt-4 gap-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Text variant="h4" className="text-amber-700 dark:text-amber-300">
            {billing.payment_requirement.days_left <= 0
              ? 'Your period ends today'
              : `Your period ends in ${billing.payment_requirement.days_left} day${
                  billing.payment_requirement.days_left === 1 ? '' : 's'
                }`}
          </Text>
          <Text variant="muted">
            After it ends you will be billed through your usual payment
            instruction. Submit your payment to stay covered.
          </Text>
        </View>
      ) : null}

      {/* Feature 10: the resolver decides whether money is asked for at all. */}
      {billing.payment_requirement.required ? (
        <View className="border-border mt-4 gap-1 rounded-xl border p-4">
          <View className="flex-row items-center justify-between">
            <Text variant="h4">Amount due</Text>
            <Badge label="Payment required" tone="warning" />
          </View>
          <Text className="font-semibold">
            {billing.payment_requirement.amount ?? '—'} ETB
          </Text>
          <Text variant="muted">
            {billing.payment_requirement.source === 'period'
              ? 'As set by your trainer for the current period.'
              : 'Your standard payment instruction.'}
          </Text>
        </View>
      ) : (
        <View className="border-border mt-4 gap-1 rounded-xl border p-4">
          <View className="flex-row items-center justify-between">
            <Text variant="h4">Payment</Text>
            <Badge label="None due" tone="success" />
          </View>
          <Text variant="muted">
            {billing.payment_requirement.source === 'trial'
              ? 'You are on a free trial — no payment is required during this period.'
              : billing.payment_requirement.source === 'paid'
                ? 'This period is settled. Nothing to pay right now.'
                : 'No payment is required right now.'}
          </Text>
        </View>
      )}

      {billing.invoice ? (
        <View className="border-border mt-4 gap-2 rounded-xl border p-4">
          <View className="flex-row items-center justify-between">
            <Text variant="h4">Pending invoice</Text>
            <Badge label={billing.invoice.status} tone={toneForInvoice[billing.invoice.status]} />
          </View>
          <Text className="font-semibold">{billing.invoice.amount} ETB</Text>
          <Text variant="muted">Due {shortDate(billing.invoice.due_date)}</Text>
        </View>
      ) : null}

      {/* Zero payment prompts when nothing is owed (trial / paid / illustrative). */}
      {billing.payment_requirement.required || billing.invoice ? (
        <Button className="mt-4" onPress={goPay}>
          <Text>Submit payment</Text>
        </Button>
      ) : null}

      <Text variant="h4" className="mb-2 mt-6">
        Payment instructions
      </Text>
      <View className="border-border gap-3 rounded-xl border p-4">
        {instructions.telebirr_number ? (
          <View className="flex-row items-center gap-2">
            <Icon as={SmartphoneIcon} size={18} className="text-muted-foreground" />
            <Text>Telebirr: {instructions.telebirr_number}</Text>
          </View>
        ) : null}
        {instructions.bank_name || instructions.bank_account_number ? (
          <View className="flex-row items-center gap-2">
            <Icon as={LandmarkIcon} size={18} className="text-muted-foreground" />
            <View className="flex-1">
              {instructions.bank_name ? <Text>Bank: {instructions.bank_name}</Text> : null}
              {instructions.bank_account_name ? <Text variant="muted">Account name: {instructions.bank_account_name}</Text> : null}
              {instructions.bank_account_number ? <Text variant="muted">Account: {instructions.bank_account_number}</Text> : null}
            </View>
          </View>
        ) : null}
        {instructions.cash_note ? (
          <View className="flex-row items-center gap-2">
            <Icon as={BanknoteIcon} size={18} className="text-muted-foreground" />
            <Text>{instructions.cash_note}</Text>
          </View>
        ) : null}
        {!instructions.telebirr_number && !instructions.bank_name && !instructions.bank_account_number && !instructions.cash_note ? (
          <Text variant="muted">Ask your trainer for payment details.</Text>
        ) : null}
      </View>

      <Text variant="h4" className="mb-2 mt-6">
        Invoice history
      </Text>
      {invoices.length === 0 ? (
        <Text variant="muted">No invoices yet.</Text>
      ) : (
        <View className="gap-3">
          {invoices.map((invoice) => (
            <View key={invoice.id} className="border-border gap-2 rounded-xl border p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold">{invoice.amount} ETB</Text>
                <Badge label={invoice.status} tone={toneForInvoice[invoice.status]} />
              </View>
              <Text variant="muted">Due {shortDate(invoice.due_date)}</Text>
              {invoice.period_info ? (
                <Text variant="muted">
                  {shortDate(invoice.period_info.start_date)} – {shortDate(invoice.period_info.end_date)}
                  {invoice.period_info.is_trial ? ' (trial)' : ''}
                </Text>
              ) : null}
              {invoice.payments.length > 0 ? (
                <View className="mt-1 gap-1.5">
                  {invoice.payments.map((payment) => (
                    <View key={payment.id} className="flex-row items-center justify-between">
                      <Text variant="muted">
                        {payment.transaction_id} · {payment.channel}
                      </Text>
                      <Badge label={payment.status} tone={paymentStatusTone[payment.status]} />
                    </View>
                  ))}
                </View>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="mt-1 self-start"
                onPress={() => exportPdf(invoice)}>
                <Icon as={FileDownIcon} size={14} />
                <Text>Export PDF</Text>
              </Button>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
