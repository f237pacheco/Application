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

// A link built from a malformed base URL (missing protocol, stray trailing
// slash) is exactly the kind of bug that looks fine in code review and only
// shows up as "this site can't be reached" when a real person clicks it in
// their inbox — so this is deliberately defensive, not just a straight read.
function resolveAppUrl(): string {
  let url = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  if (!/^https?:\/\//i.test(url)) {
    console.warn(`[email] NEXT_PUBLIC_APP_URL="${url}" ne commence pas par http:// ou https:// — un lien construit avec cette valeur telle quelle serait cassé dans un email (le client mail ne saurait pas vers quel serveur naviguer). Ajout automatique de "https://" en préfixe ; corrigez la variable d'environnement pour lever cet avertissement.`);
    url = `https://${url}`;
  }
  url = url.replace(/\/+$/, '');
  return url;
}
const APP_URL = resolveAppUrl();
console.log(`[email] URL de base utilisée pour les liens "Modifier"/"Annuler" dans les emails (NEXT_PUBLIC_APP_URL) : "${APP_URL}"`);

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
  businessServices?: string;
  businessInstructions?: string;
  businessPaymentMethods?: string;
  slotDuration?: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM[:SS]
  proEmail?: string;
  manageToken?: string;
  previousDate?: string; // set on reschedule emails only
  previousTime?: string;
};

// ─── Shared palette (kept light — many email clients render dark-mode
// backgrounds unreliably, so the shell stays light with the same brand
// accents used in the app: emerald/blue/amber/red). ───────────────────────────
const INK = '#18181B';
const MUTED = '#52525B';
const FAINT = '#A1A1AA';
const CARD_BORDER = '#E4E4E7';
const PAGE_BG = '#F4F4F5';

const EMERALD = '#059669';
const EMERALD_SOFT = '#ECFDF5';
const EMERALD_BORDER = '#A7F3D0';
const BLUE = '#2563EB';
const BLUE_SOFT = '#EFF6FF';
const BLUE_BORDER = '#BFDBFE';
const RED = '#DC2626';
const RED_SOFT = '#FEF2F2';
const RED_BORDER = '#FECACA';
const AMBER = '#D97706';
const AMBER_SOFT = '#FFFBEB';
const AMBER_BORDER = '#FDE68A';

