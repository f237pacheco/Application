function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function addMinutes(dateStr: string, timeStr: string, minutes: number): { date: string; time: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.slice(0, 5).split(':').map(Number);
  const total = hh * 60 + mm + minutes;
  const dayOverflow = Math.floor(total / 1440);
  const remaining = ((total % 1440) + 1440) % 1440;
  const date = new Date(y, m - 1, d + dayOverflow);
  return {
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    time: `${pad2(Math.floor(remaining / 60))}:${pad2(remaining % 60)}`,
  };
}

function icsDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const [hh, mm] = timeStr.slice(0, 5).split(':');
  return `${y}${m}${d}T${hh}${mm}00`;
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export type ICSEventInput = {
  uid: string;
  businessName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  address?: string;
  description?: string;
};

// Floating local time pinned to Europe/Paris (booking_settings' default and
// only supported timezone today) — broadly supported by Google/Outlook/Apple
// without needing a full embedded VTIMEZONE block.
export function generateICS(opts: ICSEventInput): string {
  const end = addMinutes(opts.date, opts.time, opts.durationMinutes);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Velona//Booking//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Europe/Paris:${icsDateTime(opts.date, opts.time)}`,
    `DTEND;TZID=Europe/Paris:${icsDateTime(end.date, end.time)}`,
    `SUMMARY:${escapeICS(`RDV — ${opts.businessName}`)}`,
    opts.address ? `LOCATION:${escapeICS(opts.address)}` : '',
    opts.description ? `DESCRIPTION:${escapeICS(opts.description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

// Browser-only: triggers a .ics file download.
export function downloadICS(opts: ICSEventInput, filename = 'rendez-vous.ics'): void {
  const content = generateICS(opts);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
