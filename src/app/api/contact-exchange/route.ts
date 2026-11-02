import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

async function resolveProfileId(): Promise<string> {
  const session = await getServerSession();
  if (session?.profileId) return session.profileId;
  return await db.seedDemoProfileIfEmpty();
}

export async function GET() {
  try {
    const profileId = await resolveProfileId();
    const requests = await db.getUserContactRequests(profileId);
    return NextResponse.json({ success: true, requests });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const initiateSchema = z.object({
  receiverProfileId: z.string().uuid(),
  disclosePhone: z.boolean().default(true),
  discloseEmail: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const profileId = await resolveProfileId();
    const body = await req.json();
    const parsed = initiateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid contact request", details: parsed.error.format() }, { status: 400 });
    }

    const { receiverProfileId, disclosePhone, discloseEmail } = parsed.data;

    const request = await db.initiateContactExchange(
      profileId,
      receiverProfileId,
      disclosePhone,
      discloseEmail
    );

    return NextResponse.json({
      success: true,
      message: "Contact exchange request initiated. Contact details will be disclosed once the other party approves.",
      request,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const respondSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["APPROVE", "REJECT", "WITHDRAW"]),
  disclosePhone: z.boolean().default(true),
  discloseEmail: z.boolean().default(false),
});

export async function PUT(req: Request) {
  try {
    const profileId = await resolveProfileId();
    const body = await req.json();
    const parsed = respondSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid response parameters", details: parsed.error.format() }, { status: 400 });
    }

    const { requestId, action, disclosePhone, discloseEmail } = parsed.data;

    const updated = await db.respondContactExchange(
      requestId,
      profileId,
      action,
      disclosePhone,
      discloseEmail
    );

    if (!updated) {
      return NextResponse.json({ error: "Contact request not found" }, { status: 404 });
    }

    const isBothApproved = updated.status === "BOTH_APPROVED";

    return NextResponse.json({
      success: true,
      message: isBothApproved
        ? "Dual mutual approval achieved! Contact details are now accessible."
        : `Request marked as ${updated.status.toLowerCase()}`,
      request: updated,
      bothApproved: isBothApproved,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
