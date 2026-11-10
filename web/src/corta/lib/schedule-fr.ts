// CORTA CUSTOMIZATION
// Scheduled tasks in plain French: the expert picks a frequency and a time;
// this module writes the schedule string the server parses (a 5-field cron
// expression, or an ISO date for a one-off) and describes any stored one.

export type Frequency = "daily" | "weekdays" | "weekly" | "monthly" | "once";

export interface ScheduleForm {
  frequency: Frequency;
  /** "HH:MM", 24-hour. */
  time: string;
  /** Cron weekday, 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** 1–28 (every month has it). */
  monthDay: number;
  /** "YYYY-MM-DD" for a one-off. */
  date: string;
}

export const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export const DEFAULT_SCHEDULE: ScheduleForm = { frequency: "weekly", time: "09:00", weekday: 1, monthDay: 1, date: "" };

function splitTime(time: string): [number, number] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return [9, 0];
  return [Math.min(23, Number(match[1])), Math.min(59, Number(match[2]))];
}

function frenchTime(hour: number, minute: number): string {
  return minute ? `${hour} h ${String(minute).padStart(2, "0")}` : `${hour} h`;
}

export function buildSchedule(form: ScheduleForm): string {
  const [hour, minute] = splitTime(form.time);
  switch (form.frequency) {
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekdays":
      return `${minute} ${hour} * * 1-5`;
    case "weekly":
      return `${minute} ${hour} * * ${form.weekday}`;
    case "monthly":
      return `${minute} ${hour} ${form.monthDay} * *`;
    case "once":
      return `${form.date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
}

/** The form for a stored cron expression, when it is one this editor writes. */
export function parseCronExpression(expr: string): ScheduleForm | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5 || parts[3] !== "*") return null;
  const [m, h, dom, , dow] = parts;
  if (!/^\d+$/.test(m) || !/^\d+$/.test(h)) return null;
  const time = `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  const base = { ...DEFAULT_SCHEDULE, time };
  if (dom === "*" && dow === "*") return { ...base, frequency: "daily" };
  if (dom === "*" && dow === "1-5") return { ...base, frequency: "weekdays" };
  if (dom === "*" && /^[0-7]$/.test(dow)) return { ...base, frequency: "weekly", weekday: Number(dow) % 7 };
  if (/^\d+$/.test(dom) && dow === "*") return { ...base, frequency: "monthly", monthDay: Number(dom) };
  return null;
}

export function describeForm(form: ScheduleForm): string {
  const [hour, minute] = splitTime(form.time);
  const at = `à ${frenchTime(hour, minute)}`;
  switch (form.frequency) {
    case "daily":
      return `Tous les jours ${at}`;
    case "weekdays":
      return `Du lundi au vendredi ${at}`;
    case "weekly":
      return `Tous les ${WEEKDAYS[form.weekday] ?? "lundi"}s ${at}`;
    case "monthly":
      return `Le ${form.monthDay === 1 ? "1er" : form.monthDay} de chaque mois ${at}`;
    case "once":
      return form.date ? `Le ${formatDate(`${form.date}T${form.time}`)}` : "Une seule fois";
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return `${day} à ${frenchTime(date.getHours(), date.getMinutes())}`;
}

interface StoredSchedule {
  kind?: string;
  expr?: string;
  run_at?: string;
  display?: string;
  minutes?: number;
}

function describeInterval(minutes: number): string {
  if (minutes % 1440 === 0) return minutes === 1440 ? "Tous les jours" : `Tous les ${minutes / 1440} jours`;
  if (minutes % 60 === 0) return minutes === 60 ? "Toutes les heures" : `Toutes les ${minutes / 60} heures`;
  return `Toutes les ${minutes} minutes`;
}

function intervalMinutes(schedule: StoredSchedule, display?: string | null): number {
  return schedule.minutes ?? Number(/^every (\d+)m$/.exec(schedule.display ?? display ?? "")?.[1] ?? NaN);
}

/** A stored job's schedule in French (falls back to the server's own wording). */
export function describeSchedule(schedule: StoredSchedule | null | undefined, display?: string | null): string {
  const form = schedule?.kind === "cron" && schedule.expr ? parseCronExpression(schedule.expr) : null;
  if (form) return describeForm(form);
  const when = schedule?.kind === "once" ? formatDate(schedule.run_at) : "";
  if (when) return `Une fois, le ${when}`;
  const minutes = schedule?.kind === "interval" ? intervalMinutes(schedule, display) : NaN;
  if (Number.isFinite(minutes) && minutes > 0) return describeInterval(minutes);
  return schedule?.display || display || schedule?.expr || "Programmation personnalisée";
}
