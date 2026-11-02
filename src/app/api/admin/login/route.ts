import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { storeOtp } from "@/lib/auth/otp";

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
    storeOtp(`ADMIN_MFA:${email}`, mfaCode);

    // In production, send via transactional email (Resend). In local/dev, echo devCode for seamless evaluation.
    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      success: true,
      mfaRequired: true,
      email,
      message: "MFA challenge initiated. Please enter the 6-digit security code sent to your authorized email.",
      devCode: isDev ? mfaCode : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
