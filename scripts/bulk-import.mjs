import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const importDataPath = '/tmp/import_data.json';

async function bulkImport() {
  console.log('🚀 Starting bulk import of teams and employees...\n');

  let connection;
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    console.log('Connecting to database...');
    // Create database connection
    connection = await mysql.createConnection(dbUrl);
    console.log('✓ Database connected\n');

    // Read import data
    const importData = JSON.parse(fs.readFileSync(importDataPath, 'utf-8'));
    
    console.log(`📊 Import Summary:`);
    console.log(`   - Teams to create: ${importData.teams.length}`);
    console.log(`   - Employees to import: ${importData.total_employees - importData.unassigned_count}`);
    console.log(`   - Unassigned employees: ${importData.unassigned_count}\n`);

    let createdTeams = 0;
    let createdEmployees = 0;
    let skippedEmployees = 0;

    // Create teams and import employees
    for (const teamData of importData.teams) {
      try {
        // Create team
        const [teamResult] = await connection.execute(
          'INSERT INTO teams (name, description, isActive, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
          [teamData.name, `Team led by ${teamData.name}`, 1]
        );

        const teamId = teamResult.insertId;
        createdTeams++;

        console.log(`✓ Created team: ${teamData.name} (ID: ${teamId})`);

        // Import employees for this team
        for (const emp of teamData.employees) {
          try {
            // Validate required fields
            if (!emp['Employee Code'] || !emp['Name']) {
              skippedEmployees++;
              continue;
            }

            await connection.execute(
              'INSERT INTO employees (employeeCode, firstName, lastName, jobTitle, email, phone, teamId, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
              [
                String(emp['Employee Code']),
                emp['Name'] || 'Unknown',
                '',
                emp['Job Title'] || null,
                emp['Email'] || null,
                emp['Phone'] ? String(emp['Phone']) : null,
                teamId,
                1
              ]
            );

            createdEmployees++;
          } catch (err) {
            console.error(`  ✗ Failed to import employee ${emp['Employee Code']}: ${err.message}`);
            skippedEmployees++;
          }
        }

        console.log(`  → Imported ${teamData.employees.length} employees\n`);
      } catch (err) {
        console.error(`✗ Failed to create team ${teamData.name}: ${err.message}`);
      }
    }

    console.log('\n✅ Bulk Import Complete!');
    console.log(`   - Teams created: ${createdTeams}`);
    console.log(`   - Employees imported: ${createdEmployees}`);
    console.log(`   - Employees skipped: ${skippedEmployees}`);
    console.log(`   - Unassigned employees (not imported): ${importData.unassigned_count}`);

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    console.error(err);
    if (connection) await connection.end();
    process.exit(1);
  }
}

bulkImport();
