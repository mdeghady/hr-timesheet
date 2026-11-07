import { describe, expect, it } from "vitest";
import { applySubmissionStatuses, getWorkingDatesBetween, getWorkingDatesForMonth } from "./teamSubmissionReport";

describe("team submission report helpers", () => {
  it("excludes Fridays from the calendar", () => {
    const dates = getWorkingDatesForMonth(2026, 11, new Date("2026-11-07T12:00:00Z"));
    expect(dates.some((date) => date.weekday === "Friday")).toBe(false);
    expect(dates).toHaveLength(26);
  });

  it("classifies submitted, missing, and upcoming working dates", () => {
    const dates = getWorkingDatesForMonth(2026, 11, new Date("2026-11-07T12:00:00Z"));
    const result = applySubmissionStatuses(dates, new Set(["2026-11-01", "2026-11-07"]));

    expect(result.find((date) => date.isoDate === "2026-11-01")?.status).toBe("Submitted");
    expect(result.find((date) => date.isoDate === "2026-11-02")?.status).toBe("Not Submitted");
    expect(result.find((date) => date.isoDate === "2026-11-08")?.status).toBe("Upcoming");
  });

  it("supports a full app-history range instead of a single month", () => {
    const dates = getWorkingDatesBetween("2026-01-01", "2026-01-10", new Date("2026-01-10T12:00:00Z"));
    expect(dates.map((date) => date.isoDate)).toEqual([
      "2026-01-01",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
      "2026-01-10",
    ]);
  });
});
