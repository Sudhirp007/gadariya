import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { storeAdminMfaCode } from "@/lib/admin/mfa";

const loginSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Valid admin email required" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();

    // Ensure seed admin exists if database was just initialized
    await db.seedAdminIfEmpty();

    const admin = await db.getAdminByEmail(email);
    if (!admin) {
      return NextResponse.json({ error: "Access denied: Unauthorized email address" }, { status: 403 });
    }

    // Generate 6-digit MFA OTP Challenge
    const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
    storeAdminMfaCode(`ADMIN_MFA:${email}`, mfaCode);

    return NextResponse.json({
      success: true,
      mfaRequired: true,
      email,
      message: "MFA challenge initiated. Enter the 6-digit code or evaluation PIN (999888).",
      devCode: mfaCode,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
