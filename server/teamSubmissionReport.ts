export type SubmissionStatus = "Submitted" | "Not Submitted" | "Upcoming";

export type SubmissionCalendarDate = {
  isoDate: string;
  label: string;
  weekday: string;
  status: SubmissionStatus;
};

function formatIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getWorkingDatesForMonth(
  year: number,
  month: number,
  today = new Date()
): SubmissionCalendarDate[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const todayIso = today.toISOString().slice(0, 10);
  const dates: SubmissionCalendarDate[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCDay() === 5) continue;

    const isoDate = formatIsoDate(year, month, day);
    dates.push({
      isoDate,
      label: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }),
      weekday: date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }),
      status: isoDate > todayIso ? "Upcoming" : "Not Submitted",
    });
  }

  return dates;
}

export function applySubmissionStatuses(
  dates: SubmissionCalendarDate[],
  submittedDates: ReadonlySet<string>
): SubmissionCalendarDate[] {
  return dates.map((date) => ({
    ...date,
    status: date.status === "Upcoming"
      ? date.status
      : submittedDates.has(date.isoDate)
        ? "Submitted"
        : "Not Submitted",
  } as SubmissionCalendarDate));
}
