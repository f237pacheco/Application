import { Resend } from 'resend';
import { formatDateFR, formatTimeFR } from '@/lib/booking';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = 'Velona <reservations@velona.app>';

type BookingEmailData = {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  serviceNote?: string;
  businessName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM[:SS]
  proEmail?: string;
};

function escapeHtml(str: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

function layout(title: string, accentColor: string, body: string): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #18181B;">
      <h2 style="color: ${accentColor}; margin-bottom: 4px;">${title}</h2>
      ${body}
      <p style="color: #A1A1AA; font-size: 12px; margin-top: 24px;">Cet email a été envoyé automatiquement par Velona.</p>
    </div>
  `;
}

export async function sendBookingConfirmationToClient(data: BookingEmailData): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing — skipping client confirmation email');
    return;
  }
  const dateLabel = formatDateFR(data.date);
  const timeLabel = formatTimeFR(data.time);
  try {
    await resend.emails.send({
      from: FROM,
      to: data.clientEmail,
      subject: `Confirmation de votre RDV — ${data.businessName}`,
      html: layout(
        '✓ Rendez-vous confirmé',
        '#10B981',
        `
          <p>Bonjour ${escapeHtml(data.clientName)},</p>
          <p>Votre rendez-vous avec <strong>${escapeHtml(data.businessName)}</strong> est confirmé :</p>
          <p style="font-size: 17px; font-weight: 700; text-transform: capitalize;">${dateLabel} à ${timeLabel}</p>
          ${data.serviceNote ? `<p><strong>Note :</strong> ${escapeHtml(data.serviceNote)}</p>` : ''}
          <p style="color: #71717A; font-size: 13px;">Pour annuler ou modifier ce rendez-vous, contactez directement ${escapeHtml(data.businessName)}.</p>
        `
      ),
    });
  } catch (err) {
    console.error('[email] failed to send client confirmation', err);
  }
}

export async function sendBookingNotificationToPro(data: BookingEmailData): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing — skipping pro notification email');
    return;
  }
  if (!data.proEmail) return;
  const dateLabel = formatDateFR(data.date);
  const timeLabel = formatTimeFR(data.time);
  try {
    await resend.emails.send({
      from: FROM,
      to: data.proEmail,
      subject: `Nouveau RDV — ${data.clientName} le ${dateLabel}`,
      html: layout(
        '📅 Nouveau rendez-vous',
        '#10B981',
        `
          <p style="font-size: 17px; font-weight: 700; text-transform: capitalize;">${dateLabel} à ${timeLabel}</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 4px 0; color: #71717A;">Client</td><td style="padding: 4px 0; font-weight: 600;">${escapeHtml(data.clientName)}</td></tr>
            <tr><td style="padding: 4px 0; color: #71717A;">Email</td><td style="padding: 4px 0;">${escapeHtml(data.clientEmail)}</td></tr>
            ${data.clientPhone ? `<tr><td style="padding: 4px 0; color: #71717A;">Téléphone</td><td style="padding: 4px 0;">${escapeHtml(data.clientPhone)}</td></tr>` : ''}
            ${data.serviceNote ? `<tr><td style="padding: 4px 0; color: #71717A;">Note</td><td style="padding: 4px 0;">${escapeHtml(data.serviceNote)}</td></tr>` : ''}
          </table>
        `
      ),
    });
  } catch (err) {
    console.error('[email] failed to send pro notification', err);
  }
}

export async function sendBookingCancellationToClient(data: BookingEmailData): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing — skipping cancellation email');
    return;
  }
  const dateLabel = formatDateFR(data.date);
  const timeLabel = formatTimeFR(data.time);
  try {
    await resend.emails.send({
      from: FROM,
      to: data.clientEmail,
      subject: `Annulation de votre RDV — ${data.businessName}`,
      html: layout(
        'Rendez-vous annulé',
        '#EF4444',
        `
          <p>Bonjour ${escapeHtml(data.clientName)},</p>
          <p>Votre rendez-vous du <strong style="text-transform: capitalize;">${dateLabel} à ${timeLabel}</strong> avec ${escapeHtml(data.businessName)} a été annulé.</p>
          <p style="color: #71717A; font-size: 13px;">Vous pouvez reprendre un nouveau créneau à tout moment via leur lien de réservation.</p>
        `
      ),
    });
  } catch (err) {
    console.error('[email] failed to send cancellation email', err);
  }
}