function escapeHtml(str: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ─── Shell: header (logo + business name), body slot, footer. Table-based
// layout throughout — not flexbox/grid — for compatibility across Gmail,
// Outlook, and Apple Mail. ──────────────────────────────────────────────────
function emailShell(opts: { businessName: string; logoUrl?: string; accent: string; kicker: string; bodyHtml: string; footerNote: string }): string {
  const { businessName, logoUrl, accent, kicker, bodyHtml, footerNote } = opts;
  // Fixed-width, auto-height sizing (not object-fit, which old Outlook
  // ignores entirely) is the one logo-scaling technique that actually keeps
  // the original aspect ratio across every mail client — a wide logo stays
  // wide, a tall one stays tall, nothing gets stretched into a square. The
  // white backing card keeps it legible regardless of the header's accent
  // color, and gives transparent PNGs a clean, intentional-looking frame.
  const headerContent = logoUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
         <td style="padding-right:16px;">
           <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;">
             <tr><td style="padding:6px;"><img src="${escapeHtml(logoUrl)}" width="52" alt="" style="display:block;width:52px;height:auto;max-height:52px;border-radius:8px;" /></td></tr>
           </table>
         </td>
         <td style="vertical-align:middle;">
           <div style="color:#FFFFFF;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;opacity:0.75;">${escapeHtml(kicker)}</div>
           <div style="color:#FFFFFF;font-size:23px;font-weight:800;">${escapeHtml(businessName)}</div>
         </td>
       </tr></table>`
    : `<div style="color:#FFFFFF;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;opacity:0.75;">${escapeHtml(kicker)}</div>
       <div style="color:#FFFFFF;font-size:23px;font-weight:800;">${escapeHtml(businessName)}</div>`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(businessName)}</title>
  <style>
    body { margin: 0; padding: 0; background: ${PAGE_BG}; }
    @media (max-width: 480px) {
      .velona-card { border-radius: 0 !important; }
      .velona-pad { padding: 22px 18px !important; }
      .velona-btn-cell { display: block !important; width: 100% !important; padding: 6px 0 !important; }
      .velona-btn { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="velona-card" style="max-width:600px;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid ${CARD_BORDER};">
          <tr>
            <td class="velona-pad" style="background:${accent};padding:28px 40px;">
              ${headerContent}
            </td>
          </tr>
          <tr>
            <td class="velona-pad" style="padding:40px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="velona-pad" style="padding:22px 40px;background:#FAFAFA;border-top:1px solid ${CARD_BORDER};">
              <p style="margin:0 0 6px;color:${MUTED};font-size:13px;line-height:1.6;">${footerNote}</p>
              <p style="margin:0;color:${FAINT};font-size:12px;">Propulsé par <strong style="color:${MUTED};">Velona</strong> — système de réservation en ligne.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Hero: the one thing the reader must see in two seconds — full spelled-
// out date + big time, tinted per situation (confirmed/moved/cancelled). ─────
function heroBlock(opts: { eyebrow: string; dateLabel: string; hourLabel: string; duration?: number; accent: string; soft: string; border: string; strike?: boolean }): string {
  const { eyebrow, dateLabel, hourLabel, duration, accent, soft, border, strike } = opts;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${soft};border:1px solid ${border};border-radius:14px;margin-bottom:24px;">
      <tr>
        <td style="padding:22px 24px;text-align:center;">
          <div style="color:${accent};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${escapeHtml(eyebrow)}</div>
          <div style="color:${INK};font-size:21px;font-weight:800;text-transform:capitalize;${strike ? 'text-decoration:line-through;color:' + FAINT + ';' : ''}">${dateLabel}</div>
          <div style="color:${accent};font-size:${strike ? '24px' : '36px'};font-weight:800;margin-top:4px;${strike ? 'text-decoration:line-through;' : ''}">${hourLabel}</div>
          ${duration && !strike ? `<div style="color:${MUTED};font-size:13px;margin-top:6px;">Durée estimée : ${duration} min</div>` : ''}
        </td>
      </tr>
    </table>`;
}

// ─── Practical info: everything the client needs to actually show up
// prepared, without contacting anyone — address (with a Maps link), phone
// (tappable), services, and pre-appointment instructions. ────────────────────
function detailsBlock(opts: {
  businessName: string; address: string; phone: string;
  services?: string; instructions?: string; paymentMethods?: string;
}): string {
  const { businessName, address, phone, services, instructions, paymentMethods } = opts;
  const row = (label: string, valueHtml: string) => `
      <tr>
        <td style="padding:10px 0;border-top:1px solid ${CARD_BORDER};vertical-align:top;width:120px;">
          <span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${label}</span>
        </td>
        <td style="padding:10px 0;border-top:1px solid ${CARD_BORDER};vertical-align:top;">
          ${valueHtml}
        </td>
      </tr>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
      <tr>
        <td colspan="2" style="padding-bottom:10px;">
          <div style="color:${INK};font-size:17px;font-weight:700;">${escapeHtml(businessName)}</div>
        </td>
      </tr>
      ${row('Adresse', `<a href="${mapsHref(address)}" style="color:${BLUE};font-size:15px;text-decoration:none;line-height:1.5;">${escapeHtml(address)} ↗</a>`)}
      ${row('Téléphone', `<a href="${telHref(phone)}" style="color:${BLUE};font-size:15px;text-decoration:none;">${escapeHtml(phone)}</a>`)}
      ${services ? row('Prestations', `<span style="color:${MUTED};font-size:15px;line-height:1.5;">${escapeHtml(services)}</span>`) : ''}
      ${paymentMethods ? row('Paiement', `<span style="color:${MUTED};font-size:15px;line-height:1.5;">${escapeHtml(paymentMethods)}</span>`) : ''}
    </table>
    ${instructions ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:14px 16px;background:${AMBER_SOFT};border:1px solid ${AMBER_BORDER};border-radius:10px;">
          <div style="color:${AMBER};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">À savoir avant votre RDV</div>
          <div style="color:${INK};font-size:15px;line-height:1.6;">${escapeHtml(instructions)}</div>
        </td>
      </tr>
    </table>` : ''}`;
}

function calendarNoticeBlock(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:12px 16px;background:${PAGE_BG};border-radius:10px;text-align:center;">
          <span style="color:${MUTED};font-size:13px;">Un fichier <strong style="color:${INK};">.ics</strong> est joint à cet email — ouvrez-le pour l'ajouter à votre agenda.</span>
        </td>
      </tr>
    </table>`;
}

