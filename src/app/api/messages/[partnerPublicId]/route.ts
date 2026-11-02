import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partnerPublicId: string }> }
) {
  try {
    const { partnerPublicId } = await params;
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partnerRes = await db.query(
      `SELECT id, public_id, first_name, gender, state, city FROM public.profiles WHERE public_id = $1 LIMIT 1;`,
      [partnerPublicId]
    );
    const partner = partnerRes.rows[0];
    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });
    }

    const messages = await db.getMessages(session.profileId, partner.id);
    await db.markMessagesAsRead(session.profileId, partner.id);

    return NextResponse.json({
      success: true,
      partner: {
        id: partner.id,
        publicId: partner.public_id,
        name: partner.first_name,
        gender: partner.gender,
        location: `${partner.city || ""}, ${partner.state || ""}`,
      },
      messages,
    });
  } catch (error: any) {
    console.error("GET /api/messages/[partnerPublicId] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ partnerPublicId: string }> }
) {
  try {
    const { partnerPublicId } = await params;
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyJson = await req.json();
    const { body } = bodyJson;

    if (!body || !body.trim()) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const partnerRes = await db.query(
      `SELECT id, public_id FROM public.profiles WHERE public_id = $1 LIMIT 1;`,
      [partnerPublicId]
    );
    const partner = partnerRes.rows[0];
    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });
    }

    // Light content safety checks (curb vulgarity or unapproved contact bypass attempts)
    const phoneBypassRegex = /(\+91|91)?[6-9]\d{9}/;
    if (phoneBypassRegex.test(body.replace(/[\s-]/g, ""))) {
      // Check if contact exchange is already both approved
      const contactEx = await db.query(
        `SELECT status FROM public.contact_exchange_requests 
         WHERE ((sender_profile_id = $1 AND receiver_profile_id = $2)
            OR (sender_profile_id = $2 AND receiver_profile_id = $1))
           AND status = 'BOTH_APPROVED' LIMIT 1;`,
        [session.profileId, partner.id]
      );
      if (contactEx.rows.length === 0) {
        return NextResponse.json(
          {
            error:
              "PRIVACY NOTICE: Sharing phone numbers in direct chat before mutual contact exchange approval is prohibited to safeguard member privacy. Please use the official 'Request Contact Exchange' action.",
          },
          { status: 403 }
        );
      }
    }

    const message = await db.sendMessage(session.profileId, partner.id, body);

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error("POST /api/messages/[partnerPublicId] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 400 }
    );
  }
}
