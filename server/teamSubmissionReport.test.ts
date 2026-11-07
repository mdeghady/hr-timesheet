import { describe, expect, it } from "vitest";
import { applySubmissionStatuses, getWorkingDatesForMonth } from "./teamSubmissionReport";

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
});
