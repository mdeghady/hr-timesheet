export type MonthDateRange = {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  expectedWorkingDays: number;
};

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Returns the number of calendar days in a month, excluding Fridays. */
export function getWorkingDaysExcludingFridays(year: number, month: number) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (weekday !== 5) workingDays += 1;
  }

  return workingDays;
}

export function getCurrentMonthDateRange(referenceDate = new Date()): MonthDateRange {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth() + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    year,
    month,
    startDate: formatDate(year, month, 1),
    endDate: formatDate(year, month, daysInMonth),
    expectedWorkingDays: getWorkingDaysExcludingFridays(year, month),
  };
}

export function getProgressPercentage(submittedDays: number, expectedWorkingDays: number) {
  if (expectedWorkingDays <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((submittedDays / expectedWorkingDays) * 100)));
}
