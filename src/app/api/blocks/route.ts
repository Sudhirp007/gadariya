import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetPublicId } = await req.json();
    if (!targetPublicId) {
      return NextResponse.json({ error: "targetPublicId is required" }, { status: 400 });
    }

    const targetRes = await db.query(
      `SELECT id FROM public.profiles WHERE public_id = $1 LIMIT 1;`,
      [targetPublicId]
    );
    const target = targetRes.rows[0];
    if (!target) {
      return NextResponse.json({ error: "Target profile not found" }, { status: 404 });
    }

    await db.blockProfile(session.profileId, target.id);
    return NextResponse.json({
      success: true,
      message: `Profile ${targetPublicId} has been blocked. They can no longer contact or view your profile.`,
    });
  } catch (error: any) {
    console.error("POST /api/blocks error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to block profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetPublicId } = await req.json();
    if (!targetPublicId) {
      return NextResponse.json({ error: "targetPublicId is required" }, { status: 400 });
    }

    const targetRes = await db.query(
      `SELECT id FROM public.profiles WHERE public_id = $1 LIMIT 1;`,
      [targetPublicId]
    );
    const target = targetRes.rows[0];
    if (!target) {
      return NextResponse.json({ error: "Target profile not found" }, { status: 404 });
    }

    await db.unblockProfile(session.profileId, target.id);
    return NextResponse.json({
      success: true,
      message: `Profile ${targetPublicId} has been unblocked.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/blocks error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unblock profile" },
      { status: 500 }
    );
  }
}
