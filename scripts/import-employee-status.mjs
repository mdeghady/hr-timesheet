import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { parse } from 'xlsx';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function importEmployeeStatus() {
  let connection;
  try {
    // Parse connection string
    const url = new URL(DATABASE_URL);
    const config = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    };

    connection = await mysql.createConnection(config);
    console.log('✓ Connected to database');

    // Read Excel file
    const excelFile = '/home/ubuntu/upload/4-4-2026.xlsx';
    const workbook = parse(readFileSync(excelFile));
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert sheet to JSON
    const rows = [];
    let rowNum = 2; // Start from row 2 (skip header)
    while (true) {
      const codeCell = sheet[`A${rowNum}`];
      const statusCell = sheet[`F${rowNum}`];
      if (!codeCell) break;
      
      const code = String(codeCell.v || '').trim();
      const status = String(statusCell?.v || '').trim();
      
      if (code) {
        rows.push({ code, status });
      }
      rowNum++;
    }

    console.log(`✓ Found ${rows.length} records in Excel`);

    // Batch import with status
    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const [result] = await connection.execute(
          'UPDATE employees SET employeeStatus = ? WHERE employeeCode = ?',
          [row.status || null, row.code]
        );
        
        if (result.affectedRows > 0) {
          updated++;
        } else {
          notFound++;
        }
      } catch (err) {
        console.error(`Error updating ${row.code}:`, err.message);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`  ✓ Updated: ${updated}`);
    console.log(`  ✗ Not found: ${notFound}`);
    console.log(`  ⚠ Errors: ${errors}`);

    // Verify import
    const [stats] = await connection.execute(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN employeeStatus IS NOT NULL THEN 1 END) as withStatus FROM employees'
    );
    console.log(`\n✓ Database Status:`);
    console.log(`  Total employees: ${stats[0].total}`);
    console.log(`  With status: ${stats[0].withStatus}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

importEmployeeStatus();