function manageBaseUrl(manageToken: string): string {
  return `${APP_URL}/rdv/manage/${manageToken}`;
}

// "Modifier" / "Annuler" buttons pointing at the client's own manage page —
// only rendered when a manage_token exists (bookings created before that
// column existed have none, and simply don't get these links).
function manageLinksBlock(manageToken: string | undefined, context: string): string {
  if (!manageToken) return '';
  const base = manageBaseUrl(manageToken);
  const rescheduleUrl = `${base}?action=reschedule`;
  const cancelUrl = `${base}?action=cancel`;
  console.log(`[email] liens de gestion générés (${context}) -> Modifier: ${rescheduleUrl} | Annuler: ${cancelUrl}`);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;padding-top:20px;border-top:1px solid ${CARD_BORDER};">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td class="velona-btn-cell" style="padding:0 5px;">
              <a href="${rescheduleUrl}" class="velona-btn" style="display:inline-block;padding:12px 20px;border-radius:10px;background:${INK};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;">Modifier mon rendez-vous</a>
            </td>
            <td class="velona-btn-cell" style="padding:0 5px;">
              <a href="${cancelUrl}" class="velona-btn" style="display:inline-block;padding:12px 20px;border-radius:10px;background:${RED_SOFT};border:1px solid ${RED_BORDER};color:${RED};font-size:15px;font-weight:700;text-decoration:none;">Annuler mon rendez-vous</a>
            </td>
          </tr></table>
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
    console.log(`[email] RÉPONSE RESEND COMPLÈTE (${context}) vers ${payload.to}:`, JSON.stringify({ data, error }));

    if (error) {
      console.error(`[email] ============ ÉCHEC EMAIL (${context}) vers ${payload.to} ============`);
      console.error(`[email] Détail de l'erreur Resend : ${JSON.stringify(error)}`);
      const msg = (error as { message?: string; name?: string }).message ?? '';
      if (/only send testing emails|verify a domain/i.test(msg)) {
        console.error(
          `[email] CAUSE : compte Resend en mode bac à sable (aucun domaine vérifié). ` +
          `Avec l'expéditeur "onboarding@resend.dev", Resend n'autorise l'envoi QUE vers l'adresse email de votre propre compte Resend — ` +
          `tout autre destinataire (comme l'adresse d'un vrai client) est automatiquement rejeté, quel que soit le code. ` +
          `C'est très probablement pour ça que "${context}" échoue alors que d'autres envois vers votre propre adresse réussissent. ` +
          `Solution : vérifiez un domaine sur https://resend.com/domains, puis définissez la variable d'environnement RESEND_FROM_EMAIL ` +
          `avec une adresse de ce domaine (ex: "Velona <reservations@votredomaine.com>") pour pouvoir envoyer à n'importe quel destinataire.`
        );
      }
      console.error(`[email] ============================================================`);
      return;
    }
    console.log(`[email] EMAIL ENVOYÉ (${context}) id=${data?.id} vers ${payload.to}`);
  } catch (err) {
    console.error(`[email] EXCEPTION lors de l'envoi (${context}) vers ${payload.to}:`, err);
  }
}

