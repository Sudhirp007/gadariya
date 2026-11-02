import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session = await getServerSession();

    const gender = searchParams.get("gender") || undefined;
    const rawMinAge = searchParams.get("minAge");
    const rawMaxAge = searchParams.get("maxAge");
    const parsedMinAge = rawMinAge ? parseInt(rawMinAge, 10) : undefined;
    const parsedMaxAge = rawMaxAge ? parseInt(rawMaxAge, 10) : undefined;
    const minAge = parsedMinAge !== undefined && !Number.isNaN(parsedMinAge) ? parsedMinAge : undefined;
    const maxAge = parsedMaxAge !== undefined && !Number.isNaN(parsedMaxAge) ? parsedMaxAge : undefined;

    const state = searchParams.get("state") || undefined;
    const city = searchParams.get("city") || undefined;
    const subCommunity = searchParams.get("subCommunity") || undefined;
    const highestEducation = searchParams.get("education") || undefined;

    const profiles = await db.searchDiscoveryProfiles({
      gender,
      minAge,
      maxAge,
      state,
      city,
      subCommunity,
      highestEducation,
      excludeProfileId: session?.profileId,
    });

    return NextResponse.json(
      {
        success: true,
        count: profiles.length,
        profiles,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
