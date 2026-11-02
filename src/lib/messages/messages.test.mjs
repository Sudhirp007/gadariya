import test from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { db } from "../db/index.ts";

test("Milestone M7: In-App Encrypted Messaging & Safety Suite", async (t) => {
  const runId = Math.random().toString(36).substring(2, 7);
  const u1 = randomUUID();
  const u2 = randomUUID();
  const p1 = randomUUID();
  const p2 = randomUUID();
  const randNum = Math.floor(1000 + Math.random() * 9000);

  // Seed test users & profiles
  await db.query(
    `INSERT INTO public.users (id, email, phone_encrypted, phone_iv, phone_tag, phone_lookup_hash, status)
     VALUES ($1, $2, 'enc', 'iv', 'tag', $3, 'ACTIVE'),
            ($4, $5, 'enc', 'iv', 'tag', $6, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING;`,
    [u1, `msg1_${randNum}@pal.in`, `hash1_${randNum}`, u2, `msg2_${randNum}@pal.in`, `hash2_${randNum}`]
  );

  await db.query(
    `INSERT INTO public.profiles (id, owner_user_id, public_id, first_name, gender, dob, state, city, community_declaration, publication_status)
     VALUES ($1, $2, $3, 'SenderCandidate', 'MALE', '1995-04-12', 'Madhya Pradesh', 'Indore', TRUE, 'PUBLISHED'),
            ($4, $5, $6, 'ReceiverCandidate', 'FEMALE', '1997-08-20', 'Madhya Pradesh', 'Bhopal', TRUE, 'PUBLISHED')
     ON CONFLICT (id) DO NOTHING;`,
    [p1, u1, `PAL6${randNum}1`, p2, u2, `PAL6${randNum}2`]
  );

  // Cleanup + pool close run after ALL subtests, even if one fails.
  // Deleting the two seeded users cascades to their profiles, interests,
  // messages, blocks, and reports (FKs use ON DELETE CASCADE), so no
  // fabricated rows leak into the database / discovery results.
  await t.after(async () => {
    try {
      await db.query(`DELETE FROM public.users WHERE id IN ($1, $2);`, [u1, u2]);
    } catch {
      // best-effort cleanup; never mask a real subtest failure
    }
    await db.endPool();
  });

  await t.test("M7-01: Invariant — Messaging is strictly rejected if mutual interest is NOT accepted", async () => {
    // Attempting to send message with NO interest accepted
    await assert.rejects(
      async () => {
        await db.sendMessage(p1, p2, "Hello, can we connect?");
      },
      (err) => {
        assert.match(err.message, /PRIVACY VIOLATION.*mutual interest/i);
        return true;
      },
      "Must throw PRIVACY VIOLATION if mutual interest not accepted"
    );
  });

  await t.test("M7-02: AES-256-GCM Encryption at Rest upon mutual interest acceptance", async () => {
    // 1. Establish accepted mutual interest
    await db.query(
      `INSERT INTO public.interests (sender_profile_id, receiver_profile_id, status)
       VALUES ($1, $2, 'ACCEPTED')
       ON CONFLICT (sender_profile_id, receiver_profile_id) DO UPDATE SET status = 'ACCEPTED';`,
      [p1, p2]
    );

    // 2. Send message
    const msg = await db.sendMessage(p1, p2, "Namaste Ji, saw your biodata on Pal Matrimony.");
    assert.ok(msg.id, "Message must be created");
    assert.strictEqual(msg.body, "Namaste Ji, saw your biodata on Pal Matrimony.");

    // 3. Inspect raw ciphertext in database to prove encryption at rest
    const rawDbRes = await db.query(
      `SELECT encrypted_body, iv, tag FROM public.messages WHERE id = $1;`,
      [msg.id]
    );
    const raw = rawDbRes.rows[0];
    assert.notStrictEqual(raw.encrypted_body, "Namaste Ji, saw your biodata on Pal Matrimony.");
    assert.ok(raw.encrypted_body.length > 20, "Ciphertext must be encrypted string");
    assert.ok(raw.iv.length === 16 || raw.iv.length === 24, "IV must be valid 12-byte encoded representation");
    assert.ok(raw.tag.length >= 22, "Auth tag must be valid 16-byte encoded representation");
  });

  await t.test("M7-03: Message retrieval decrypts content & read receipts update correctly", async () => {
    // 1. Retrieve messages
    const thread = await db.getMessages(p1, p2);
    assert.ok(thread.length >= 1, "Must return at least 1 message");
    const lastMsg = thread[thread.length - 1];
    assert.strictEqual(lastMsg.body, "Namaste Ji, saw your biodata on Pal Matrimony.");
    assert.strictEqual(lastMsg.readAt, null, "Initial readAt must be null");

    // 2. Receiver marks messages as read
    const markRes = await db.markMessagesAsRead(p2, p1);
    assert.ok(markRes.markedCount >= 1, "Must mark at least 1 message as read");

    // 3. Check read receipt updated
    const updatedThread = await db.getMessages(p1, p2);
    const updatedLast = updatedThread[updatedThread.length - 1];
    assert.ok(updatedLast.readAt !== null, "readAt must be populated with timestamp");
  });

  await t.test("M7-04: Blocking restricts messaging between candidates", async () => {
    // Receiver blocks sender
    await db.blockProfile(p2, p1);

    // Sender attempts to message receiver
    await assert.rejects(
      async () => {
        await db.sendMessage(p1, p2, "Are you receiving my messages?");
      },
      (err) => {
        assert.match(err.message, /restricted/i);
        return true;
      },
      "Must throw error when profile is blocked"
    );

    // Receiver unblocks sender
    await db.unblockProfile(p2, p1);
    const isStillBlocked = await db.isBlocked(p1, p2);
    assert.strictEqual(isStillBlocked, false, "Must be unblocked");
  });

  await t.test("M7-05: Safety Reporting enters admin moderation queue", async () => {
    const report = await db.reportProfile(
      p1,
      p2,
      "INAPPROPRIATE_CONTENT",
      "Candidate asked for commercial transaction"
    );

    assert.ok(report.id, "Report record must be created");
    assert.strictEqual(report.status, "PENDING");
    assert.strictEqual(report.category, "INAPPROPRIATE_CONTENT");

    // Verify it exists in public.reports
    const checkRes = await db.query(
      `SELECT * FROM public.reports WHERE id = $1;`,
      [report.id]
    );
    assert.strictEqual(checkRes.rows[0].status, "PENDING");
  });
});