// ─── Client: booking confirmed ──────────────────────────────────────────────

export async function sendBookingConfirmationToClient(data: BookingEmailData): Promise<void> {
  const dateLabel = formatDateFR(data.date);
  const hourLabel = formatHourFR(data.time);
  const address = data.businessAddress?.trim() || DEFAULT_ADDRESS;
  const phone = data.businessPhone?.trim() || DEFAULT_PHONE;
  const ics = buildICSAttachment(data);

  const html = emailShell({
    businessName: data.businessName,
    logoUrl: data.businessLogoUrl,
    accent: EMERALD,
    kicker: 'Rendez-vous confirmé',
    bodyHtml: `
      <p style="margin:0 0 4px;color:${INK};font-size:17px;font-weight:700;">Bonjour ${escapeHtml(data.clientName)},</p>
      <p style="margin:0 0 22px;color:${MUTED};font-size:16px;line-height:1.6;">Votre rendez-vous avec <strong style="color:${INK};">${escapeHtml(data.businessName)}</strong> est confirmé. Voici tout ce qu'il vous faut pour vous y rendre :</p>

      ${heroBlock({ eyebrow: 'Votre rendez-vous', dateLabel, hourLabel, duration: data.slotDuration, accent: EMERALD, soft: EMERALD_SOFT, border: EMERALD_BORDER })}

      ${data.serviceNote ? `<p style="margin:0 0 20px;color:${MUTED};font-size:15px;line-height:1.6;"><strong style="color:${INK};">Votre demande :</strong> ${escapeHtml(data.serviceNote)}</p>` : ''}

      ${detailsBlock({ businessName: data.businessName, address, phone, services: data.businessServices, instructions: data.businessInstructions, paymentMethods: data.businessPaymentMethods })}

      ${ics ? calendarNoticeBlock() : ''}
      ${manageLinksBlock(data.manageToken, 'confirmation client')}
    `,
    footerNote: data.manageToken
      ? 'Besoin de changer quelque chose ? Utilisez les boutons ci-dessus pour modifier ou annuler ce rendez-vous vous-même, à tout moment.'
      : `Pour annuler ou modifier ce rendez-vous, contactez directement ${escapeHtml(data.businessName)}.`,
  });

  const text = [
    `Rendez-vous confirmé`,
    ``,
    `Bonjour ${data.clientName},`,
    ``,
    `Votre rendez-vous avec ${data.businessName} est confirmé :`,
    `${dateLabel} à ${hourLabel}${data.slotDuration ? ` (durée : ${data.slotDuration} min)` : ''}`,
    ``,
    data.serviceNote ? `Votre demande : ${data.serviceNote}` : '',
    ``,
    `${data.businessName}`,
    `${address}`,
    `${phone}`,
    data.businessServices ? `Prestations : ${data.businessServices}` : '',
    data.businessPaymentMethods ? `Paiement : ${data.businessPaymentMethods}` : '',
    data.businessInstructions ? `À savoir avant votre RDV : ${data.businessInstructions}` : '',
    data.manageToken ? `` : '',
    data.manageToken ? `Modifier : ${manageBaseUrl(data.manageToken)}?action=reschedule` : '',
    data.manageToken ? `Annuler : ${manageBaseUrl(data.manageToken)}?action=cancel` : '',
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
    'confirmation client'
  );
}

// ─── Pro: new booking ────────────────────────────────────────────────────────

