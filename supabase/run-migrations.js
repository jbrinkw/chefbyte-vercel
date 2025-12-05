// Run Supabase migrations
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: '192.168.0.226',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    // RESET DATABASE (User authorized)
    console.log('⚠ Resetting database (dropping public schema)...');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO postgres');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    console.log('✓ Database reset complete');

    // Create migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get executed migrations
    const { rows: executed } = await client.query('SELECT name FROM migrations');
    const executedNames = new Set(executed.map(r => r.name));

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        if (executedNames.has(file)) {
          console.log(`Skipping ${file} (already executed)`);
          continue;
        }

        console.log(`Running ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        console.log(`✓ ${file} completed`);
      }
    }

    // Run seed only if initial schema was just run (optional logic, keeping simple for now)
    // Or just always run seed if it's idempotent (usually seed scripts should be idempotent)
    // For now, let's skip seed if we skipped initial schema to avoid duplicate key errors if seed isn't idempotent
    // Actually, let's just log that we are skipping seed for now to be safe, or check if it's needed.
    // Given the current state, let's just focus on the new migration.

    console.log('\n✅ All migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
