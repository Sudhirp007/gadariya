import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyStoredOtp } from "@/lib/auth/otp";
import crypto from "crypto";

const verifySchema = z.object({
  identifier: z.string().min(3),
  otp: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid OTP format" }, { status: 400 });
    }

    const { identifier, otp } = parsed.data;

    const isValid = verifyStoredOtp(identifier, otp);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP code. Please try again." },
        { status: 401 }
      );
    }

    // Generate authenticated session token
    const sessionToken = crypto.randomBytes(32).toString("hex");

    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: { identifier },
    });

    // Set secure, HttpOnly cookie
    response.cookies.set({
      name: "pal_session",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
