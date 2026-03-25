import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, '../client/src/pages');

// List of pages to update with translations
const pagesToUpdate = [
  'hr/EmployeesPage.tsx',
  'hr/ManagersPage.tsx',
  'hr/TimesheetsPage.tsx',
  'hr/TimesheetDetailPage.tsx',
  'hr/ExportPage.tsx',
  'hr/AuditPage.tsx',
  'manager/ManagerHome.tsx',
  'manager/TimesheetSubmitPage.tsx',
  'manager/ManagerHistory.tsx',
  'manager/ManagerTimesheetDetail.tsx',
  'Home.tsx',
  'NotFound.tsx',
];

// Common replacements for all pages
const replacements = [
  // Import statement
  {
    find: /import { trpc } from "@\/lib\/trpc";/,
    replace: `import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";`,
    skipIfExists: true
  },
  // Add useTranslation hook at start of component
  {
    find: /export default function (\w+)\(\) \{/,
    replace: `export default function $1() {
  const { t } = useTranslation();`,
    skipIfExists: true
  },
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    replacements.forEach(({ find, replace, skipIfExists }) => {
      if (skipIfExists && content.includes(replace)) {
        return;
      }
      
      if (find.test(content)) {
        content = content.replace(find, replace);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Updated: ${filePath}`);
    } else {
      console.log(`- No changes: ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Error updating ${filePath}:`, error.message);
  }
}

console.log('Starting translation updates...\n');

pagesToUpdate.forEach(page => {
  const filePath = path.join(pagesDir, page);
  if (fs.existsSync(filePath)) {
    updateFile(filePath);
  } else {
    console.log(`- File not found: ${filePath}`);
  }
});

console.log('\nTranslation update complete!');
