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

test("Milestone M5: Discovery, Interests & Dual-Approval Contact Exchange Suite", async (t) => {
  const client = new Client({
    connectionString: getConnectionString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Create two test profiles for testing mutual contact exchange
  const userARes = await client.query(`
    INSERT INTO public.users (email, phone_lookup_hash, status)
    VALUES ('test_a@palmatrimony.in', 'hash_test_user_a', 'ACTIVE')
    ON CONFLICT (phone_lookup_hash) DO UPDATE SET status = 'ACTIVE'
    RETURNING id;
  `);
  const userBRes = await client.query(`
    INSERT INTO public.users (email, phone_lookup_hash, status)
    VALUES ('test_b@palmatrimony.in', 'hash_test_user_b', 'ACTIVE')
    ON CONFLICT (phone_lookup_hash) DO UPDATE SET status = 'ACTIVE'
    RETURNING id;
  `);

  const userAId = userARes.rows[0].id;
  const userBId = userBRes.rows[0].id;

  const profARes = await client.query(`
    INSERT INTO public.profiles (
      owner_user_id, managed_by, first_name, gender, dob, state, city,
      publication_status, is_discoverable
    ) VALUES (
      $1, 'SELF', 'Candidate A', 'MALE', '1995-01-01', 'Uttar Pradesh', 'Lucknow',
      'PUBLISHED', TRUE
    )
    ON CONFLICT (public_id) DO NOTHING
    RETURNING id, public_id;
  `, [userAId]);

  const profBRes = await client.query(`
    INSERT INTO public.profiles (
      owner_user_id, managed_by, first_name, gender, dob, state, city,
      publication_status, is_discoverable
    ) VALUES (
      $1, 'SELF', 'Candidate B', 'FEMALE', '1997-01-01', 'Uttar Pradesh', 'Kanpur',
      'PUBLISHED', TRUE
    )
    ON CONFLICT (public_id) DO NOTHING
    RETURNING id, public_id;
  `, [userBId]);

  const profileAId = profARes.rows[0]?.id || (await client.query(`SELECT id FROM public.profiles WHERE owner_user_id = $1;`, [userAId])).rows[0].id;
  const profileBId = profBRes.rows[0]?.id || (await client.query(`SELECT id FROM public.profiles WHERE owner_user_id = $1;`, [userBId])).rows[0].id;

  await t.test("D-04: Discovery view NEVER exposes phone numbers or emails", async () => {
    const res = await client.query(`SELECT * FROM public.discovery_profiles LIMIT 10;`);
    for (const row of res.rows) {
      assert.strictEqual(row.phone, undefined, "Discovery profile must never include phone");
      assert.strictEqual(row.phone_encrypted, undefined, "Discovery profile must never include phone_encrypted");
      assert.strictEqual(row.email, undefined, "Discovery profile must never include email");
    }
  });

  await t.test("G-01 & G-02: Interest bilateral workflow (send, accept, decline)", async () => {
    // Send interest from A to B
    const sendRes = await client.query(`
      INSERT INTO public.interests (sender_profile_id, receiver_profile_id, status)
      VALUES ($1, $2, 'SENT')
      ON CONFLICT (sender_profile_id, receiver_profile_id) DO UPDATE SET status = 'SENT'
      RETURNING *;
    `, [profileAId, profileBId]);
    assert.strictEqual(sendRes.rows[0].status, "SENT");

    // Accept interest by B
    const acceptRes = await client.query(`
      UPDATE public.interests SET status = 'ACCEPTED'
      WHERE sender_profile_id = $1 AND receiver_profile_id = $2
      RETURNING *;
    `, [profileAId, profileBId]);
    assert.strictEqual(acceptRes.rows[0].status, "ACCEPTED");
  });

  await t.test("F-01 to F-03: Dual-Approval Contact Exchange State Machine", async () => {
    // 1. Candidate A initiates contact exchange -> SENDER_APPROVED
    const initRes = await client.query(`
      INSERT INTO public.contact_exchange_requests (
        sender_profile_id, receiver_profile_id, status, sender_disclose_phone, sender_approved_at
      ) VALUES ($1, $2, 'SENDER_APPROVED', TRUE, NOW())
      ON CONFLICT (sender_profile_id, receiver_profile_id) DO UPDATE SET status = 'SENDER_APPROVED'
      RETURNING *;
    `, [profileAId, profileBId]);
    const requestId = initRes.rows[0].id;
    assert.strictEqual(initRes.rows[0].status, "SENDER_APPROVED");

    // 2. Query contact_disclosures view: must return ZERO rows for this request because it's not BOTH_APPROVED
    const disclosureCheck = await client.query(
      `SELECT * FROM public.contact_disclosures WHERE request_id = $1;`,
      [requestId]
    );
    assert.strictEqual(
      disclosureCheck.rows.length,
      0,
      "Contact must not be visible in contact_disclosures view prior to BOTH_APPROVED"
    );

    // 3. Candidate B approves -> transitions to BOTH_APPROVED
    const approveRes = await client.query(`
      UPDATE public.contact_exchange_requests
      SET status = 'BOTH_APPROVED', receiver_disclose_phone = TRUE, receiver_approved_at = NOW(), disclosed_at = NOW()
      WHERE id = $1
      RETURNING *;
    `, [requestId]);
    assert.strictEqual(approveRes.rows[0].status, "BOTH_APPROVED");

    // 4. Now query contact_disclosures view: MUST return row!
    const verifiedDisclosure = await client.query(
      `SELECT * FROM public.contact_disclosures WHERE request_id = $1;`,
      [requestId]
    );
    assert.ok(verifiedDisclosure.rows.length > 0, "Contact must be visible when status = BOTH_APPROVED");
  });

  await client.end();
});
