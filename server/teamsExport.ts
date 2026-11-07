import ExcelJS from 'exceljs';
import { getAllTeams, getTeamById, getEmployeesByTeamId, getAllTimesheets } from './db';
import { applySubmissionStatuses, getWorkingDatesBetween, type SubmissionCalendarDate } from './teamSubmissionReport';

const BRAND_COLOR = 'FFA500'; // Orange
const HEADER_COLOR = 'FFE5CC'; // Light orange
const ACCENT_COLOR = 'F5F5F5'; // Light gray

const headerStyle = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: HEADER_COLOR } },
  font: { bold: true, size: 11, color: { argb: 'FF000000' } },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
  border: {
    top: { style: 'thin' as const, color: { argb: 'FFB8860B' } },
    left: { style: 'thin' as const, color: { argb: 'FFB8860B' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFB8860B' } },
    right: { style: 'thin' as const, color: { argb: 'FFB8860B' } },
  },
};

const cellStyle = {
  border: {
    top: { style: 'thin' as const, color: { argb: 'FFE0E0E0' } },
    left: { style: 'thin' as const, color: { argb: 'FFE0E0E0' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFE0E0E0' } },
    right: { style: 'thin' as const, color: { argb: 'FFE0E0E0' } },
  },
};

const alternateRowStyle = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: ACCENT_COLOR } },
  ...cellStyle,
};

function sanitizeSheetName(name: string, index: number = 0): string {
  // Excel sheet names: max 31 chars, no special chars: \ / ? * [ ]
  let sanitized = name.replace(/[\\\/\?\*\[\]]/g, '');
  const suffix = index > 0 ? ` (${index})` : '';
  const maxLen = 31 - suffix.length;
  if (sanitized.length > maxLen) {
    sanitized = sanitized.substring(0, Math.max(1, maxLen - 3)) + '...';
  }
  return (sanitized + suffix) || 'Sheet';
}

