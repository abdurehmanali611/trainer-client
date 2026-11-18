import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import { shortDate } from '@/lib/dates';
import type { Invoice } from '@/lib/types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportInvoicePdf(invoice: Invoice): Promise<void> {
  const period = invoice.period_info;
  const periodText = period
    ? `${shortDate(period.start_date)} – ${shortDate(period.end_date)}${period.is_trial ? ' (trial)' : ''}`
    : '—';

  const paymentRows =
    invoice.payments.length > 0
      ? invoice.payments
          .map(
            (p) =>
              `<tr><td>${escapeHtml(p.transaction_id)}</td><td>${escapeHtml(p.channel)}</td><td>${escapeHtml(p.status)}</td></tr>`
          )
          .join('')
      : '<tr><td colspan="3">No payments recorded.</td></tr>';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 40px; }
  h1 { font-size: 22px; margin: 0 0 24px; }
  h2 { font-size: 16px; margin: 0 0 10px; }
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  .meta td { padding: 8px 0; border-bottom: 1px solid #e5e5e5; font-size: 14px; vertical-align: top; }
  .meta td:first-child { width: 140px; color: #666; }
  .payments { width: 100%; border-collapse: collapse; font-size: 14px; }
  .payments th { text-align: left; color: #666; font-weight: 600; border-bottom: 2px solid #111; padding: 8px 0; }
  .payments td { padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
  .footer { margin-top: 32px; font-size: 12px; color: #888; }
</style>
</head>
<body>
  <h1>Trainer Invoice #${invoice.id}</h1>
  <table class="meta">
    <tr><td>Client</td><td>${escapeHtml(invoice.client_name)}</td></tr>
    <tr><td>Amount</td><td>${escapeHtml(invoice.amount)} ETB</td></tr>
    <tr><td>Due date</td><td>${shortDate(invoice.due_date)}</td></tr>
    <tr><td>Status</td><td>${escapeHtml(invoice.status)}</td></tr>
    <tr><td>Period</td><td>${periodText}</td></tr>
  </table>
  <h2>Payments</h2>
  <table class="payments">
    <thead><tr><th>Transaction ID</th><th>Channel</th><th>Status</th></tr></thead>
    <tbody>${paymentRows}</tbody>
  </table>
  <p class="footer">Generated ${shortDate(new Date().toISOString())}</p>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } else {
    Alert.alert('Invoice PDF', `The PDF was saved to:\n${uri}`);
  }
}
