import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import pg from "pg";
const { Client } = pg;

function normalizePoolerUrl(raw) {
  if (!raw) return raw;
  return raw.includes(".pooler.supabase.com:5432")
    ? raw.replace(".pooler.supabase.com:5432", ".pooler.supabase.com:6543")
    : raw;
}

function getConnectionString() {
  if (process.env.DATABASE_URL) return normalizePoolerUrl(process.env.DATABASE_URL);
  try {
    if (fs.existsSync(".env.local")) {
      const lines = fs.readFileSync(".env.local", "utf-8").split("\n");
      for (const line of lines) {
        if (line.startsWith("DATABASE_URL=")) {
          return normalizePoolerUrl(line.slice("DATABASE_URL=".length).trim());
        }
      }
    }
  } catch {
    // ignore
  }
  return "postgresql://postgres:postgres@localhost:5432/postgres";
}

const CONNECTION_STRING = getConnectionString();

test("Database Integration Suite", async (t) => {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  t.after(async () => {
    try {
      await client.query(`DELETE FROM public.profile_managers WHERE manager_phone_hash = 'test_hash_brother_999';`);
    } catch {
      // ignore cleanup error
    }
    await client.end();
  });

  await t.test("Schema Verification: All core tables and views exist", async () => {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const tables = res.rows.map((r) => r.table_name);
    const expected = [
      "users",
      "profiles",
      "profile_details",
      "family_details",
      "profile_preferences",
      "profile_photos",
      "profile_managers",
      "verification_requests",
      "interests",
      "shortlists",
      "contact_exchange_requests",
      "biodata_shares",
      "messages",
      "blocks",
      "reports",
      "audit_logs",
      "consent_records",
      "admin_users",
      "discovery_profiles",
      "contact_disclosures",
    ];

    for (const exp of expected) {
      assert.ok(
        tables.includes(exp),
        `Expected table/view ${exp} was not found in database.`
      );
    }
  });

  await t.test("Security Verification: RLS is enabled on all sensitive tables", async () => {
    const res = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    const sensitive = [
      "users",
      "profiles",
      "profile_details",
      "family_details",
      "profile_preferences",
      "profile_photos",
      "profile_managers",
      "verification_requests",
      "interests",
      "contact_exchange_requests",
      "messages",
      "blocks",
      "reports",
      "audit_logs",
    ];

    for (const row of res.rows) {
      if (sensitive.includes(row.tablename)) {
        assert.strictEqual(
          row.rowsecurity,
          true,
          `RLS must be enabled on ${row.tablename}`
        );
      }
    }
  });

  await t.test("Privacy Invariant C-06: Database strictly prohibits managers from disclosing contact", async () => {
    const pRes = await client.query(`SELECT id FROM public.profiles LIMIT 1;`);
    assert.ok(pRes.rows.length > 0, "A profile must exist for testing");
    const testProfileId = pRes.rows[0].id;

    const insertRes = await client.query(
      `INSERT INTO public.profile_managers (
        profile_id, relation, manager_phone_hash, can_disclose_contact, can_view_verification_docs
      ) VALUES ($1, 'BROTHER', 'test_hash_brother_999', FALSE, FALSE)
      ON CONFLICT (profile_id, manager_phone_hash) DO UPDATE SET status = 'ACTIVE'
      RETURNING *;`,
      [testProfileId]
    );
    assert.strictEqual(insertRes.rows[0].can_disclose_contact, false);
    assert.strictEqual(insertRes.rows[0].can_view_verification_docs, false);

    let constraintViolated = false;
    try {
      await client.query(
        `INSERT INTO public.profile_managers (
          profile_id, relation, manager_phone_hash, can_disclose_contact
        ) VALUES ($1, 'BROTHER', 'illegal_hash_attempt', TRUE);`,
        [testProfileId]
      );
    } catch {
      constraintViolated = true;
    }
    assert.strictEqual(
      constraintViolated,
      true,
      "PostgreSQL check constraint must reject can_disclose_contact = TRUE"
    );
  });

  await t.test("Contact Disclosures View: Hides contact until BOTH_APPROVED", async () => {
    const res = await client.query(`SELECT * FROM public.contact_disclosures;`);
    for (const row of res.rows) {
      assert.strictEqual(row.status, "BOTH_APPROVED");
    }
  });
});