export async function generateTeamsExcel(teamIds: number[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Fetch all teams and employees
  const allTeams = await getAllTeams();
  const selectedTeams = allTeams.filter((t) => teamIds.includes(t.id) && t.isActive);

  if (selectedTeams.length === 0) {
    throw new Error('No valid teams selected for export');
  }

  // Prepare data for summary sheet
  const summaryData: any[] = [];
  const teamEmployeeMap = new Map<number, any[]>();

  for (const team of selectedTeams) {
    const employees = await getEmployeesByTeamId(team.id);
    const activeEmployees = employees.filter((e) => e.isActive);
    teamEmployeeMap.set(team.id, activeEmployees);

    for (const emp of activeEmployees) {
      summaryData.push({
        teamName: team.name,
        teamDescription: team.description || '',
        projectSite: team.projectSite || '',
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        jobTitle: emp.jobTitle || '',
        employeeStatus: emp.employeeStatus || '',
        phone: emp.phone || '',
        email: emp.email || '',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create Summary Sheet
  // ─────────────────────────────────────────────────────────────────────────

  const summarySheet = workbook.addWorksheet('Summary', { pageSetup: { paperSize: 9, orientation: 'landscape' } });

  // Add title
  summarySheet.mergeCells('A1:I1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'Teams Export Summary';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF' + BRAND_COLOR } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  summarySheet.getRow(1).height = 25;

  // Add export date
  summarySheet.mergeCells('A2:I2');
  const dateCell = summarySheet.getCell('A2');
  dateCell.value = `Generated on ${new Date().toLocaleString()}`;
  dateCell.font = { italic: true, size: 10, color: { argb: 'FF808080' } };
  dateCell.alignment = { horizontal: 'left', vertical: 'middle' };

  // Add headers
  const summaryHeaders = [
    'Team Name',
    'Team Description',
    'Project Site',
    'Employee Code',
    'First Name',
    'Job Title',
    'Employee Status',
    'Phone',
    'Email',
  ];

  const headerRow = summarySheet.addRow(summaryHeaders);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });
  summarySheet.getRow(4).height = 20;

  // Add data with alternating colors
  summaryData.forEach((row, index) => {
    const dataRow = summarySheet.addRow([
      row.teamName,
      row.teamDescription,
      row.projectSite,
      row.employeeCode,
      row.firstName,
      row.jobTitle,
      row.employeeStatus,
      row.phone,
      row.email,
    ]);

    dataRow.eachCell((cell) => {
      cell.style = index % 2 === 0 ? cellStyle : alternateRowStyle;
      if (cell.value && typeof cell.value === 'string') {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
    });
  });

  // Auto-fit columns
  summarySheet.columns = [
    { width: 20 },
    { width: 25 },
    { width: 20 },
    { width: 14 },
    { width: 18 },
    { width: 20 },
    { width: 18 },
    { width: 15 },
    { width: 25 },
  ];

  // Freeze header rows
  summarySheet.views = [{ state: 'frozen', ySplit: 4 }];

  // ─────────────────────────────────────────────────────────────────────────
  // Create Individual Team Sheets
  // ─────────────────────────────────────────────────────────────────────────

  // Track sheet names to handle collisions
  const sheetNames = new Set<string>();
  const getUniqueSheetName = (baseName: string): string => {
    let name = sanitizeSheetName(baseName);
    let index = 1;
    while (sheetNames.has(name)) {
      name = sanitizeSheetName(baseName, index++);
    }
    sheetNames.add(name);
    return name;
  };

  for (const team of selectedTeams) {
    const sheetName = getUniqueSheetName(team.name);
    const teamSheet = workbook.addWorksheet(sheetName, { pageSetup: { paperSize: 9, orientation: 'landscape' } });

    // Add team header
    teamSheet.mergeCells('A1:H1');
    const teamTitleCell = teamSheet.getCell('A1');
    teamTitleCell.value = team.name;
    teamTitleCell.font = { bold: true, size: 14, color: { argb: 'FF' + BRAND_COLOR } };
    teamTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    teamSheet.getRow(1).height = 25;

    // Add team details
    const details = [
      { label: 'Description:', value: team.description || '—' },
      { label: 'Project Site:', value: team.projectSite || '—' },
      { label: 'Manager:', value: team.managerName || '—' },
      { label: 'Total Employees:', value: teamEmployeeMap.get(team.id)?.length || 0 },
    ];

    let detailRow = 2;
    details.forEach((detail) => {
      const row = teamSheet.getRow(detailRow);
      row.getCell(1).value = detail.label;
      row.getCell(1).font = { bold: true, size: 10 };
      row.getCell(2).value = detail.value;
      row.getCell(2).font = { size: 10 };
      detailRow++;
    });

    // Add employees header
    const empHeaderRow = teamSheet.addRow([
      'Employee Code',
      'First Name',
      'Job Title',
      'Employee Status',
      'Phone',
      'Email',
      'Contact',
      'Status',
    ]);
    empHeaderRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Add employee data
    const employees = teamEmployeeMap.get(team.id) || [];
    employees.forEach((emp, index) => {
      const empRow = teamSheet.addRow([
        emp.employeeCode,
        emp.firstName,
        emp.jobTitle || '',
        emp.employeeStatus || '',
        emp.phone || '',
        emp.email || '',
        emp.phone || emp.email || '',
        emp.isActive ? 'Active' : 'Inactive',
      ]);

      empRow.eachCell((cell) => {
        cell.style = index % 2 === 0 ? cellStyle : alternateRowStyle;
        if (cell.value && typeof cell.value === 'string') {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
      });
    });

    // Auto-fit columns
    teamSheet.columns = [
      { width: 14 },
      { width: 18 },
      { width: 20 },
      { width: 18 },
      { width: 15 },
      { width: 25 },
      { width: 20 },
      { width: 12 },
    ];

    // Freeze header rows
    teamSheet.views = [{ state: 'frozen', ySplit: detailRow + 1 }];
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function applyTableStyle(sheet: ExcelJS.Worksheet, headerRowNumber: number, endColumn: number) {
  const headerRow = sheet.getRow(headerRowNumber);
  headerRow.eachCell((cell) => { cell.style = headerStyle; });
  sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
  sheet.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: headerRowNumber, column: endColumn } };
}

function statusCellStyle(status: SubmissionCalendarDate['status']) {
  if (status === 'Submitted') return { font: { bold: true, color: { argb: 'FF166534' } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDCFCE7' } } };
  if (status === 'Upcoming') return { font: { italic: true, color: { argb: 'FF64748B' } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF1F5F9' } } };
  return { font: { bold: true, color: { argb: 'FFB91C1C' } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFEE2E2' } } };
}

export async function generateTeamSubmissionReportExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const activeTeams = (await getAllTeams()).filter((team) => team.isActive);
  const timesheetRows = await getAllTimesheets();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const recordedDates = timesheetRows.map((row) => new Date(row.workDate).toISOString().slice(0, 10));
  const startDate = recordedDates.length > 0 ? recordedDates.sort()[0] : todayIso;
  const dates = getWorkingDatesBetween(startDate, todayIso, today);
  const expectedWorkingDays = dates.length;
  const submittedByTeam = new Map<number, Set<string>>();

  for (const row of timesheetRows) {
    if (row.status === 'draft') continue;
    const isoDate = new Date(row.workDate).toISOString().slice(0, 10);
    if (!submittedByTeam.has(row.teamId)) submittedByTeam.set(row.teamId, new Set());
    submittedByTeam.get(row.teamId)!.add(isoDate);
  }

  const teamRows = activeTeams.map((team) => {
    const calendar = applySubmissionStatuses(dates, submittedByTeam.get(team.id) ?? new Set());
    const submitted = calendar.filter((date) => date.status === 'Submitted').length;
    const notSubmitted = calendar.filter((date) => date.status === 'Not Submitted').length;
    const upcoming = calendar.filter((date) => date.status === 'Upcoming').length;
    return { team, calendar, submitted, notSubmitted, upcoming };
  });
  const reportRangeLabel = `${startDate} through ${todayIso}`;

  const overview = workbook.addWorksheet('Executive Summary', { pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true } });
  overview.mergeCells('A1:H1');
  overview.getCell('A1').value = `Team Timesheet Submission Report — App History`;
  overview.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF' + BRAND_COLOR } };
  overview.getCell('A1').alignment = { horizontal: 'left' };
  overview.mergeCells('A2:H2');
  overview.getCell('A2').value = `Date range: ${reportRangeLabel} · Fridays excluded · Generated ${new Date().toLocaleString()}`;
  overview.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
  const overviewHeaders = ['Team', 'Manager', 'Expected Working Days', 'Submitted', 'Not Submitted', 'Upcoming', 'Completion %', 'Board Status'];
  overview.addRow([]);
  overview.addRow(overviewHeaders);
  teamRows.forEach(({ team, submitted, notSubmitted, upcoming }) => {
    const percentage = expectedWorkingDays ? Math.round((submitted / expectedWorkingDays) * 100) : 0;
    const row = overview.addRow([team.name, team.managerName || '—', expectedWorkingDays, submitted, notSubmitted, upcoming, percentage / 100, percentage === 100 ? 'Complete' : percentage >= 80 ? 'On Track' : 'Needs Attention']);
    row.eachCell((cell, index) => { cell.style = index === 8 ? (percentage === 100 ? statusCellStyle('Submitted') : percentage >= 80 ? statusCellStyle('Upcoming') : statusCellStyle('Not Submitted')) : (row.number % 2 === 0 ? cellStyle : alternateRowStyle); });
    row.getCell(7).numFmt = '0%';
  });
  applyTableStyle(overview, 4, overviewHeaders.length);
  overview.columns = [{ width: 28 }, { width: 22 }, { width: 22 }, { width: 14 }, { width: 16 }, { width: 12 }, { width: 15 }, { width: 18 }];

  const matrix = workbook.addWorksheet('Submission Matrix', { pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true } });
  matrix.mergeCells('A1:F1');
  matrix.getCell('A1').value = `Daily Submission Matrix — App History`;
  matrix.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF' + BRAND_COLOR } };
  matrix.addRow([]);
  const matrixHeaders = ['Team', 'Date', 'Weekday', 'Status', 'Submitted?', 'Report Range'];
  matrix.addRow(matrixHeaders);
  teamRows.forEach(({ team, calendar }) => {
    calendar.forEach((date) => {
      const row = matrix.addRow([team.name, date.isoDate, date.weekday, date.status, date.status === 'Submitted' ? 'Yes' : date.status === 'Upcoming' ? 'Pending' : 'No', reportRangeLabel]);
      row.eachCell((cell) => { cell.style = cellStyle; cell.alignment = { vertical: 'middle', wrapText: true }; });
      row.getCell(4).style = statusCellStyle(date.status);
      row.getCell(5).style = statusCellStyle(date.status);
    });
  });
  applyTableStyle(matrix, 3, matrixHeaders.length);
  matrix.columns = [{ width: 28 }, { width: 15 }, { width: 15 }, { width: 18 }, { width: 14 }, { width: 28 }];

  const sheetNames = new Set<string>();
  for (const { team, calendar, submitted, notSubmitted, upcoming } of teamRows) {
    const sheetName = getUniqueSubmissionSheetName(team.name, sheetNames);
    const sheet = workbook.addWorksheet(sheetName, { pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true } });
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = `${team.name} — Submission Calendar`;
    sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF' + BRAND_COLOR } };
    sheet.addRow(['Manager', team.managerName || '—', 'Expected Days', expectedWorkingDays, 'Completion', expectedWorkingDays ? submitted / expectedWorkingDays : 0]);
    sheet.getRow(2).getCell(6).numFmt = '0%';
    sheet.addRow(['Submitted', submitted, 'Not Submitted', notSubmitted, 'Upcoming', upcoming]);
    sheet.addRow([]);
    sheet.addRow(['Date', 'Weekday', 'Status', 'Submitted?', 'Notes', 'Report Range']);
    calendar.forEach((date) => {
      const row = sheet.addRow([date.isoDate, date.weekday, date.status, date.status === 'Submitted' ? 'Yes' : date.status === 'Upcoming' ? 'Pending' : 'No', date.status === 'Upcoming' ? 'Future working day' : '', reportRangeLabel]);
      row.eachCell((cell) => { cell.style = cellStyle; cell.alignment = { vertical: 'middle', wrapText: true }; });
      row.getCell(3).style = statusCellStyle(date.status);
      row.getCell(4).style = statusCellStyle(date.status);
    });
    applyTableStyle(sheet, 5, 6);
    sheet.columns = [{ width: 15 }, { width: 15 }, { width: 18 }, { width: 14 }, { width: 22 }, { width: 18 }];
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function getUniqueSubmissionSheetName(baseName: string, names: Set<string>) {
  let name = sanitizeSheetName(baseName);
  let suffix = 1;
  while (names.has(name)) name = sanitizeSheetName(baseName, suffix++);
  names.add(name);
  return name;
}
