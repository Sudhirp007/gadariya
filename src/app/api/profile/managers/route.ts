import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { normalizePhoneNumber, hashPhoneNumber, encryptData } from "@/lib/crypto";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/session";

const managerInviteSchema = z.object({
  phone: z.string().min(10, "Valid 10-digit mobile number required"),
  relation: z.enum(["FATHER", "MOTHER", "BROTHER", "SISTER", "RELATIVE", "GUARDIAN"]),
  permissions: z.object({
    viewBiodata: z.boolean().default(true),
    editBiodata: z.boolean().default(false),
    managePreferences: z.boolean().default(false),
    sendInterests: z.boolean().default(false),
    requestBiodata: z.boolean().default(false),
    // Critical Invariant C-06: Manager can NEVER disclose owner's phone or identity docs
  }),
});

async function resolveProfileId(): Promise<string> {
  const session = await getServerSession();
  if (session?.profileId) {
    return session.profileId;
  }
  return await db.seedDemoProfileIfEmpty();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = managerInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid manager invitation data", details: parsed.error.format() }, { status: 400 });
    }

    const { phone, relation, permissions } = parsed.data;
    const normalized = normalizePhoneNumber(phone);
    const phoneHash = hashPhoneNumber(normalized);
    const encryptedPhone = encryptData(normalized);
    const inviteToken = crypto.randomBytes(16).toString("hex");

    const profileId = await resolveProfileId();

    const manager = await db.addFamilyManager({
      profileId,
      relation,
      managerPhoneHash: phoneHash,
      managerPhoneEncrypted: encryptedPhone.ciphertext,
      managerPhoneIv: encryptedPhone.iv,
      managerPhoneTag: encryptedPhone.tag,
      canEditBiodata: permissions.editBiodata,
      canManagePreferences: permissions.managePreferences,
      canSendInterests: permissions.sendInterests,
      canViewShortlists: permissions.viewBiodata,
    });

    await db.logAuditEvent({
      action: "FAMILY_MANAGER_INVITED",
      targetType: "PROFILE_MANAGER",
      targetId: manager.id,
      metadata: { profileId, relation, permissions },
    });

    return NextResponse.json({
      success: true,
      message: "Family manager invited successfully with restricted permission scopes",
      invite: {
        id: manager.id,
        relation: manager.relation,
        inviteToken,
        expiresInHours: 48,
        permissions: {
          canEditBiodata: manager.can_edit_biodata,
          canManagePreferences: manager.can_manage_preferences,
          canSendInterests: manager.can_send_interests,
          canViewShortlists: manager.can_view_shortlists,
          canDiscloseContact: manager.can_disclose_contact, // Always FALSE
          canViewVerificationDocs: manager.can_view_verification_docs, // Always FALSE
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const managerId = searchParams.get("managerId");

    if (!managerId) {
      return NextResponse.json({ error: "managerId parameter is required" }, { status: 400 });
    }

    const profileId = await resolveProfileId();
    const revoked = await db.revokeFamilyManager(profileId, managerId);

    if (!revoked) {
      return NextResponse.json({ error: "Manager record not found or not owned by profile" }, { status: 404 });
    }

    await db.logAuditEvent({
      action: "FAMILY_MANAGER_REVOKED",
      targetType: "PROFILE_MANAGER",
      targetId: managerId,
      metadata: { profileId },
    });

    return NextResponse.json({
      success: true,
      message: "Family manager access revoked immediately",
      managerId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
