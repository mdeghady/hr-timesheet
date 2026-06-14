import ExcelJS from 'exceljs';
import { getAllTeams, getTeamById, getEmployeesByTeamId } from './db';

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
