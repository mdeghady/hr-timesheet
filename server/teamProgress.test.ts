import { describe, expect, it } from "vitest";
import {
  getCurrentMonthDateRange,
  getProgressPercentage,
  getWorkingDaysExcludingFridays,
} from "./teamProgress";

describe("team monthly progress helpers", () => {
  it("excludes Fridays from the expected working-day count", () => {
    expect(getWorkingDaysExcludingFridays(2026, 10)).toBe(26);
  });

  it("returns exact UTC month boundaries", () => {
    expect(getCurrentMonthDateRange(new Date("2026-02-14T12:00:00Z"))).toMatchObject({
      year: 2026,
      month: 2,
      startDate: "2026-02-01",
      endDate: "2026-02-28",
      expectedWorkingDays: 24,
    });
  });

  it("clamps progress to a safe 0-100 percentage", () => {
    expect(getProgressPercentage(0, 24)).toBe(0);
    expect(getProgressPercentage(12, 24)).toBe(50);
    expect(getProgressPercentage(30, 24)).toBe(100);
    expect(getProgressPercentage(2, 0)).toBe(0);
  });
});