export async function sendBookingNotificationToPro(data: BookingEmailData): Promise<void> {
  if (!data.proEmail) {
    console.warn('[email] no pro email on file — skipping pro notification');
    return;
  }
  const dateLabel = formatDateFR(data.date);
  const hourLabel = formatHourFR(data.time);
  const ics = buildICSAttachment(data);

  const html = emailShell({
    businessName: data.businessName,
    logoUrl: data.businessLogoUrl,
    accent: EMERALD,
    kicker: 'Nouveau rendez-vous',
    bodyHtml: `
      <p style="margin:0 0 22px;color:${MUTED};font-size:16px;line-height:1.6;"><strong style="color:${INK};">${escapeHtml(data.clientName)}</strong> vient de réserver un créneau.</p>

      ${heroBlock({ eyebrow: 'Créneau réservé', dateLabel, hourLabel, duration: data.slotDuration, accent: EMERALD, soft: EMERALD_SOFT, border: EMERALD_BORDER })}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom:8px;"><span style="color:${INK};font-size:17px;font-weight:700;">Coordonnées du client</span></td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};width:100px;"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Nom</span></td>
        </tr>
        <tr><td style="padding:0 0 8px;"><span style="color:${INK};font-size:16px;font-weight:600;">${escapeHtml(data.clientName)}</span></td></tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Email</span></td>
        </tr>
        <tr><td style="padding:0 0 8px;"><a href="mailto:${escapeHtml(data.clientEmail)}" style="color:${BLUE};font-size:16px;text-decoration:none;">${escapeHtml(data.clientEmail)}</a></td></tr>
        ${data.clientPhone ? `
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Téléphone</span></td>
        </tr>
        <tr><td style="padding:0 0 8px;"><a href="${telHref(data.clientPhone)}" style="color:${BLUE};font-size:16px;text-decoration:none;">${escapeHtml(data.clientPhone)}</a></td></tr>` : ''}
        ${data.serviceNote ? `
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Motif</span></td>
        </tr>
        <tr><td style="padding:0;"><span style="color:${INK};font-size:16px;line-height:1.5;">${escapeHtml(data.serviceNote)}</span></td></tr>` : ''}
      </table>

      ${ics ? calendarNoticeBlock() : ''}
    `,
    footerNote: `Notification automatique de votre système de réservation ${escapeHtml(data.businessName)}.`,
  });

  const text = [
    `Nouveau rendez-vous`,
    ``,
    `${dateLabel} à ${hourLabel}${data.slotDuration ? ` (durée : ${data.slotDuration} min)` : ''}`,
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
    'notification pro'
  );
}

// ─── Client: booking cancelled ──────────────────────────────────────────────

export async function sendBookingCancellationToClient(data: BookingEmailData): Promise<void> {
  const dateLabel = formatDateFR(data.date);
  const hourLabel = formatHourFR(data.time);
  const address = data.businessAddress?.trim() || DEFAULT_ADDRESS;
  const phone = data.businessPhone?.trim() || DEFAULT_PHONE;

  const html = emailShell({
    businessName: data.businessName,
    logoUrl: data.businessLogoUrl,
    accent: '#3F3F46',
    kicker: 'Rendez-vous annulé',
    bodyHtml: `
      <p style="margin:0 0 4px;color:${INK};font-size:17px;font-weight:700;">Bonjour ${escapeHtml(data.clientName)},</p>
      <p style="margin:0 0 22px;color:${MUTED};font-size:16px;line-height:1.6;">Votre rendez-vous avec <strong style="color:${INK};">${escapeHtml(data.businessName)}</strong> a été annulé.</p>

      ${heroBlock({ eyebrow: 'Rendez-vous annulé', dateLabel, hourLabel, accent: RED, soft: RED_SOFT, border: RED_BORDER, strike: true })}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        <tr><td colspan="2" style="padding-bottom:10px;"><div style="color:${INK};font-size:17px;font-weight:700;">${escapeHtml(data.businessName)}</div></td></tr>
        <tr>
          <td style="padding:10px 0;border-top:1px solid ${CARD_BORDER};vertical-align:top;width:100px;"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Adresse</span></td>
          <td style="padding:10px 0;border-top:1px solid ${CARD_BORDER};vertical-align:top;"><a href="${mapsHref(address)}" style="color:${BLUE};font-size:15px;text-decoration:none;">${escapeHtml(address)} ↗</a></td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-top:1px solid ${CARD_BORDER};vertical-align:top;"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Téléphone</span></td>
          <td style="padding:10px 0;border-top:1px solid ${CARD_BORDER};vertical-align:top;"><a href="${telHref(phone)}" style="color:${BLUE};font-size:15px;text-decoration:none;">${escapeHtml(phone)}</a></td>
        </tr>
      </table>

      <p style="margin:20px 0 0;color:${MUTED};font-size:15px;line-height:1.6;">Vous pouvez reprendre un nouveau créneau à tout moment sur leur page de réservation en ligne.</p>
    `,
    footerNote: `Notification automatique envoyée suite à l'annulation de votre rendez-vous avec ${escapeHtml(data.businessName)}.`,
  });

  const text = [
    `Rendez-vous annulé`,
    ``,
    `Bonjour ${data.clientName},`,
    ``,
    `Votre rendez-vous du ${dateLabel} à ${hourLabel} avec ${data.businessName} a été annulé.`,
    ``,
    `${data.businessName}`,
    `${address}`,
    `${phone}`,
    ``,
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
    'annulation client'
  );
}

