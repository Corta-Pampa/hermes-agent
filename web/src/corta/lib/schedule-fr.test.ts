import { describe, expect, it } from "vitest";

import { buildSchedule, DEFAULT_SCHEDULE, describeForm, describeSchedule, parseCronExpression } from "./schedule-fr";

describe("schedule-fr", () => {
  it("writes the schedule strings the server parses", () => {
    expect(buildSchedule({ ...DEFAULT_SCHEDULE, frequency: "daily", time: "07:30" })).toBe("30 7 * * *");
    expect(buildSchedule({ ...DEFAULT_SCHEDULE, frequency: "weekdays", time: "18:00" })).toBe("0 18 * * 1-5");
    expect(buildSchedule({ ...DEFAULT_SCHEDULE, frequency: "weekly", weekday: 5, time: "09:00" })).toBe("0 9 * * 5");
    expect(buildSchedule({ ...DEFAULT_SCHEDULE, frequency: "monthly", monthDay: 15, time: "08:05" })).toBe("5 8 15 * *");
    expect(buildSchedule({ ...DEFAULT_SCHEDULE, frequency: "once", date: "2026-12-01", time: "10:00" })).toBe("2026-12-01T10:00");
  });

  it("reads back what it writes", () => {
    for (const form of [
      { ...DEFAULT_SCHEDULE, frequency: "daily" as const, time: "07:30" },
      { ...DEFAULT_SCHEDULE, frequency: "weekly" as const, weekday: 0, time: "09:00" },
      { ...DEFAULT_SCHEDULE, frequency: "monthly" as const, monthDay: 3, time: "12:15" },
    ]) {
      expect(parseCronExpression(buildSchedule(form))).toMatchObject({ frequency: form.frequency, time: form.time });
    }
    expect(parseCronExpression("*/5 * * * *")).toBeNull();
  });

  it("describes schedules in French", () => {
    expect(describeForm({ ...DEFAULT_SCHEDULE, frequency: "weekly", weekday: 1, time: "09:00" })).toBe("Tous les lundis à 9 h");
    expect(describeForm({ ...DEFAULT_SCHEDULE, frequency: "monthly", monthDay: 1, time: "08:30" })).toBe("Le 1er de chaque mois à 8 h 30");
    expect(describeSchedule({ kind: "cron", expr: "0 18 * * 1-5" })).toBe("Du lundi au vendredi à 18 h");
    expect(describeSchedule({ kind: "interval", minutes: 120, display: "every 120m" })).toBe("Toutes les 2 heures");
    expect(describeSchedule({ kind: "cron", expr: "*/5 * * * *", display: "*/5 * * * *" })).toBe("*/5 * * * *");
  });
});
