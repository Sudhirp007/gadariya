import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedProfileId } from "@/lib/auth/session";
import { generateBiodataPdf } from "@/lib/biodata/pdf-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    const session = await getAuthenticatedProfileId();

    if (!session?.profileId) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to download candidate biodata." },
        { status: 401 }
      );
    }

    const requesterProfile = await db.getProfileById(session.profileId);
    if (!requesterProfile) {
      return NextResponse.json(
        { error: "Requester profile not found." },
        { status: 404 }
      );
    }

    const candidate = await db.getPublicProfileByPublicId(publicId, session.profileId);
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate profile not found or is private." },
        { status: 404 }
      );
    }

    // Check if requester has BOTH_APPROVED contact exchange with this candidate
    let isContactApproved = false;
    let contactPhone: string | null = null;
    let contactEmail: string | null = null;

    if (candidate.relationshipState?.contactExchange?.status === "BOTH_APPROVED") {
      try {
        const disclosed = await db.getDisclosedContact(
          candidate.relationshipState.contactExchange.id,
          session.profileId
        );
        isContactApproved = true;
        contactPhone = disclosed.phone;
        contactEmail = disclosed.email;
      } catch (err) {
        console.error("Failed to decrypt approved contact for PDF:", err);
      }
    }

    const auditId = `PDF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Map candidate fields to PDF generator input
    const pdfBytes = await generateBiodataPdf(
      {
        publicId: candidate.publicId,
        firstName: candidate.firstName,
        gender: candidate.gender,
        age: candidate.age,
        heightCm: candidate.heightCm,
        maritalStatus: candidate.maritalStatus,
        subCommunity: candidate.subCommunity,
        city: candidate.city,
        state: candidate.state,
        diet: candidate.diet,
        highestEducation: candidate.highestEducation,
        employedIn: candidate.employedIn,
        occupation: candidate.occupation,
        annualIncomeRange: candidate.annualIncomeRange,
        aboutMe: candidate.aboutMe,
        fatherOccupation: candidate.fatherOccupation,
        motherOccupation: candidate.motherOccupation,
        familyValues: candidate.familyValues,
        prefAgeMin: candidate.prefMinAge,
        prefAgeMax: candidate.prefMaxAge,
        mobileVerified: candidate.badges?.some(
          (b: any) => b.type === "MOBILE_OTP" && b.verified
        ),
        adminReviewed: candidate.badges?.some(
          (b: any) => b.type === "ADMIN_REVIEWED" && b.verified
        ),
        selfieVerified: candidate.badges?.some(
          (b: any) => b.type === "SELFIE" && b.verified
        ),
      },
      {
        recipientPublicId: requesterProfile.public_id,
        isContactApproved,
        contactPhone,
        contactEmail,
        auditId,
      }
    );

    // Audit log this export
    await db.logAuditEvent({
      actorId: session.profileId,
      action: "BIODATA_PDF_EXPORTED",
      targetType: "PROFILE",
      targetId: candidate.id,
      metadata: {
        candidatePublicId: publicId,
        recipientPublicId: requesterProfile.public_id,
        auditId,
        isContactApproved,
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Pal_Matrimony_Biodata_${publicId}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Audit-Id": auditId,
      },
    });
  } catch (error: any) {
    console.error("Biodata PDF export error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate biodata PDF." },
      { status: 500 }
    );
  }
}