// ─── Pro: booking cancelled by the client ───────────────────────────────────

export async function sendBookingCancellationToPro(data: BookingEmailData): Promise<void> {
  if (!data.proEmail) {
    console.warn('[email] no pro email on file — skipping pro cancellation notification');
    return;
  }
  const dateLabel = formatDateFR(data.date);
  const hourLabel = formatHourFR(data.time);

  const html = emailShell({
    businessName: data.businessName,
    logoUrl: data.businessLogoUrl,
    accent: '#3F3F46',
    kicker: 'Rendez-vous annulé',
    bodyHtml: `
      <p style="margin:0 0 22px;color:${MUTED};font-size:16px;line-height:1.6;"><strong style="color:${INK};">${escapeHtml(data.clientName)}</strong> a annulé son rendez-vous.</p>

      ${heroBlock({ eyebrow: 'Créneau libéré', dateLabel, hourLabel, accent: RED, soft: RED_SOFT, border: RED_BORDER, strike: true })}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td colspan="2" style="padding-bottom:8px;"><span style="color:${INK};font-size:17px;font-weight:700;">Client</span></td></tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};width:100px;"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Nom</span></td>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><span style="color:${INK};font-size:16px;font-weight:600;">${escapeHtml(data.clientName)}</span></td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Email</span></td>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><a href="mailto:${escapeHtml(data.clientEmail)}" style="color:${BLUE};font-size:16px;text-decoration:none;">${escapeHtml(data.clientEmail)}</a></td>
        </tr>
        ${data.clientPhone ? `
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Téléphone</span></td>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><a href="${telHref(data.clientPhone)}" style="color:${BLUE};font-size:16px;text-decoration:none;">${escapeHtml(data.clientPhone)}</a></td>
        </tr>` : ''}
      </table>

      <p style="margin:20px 0 0;color:${MUTED};font-size:15px;">Ce créneau est de nouveau disponible sur votre page de réservation.</p>
    `,
    footerNote: `Notification automatique de votre système de réservation ${escapeHtml(data.businessName)}.`,
  });

  const text = [
    `Rendez-vous annulé`,
    ``,
    `${data.clientName} a annulé son rendez-vous du ${dateLabel} à ${hourLabel}.`,
    ``,
    `Client : ${data.clientName}`,
    `Email : ${data.clientEmail}`,
    data.clientPhone ? `Téléphone : ${data.clientPhone}` : '',
    ``,
    `Ce créneau est de nouveau disponible sur votre page de réservation.`,
  ].filter(Boolean).join('\n');

  await send(
    {
      to: data.proEmail,
      subject: `RDV annulé — ${data.clientName} (${dateLabel})`,
      html,
      text,
      replyTo: data.clientEmail,
    },
    'annulation pro'
  );
}

