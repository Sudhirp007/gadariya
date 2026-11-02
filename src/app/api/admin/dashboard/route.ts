import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
    }

    const [stats, recentAuditLogs] = await Promise.all([
      db.getAdminDashboardStats(),
      db.getRecentAuditLogs(20),
    ]);

    return NextResponse.json({
      success: true,
      admin: {
        id: session.adminId,
        email: session.email,
        role: session.role,
      },
      stats,
      recentAuditLogs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
