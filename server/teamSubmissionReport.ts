export type SubmissionStatus = "Submitted" | "Not Submitted" | "Upcoming";

export type SubmissionCalendarDate = {
  isoDate: string;
  label: string;
  weekday: string;
  status: SubmissionStatus;
};

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getWorkingDatesForMonth(
  year: number,
  month: number,
  today = new Date()
): SubmissionCalendarDate[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return getWorkingDatesBetween(
    formatIsoDate(year, month, 1),
    formatIsoDate(year, month, daysInMonth),
    today
  );
}

export function getWorkingDatesBetween(
  startDate: string,
  endDate: string,
  today = new Date()
): SubmissionCalendarDate[] {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const todayIso = today.toISOString().slice(0, 10);
  const dates: SubmissionCalendarDate[] = [];

  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    if (date.getUTCDay() === 5) continue;

    const isoDate = date.toISOString().slice(0, 10);
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