// ─── Client: booking rescheduled ────────────────────────────────────────────

export async function sendBookingRescheduledToClient(data: BookingEmailData): Promise<void> {
  const dateLabel = formatDateFR(data.date);
  const hourLabel = formatHourFR(data.time);
  const address = data.businessAddress?.trim() || DEFAULT_ADDRESS;
  const phone = data.businessPhone?.trim() || DEFAULT_PHONE;
  const ics = buildICSAttachment(data);
  const hasPrevious = !!(data.previousDate && data.previousTime);
  const previousDateLabel = data.previousDate ? formatDateFR(data.previousDate) : '';
  const previousHourLabel = data.previousTime ? formatHourFR(data.previousTime) : '';

  const html = emailShell({
    businessName: data.businessName,
    logoUrl: data.businessLogoUrl,
    accent: BLUE,
    kicker: 'Rendez-vous déplacé',
    bodyHtml: `
      <p style="margin:0 0 4px;color:${INK};font-size:17px;font-weight:700;">Bonjour ${escapeHtml(data.clientName)},</p>
      <p style="margin:0 0 22px;color:${MUTED};font-size:16px;line-height:1.6;">Votre rendez-vous avec <strong style="color:${INK};">${escapeHtml(data.businessName)}</strong> a été reprogrammé. Voici les nouvelles informations :</p>

      ${hasPrevious ? heroBlock({ eyebrow: 'Ancien créneau', dateLabel: previousDateLabel, hourLabel: previousHourLabel, accent: FAINT, soft: '#FAFAFA', border: CARD_BORDER, strike: true }) : ''}
      ${heroBlock({ eyebrow: 'Nouveau créneau', dateLabel, hourLabel, duration: data.slotDuration, accent: BLUE, soft: BLUE_SOFT, border: BLUE_BORDER })}

      ${data.serviceNote ? `<p style="margin:0 0 20px;color:${MUTED};font-size:15px;line-height:1.6;"><strong style="color:${INK};">Votre demande :</strong> ${escapeHtml(data.serviceNote)}</p>` : ''}

      ${detailsBlock({ businessName: data.businessName, address, phone, services: data.businessServices, instructions: data.businessInstructions, paymentMethods: data.businessPaymentMethods })}

      ${ics ? calendarNoticeBlock() : ''}
      ${manageLinksBlock(data.manageToken, 'modification client')}
    `,
    footerNote: data.manageToken
      ? 'Besoin de changer à nouveau ? Utilisez les boutons ci-dessus pour modifier ou annuler ce rendez-vous vous-même, à tout moment.'
      : `Pour annuler ou modifier ce rendez-vous, contactez directement ${escapeHtml(data.businessName)}.`,
  });

  const text = [
    `Rendez-vous déplacé`,
    ``,
    `Bonjour ${data.clientName},`,
    ``,
    hasPrevious ? `Ancien créneau : ${previousDateLabel} à ${previousHourLabel}` : '',
    `Nouveau créneau : ${dateLabel} à ${hourLabel}${data.slotDuration ? ` (durée : ${data.slotDuration} min)` : ''}`,
    ``,
    `${data.businessName}`,
    `${address}`,
    `${phone}`,
    data.businessServices ? `Prestations : ${data.businessServices}` : '',
    data.businessPaymentMethods ? `Paiement : ${data.businessPaymentMethods}` : '',
    data.businessInstructions ? `À savoir avant votre RDV : ${data.businessInstructions}` : '',
    data.manageToken ? `` : '',
    data.manageToken ? `Modifier : ${manageBaseUrl(data.manageToken)}?action=reschedule` : '',
    data.manageToken ? `Annuler : ${manageBaseUrl(data.manageToken)}?action=cancel` : '',
  ].filter(Boolean).join('\n');

  await send(
    {
      to: data.clientEmail,
      subject: `Votre RDV a été déplacé au ${dateLabel}`,
      html,
      text,
      replyTo: data.proEmail,
      attachments: ics ? [ics] : undefined,
    },
    'modification client'
  );
}

