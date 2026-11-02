import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

export interface BiodataPdfInput {
  publicId: string;
  firstName: string;
  gender: string;
  age: number;
  heightCm?: number | null;
  maritalStatus?: string | null;
  subCommunity?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  diet?: string | null;
  highestEducation?: string | null;
  employedIn?: string | null;
  occupation?: string | null;
  annualIncomeRange?: string | null;
  aboutMe?: string | null;
  fatherOccupation?: string | null;
  motherOccupation?: string | null;
  brothersCount?: number | null;
  sistersCount?: number | null;
  familyLocation?: string | null;
  familyValues?: string | null;
  prefAgeMin?: number | null;
  prefAgeMax?: number | null;
  prefEducation?: string | null;
  prefLocation?: string | null;
  mobileVerified?: boolean;
  adminReviewed?: boolean;
  selfieVerified?: boolean;
}

export interface BiodataPdfOptions {
  recipientPublicId: string;
  isContactApproved?: boolean;
  contactPhone?: string | null;
  contactEmail?: string | null;
  auditId?: string;
  generatedAt?: Date;
}

function sanitizePdfText(raw: string | null | undefined, fallback = "Not specified"): string {
  if (!raw) return fallback;
  const normalized = String(raw)
    .replace(/₹/g, "Rs. ")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, "*")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || fallback;
}

