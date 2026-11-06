import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  console.log('🔄 [QueueCare Migrations] Connecting to MySQL...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'queuecare',
    multipleStatements: true,
  });

  try {
    // 1. Ensure migrations tracking table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Read executed migrations
    const [rows] = await connection.query<any[]>(`SELECT name FROM _migrations`);
    const executedNames = new Set(rows.map((r: any) => r.name));

    // 3. Find SQL files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`📂 Found ${files.length} migration files in ${migrationsDir}`);

    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`⏩ [Skipping] ${file} (already executed)`);
        continue;
      }

      console.log(`⚡ [Executing] ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await connection.query(sql);
      await connection.query(`INSERT INTO _migrations (name) VALUES (?)`, [file]);
      console.log(`✅ [Done] ${file}`);
    }

    console.log('🎉 [QueueCare Migrations] All migrations executed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