// ─── Pro: booking rescheduled ────────────────────────────────────────────────

export async function sendBookingRescheduledToPro(data: BookingEmailData): Promise<void> {
  if (!data.proEmail) {
    console.warn('[email] no pro email on file — skipping pro reschedule notification');
    return;
  }
  const dateLabel = formatDateFR(data.date);
  const hourLabel = formatHourFR(data.time);
  const hasPrevious = !!(data.previousDate && data.previousTime);
  const previousDateLabel = data.previousDate ? formatDateFR(data.previousDate) : '';
  const previousHourLabel = data.previousTime ? formatHourFR(data.previousTime) : '';
  const ics = buildICSAttachment(data);

  const html = emailShell({
    businessName: data.businessName,
    logoUrl: data.businessLogoUrl,
    accent: BLUE,
    kicker: 'Rendez-vous déplacé',
    bodyHtml: `
      <p style="margin:0 0 22px;color:${MUTED};font-size:16px;line-height:1.6;"><strong style="color:${INK};">${escapeHtml(data.clientName)}</strong> a changé de créneau.</p>

      ${hasPrevious ? heroBlock({ eyebrow: 'Ancien créneau', dateLabel: previousDateLabel, hourLabel: previousHourLabel, accent: FAINT, soft: '#FAFAFA', border: CARD_BORDER, strike: true }) : ''}
      ${heroBlock({ eyebrow: 'Nouveau créneau', dateLabel, hourLabel, duration: data.slotDuration, accent: BLUE, soft: BLUE_SOFT, border: BLUE_BORDER })}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td colspan="2" style="padding-bottom:8px;"><span style="color:${INK};font-size:17px;font-weight:700;">Client</span></td></tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};width:100px;"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Nom</span></td>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><span style="color:${INK};font-size:16px;font-weight:600;">${escapeHtml(data.clientName)}</span></td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Email</span></td>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><a href="mailto:${escapeHtml(data.clientEmail)}" style="color:${BLUE};font-size:16px;text-decoration:none;">${escapeHtml(data.clientEmail)}</a></td>
        </tr>
        ${data.clientPhone ? `
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><span style="color:${FAINT};font-size:12px;font-weight:700;text-transform:uppercase;">Téléphone</span></td>
          <td style="padding:8px 0;border-top:1px solid ${CARD_BORDER};"><a href="${telHref(data.clientPhone)}" style="color:${BLUE};font-size:16px;text-decoration:none;">${escapeHtml(data.clientPhone)}</a></td>
        </tr>` : ''}
      </table>

      ${ics ? calendarNoticeBlock() : ''}
    `,
    footerNote: `Notification automatique de votre système de réservation ${escapeHtml(data.businessName)}.`,
  });

  const text = [
    `Rendez-vous déplacé`,
    ``,
    `${data.clientName} a changé de créneau.`,
    hasPrevious ? `Ancien créneau : ${previousDateLabel} à ${previousHourLabel}` : '',
    `Nouveau créneau : ${dateLabel} à ${hourLabel}`,
    ``,
    `Client : ${data.clientName}`,
    `Email : ${data.clientEmail}`,
    data.clientPhone ? `Téléphone : ${data.clientPhone}` : '',
  ].filter(Boolean).join('\n');

  await send(
    {
      to: data.proEmail,
      subject: `RDV déplacé — ${data.clientName} (${dateLabel})`,
      html,
      text,
      replyTo: data.clientEmail,
      attachments: ics ? [ics] : undefined,
    },
    'modification pro'
  );
}