export async function generateBiodataPdf(
  candidate: BiodataPdfInput,
  options: BiodataPdfOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Pal Matrimony Biodata - ${candidate.publicId}`);
  pdfDoc.setAuthor("gadariya.org");
  pdfDoc.setSubject(`Confidential Matrimonial Biodata for ${options.recipientPublicId}`);
  pdfDoc.setKeywords([
    candidate.publicId,
    options.recipientPublicId,
    options.isContactApproved ? "CONTACT_APPROVED" : "CONTACT_HIDDEN",
    options.auditId || "AUD-" + candidate.publicId,
  ]);

  const rawPage = pdfDoc.addPage([595.28, 841.89]); // A4 portrait in points
  const page = {
    drawRectangle: rawPage.drawRectangle.bind(rawPage),
    drawText: (text: string, opts: Parameters<typeof rawPage.drawText>[1]) =>
      rawPage.drawText(sanitizePdfText(text, "-"), opts),
  };

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Brand Palette: Royal Heritage (Option A)
  const plum = rgb(112 / 255, 39 / 255, 71 / 255); // #702747
  const gold = rgb(198 / 255, 161 / 255, 91 / 255); // #C6A15B
  const darkCharcoal = rgb(69 / 255, 64 / 255, 74 / 255); // #45404A
  const forestGreen = rgb(52 / 255, 74 / 255, 66 / 255); // #344A42
  const lightBg = rgb(255 / 255, 249 / 255, 242 / 255); // #FFF9F2
  const cardBorder = rgb(233 / 255, 226 / 255, 218 / 255); // #E9E2DA
  const mutedText = rgb(120 / 255, 115 / 255, 125 / 255);

  const genDate = options.generatedAt || new Date();
  const timestampStr = genDate.toISOString().replace("T", " ").substring(0, 19) + " UTC";
  const auditId = options.auditId || "AUD-" + Math.random().toString(36).substring(2, 10).toUpperCase();

  // Background tint
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
    color: lightBg,
  });

  // Top Header Banner (Royal Plum)
  page.drawRectangle({
    x: 0,
    y: 765,
    width: 595.28,
    height: 76.89,
    color: plum,
  });

  // Gold accent line under header
  page.drawRectangle({
    x: 0,
    y: 761,
    width: 595.28,
    height: 4,
    color: gold,
  });

  // Header Title
  page.drawText("PAL MATRIMONY", {
    x: 40,
    y: 810,
    size: 20,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("gadariya.org — Verified Gadaria / Pal Community Platform", {
    x: 40,
    y: 792,
    size: 9.5,
    font: helvetica,
    color: gold,
  });

  page.drawText("CONFIDENTIAL BIODATA SUMMARY", {
    x: 350,
    y: 810,
    size: 11,
    font: helveticaBold,
    color: gold,
  });

  page.drawText(`Candidate ID: ${candidate.publicId}`, {
    x: 350,
    y: 792,
    size: 10,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  // --------------------------------------------------------------------------
  // ANTI-LEAK WATERMARK (Prominent Diagonal Recipient Attribution)
  // --------------------------------------------------------------------------
  const watermarkText1 = `CONFIDENTIAL - DOWNLOADED BY ${options.recipientPublicId}`;
  const watermarkText2 = `${timestampStr} - GADARIYA.ORG - TRACKED BIODATA`;

  page.drawText(watermarkText1, {
    x: 70,
    y: 220,
    size: 19,
    font: helveticaBold,
    color: rgb(0.65, 0.65, 0.65),
    rotate: degrees(45),
    opacity: 0.17,
  });

  page.drawText(watermarkText2, {
    x: 90,
    y: 200,
    size: 14,
    font: helveticaBold,
    color: rgb(0.65, 0.65, 0.65),
    rotate: degrees(45),
    opacity: 0.17,
  });

  page.drawText(watermarkText1, {
    x: 170,
    y: 450,
    size: 19,
    font: helveticaBold,
    color: rgb(0.65, 0.65, 0.65),
    rotate: degrees(45),
    opacity: 0.15,
  });

  // --------------------------------------------------------------------------
  // CONTENT SECTIONS
  // --------------------------------------------------------------------------
  let curY = 735;

  const drawSectionTitle = (title: string, yPos: number) => {
    page.drawRectangle({
      x: 40,
      y: yPos - 3,
      width: 515.28,
      height: 20,
      color: rgb(240 / 255, 233 / 255, 225 / 255),
    });
    page.drawRectangle({
      x: 40,
      y: yPos - 3,
      width: 4,
      height: 20,
      color: plum,
    });
    page.drawText(title, {
      x: 52,
      y: yPos + 3,
      size: 10.5,
      font: helveticaBold,
      color: plum,
    });
    return yPos - 25;
  };

  const drawRow = (label1: string, val1: string, label2: string, val2: string, yPos: number) => {
    page.drawText(label1 + ":", { x: 50, y: yPos, size: 9, font: helveticaBold, color: darkCharcoal });
    page.drawText(val1, { x: 155, y: yPos, size: 9, font: helvetica, color: darkCharcoal });

    page.drawText(label2 + ":", { x: 310, y: yPos, size: 9, font: helveticaBold, color: darkCharcoal });
    page.drawText(val2, { x: 415, y: yPos, size: 9, font: helvetica, color: darkCharcoal });

    return yPos - 16;
  };

  // Section 1: Candidate Overview
  curY = drawSectionTitle("1. BASIC & COMMUNITY PARTICULARS", curY);
  curY = drawRow("Full/First Name", candidate.firstName, "Profile Public ID", candidate.publicId, curY);
  curY = drawRow(
    "Gender",
    candidate.gender === "FEMALE" ? "Bride (Female)" : "Groom (Male)",
    "Age",
    `${candidate.age} Years`,
    curY
  );
  curY = drawRow(
    "Height",
    candidate.heightCm ? `${candidate.heightCm} cm (${Math.floor(candidate.heightCm / 30.48)}' ${Math.round((candidate.heightCm % 30.48) / 2.54)}")` : "Not specified",
    "Marital Status",
    candidate.maritalStatus || "Never Married",
    curY
  );
  curY = drawRow(
    "Sub-Community",
    candidate.subCommunity || "Gadaria / Pal",
    "Dietary Habit",
    candidate.diet || "Vegetarian",
    curY
  );
  curY = drawRow(
    "Current Location",
    `${candidate.city || "—"}, ${candidate.state || "—"}`,
    "Country",
    candidate.country || "India",
    curY
  );

  curY -= 6;

  // Section 2: Education & Career
  curY = drawSectionTitle("2. EDUCATION & OCCUPATION", curY);
  curY = drawRow(
    "Highest Education",
    candidate.highestEducation || "Graduate",
    "Employed In",
    candidate.employedIn || "Private Sector",
    curY
  );
  curY = drawRow(
    "Occupation",
    candidate.occupation || "Professional",
    "Annual Income",
    candidate.annualIncomeRange || "Confidential",
    curY
  );

  curY -= 6;

  // Section 3: Family Details
  curY = drawSectionTitle("3. FAMILY BACKGROUND", curY);
  curY = drawRow(
    "Father's Profession",
    candidate.fatherOccupation || "Employed",
    "Mother's Profession",
    candidate.motherOccupation || "Homemaker",
    curY
  );
  curY = drawRow(
    "Brothers / Sisters",
    `${candidate.brothersCount ?? 0} Brothers / ${candidate.sistersCount ?? 0} Sisters`,
    "Family Values",
    candidate.familyValues || "Traditional & Moderate",
    curY
  );
  curY = drawRow(
    "Family Location",
    candidate.familyLocation || `${candidate.city || "—"}, ${candidate.state || "—"}`,
    "Community Standing",
    "Registered & Verified Gadaria Family",
    curY
  );

  curY -= 6;

  // Section 4: Partner Preferences
  curY = drawSectionTitle("4. EXPECTED PARTNER PREFERENCES", curY);
  curY = drawRow(
    "Age Preference",
    `${candidate.prefAgeMin ?? candidate.age - 3} - ${candidate.prefAgeMax ?? candidate.age + 3} Years`,
    "Education",
    candidate.prefEducation || "Graduate & Above",
    curY
  );
  curY = drawRow(
    "Preferred Location",
    candidate.prefLocation || "Same State / Open to Relocation",
    "Sub-Community",
    "Gadaria / Pal / Dhangar",
    curY
  );

  curY -= 6;

  // Section 5: Verification & Trust Credentials
  curY = drawSectionTitle("5. COMMUNITY VERIFICATION CREDENTIALS", curY);
  const mobileStatus = candidate.mobileVerified ? "VERIFIED (OTP Validated)" : "PENDING";
  const adminStatus = candidate.adminReviewed ? "VERIFIED (Admin Community Declaration Review)" : "PENDING";
  const selfieStatus = candidate.selfieVerified ? "VERIFIED (Photo Matched)" : "OPTIONAL (Not Submitted)";

  curY = drawRow("Mobile Identity", mobileStatus, "Admin Community Review", adminStatus, curY);
  curY = drawRow("Selfie Verification", selfieStatus, "Govt ID Check", "Voluntary (No Aadhaar Stored)", curY);

  curY -= 6;

  // Section 6: Contact Information (Dual-Approval Gate Enforced)
  curY = drawSectionTitle("6. CONTACT & COMMUNICATION DISCLOSURE", curY);

  if (options.isContactApproved && (options.contactPhone || options.contactEmail)) {
    page.drawRectangle({
      x: 45,
      y: curY - 32,
      width: 505.28,
      height: 44,
      color: rgb(238 / 255, 246 / 255, 242 / 255),
      borderColor: forestGreen,
      borderWidth: 1,
    });
    page.drawText("BILATERAL MUTUAL CONTACT APPROVAL GRANTED", {
      x: 55,
      y: curY - 2,
      size: 9.5,
      font: helveticaBold,
      color: forestGreen,
    });
    page.drawText(
      `Mobile Phone: ${options.contactPhone || "Not provided"}   |   Email: ${options.contactEmail || "Not provided"}`,
      {
        x: 55,
        y: curY - 18,
        size: 9,
        font: helveticaBold,
        color: darkCharcoal,
      }
    );
    curY -= 48;
  } else {
    page.drawRectangle({
      x: 45,
      y: curY - 32,
      width: 505.28,
      height: 44,
      color: rgb(254 / 255, 242 / 255, 242 / 255),
      borderColor: rgb(239 / 255, 68 / 255, 68 / 255),
      borderWidth: 1,
    });
    page.drawText("CONTACT DETAILS PROTECTED (PRIVACY-BY-DESIGN INVARIANT)", {
      x: 55,
      y: curY - 2,
      size: 9.5,
      font: helveticaBold,
      color: rgb(185 / 255, 28 / 255, 28 / 255),
    });
    page.drawText(
      "Direct phone and email are strictly hidden. Both parties must mutually approve contact exchange on gadariya.org.",
      {
        x: 55,
        y: curY - 18,
        size: 8.5,
        font: helvetica,
        color: darkCharcoal,
      }
    );
    curY -= 48;
  }

  // --------------------------------------------------------------------------
  // FOOTER & AUDIT INTEGRITY (DPDP Act 2025 Notice)
  // --------------------------------------------------------------------------
  page.drawRectangle({
    x: 40,
    y: 22,
    width: 515.28,
    height: 48,
    color: rgb(245 / 255, 240 / 255, 235 / 255),
    borderColor: cardBorder,
    borderWidth: 0.5,
  });

  page.drawText(
    "LEGAL NOTICE: This biodata document is protected under the Digital Personal Data Protection (DPDP) Act 2025.",
    {
      x: 48,
      y: 54,
      size: 7.5,
      font: helveticaBold,
      color: darkCharcoal,
    }
  );

  page.drawText(
    `Authorized Recipient: ${options.recipientPublicId} | Generated At: ${timestampStr} | Tracking Hash: ${auditId}`,
    {
      x: 48,
      y: 42,
      size: 7,
      font: helvetica,
      color: mutedText,
    }
  );

  page.drawText(
    "Any unauthorized dissemination, public sharing, or commercial use is strictly actionable under Indian law.",
    {
      x: 48,
      y: 30,
      size: 7,
      font: helveticaOblique,
      color: mutedText,
    }
  );

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
