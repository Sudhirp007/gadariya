import { NextResponse } from "next/server";
import { z } from "zod";
import { checkOtpRateLimit, generateAndStoreOtp } from "@/lib/auth/otp";

const sendOtpSchema = z.object({
  identifier: z.string().min(3),
  channel: z.enum(["email", "phone"]).default("email"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { identifier, channel } = parsed.data;
    const clientIp = req.headers.get("x-forwarded-for") || "local";
    const rateLimitKey = `${clientIp}:${identifier}`;

    // Rate-limiting check
    const rateLimit = checkOtpRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many OTP requests. Please wait ${rateLimit.retryAfter || 300} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    // Generate cryptographic 6-digit OTP
    const otpCode = generateAndStoreOtp(identifier);

    // Send OTP via Resend or log in development
    const resendApiKey = process.env.RESEND_API_KEY;
    if (channel === "email" && resendApiKey && !resendApiKey.includes("placeholder")) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "Pal Matrimony <support@palmatrimony.in>",
            to: identifier,
            subject: "Your Pal Matrimony Login OTP",
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>पाल वैवाहिक मंच (Pal Matrimony)</h2>
                <p>Your one-time login verification code is:</p>
                <h1 style="color: #ea580c; letter-spacing: 4px;">${otpCode}</h1>
                <p>This code is valid for 5 minutes. Do not share it with anyone.</p>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.warn("[Resend] Email dispatch failed, falling back to local log:", err);
      }
    } else {
      console.log(`\n[Pal Matrimony OTP Service] Destination: ${identifier} | OTP Code: ${otpCode} (Valid 5m)\n`);
    }

    // Invariant: NEVER echo the OTP code in the response
    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      expiresInSeconds: 300,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
