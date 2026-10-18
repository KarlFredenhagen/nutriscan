const pad = (n: number) => String(n).padStart(2, "0");

export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shiftKey(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function isFuture(key: string): boolean {
  return key > todayKey();
}

export function dayLabel(key: string): string {
  const today = todayKey();
  if (key === today) return "Today";
  if (key === shiftKey(today, -1)) return "Yesterday";
  const d = parseKey(key);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function shortDate(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function weekdayLetter(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, { weekday: "narrow" });
}

export function startOfWeek(key: string): string {
  const d = parseKey(key);
  const offset = (d.getDay() + 6) % 7; // Monday first
  d.setDate(d.getDate() - offset);
  return dateKey(d);
}

export function lastNDays(n: number, endKey: string = todayKey()): string[] {
  return Array.from({ length: n }, (_, i) => shiftKey(endKey, -(n - 1 - i)));
}

export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function timeOfDay(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);
}
