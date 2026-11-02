import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import pg from "pg";
const { Client } = pg;
import {
  createAdminToken,
  verifyAdminToken,
} from "../auth/admin-session.ts";

function getConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    if (fs.existsSync(".env.local")) {
      const lines = fs.readFileSync(".env.local", "utf-8").split("\n");
      for (const line of lines) {
        if (line.startsWith("DATABASE_URL=")) {
          return line.slice("DATABASE_URL=".length).trim();
        }
      }
    }
  } catch {
    // ignore
  }
  return "postgresql://postgres:postgres@localhost:5432/postgres";
}

test("Milestone M3: Admin Core & RBAC Test Suite", async (t) => {
  await t.test("Admin Session Tokens: HMAC Signing & Verification", () => {
    const token = createAdminToken({
      adminId: "10000000-0000-0000-0000-000000000001",
      email: "admin@palmatrimony.in",
      role: "SUPER_ADMIN",
    });

    assert.ok(token.includes("."), "Token must contain payload and signature");

    const verified = verifyAdminToken(token);
    assert.ok(verified, "Token must verify successfully");
    assert.strictEqual(verified.email, "admin@palmatrimony.in");
    assert.strictEqual(verified.role, "SUPER_ADMIN");

    // Tampered token must be rejected
    const tampered = token.slice(0, -4) + "XXXX";
    const invalid = verifyAdminToken(tampered);
    assert.strictEqual(invalid, null, "Tampered token must fail verification");
  });

  await t.test("Admin PostgreSQL Verification: Seed admin, stats, and audit logs", async () => {
    const client = new Client({
      connectionString: getConnectionString(),
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    // 1. Verify admin user exists or insert seed
    await client.query(`
      INSERT INTO public.admin_users (id, email, role, mfa_enabled)
      VALUES ('10000000-0000-0000-0000-000000000001', 'admin@palmatrimony.in', 'SUPER_ADMIN', TRUE)
      ON CONFLICT (email) DO NOTHING;
    `);

    const res = await client.query(
      `SELECT * FROM public.admin_users WHERE email = 'admin@palmatrimony.in';`
    );
    assert.strictEqual(res.rows.length, 1);
    assert.strictEqual(res.rows[0].role, "SUPER_ADMIN");
    assert.strictEqual(res.rows[0].mfa_enabled, true);

    // 2. Test audit logging for an admin action
    const auditRes = await client.query(
      `INSERT INTO public.audit_logs (actor_id, action, target_type, metadata)
       VALUES ($1, 'TEST_ADMIN_ACTION', 'PROFILE', '{"reason": "Automated Test"}')
       RETURNING *;`,
      [res.rows[0].id]
    );
    assert.strictEqual(auditRes.rows[0].action, "TEST_ADMIN_ACTION");

    await client.end();
  });
});
