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
    const interests = await db.getInterestsForProfile(profileId);
    return NextResponse.json({ success: true, interests });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const sendInterestSchema = z.object({
  targetProfileId: z.string().uuid().optional(),
  interestId: z.string().uuid().optional(),
  action: z.enum(["SEND", "ACCEPTED", "DECLINED"]).default("SEND"),
});

export async function POST(req: Request) {
  try {
    const profileId = await resolveProfileId();
    const body = await req.json();
    const parsed = sendInterestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid interest request", details: parsed.error.format() }, { status: 400 });
    }

    const { targetProfileId, interestId, action } = parsed.data;

    if (action === "SEND") {
      if (!targetProfileId) {
        return NextResponse.json({ error: "targetProfileId is required to send interest" }, { status: 400 });
      }
      const interest = await db.sendInterest(profileId, targetProfileId);
      return NextResponse.json({
        success: true,
        message: "Interest sent successfully with respectful notification",
        interest,
      });
    } else {
      if (!interestId) {
        return NextResponse.json({ error: "interestId is required to respond" }, { status: 400 });
      }
      const interest = await db.respondInterest(interestId, profileId, action);
      if (!interest) {
        return NextResponse.json({ error: "Interest record not found or not addressed to you" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: `Interest marked as ${action.toLowerCase()}`,
        interest,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
