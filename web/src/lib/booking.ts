export type TimeRange = { start: string; end: string };

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Slot start times for a day, given its active ranges, slot length and gap between slots.
export function generateSlots(ranges: TimeRange[], slotDuration: number, bufferTime: number): string[] {
  const step = slotDuration + bufferTime;
  const slots: string[] = [];
  for (const range of ranges) {
    const start = timeToMinutes(range.start);
    const end = timeToMinutes(range.end);
    for (let t = start; t + slotDuration <= end; t += step) {
      slots.push(minutesToTime(t));
    }
  }
  return slots;
}

export function formatDateFR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTimeFR(timeStr: string): string {
  return timeStr.slice(0, 5);
}

// "10:00" -> "10h00", "14:30" -> "14h30" — French spoken-hour convention, used in emails.
export function formatHourFR(timeStr: string): string {
  const [h, m] = timeStr.slice(0, 5).split(':');
  return `${h}h${m}`;
}

export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const DIACRITICS_REGEX = new RegExp('[̀-ͯ]', 'g');

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(DIACRITICS_REGEX, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

// Local YYYY-MM-DD for a Date, in the browser/server's local time (no UTC shift).
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}
