import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { normalizePhoneNumber } from "@/lib/crypto";
import { activeProfiles } from "@/lib/profile/store";

const managerInviteSchema = z.object({
  phone: z.string().min(10, "Valid 10-digit mobile number required"),
  relation: z.enum(["FATHER", "MOTHER", "BROTHER", "SISTER", "RELATIVE", "GUARDIAN"]),
  permissions: z.object({
    viewBiodata: z.boolean().default(true),
    editBiodata: z.boolean().default(false),
    managePreferences: z.boolean().default(false),
    sendInterests: z.boolean().default(false),
    requestBiodata: z.boolean().default(false),
    // Critical Invariant: Manager can NEVER disclose owner's phone or identity docs
  }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = managerInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid manager invitation data", details: parsed.error.format() }, { status: 400 });
    }

    const { phone, relation, permissions } = parsed.data;
    const normalized = normalizePhoneNumber(phone);
    const managerId = crypto.randomUUID();
    const inviteToken = crypto.randomBytes(16).toString("hex");

    const profile = activeProfiles.get("default-user");
    if (profile) {
      if (!profile.managers) profile.managers = [];
      profile.managers.push({
        id: managerId,
        managerPhone: normalized,
        relation,
        permissions,
      });
      activeProfiles.set("default-user", profile);
    }

    return NextResponse.json({
      success: true,
      message: "Family manager invited successfully with restricted permission scopes",
      invite: {
        id: managerId,
        managerPhone: normalized,
        relation,
        inviteToken,
        expiresInHours: 48,
        permissions,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
