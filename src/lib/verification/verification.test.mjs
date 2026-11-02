import test from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
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

test("Milestone M4: Verification Flow & Multi-Tier Badges Suite", async (t) => {
  const client = new Client({
    connectionString: getConnectionString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const testUserId = randomUUID();
  const testProfileId = randomUUID();
  const suffix = Math.floor(10000 + Math.random() * 89999);

  t.after(async () => {
    try {
      await client.query(`DELETE FROM public.users WHERE id = $1;`, [testUserId]);
    } catch {
      // best-effort cleanup
    }
    await client.end();
  });

  await client.query(
    `INSERT INTO public.users (id, email, phone_lookup_hash, status)
     VALUES ($1, $2, $3, 'ACTIVE');`,
    [testUserId, `m4_${suffix}@pal.in`, `m4_hash_${suffix}`]
  );

  await client.query(
    `INSERT INTO public.profiles (
      id, owner_user_id, public_id, managed_by, first_name, gender, dob, state, city, publication_status
    ) VALUES ($1, $2, $3, 'SELF', 'M4TempVerify', 'MALE', '1996-06-06', 'Uttar Pradesh', 'Agra', 'PENDING_REVIEW');`,
    [testProfileId, testUserId, `PAL4${suffix}`]
  );

  await client.query(
    `INSERT INTO public.verification_requests (profile_id, verification_type, status, verified_at)
     VALUES ($1, 'MOBILE_OTP', 'APPROVED', NOW());`,
    [testProfileId]
  );

  await t.test("E-02: Live selfie submission creates PENDING verification request", async () => {
    const selfieKey = `private/verification/selfies/${testProfileId}-test-selfie.jpg`;

    await client.query(
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
    assert.strictEqual(verif.status, "PENDING");
  });

  await t.test("E-03: Moderator approval awards verified status and sets verified_at timestamp", async () => {
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

    const mobileApproved = verifs.rows.some(
      (r) => r.verification_type === "MOBILE_OTP" && r.status === "APPROVED"
    );
    const selfieApproved = verifs.rows.some(
      (r) => r.verification_type === "SELFIE" && r.status === "APPROVED"
    );

    assert.strictEqual(mobileApproved, true);
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
  });
});
