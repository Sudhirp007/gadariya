import test from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { generateBiodataPdf } from "../biodata/pdf-generator.ts";
import { db } from "../db/index.ts";

test("Milestone M6: Privacy, Watermarked Biodata & DPDP Act 2025 Suite", async (t) => {
  await t.test("M6-01: Watermarked Biodata PDF Generator produces valid binary with tracking metadata", async () => {
    const candidateData = {
      publicId: "PAL900001",
      firstName: "Aarav",
      gender: "MALE",
      age: 28,
      heightCm: 178,
      maritalStatus: "Never Married",
      subCommunity: "Gadaria / Pal (Nikhar)",
      city: "Indore",
      state: "Madhya Pradesh",
      highestEducation: "B.Tech Computer Science",
      employedIn: "Private Sector",
      occupation: "Software Engineer",
      mobileVerified: true,
      adminReviewed: true,
      selfieVerified: false,
    };

    const pdfBytes = await generateBiodataPdf(candidateData, {
      recipientPublicId: "PAL900002",
      isContactApproved: false,
      auditId: "TEST-AUDIT-12345",
    });

    assert.ok(pdfBytes instanceof Uint8Array, "Result must be a Uint8Array");
    assert.ok(pdfBytes.length > 2000, "PDF byte length must be substantial (>2KB)");

    const headerStr = Buffer.from(pdfBytes.slice(0, 10)).toString("utf-8");
    assert.ok(headerStr.startsWith("%PDF-"), "File must start with standard %PDF- header");

    const doc = await PDFDocument.load(pdfBytes);
    assert.strictEqual(doc.getPageCount(), 1, "Must generate a 1-page A4 summary");
    assert.strictEqual(doc.getTitle(), "Pal Matrimony Biodata - PAL900001");
  });

  await t.test("M6-02: Watermarked PDF strictly conceals direct phone unless dual mutual consent verified", async () => {
    const candidateData = {
      publicId: "PAL900003",
      firstName: "Priya",
      gender: "FEMALE",
      age: 26,
      city: "Gwalior",
      state: "Madhya Pradesh",
    };

    // When NOT approved
    const pdfHiddenBytes = await generateBiodataPdf(candidateData, {
      recipientPublicId: "PAL900004",
      isContactApproved: false,
      contactPhone: "+91 99999 88888",
    });
    const docHidden = await PDFDocument.load(pdfHiddenBytes);
    assert.strictEqual(docHidden.getKeywords()?.includes("CONTACT_HIDDEN"), true);
    assert.strictEqual(docHidden.getKeywords()?.includes("CONTACT_APPROVED"), false);

    // When approved
    const pdfApprovedBytes = await generateBiodataPdf(candidateData, {
      recipientPublicId: "PAL900004",
      isContactApproved: true,
      contactPhone: "+91 99999 88888",
      contactEmail: "priya.test@palmatrimony.in",
    });
    const docApproved = await PDFDocument.load(pdfApprovedBytes);
    assert.strictEqual(docApproved.getKeywords()?.includes("CONTACT_APPROVED"), true);
    assert.strictEqual(docApproved.getKeywords()?.includes("CONTACT_HIDDEN"), false);
  });

  await t.test("M6-03: Biodata & Photo Sharing Lifecycle (Request -> Approve -> Revoke)", async () => {
    const u1 = randomUUID();
    const u2 = randomUUID();
    const p1 = randomUUID();
    const p2 = randomUUID();
    const randSuffix = Math.floor(1000 + Math.random() * 9000);

    // Seed test users & profiles
    await db.query(
      `INSERT INTO public.users (id, email, phone_encrypted, phone_iv, phone_tag, phone_lookup_hash, status)
       VALUES ($1, $2, 'enc', 'iv', 'tag', $3, 'ACTIVE'),
              ($4, $5, 'enc', 'iv', 'tag', $6, 'ACTIVE')
       ON CONFLICT (id) DO NOTHING;`,
      [u1, `p1_${randSuffix}@pal.in`, `hash1_${randSuffix}`, u2, `p2_${randSuffix}@pal.in`, `hash2_${randSuffix}`]
    );

    await db.query(
      `INSERT INTO public.profiles (id, owner_user_id, public_id, first_name, gender, dob, state, city, community_declaration, publication_status)
       VALUES ($1, $2, $3, 'OwnerCandidate', 'FEMALE', '1998-05-10', 'Madhya Pradesh', 'Indore', TRUE, 'PUBLISHED'),
              ($4, $5, $6, 'RequesterCandidate', 'MALE', '1996-03-15', 'Madhya Pradesh', 'Bhopal', TRUE, 'PUBLISHED')
       ON CONFLICT (id) DO NOTHING;`,
      [p1, u1, `PAL8${randSuffix}1`, p2, u2, `PAL8${randSuffix}2`]
    );

    // 1. Initially, requester has NO biodata access
    const initialAccess = await db.checkBiodataAccess(p1, p2);
    assert.strictEqual(initialAccess, false, "Initial biodata access must be false");

    // 2. Requester requests access
    const share = await db.requestBiodataShare(p1, p2);
    assert.strictEqual(share.status, "REQUESTED");

    // 3. Owner approves request
    const approved = await db.respondBiodataShare(share.id, p1, "APPROVE");
    assert.strictEqual(approved.status, "APPROVED");
    assert.ok(approved.expires_at, "Expires timestamp must be set on approval");

    // Check access is now true
    const accessGranted = await db.checkBiodataAccess(p1, p2);
    assert.strictEqual(accessGranted, true, "Biodata access must be true after approval");

    // 4. Owner revokes access
    const revoked = await db.respondBiodataShare(share.id, p1, "REVOKE");
    assert.strictEqual(revoked.status, "REVOKED");

    // Check access is now revoked
    const accessRevoked = await db.checkBiodataAccess(p1, p2);
    assert.strictEqual(accessRevoked, false, "Biodata access must be false after revocation");
  });

  await t.test("M6-04: DPDP Act 2025 Consent Withdrawal & Account Erasure", async () => {
    const userId = randomUUID();
    const profId = randomUUID();
    const randSuffix = Math.floor(1000 + Math.random() * 9000);

    await db.query(
      `INSERT INTO public.users (id, email, phone_encrypted, phone_iv, phone_tag, phone_lookup_hash, status)
       VALUES ($1, $2, 'enc', 'iv', 'tag', $3, 'ACTIVE');`,
      [userId, `dpdp_${randSuffix}@pal.in`, `dpdp_hash_${randSuffix}`]
    );

    await db.query(
      `INSERT INTO public.profiles (id, owner_user_id, public_id, first_name, gender, dob, state, city, community_declaration, publication_status)
       VALUES ($1, $2, $3, 'DPDPCandidate', 'FEMALE', '1999-01-01', 'Madhya Pradesh', 'Indore', TRUE, 'PUBLISHED');`,
      [profId, userId, `PAL7${randSuffix}1`]
    );

    // Record consent
    await db.query(
      `INSERT INTO public.consent_records (user_id, consent_purpose, granted, policy_version)
       VALUES ($1, 'DIRECTORY_INDEXING', TRUE, 'DPDP-2025-V1');`,
      [userId]
    );

    // Withdraw consent
    const withdrawRes = await db.withdrawConsent(userId, "DIRECTORY_INDEXING");
    assert.strictEqual(withdrawRes[0].granted, false);
    assert.ok(withdrawRes[0].withdrawn_at, "withdrawn_at timestamp must be recorded");

    // Request account deletion
    const delResult = await db.requestAccountDeletion(userId, "Testing statutory erasure");
    assert.strictEqual(delResult.success, true);
    assert.strictEqual(delResult.profileArchived, true);

    // Verify user is suspended and profile archived
    const userCheck = await db.query(`SELECT status FROM public.users WHERE id = $1;`, [userId]);
    assert.strictEqual(userCheck.rows[0].status, "SUSPENDED");

    const profileCheck = await db.query(`SELECT publication_status, is_discoverable FROM public.profiles WHERE id = $1;`, [profId]);
    assert.strictEqual(profileCheck.rows[0].publication_status, "SUSPENDED");
    assert.strictEqual(profileCheck.rows[0].is_discoverable, false);

    await db.endPool();
  });
});
