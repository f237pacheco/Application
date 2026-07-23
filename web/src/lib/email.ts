import { Resend } from 'resend';
import { formatDateFR, formatHourFR } from '@/lib/booking';
import { generateICS } from '@/lib/ics';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Without a verified domain, Resend only allows sending from onboarding@resend.dev,
// and only to the email address of the Resend account itself. Set RESEND_FROM_EMAIL
// once a domain is verified (see the deployment notes) to send to real clients.
const FROM = process.env.RESEND_FROM_EMAIL || 'Velona <onboarding@resend.dev>';

// Runs once when this module is first loaded by the server (dev server start
// or first request in prod) — confirms the config actually in effect, without
// ever printing the key itself.
console.log(`[email] RESEND_API_KEY : ${process.env.RESEND_API_KEY ? 'clé présente' : 'CLÉ MANQUANTE — aucun email ne sera envoyé'}`);
console.log(`[email] expéditeur (FROM) : ${FROM}`);

const DEFAULT_ADDRESS = '12 rue de la Paix, 49000 Angers';
const DEFAULT_PHONE = '02 41 00 00 00';
const DEFAULT_DURATION = 30;

type BookingEmailData = {
  bookingId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  serviceNote?: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessLogoUrl?: string;
  slotDuration?: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM[:SS]
  proEmail?: string;
};

function escapeHtml(str: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

// Table-based layout (not flexbox/grid) for compatibility across Gmail/Outlook/Apple Mail.
function emailShell(businessName: string, logoUrl: string | undefined, headerBg: string, bodyHtml: string, footerText: string): string {
  const headerContent = logoUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
         <td style="padding-right:10px;"><img src="${escapeHtml(logoUrl)}" width="32" height="32" alt="" style="display:block;border-radius:8px;object-fit:cover;" /></td>
         <td style="vertical-align:middle;"><span style="color:#FFFFFF;font-size:17px;font-weight:700;">${escapeHtml(businessName)}</span></td>
       </tr></table>`
    : `<span style="color:#FFFFFF;font-size:17px;font-weight:700;">${escapeHtml(businessName)}</span>`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @media (max-width: 480px) {
      .velona-card { border-radius: 0 !important; }
      .velona-pad { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F4F4F5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="velona-card" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E4E4E7;">
          <tr>
            <td class="velona-pad" style="background:${headerBg};padding:22px 32px;">
              ${headerContent}
            </td>
          </tr>
          <tr>
            <td class="velona-pad" style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="velona-pad" style="padding:18px 32px;background:#FAFAFA;border-top:1px solid #E4E4E7;">
              <p style="margin:0;color:#A1A1AA;font-size:12px;line-height:1.5;">${footerText}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function contactBlock(businessName: string, address: string, phone: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E4E4E7;margin-top:8px;">
      <tr>
        <td style="padding-top:20px;">
          <div style="color:#18181B;font-size:14px;font-weight:700;margin-bottom:6px;">${escapeHtml(businessName)}</div>
          <div style="color:#71717A;font-size:13px;line-height:1.7;">
            📍 ${escapeHtml(address)}<br />
            📞 ${escapeHtml(phone)}
          </div>
        </td>
      </tr>
    </table>`;
}

function calendarNoticeBlock(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:12px 16px;background:#F4F4F5;border-radius:10px;text-align:center;">
          <span style="color:#3F3F46;font-size:13px;">📅 Un fichier <strong>.ics</strong> est joint à cet email — ouvrez-le pour ajouter ce RDV à votre agenda.</span>
        </td>
      </tr>
    </table>`;
}

function buildICSAttachment(data: BookingEmailData): { filename: string; content: string; contentType: string } | null {
  if (!data.bookingId) return null;
  const ics = generateICS({
    uid: `${data.bookingId}@velona.app`,
    businessName: data.businessName,
    date: data.date,
    time: data.time,
    durationMinutes: data.slotDuration || DEFAULT_DURATION,
    address: data.businessAddress,
    description: data.serviceNote,
  });
  return {
    filename: 'rendez-vous.ics',
    content: Buffer.from(ics, 'utf-8').toString('base64'),
    contentType: 'text/calendar',
  };
}

async function send(
  payload: {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
    attachments?: { filename: string; content: string; contentType: string }[];
  },
  context: string
): Promise<void> {
  if (!resend) {
    console.warn(`[email] CLÉ MANQUANTE — "${context}" NON envoyé (aurait été envoyé vers ${payload.to})`);
    return;
  }

  console.log(`[email] TENTATIVE ENVOI EMAIL (${context}) vers ${payload.to} | from=${FROM} | sujet="${payload.subject}"`);

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      ...(payload.attachments ? { attachments: payload.attachments } : {}),
    });
    const { data, error } = result;

    // Full Resend response, logged unconditionally — this is what tells us
    // definitively whether Resend accepted or rejected the send, and why.
    console.log(`[email] RÉPONSE RESEND COMPLÈTE (${context}):`, JSON.stringify({ data, error }));

    if (error) {
      console.error(`[email] ÉCHEC EMAIL (${context}) vers ${payload.to}: ${JSON.stringify(error)}`);
      const msg = (error as { message?: string }).message ?? '';
      if (/only send testing emails|verify a domain/i.test(msg)) {
        console.error(`[email] CAUSE PROBABLE : compte Resend en mode bac à sable (aucun domaine vérifié) — Resend n'autorise l'envoi qu'à l'adresse email du compte Resend lui-même, quel que soit le destinataire demandé. Vérifiez un domaine sur https://resend.com/domains puis définissez RESEND_FROM_EMAIL pour débloquer l'envoi vers de vrais clients.`);
      }
      return;
    }
    console.log(`[email] EMAIL ENVOYÉ (${context}) id=${data?.id} vers ${payload.to}`);
  } catch (err) {
    console.error(`[email] EXCEPTION lors de l'envoi (${context}) vers ${payload.to}:`, err);
  }
}

