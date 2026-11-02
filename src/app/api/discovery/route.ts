import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session = await getServerSession();

    const gender = searchParams.get("gender") || undefined;
    const minAge = searchParams.get("minAge") ? parseInt(searchParams.get("minAge")!) : undefined;
    const maxAge = searchParams.get("maxAge") ? parseInt(searchParams.get("maxAge")!) : undefined;
    const state = searchParams.get("state") || undefined;
    const subCommunity = searchParams.get("subCommunity") || undefined;
    const highestEducation = searchParams.get("education") || undefined;

    // Ensure demo seed profile exists so discovery always has sample profiles
    await db.seedDemoProfileIfEmpty();

    const profiles = await db.searchDiscoveryProfiles({
      gender,
      minAge,
      maxAge,
      state,
      subCommunity,
      highestEducation,
      excludeProfileId: session?.profileId,
    });

    return NextResponse.json({
      success: true,
      count: profiles.length,
      profiles,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
