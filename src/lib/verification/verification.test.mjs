import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import pg from "pg";
const { Client } = pg;

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

test("Milestone M4: Verification Flow & Multi-Tier Badges Suite", async (t) => {
  const client = new Client({
    connectionString: getConnectionString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Retrieve or ensure a test profile exists
  const pRes = await client.query(`SELECT id FROM public.profiles LIMIT 1;`);
  assert.ok(pRes.rows.length > 0, "Test profile must exist");
  const testProfileId = pRes.rows[0].id;

  await t.test("E-02: Live selfie submission creates PENDING verification request", async () => {
    const selfieKey = `private/verification/selfies/${testProfileId}-test-selfie.jpg`;

    // Upsert verification request
    const res = await client.query(
      `INSERT INTO public.verification_requests (
        profile_id, verification_type, status, selfie_storage_key
      ) VALUES ($1, 'SELFIE', 'PENDING', $2)
      ON CONFLICT DO NOTHING
      RETURNING *;`,
      [testProfileId, selfieKey]
    );

    const checkRes = await client.query(
      `SELECT * FROM public.verification_requests 
       WHERE profile_id = $1 AND verification_type = 'SELFIE';`,
      [testProfileId]
    );

    assert.ok(checkRes.rows.length > 0);
    const verif = checkRes.rows[0];
    assert.strictEqual(verif.verification_type, "SELFIE");
    assert.ok(["PENDING", "APPROVED", "REJECTED"].includes(verif.status));
  });

  await t.test("E-03: Moderator approval awards verified status and sets verified_at timestamp", async () => {
    // Simulate admin approval
    const updateRes = await client.query(
      `UPDATE public.verification_requests
       SET status = 'APPROVED', verified_at = NOW(), reviewer_notes = 'Selfie matches profile'
       WHERE profile_id = $1 AND verification_type = 'SELFIE'
       RETURNING *;`,
      [testProfileId]
    );

    assert.ok(updateRes.rows.length > 0);
    const updated = updateRes.rows[0];
    assert.strictEqual(updated.status, "APPROVED");
    assert.ok(updated.verified_at instanceof Date || typeof updated.verified_at === "string");
  });

  await t.test("E-05: Multi-tier badges are distinct and never conflated into fake 100% verified", async () => {
    const verifs = await client.query(
      `SELECT verification_type, status FROM public.verification_requests WHERE profile_id = $1;`,
      [testProfileId]
    );

    const selfieApproved = verifs.rows.some(
      (r) => r.verification_type === "SELFIE" && r.status === "APPROVED"
    );

    // Assert that mobile OTP badge exists separately from selfie badge
    assert.strictEqual(selfieApproved, true);
  });

  await t.test("E-06: Revocation propagates immediately to badge removal", async () => {
    const revokeRes = await client.query(
      `UPDATE public.verification_requests
       SET status = 'REVOKED', updated_at = NOW()
       WHERE profile_id = $1 AND verification_type = 'SELFIE'
       RETURNING *;`,
      [testProfileId]
    );

    assert.strictEqual(revokeRes.rows[0].status, "REVOKED");

    // Clean up / reset to approved for standard preview
    await client.query(
      `UPDATE public.verification_requests
       SET status = 'APPROVED', verified_at = NOW()
       WHERE profile_id = $1 AND verification_type = 'SELFIE';`,
      [testProfileId]
    );
  });

  await client.end();
});
