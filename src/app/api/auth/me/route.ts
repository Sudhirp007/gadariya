import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [memberSession, adminSession] = await Promise.all([
      getServerSession(),
      getAdminSession(),
    ]);

    let profile = null;
    if (memberSession?.profileId) {
      const pRes = await db.query(
        `SELECT id, public_id, first_name, publication_status
         FROM public.profiles
         WHERE id = $1
         LIMIT 1;`,
        [memberSession.profileId]
      );
      if (pRes.rows[0]) {
        profile = {
          id: pRes.rows[0].id,
          publicId: pRes.rows[0].public_id,
          firstName: pRes.rows[0].first_name,
          publicationStatus: pRes.rows[0].publication_status,
        };
      }
    }

    return NextResponse.json(
      {
        authenticated: !!profile,
        profile,
        admin: adminSession
          ? {
              adminId: adminSession.adminId,
              email: adminSession.email,
              role: adminSession.role,
            }
          : null,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { authenticated: false, profile: null, admin: null, error: msg },
      { status: 500 }
    );
  }
}
