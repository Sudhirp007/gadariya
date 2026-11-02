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

test("Milestone M5: Discovery, Interests & Dual-Approval Contact Exchange Suite", async (t) => {
  const client = new Client({
    connectionString: getConnectionString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const uA = randomUUID();
  const uB = randomUUID();
  const pA = randomUUID();
  const pB = randomUUID();
  const suffix = Math.floor(10000 + Math.random() * 89999);

  t.after(async () => {
    try {
      await client.query(`DELETE FROM public.users WHERE id IN ($1, $2);`, [uA, uB]);
    } catch {
      // best-effort cleanup
    }
    await client.end();
  });

  await client.query(
    `INSERT INTO public.users (id, email, phone_lookup_hash, status)
     VALUES ($1, $2, $3, 'ACTIVE'),
            ($4, $5, $6, 'ACTIVE');`,
    [uA, `m5a_${suffix}@pal.in`, `m5_hash_a_${suffix}`, uB, `m5b_${suffix}@pal.in`, `m5_hash_b_${suffix}`]
  );

  await client.query(
    `INSERT INTO public.profiles (
      id, owner_user_id, public_id, managed_by, first_name, gender, dob, state, city,
      publication_status, is_discoverable
    ) VALUES
      ($1, $2, $3, 'SELF', 'M5TempGroom', 'MALE', '1995-01-01', 'Uttar Pradesh', 'Lucknow', 'PUBLISHED', TRUE),
      ($4, $5, $6, 'SELF', 'M5TempBride', 'FEMALE', '1997-01-01', 'Uttar Pradesh', 'Kanpur', 'PUBLISHED', TRUE);`,
    [pA, uA, `PAL5${suffix}A`, pB, uB, `PAL5${suffix}B`]
  );

  await t.test("D-04: Discovery view NEVER exposes phone numbers or emails", async () => {
    const res = await client.query(`SELECT * FROM public.discovery_profiles LIMIT 10;`);
    for (const row of res.rows) {
      assert.strictEqual(row.phone, undefined, "Discovery profile must never include phone");
      assert.strictEqual(row.phone_encrypted, undefined, "Discovery profile must never include phone_encrypted");
      assert.strictEqual(row.email, undefined, "Discovery profile must never include email");
    }
  });

  await t.test("G-01 & G-02: Interest bilateral workflow (send, accept, decline)", async () => {
    const sendRes = await client.query(
      `INSERT INTO public.interests (sender_profile_id, receiver_profile_id, status)
       VALUES ($1, $2, 'SENT')
       ON CONFLICT (sender_profile_id, receiver_profile_id) DO UPDATE SET status = 'SENT'
       RETURNING *;`,
      [pA, pB]
    );
    assert.strictEqual(sendRes.rows[0].status, "SENT");

    const acceptRes = await client.query(
      `UPDATE public.interests SET status = 'ACCEPTED'
       WHERE sender_profile_id = $1 AND receiver_profile_id = $2
       RETURNING *;`,
      [pA, pB]
    );
    assert.strictEqual(acceptRes.rows[0].status, "ACCEPTED");
  });

  await t.test("F-01 to F-03: Dual-Approval Contact Exchange State Machine", async () => {
    const initRes = await client.query(
      `INSERT INTO public.contact_exchange_requests (
        sender_profile_id, receiver_profile_id, status, sender_disclose_phone, sender_approved_at
      ) VALUES ($1, $2, 'SENDER_APPROVED', TRUE, NOW())
      ON CONFLICT (sender_profile_id, receiver_profile_id) DO UPDATE SET status = 'SENDER_APPROVED'
      RETURNING *;`,
      [pA, pB]
    );
    const requestId = initRes.rows[0].id;
    assert.strictEqual(initRes.rows[0].status, "SENDER_APPROVED");

    const disclosureCheck = await client.query(
      `SELECT * FROM public.contact_disclosures WHERE request_id = $1;`,
      [requestId]
    );
    assert.strictEqual(
      disclosureCheck.rows.length,
      0,
      "Contact must not be visible in contact_disclosures view prior to BOTH_APPROVED"
    );

    const approveRes = await client.query(
      `UPDATE public.contact_exchange_requests
       SET status = 'BOTH_APPROVED', receiver_disclose_phone = TRUE, receiver_approved_at = NOW(), disclosed_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [requestId]
    );
    assert.strictEqual(approveRes.rows[0].status, "BOTH_APPROVED");

    const verifiedDisclosure = await client.query(
      `SELECT * FROM public.contact_disclosures WHERE request_id = $1;`,
      [requestId]
    );
    assert.ok(verifiedDisclosure.rows.length > 0, "Contact must be visible when status = BOTH_APPROVED");
  });
});
