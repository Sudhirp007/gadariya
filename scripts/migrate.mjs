import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Client } = pg;

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (fs.existsSync('.env.local')) {
    const lines = fs.readFileSync('.env.local', 'utf-8').split('\n');
    for (const line of lines) {
      if (line.startsWith('DATABASE_URL=')) {
        return line.slice('DATABASE_URL='.length).trim();
      }
    }
  }
  throw new Error('DATABASE_URL is not configured in environment or .env.local');
}

async function runMigrations() {
  const connectionString = getDatabaseUrl();
  console.log('Connecting to Supabase PostgreSQL database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    const migrations = [
      'supabase/migrations/20261102000001_initial_schema.sql',
      'supabase/migrations/20261102000002_rls_policies.sql',
      'supabase/migrations/20261102000003_profile_managers.sql'
    ];

    for (const migPath of migrations) {
      console.log(`\nExecuting migration: ${migPath}`);
      const sql = fs.readFileSync(path.resolve(migPath), 'utf-8');
      await client.query(sql);
      console.log(`Migration ${migPath} executed successfully!`);
    }

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('\nAll public tables in Supabase DB now:');
    console.log(tablesRes.rows.map(r => r.table_name));

    const policiesRes = await client.query(`
      SELECT tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    console.log(`\nTotal RLS Policies created: ${policiesRes.rows.length}`);

    await client.end();
    console.log('\nDatabase migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

runMigrations();