export async function sendBookingConfirmationToClient(data: BookingEmailData): Promise<void> {
  const dateLabel = formatDateFR(data.date);
  const hourLabel = formatHourFR(data.time);
  const address = data.businessAddress?.trim() || DEFAULT_ADDRESS;
  const phone = data.businessPhone?.trim() || DEFAULT_PHONE;
  const ics = buildICSAttachment(data);

  const html = emailShell(
    data.businessName,
    data.businessLogoUrl,
    '#09090B',
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px 24px;text-align:center;">
            <div style="font-size:26px;line-height:1;margin-bottom:8px;">✅</div>
            <div style="color:#065F46;font-size:16px;font-weight:700;">Votre rendez-vous est confirmé</div>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 4px;color:#3F3F46;font-size:14px;">Bonjour ${escapeHtml(data.clientName)},</p>
      <p style="margin:0 0 20px;color:#3F3F46;font-size:14px;line-height:1.6;">Nous confirmons votre rendez-vous avec <strong>${escapeHtml(data.businessName)}</strong> :</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px 24px;text-align:center;">
            <div style="color:#18181B;font-size:17px;font-weight:700;text-transform:capitalize;">Le ${dateLabel}</div>
            <div style="color:#10B981;font-size:26px;font-weight:800;margin-top:6px;">à ${hourLabel}</div>
            ${data.slotDuration ? `<div style="color:#71717A;font-size:12px;margin-top:4px;">Durée : ${data.slotDuration} min</div>` : ''}
          </td>
        </tr>
      </table>

      ${data.serviceNote ? `<p style="margin:0 0 20px;color:#3F3F46;font-size:14px;"><strong style="color:#18181B;">Motif :</strong> ${escapeHtml(data.serviceNote)}</p>` : ''}

      ${contactBlock(data.businessName, address, phone)}
      ${ics ? calendarNoticeBlock() : ''}
    `,
    `Confirmation envoyée automatiquement suite à votre réservation sur la page de ${escapeHtml(data.businessName)}. Pour annuler ou modifier ce rendez-vous, contactez directement ${escapeHtml(data.businessName)}.`
  );

  const text = [
    `Rendez-vous confirmé`,
    ``,
    `Bonjour ${data.clientName},`,
    ``,
    `Votre rendez-vous avec ${data.businessName} est confirmé :`,
    `Le ${dateLabel} à ${hourLabel}`,
    ``,
    data.serviceNote ? `Motif : ${data.serviceNote}` : '',
    ``,
    `${data.businessName}`,
    `${address}`,
    `${phone}`,
  ].filter(Boolean).join('\n');

  await send(
    {
      to: data.clientEmail,
      subject: `Confirmation de votre RDV du ${dateLabel}`,
      html,
      text,
      replyTo: data.proEmail,
      attachments: ics ? [ics] : undefined,
    },
    'client confirmation'
  );
}

export async function sendBookingNotificationToPro(data: BookingEmailData): Promise<void> {
  if (!data.proEmail) {
    console.warn('[email] no pro email on file — skipping pro notification');
    return;
  }
  const dateLabel = formatDateFR(data.date);
  const hourLabel = formatHourFR(data.time);
  const ics = buildICSAttachment(data);

  const html = emailShell(
    data.businessName,
    data.businessLogoUrl,
    '#10B981',
    `
      <p style="margin:0 0 4px;color:#18181B;font-size:15px;font-weight:700;">📅 Nouveau rendez-vous</p>
      <p style="margin:0 0 20px;color:#71717A;font-size:13px;">Un client vient de réserver un créneau.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;border-radius:12px;margin-bottom:20px;">
        <tr>
          <td style="padding:18px 22px;text-align:center;">
            <div style="color:#18181B;font-size:16px;font-weight:700;text-transform:capitalize;">Le ${dateLabel}</div>
            <div style="color:#10B981;font-size:22px;font-weight:800;margin-top:4px;">à ${hourLabel}</div>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr><td style="padding:6px 0;color:#71717A;width:110px;">Client</td><td style="padding:6px 0;color:#18181B;font-weight:600;">${escapeHtml(data.clientName)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717A;">Email</td><td style="padding:6px 0;color:#18181B;">${escapeHtml(data.clientEmail)}</td></tr>
        ${data.clientPhone ? `<tr><td style="padding:6px 0;color:#71717A;">Téléphone</td><td style="padding:6px 0;color:#18181B;">${escapeHtml(data.clientPhone)}</td></tr>` : ''}
        ${data.serviceNote ? `<tr><td style="padding:6px 0;color:#71717A;vertical-align:top;">Motif</td><td style="padding:6px 0;color:#18181B;">${escapeHtml(data.serviceNote)}</td></tr>` : ''}
      </table>
      ${ics ? calendarNoticeBlock() : ''}
    `,
    `Notification automatique de votre système de réservation ${escapeHtml(data.businessName)}.`
  );

  const text = [
    `Nouveau rendez-vous`,
    ``,
    `Le ${dateLabel} à ${hourLabel}`,
    ``,
    `Client : ${data.clientName}`,
    `Email : ${data.clientEmail}`,
    data.clientPhone ? `Téléphone : ${data.clientPhone}` : '',
    data.serviceNote ? `Motif : ${data.serviceNote}` : '',
  ].filter(Boolean).join('\n');

  await send(
    {
      to: data.proEmail,
      subject: `Nouveau RDV le ${dateLabel} — ${data.clientName}`,
      html,
      text,
      replyTo: data.clientEmail,
      attachments: ics ? [ics] : undefined,
    },
    'pro notification'
  );
}

export async function sendBookingCancellationToClient(data: BookingEmailData): Promise<void> {
  const dateLabel = formatDateFR(data.date);
  const hourLabel = formatHourFR(data.time);

  const html = emailShell(
    data.businessName,
    data.businessLogoUrl,
    '#09090B',
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px 24px;text-align:center;">
            <div style="color:#991B1B;font-size:16px;font-weight:700;">Rendez-vous annulé</div>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 4px;color:#3F3F46;font-size:14px;">Bonjour ${escapeHtml(data.clientName)},</p>
      <p style="margin:0 0 20px;color:#3F3F46;font-size:14px;line-height:1.6;">
        Votre rendez-vous du <strong style="text-transform:capitalize;">${dateLabel} à ${hourLabel}</strong> avec ${escapeHtml(data.businessName)} a été annulé.
      </p>
      <p style="margin:0;color:#71717A;font-size:13px;">Vous pouvez reprendre un nouveau créneau à tout moment via leur lien de réservation.</p>
    `,
    `Notification automatique envoyée suite à l'annulation de votre rendez-vous avec ${escapeHtml(data.businessName)}.`
  );

  const text = [
    `Rendez-vous annulé`,
    ``,
    `Bonjour ${data.clientName},`,
    ``,
    `Votre rendez-vous du ${dateLabel} à ${hourLabel} avec ${data.businessName} a été annulé.`,
    `Vous pouvez reprendre un nouveau créneau à tout moment via leur lien de réservation.`,
  ].join('\n');

  await send(
    {
      to: data.clientEmail,
      subject: `Annulation de votre RDV du ${dateLabel}`,
      html,
      text,
      replyTo: data.proEmail,
    },
    'cancellation'
  );
}
