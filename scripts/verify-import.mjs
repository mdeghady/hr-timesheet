import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verifyImport() {
  let connection;
  try {
    const dbUrl = process.env.DATABASE_URL;
    connection = await mysql.createConnection(dbUrl);

    // Verify teams
    const [teamResult] = await connection.execute('SELECT COUNT(*) as count FROM teams WHERE isActive = 1');
    const teamCount = teamResult[0].count;

    // Verify employees
    const [empResult] = await connection.execute('SELECT COUNT(*) as count FROM employees WHERE isActive = 1');
    const empCount = empResult[0].count;

    // Get team breakdown
    const [teamsData] = await connection.execute(`
      SELECT t.name, COUNT(e.id) as emp_count
      FROM teams t
      LEFT JOIN employees e ON t.id = e.teamId AND e.isActive = 1
      WHERE t.isActive = 1
      GROUP BY t.id, t.name
      ORDER BY emp_count DESC
      LIMIT 15
    `);

    console.log('✅ IMPORT VERIFICATION COMPLETE\n');
    console.log('📊 Database Summary:');
    console.log(`   - Total Teams: ${teamCount}`);
    console.log(`   - Total Employees: ${empCount}\n`);

    console.log('📋 Team Breakdown (Top 15):');
    teamsData.forEach((team, i) => {
      console.log(`   ${i + 1}. ${team.name}: ${team.emp_count} employees`);
    });

    if (teamCount > 15) {
      console.log(`   ... and ${teamCount - 15} more teams`);
    }

    await connection.end();
  } catch (err) {
    console.error('Verification failed:', err.message);
  }
}

verifyImport();
