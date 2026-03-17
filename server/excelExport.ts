import ExcelJS from "exceljs";
import { getTimesheetEntriesForExport } from "./db";

const BRAND_COLOR = "1B3A5C";
const ACCENT_COLOR = "C9A84C";
const HEADER_BG = "1B3A5C";
const HEADER_FG = "FFFFFF";
const ALT_ROW_BG = "F5F7FA";

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
  cell.font = { bold: true, color: { argb: HEADER_FG }, size: 11 };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = {
    bottom: { style: "medium", color: { argb: ACCENT_COLOR } },
  };
}

function applyDataStyle(cell: ExcelJS.Cell, rowIndex: number) {
  if (rowIndex % 2 === 0) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
  }
  cell.alignment = { vertical: "middle", horizontal: "left" };
  cell.border = {
    bottom: { style: "thin", color: { argb: "E2E8F0" } },
  };
}

export async function generateTimesheetExcel(params: {
  startDate: string;
  endDate: string;
  teamId?: number;
  reportType: "daily" | "weekly" | "monthly";
}): Promise<Buffer> {
  const { startDate, endDate, teamId, reportType } = params;

  const rows = await getTimesheetEntriesForExport(startDate, endDate, teamId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ConstructHR";
  workbook.created = new Date();

  // ── Title Sheet ──────────────────────────────────────────────────────────────
  const sheet = workbook.addWorksheet("Timesheet Report", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  // Title row
  sheet.mergeCells("A1:L1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `ConstructHR — ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Timesheet Report`;
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_COLOR } };
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 36;

  // Date range row
  sheet.mergeCells("A2:L2");
  const dateCell = sheet.getCell("A2");
  dateCell.value = `Period: ${startDate} to ${endDate}${teamId ? " (Filtered by Team)" : " (All Teams)"}`;
  dateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2D5A8E" } };
  dateCell.font = { size: 11, color: { argb: "FFFFFF" } };
  dateCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 24;

  // Column headers
  const headers = [
    { header: "Date", key: "workDate", width: 14 },
    { header: "Team", key: "teamName", width: 20 },
    { header: "Project Site", key: "projectSite", width: 22 },
    { header: "Manager", key: "managerName", width: 20 },
    { header: "Emp. Code", key: "employeeCode", width: 12 },
    { header: "First Name", key: "firstName", width: 16 },
    { header: "Last Name", key: "lastName", width: 16 },
    { header: "Job Title", key: "jobTitle", width: 20 },
    { header: "Work Type", key: "workType", width: 14 },
    { header: "Hours Worked", key: "hoursWorked", width: 14 },
    { header: "Overtime Hrs", key: "overtimeHours", width: 14 },
    { header: "Status", key: "status", width: 14 },
    { header: "Notes", key: "notes", width: 30 },
  ];

  sheet.columns = headers.map((h) => ({ key: h.key, width: h.width }));

  const headerRow = sheet.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.header;
    applyHeaderStyle(cell);
  });
  headerRow.height = 30;

  // Data rows
  rows.forEach((row, index) => {
    const dataRow = sheet.addRow({
      workDate: row.workDate instanceof Date
        ? row.workDate.toISOString().split("T")[0]
        : String(row.workDate),
      teamName: row.teamName ?? "",
      projectSite: row.projectSite ?? "",
      managerName: row.managerName ?? "",
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      jobTitle: row.jobTitle ?? "",
      workType: row.workType,
      hoursWorked: parseFloat(String(row.hoursWorked)),
      overtimeHours: parseFloat(String(row.overtimeHours ?? "0")),
      status: row.status,
      notes: row.notes ?? "",
    });

    dataRow.eachCell((cell) => applyDataStyle(cell, index));

    // Color-code status
    const statusCell = dataRow.getCell("status");
    if (row.status === "approved") {
      statusCell.font = { color: { argb: "16A34A" }, bold: true };
    } else if (row.status === "flagged") {
      statusCell.font = { color: { argb: "DC2626" }, bold: true };
    } else if (row.status === "submitted") {
      statusCell.font = { color: { argb: "D97706" }, bold: true };
    }
  });

  // Summary row
  if (rows.length > 0) {
    const summaryRow = sheet.addRow({
      workDate: "TOTALS",
      hoursWorked: rows.reduce((sum, r) => sum + parseFloat(String(r.hoursWorked)), 0),
      overtimeHours: rows.reduce((sum, r) => sum + parseFloat(String(r.overtimeHours ?? "0")), 0),
    });
    summaryRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1B3A5C" } };
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
    });
  }

  // Freeze header rows
  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 3 }];

  // Auto-filter
  sheet.autoFilter = { from: "A3", to: `M3` };

  // ── Summary Sheet ─────────────────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet("Summary by Team");

  // Group by team
  const teamSummary = rows.reduce(
    (acc, row) => {
      const key = row.teamName ?? "Unknown";
      if (!acc[key]) acc[key] = { employees: new Set(), totalHours: 0, overtimeHours: 0, entries: 0 };
      acc[key].employees.add(row.employeeCode);
      acc[key].totalHours += parseFloat(String(row.hoursWorked));
      acc[key].overtimeHours += parseFloat(String(row.overtimeHours ?? "0"));
      acc[key].entries++;
      return acc;
    },
    {} as Record<string, { employees: Set<string>; totalHours: number; overtimeHours: number; entries: number }>
  );

  summarySheet.mergeCells("A1:F1");
  const sumTitle = summarySheet.getCell("A1");
  sumTitle.value = `Team Summary — ${startDate} to ${endDate}`;
  sumTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_COLOR } };
  sumTitle.font = { bold: true, size: 13, color: { argb: "FFFFFF" } };
  sumTitle.alignment = { horizontal: "center", vertical: "middle" };
  summarySheet.getRow(1).height = 32;

  const sumHeaders = ["Team", "Employees", "Total Entries", "Total Hours", "Overtime Hours", "Avg Hours/Entry"];
  summarySheet.columns = [
    { key: "team", width: 24 },
    { key: "employees", width: 14 },
    { key: "entries", width: 16 },
    { key: "totalHours", width: 16 },
    { key: "overtimeHours", width: 18 },
    { key: "avgHours", width: 18 },
  ];

  const sumHeaderRow = summarySheet.getRow(2);
  sumHeaders.forEach((h, i) => {
    const cell = sumHeaderRow.getCell(i + 1);
    cell.value = h;
    applyHeaderStyle(cell);
  });
  sumHeaderRow.height = 28;

  Object.entries(teamSummary).forEach(([team, data], index) => {
    const row = summarySheet.addRow({
      team,
      employees: data.employees.size,
      entries: data.entries,
      totalHours: Math.round(data.totalHours * 100) / 100,
      overtimeHours: Math.round(data.overtimeHours * 100) / 100,
      avgHours: data.entries > 0 ? Math.round((data.totalHours / data.entries) * 100) / 100 : 0,
    });
    row.eachCell((cell) => applyDataStyle(cell, index));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
