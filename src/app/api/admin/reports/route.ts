import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
    }

    const reports = await db.getReportsQueue();
    return NextResponse.json({ success: true, reports });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const resolveReportSchema = z.object({
  reportId: z.string().uuid(),
  resolution: z.enum(["RESOLVED", "DISMISSED"]),
  notes: z.string().min(3, "Mandatory resolution notes required"),
  suspendReportedUser: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
    }

    // Role check: Only SUPER_ADMIN and MODERATOR can resolve reports
    if (session.role !== "SUPER_ADMIN" && session.role !== "MODERATOR") {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions to resolve abuse reports" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = resolveReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters", details: parsed.error.format() }, { status: 400 });
    }

    const { reportId, resolution, notes, suspendReportedUser } = parsed.data;

    const result = await db.resolveReport(session.adminId, reportId, resolution, notes, suspendReportedUser);

    return NextResponse.json({
      success: true,
      message: `Report marked as ${resolution.toLowerCase()}`,
      report: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
