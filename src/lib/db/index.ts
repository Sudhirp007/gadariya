import pg from "pg";
import fs from "fs";
import { encryptData, decryptData } from "../crypto/index.ts";
const { Pool } = pg;

// Global singleton pool across hot reloads AND serverless warm invocations
declare global {
  // eslint-disable-next-line no-var
  var __dbPool: pg.Pool | undefined;
}

function normalizeConnectionString(raw: string): string {
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  // Automatically switch Supabase Supavisor Session Mode (:5432, max 15 clients)
  // to Transaction Mode (:6543) to prevent EMAXCONNSESSION in serverless environments.
  if (cleaned.includes(".pooler.supabase.com:5432")) {
    return cleaned.replace(".pooler.supabase.com:5432", ".pooler.supabase.com:6543");
  }
  return cleaned;
}

function getConnectionString(): string {
  if (process.env.DATABASE_URL) return normalizeConnectionString(process.env.DATABASE_URL);
  try {
    if (fs.existsSync(".env.local")) {
      const lines = fs.readFileSync(".env.local", "utf-8").split("\n");
      for (const line of lines) {
        if (line.startsWith("DATABASE_URL=")) {
          return normalizeConnectionString(line.slice("DATABASE_URL=".length));
        }
      }
    }
  } catch {
    // ignore
  }
  return "postgresql://postgres:postgres@localhost:5432/postgres";
}

function getPool(): pg.Pool {
  if (globalThis.__dbPool) {
    return globalThis.__dbPool;
  }

  const connectionString = getConnectionString();

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
  });

  pool.on("error", (err) => {
    console.error("[DB Pool Idle Client Error]", err.message);
  });

  // Always cache globally (including in production!) so a single request or warm
  // serverless lambda never spawns multiple pg.Pool instances.
  globalThis.__dbPool = pool;

  return pool;
}

export const db = {
  async endPool() {
    if (globalThis.__dbPool) {
      await globalThis.__dbPool.end();
      globalThis.__dbPool = undefined;
    }
  },

  async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    const pool = getPool();
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === "development" && duration > 500) {
        console.warn(`[DB Slow Query] ${duration}ms: ${text.slice(0, 80)}`);
      }
      return res;
    } catch (err) {
      console.error(`[DB Query Error] ${text.slice(0, 80)}`, err);
      throw err;
    }
  },

  // --------------------------------------------------------------------------
  // USER OPERATIONS
  // --------------------------------------------------------------------------
  async findUserByPhoneHash(phoneHash: string) {
    const res = await this.query(
      `SELECT * FROM public.users WHERE phone_lookup_hash = $1 LIMIT 1;`,
      [phoneHash]
    );
    return res.rows[0] || null;
  },

  async createUser(user: {
    id?: string;
    email?: string;
    phoneEncrypted: string;
    phoneIv: string;
    phoneTag: string;
    phoneLookupHash: string;
  }) {
    const res = await this.query(
      `INSERT INTO public.users (
        id, email, phone_encrypted, phone_iv, phone_tag, phone_lookup_hash, status
      ) VALUES (
        COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, 'ACTIVE'
      ) RETURNING *;`,
      [
        user.id || null,
        user.email || null,
        user.phoneEncrypted,
        user.phoneIv,
        user.phoneTag,
        user.phoneLookupHash,
      ]
    );
    return res.rows[0];
  },

  // --------------------------------------------------------------------------
  // PROFILE OPERATIONS
  // --------------------------------------------------------------------------
  async getProfileByUserId(userId: string) {
    const res = await this.query(
      `SELECT * FROM public.profiles WHERE owner_user_id = $1 LIMIT 1;`,
      [userId]
    );
    return res.rows[0] || null;
  },

  async getProfileById(profileId: string) {
    const res = await this.query(
      `SELECT * FROM public.profiles WHERE id = $1 LIMIT 1;`,
      [profileId]
    );
    return res.rows[0] || null;
  },

  async getFullProfile(profileId: string) {
    const joinedRes = await this.query(
      `SELECT 
         p.*,
         pd.highest_education, pd.education_detail, pd.employed_in, pd.occupation,
         pd.annual_income_range, pd.mother_tongue, pd.diet, pd.about_me,
         fd.father_occupation, fd.mother_occupation, fd.brothers_count, fd.sisters_count,
         fd.family_type, fd.family_values, fd.family_location, fd.about_family,
         pp.min_age, pp.max_age, pp.min_height_cm, pp.max_height_cm,
         pp.marital_status_allowed, pp.preferred_states, pp.preferred_cities
       FROM public.profiles p
       LEFT JOIN public.profile_details pd ON p.id = pd.profile_id
       LEFT JOIN public.family_details fd ON p.id = fd.profile_id
       LEFT JOIN public.profile_preferences pp ON p.id = pp.profile_id
       WHERE p.id = $1
       LIMIT 1;`,
      [profileId]
    );
    const row = joinedRes.rows[0];
    if (!row) return null;

    const [photosRes, managersRes] = await Promise.all([
      this.query(
        `SELECT id, storage_key, visibility, moderation_status, is_primary,
                (image_data IS NOT NULL AND length(image_data) > 0) as has_image
         FROM public.profile_photos
         WHERE profile_id = $1
         ORDER BY is_primary DESC, created_at DESC;`,
        [profileId]
      ),
      this.query(
        `SELECT id, relation, status, can_edit_biodata, can_manage_preferences,
                can_send_interests, can_view_shortlists, can_disclose_contact, can_view_verification_docs,
                manager_phone_hash, created_at
         FROM public.profile_managers
         WHERE profile_id = $1 AND status <> 'REVOKED'
         ORDER BY created_at DESC;`,
        [profileId]
      ),
    ]);

    const age = Math.floor(
      (new Date().getTime() - new Date(row.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    return {
      id: row.id,
      publicId: row.public_id,
      userId: row.owner_user_id,
      managedBy: row.managed_by,
      firstName: row.first_name ?? "",
      gender: row.gender,
      dob: row.dob instanceof Date ? row.dob.toISOString().split("T")[0] : row.dob,
      age,
      heightCm: row.height_cm ?? null,
      maritalStatus: row.marital_status ?? "NEVER_MARRIED",
      country: row.country ?? "India",
      state: row.state ?? "",
      city: row.city ?? "",
      subCommunity: row.sub_community ?? "",
      publicationStatus: row.publication_status,
      isDiscoverable: row.is_discoverable ?? true,
      completionScore: row.completion_score ?? 20,
      // Details (normalized to empty string instead of undefined/null for safe UI state)
      highestEducation: row.highest_education ?? "",
      educationDetail: row.education_detail ?? "",
      employedIn: row.employed_in ?? "",
      occupation: row.occupation ?? "",
      annualIncomeRange: row.annual_income_range ?? "",
      motherTongue: row.mother_tongue || "Hindi",
      diet: row.diet ?? "",
      aboutMe: row.about_me ?? "",
      // Family
      fatherOccupation: row.father_occupation ?? "",
      motherOccupation: row.mother_occupation ?? "",
      brothersCount: row.brothers_count ?? 0,
      sistersCount: row.sisters_count ?? 0,
      familyType: row.family_type ?? "",
      familyValues: row.family_values ?? "",
      familyLocation: row.family_location ?? "",
      aboutFamily: row.about_family ?? "",
      // Preferences
      prefMinAge: row.min_age ?? 18,
      prefMaxAge: row.max_age ?? 70,
      prefMinHeightCm: row.min_height_cm ?? 120,
      prefMaxHeightCm: row.max_height_cm ?? 220,
      prefMaritalStatus: row.marital_status_allowed || ["NEVER_MARRIED"],
      prefStates: row.preferred_states || [],
      prefCities: row.preferred_cities || [],
      // Photos
      photos: photosRes.rows.map((r) => ({
        id: r.id,
        storageKey: r.storage_key,
        visibility: r.visibility,
        moderationStatus: r.moderation_status,
        isPrimary: r.is_primary,
        hasImage: !!r.has_image,
      })),
      // Managers
      managers: managersRes.rows.map((r) => ({
        id: r.id,
        relation: r.relation,
        status: r.status,
        permissions: {
          canEditBiodata: r.can_edit_biodata,
          canManagePreferences: r.can_manage_preferences,
          canSendInterests: r.can_send_interests,
          canViewShortlists: r.can_view_shortlists,
          canDiscloseContact: r.can_disclose_contact,
          canViewVerificationDocs: r.can_view_verification_docs,
        },
        createdAt: r.created_at,
      })),
    };
  },

  async updateFullProfile(
    profileId: string,
    updates: {
      firstName?: string;
      heightCm?: number | null;
      maritalStatus?: string;
      state?: string;
      city?: string;
      subCommunity?: string | null;
      isDiscoverable?: boolean;
      completionScore?: number;
      publicationStatus?: string;
      details?: {
        highestEducation?: string | null;
        educationDetail?: string | null;
        employedIn?: string | null;
        occupation?: string | null;
        annualIncomeRange?: string | null;
        motherTongue?: string | null;
        diet?: string | null;
        aboutMe?: string | null;
      };
      family?: {
        fatherOccupation?: string | null;
        motherOccupation?: string | null;
        brothersCount?: number;
        sistersCount?: number;
        familyType?: string | null;
        familyValues?: string | null;
        familyLocation?: string | null;
        aboutFamily?: string | null;
      };
      preferences?: {
        minAge?: number;
        maxAge?: number;
        minHeightCm?: number;
        maxHeightCm?: number;
        maritalStatusAllowed?: string[];
        preferredStates?: string[];
        preferredCities?: string[];
      };
    }
  ) {
    if (
      updates.firstName !== undefined ||
      updates.heightCm !== undefined ||
      updates.maritalStatus !== undefined ||
      updates.state !== undefined ||
      updates.city !== undefined ||
      updates.subCommunity !== undefined ||
      updates.isDiscoverable !== undefined ||
      updates.completionScore !== undefined ||
      updates.publicationStatus !== undefined
    ) {
      await this.query(
        `UPDATE public.profiles 
         SET first_name = COALESCE($2, first_name),
             height_cm = CASE WHEN $3::boolean THEN $4 ELSE height_cm END,
             marital_status = COALESCE($5, marital_status),
             state = COALESCE($6, state),
             city = COALESCE($7, city),
             sub_community = CASE WHEN $8::boolean THEN $9 ELSE sub_community END,
             is_discoverable = COALESCE($10, is_discoverable),
             completion_score = COALESCE($11, completion_score),
             publication_status = COALESCE($12, publication_status),
             updated_at = NOW()
         WHERE id = $1;`,
        [
          profileId,
          updates.firstName?.trim() || null,
          updates.heightCm !== undefined,
          updates.heightCm ?? null,
          updates.maritalStatus || null,
          updates.state?.trim() || null,
          updates.city?.trim() || null,
          updates.subCommunity !== undefined,
          updates.subCommunity?.trim() || null,
          updates.isDiscoverable ?? null,
          updates.completionScore ?? null,
          updates.publicationStatus || null,
        ]
      );
    }

    if (updates.details) {
      const d = updates.details;
      const validEmployed = ["PRIVATE", "GOVERNMENT", "BUSINESS", "DEFENCE", "NOT_WORKING", "OTHER"];
      const validDiet = ["VEGETARIAN", "NON_VEGETARIAN", "EGGETARIAN", "JAIN"];
      const normEmployed = d.employedIn && validEmployed.includes(d.employedIn) ? d.employedIn : null;
      const normDiet = d.diet && validDiet.includes(d.diet) ? d.diet : null;

      await this.query(
        `INSERT INTO public.profile_details (
          profile_id, highest_education, education_detail, employed_in, occupation,
          annual_income_range, mother_tongue, diet, about_me, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (profile_id) DO UPDATE SET
          highest_education = CASE WHEN $10::boolean THEN EXCLUDED.highest_education ELSE public.profile_details.highest_education END,
          education_detail = CASE WHEN $11::boolean THEN EXCLUDED.education_detail ELSE public.profile_details.education_detail END,
          employed_in = CASE WHEN $12::boolean THEN EXCLUDED.employed_in ELSE public.profile_details.employed_in END,
          occupation = CASE WHEN $13::boolean THEN EXCLUDED.occupation ELSE public.profile_details.occupation END,
          annual_income_range = CASE WHEN $14::boolean THEN EXCLUDED.annual_income_range ELSE public.profile_details.annual_income_range END,
          mother_tongue = COALESCE(EXCLUDED.mother_tongue, public.profile_details.mother_tongue),
          diet = CASE WHEN $15::boolean THEN EXCLUDED.diet ELSE public.profile_details.diet END,
          about_me = CASE WHEN $16::boolean THEN EXCLUDED.about_me ELSE public.profile_details.about_me END,
          updated_at = NOW();`,
        [
          profileId,
          d.highestEducation?.trim() || null,
          d.educationDetail?.trim() || null,
          normEmployed,
          d.occupation?.trim() || null,
          d.annualIncomeRange?.trim() || null,
          d.motherTongue?.trim() || "Hindi",
          normDiet,
          d.aboutMe?.trim() || null,
          d.highestEducation !== undefined,
          d.educationDetail !== undefined,
          d.employedIn !== undefined,
          d.occupation !== undefined,
          d.annualIncomeRange !== undefined,
          d.diet !== undefined,
          d.aboutMe !== undefined,
        ]
      );
    }

    if (updates.family) {
      const f = updates.family;
      const validFamilyType = ["NUCLEAR", "JOINT"];
      const validFamilyValues = ["TRADITIONAL", "MODERATE", "LIBERAL"];
      const normFamilyType = f.familyType && validFamilyType.includes(f.familyType) ? f.familyType : null;
      const normFamilyValues = f.familyValues && validFamilyValues.includes(f.familyValues) ? f.familyValues : null;

      await this.query(
        `INSERT INTO public.family_details (
          profile_id, father_occupation, mother_occupation, brothers_count, sisters_count,
          family_type, family_values, family_location, about_family, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (profile_id) DO UPDATE SET
          father_occupation = CASE WHEN $10::boolean THEN EXCLUDED.father_occupation ELSE public.family_details.father_occupation END,
          mother_occupation = CASE WHEN $11::boolean THEN EXCLUDED.mother_occupation ELSE public.family_details.mother_occupation END,
          brothers_count = COALESCE(EXCLUDED.brothers_count, public.family_details.brothers_count),
          sisters_count = COALESCE(EXCLUDED.sisters_count, public.family_details.sisters_count),
          family_type = CASE WHEN $12::boolean THEN EXCLUDED.family_type ELSE public.family_details.family_type END,
          family_values = CASE WHEN $13::boolean THEN EXCLUDED.family_values ELSE public.family_details.family_values END,
          family_location = CASE WHEN $14::boolean THEN EXCLUDED.family_location ELSE public.family_details.family_location END,
          about_family = CASE WHEN $15::boolean THEN EXCLUDED.about_family ELSE public.family_details.about_family END,
          updated_at = NOW();`,
        [
          profileId,
          f.fatherOccupation?.trim() || null,
          f.motherOccupation?.trim() || null,
          f.brothersCount ?? 0,
          f.sistersCount ?? 0,
          normFamilyType,
          normFamilyValues,
          f.familyLocation?.trim() || null,
          f.aboutFamily?.trim() || null,
          f.fatherOccupation !== undefined,
          f.motherOccupation !== undefined,
          f.familyType !== undefined,
          f.familyValues !== undefined,
          f.familyLocation !== undefined,
          f.aboutFamily !== undefined,
        ]
      );
    }

    if (updates.preferences) {
      const p = updates.preferences;
      const safeMinAge = Math.max(18, p.minAge || 18);
      const safeMaxAge = Math.max(safeMinAge, p.maxAge || 70);
      await this.query(
        `INSERT INTO public.profile_preferences (
          profile_id, min_age, max_age, min_height_cm, max_height_cm,
          marital_status_allowed, preferred_states, preferred_cities, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (profile_id) DO UPDATE SET
          min_age = COALESCE(EXCLUDED.min_age, public.profile_preferences.min_age),
          max_age = COALESCE(EXCLUDED.max_age, public.profile_preferences.max_age),
          min_height_cm = COALESCE(EXCLUDED.min_height_cm, public.profile_preferences.min_height_cm),
          max_height_cm = COALESCE(EXCLUDED.max_height_cm, public.profile_preferences.max_height_cm),
          marital_status_allowed = COALESCE(EXCLUDED.marital_status_allowed, public.profile_preferences.marital_status_allowed),
          preferred_states = COALESCE(EXCLUDED.preferred_states, public.profile_preferences.preferred_states),
          preferred_cities = COALESCE(EXCLUDED.preferred_cities, public.profile_preferences.preferred_cities),
          updated_at = NOW();`,
        [
          profileId,
          safeMinAge,
          safeMaxAge,
          p.minHeightCm || 120,
          p.maxHeightCm || 220,
          p.maritalStatusAllowed && p.maritalStatusAllowed.length > 0 ? p.maritalStatusAllowed : ["NEVER_MARRIED"],
          p.preferredStates || [],
          p.preferredCities || [],
        ]
      );
    }

    return this.getFullProfile(profileId);
  },

  // --------------------------------------------------------------------------
  // PHOTO OPERATIONS
  // --------------------------------------------------------------------------
  async addPhoto(data: {
    profileId: string;
    storageKey: string;
    visibility: "PUBLIC_TO_MEMBERS" | "BLURRED" | "APPROVAL_REQUIRED";
    isPrimary?: boolean;
    imageData?: string;
  }) {
    const existingCountRes = await this.query(
      `SELECT COUNT(*)::int as count FROM public.profile_photos WHERE profile_id = $1;`,
      [data.profileId]
    );
    const shouldBePrimary = data.isPrimary ?? (existingCountRes.rows[0]?.count === 0);

    if (shouldBePrimary) {
      await this.query(
        `UPDATE public.profile_photos SET is_primary = FALSE WHERE profile_id = $1;`,
        [data.profileId]
      );
    }

    const res = await this.query(
      `INSERT INTO public.profile_photos (
        profile_id, storage_key, visibility, moderation_status, is_primary, image_data
      ) VALUES ($1, $2, $3, 'PENDING', $4, $5)
      RETURNING id, profile_id, storage_key, visibility, moderation_status, is_primary, created_at,
                (image_data IS NOT NULL AND length(image_data) > 0) as has_image;`,
      [data.profileId, data.storageKey, data.visibility, shouldBePrimary, data.imageData || null]
    );
    return res.rows[0];
  },

  async getPhotoById(photoId: string) {
    const res = await this.query(
      `SELECT id, profile_id, storage_key, visibility, moderation_status, is_primary, image_data, created_at
       FROM public.profile_photos
       WHERE id = $1
       LIMIT 1;`,
      [photoId]
    );
    return res.rows[0] || null;
  },

  async updatePhoto(
    profileId: string,
    photoId: string,
    updates: {
      visibility?: "PUBLIC_TO_MEMBERS" | "BLURRED" | "APPROVAL_REQUIRED";
      isPrimary?: boolean;
    }
  ) {
    if (updates.isPrimary) {
      await this.query(
        `UPDATE public.profile_photos SET is_primary = FALSE WHERE profile_id = $1;`,
        [profileId]
      );
    }
    const res = await this.query(
      `UPDATE public.profile_photos
       SET visibility = COALESCE($3, visibility),
           is_primary = COALESCE($4, is_primary)
       WHERE id = $1 AND profile_id = $2
       RETURNING id, profile_id, storage_key, visibility, moderation_status, is_primary,
                 (image_data IS NOT NULL AND length(image_data) > 0) as has_image;`,
      [photoId, profileId, updates.visibility || null, updates.isPrimary ?? null]
    );
    return res.rows[0] || null;
  },

  async deletePhoto(profileId: string, photoId: string) {
    const res = await this.query(
      `DELETE FROM public.profile_photos WHERE id = $1 AND profile_id = $2 RETURNING id;`,
      [photoId, profileId]
    );
    return (res.rowCount ?? 0) > 0;
  },

  async getAdminPhotos(statusFilter: string = "PENDING") {
    const validStatuses = ["PENDING", "APPROVED", "REJECTED"];
    const useAll = statusFilter === "ALL" || !validStatuses.includes(statusFilter);
    const res = await this.query(
      `SELECT ph.id, ph.profile_id, ph.storage_key, ph.visibility, ph.moderation_status,
              ph.is_primary, ph.created_at,
              (ph.image_data IS NOT NULL AND length(ph.image_data) > 0) as has_image,
              p.public_id, p.first_name, p.gender, p.city, p.state
       FROM public.profile_photos ph
       JOIN public.profiles p ON ph.profile_id = p.id
       WHERE ($1::boolean OR ph.moderation_status = $2)
       ORDER BY ph.created_at DESC
       LIMIT 100;`,
      [useAll, statusFilter]
    );
    return res.rows;
  },

  async moderatePhoto(
    adminId: string,
    photoId: string,
    action: "APPROVED" | "REJECTED",
    notes?: string
  ) {
    const res = await this.query(
      `UPDATE public.profile_photos
       SET moderation_status = $1
       WHERE id = $2
       RETURNING id, profile_id, storage_key, visibility, moderation_status, is_primary;`,
      [action, photoId]
    );
    if (res.rows[0]) {
      await this.logAuditEvent({
        actorId: adminId,
        action: `ADMIN_PHOTO_${action}`,
        targetType: "PHOTO",
        targetId: photoId,
        metadata: { action, notes: notes || "", profileId: res.rows[0].profile_id },
      });
    }
    return res.rows[0] || null;
  },

  // --------------------------------------------------------------------------
  // FAMILY MANAGER OPERATIONS (Privacy Invariant C-06 Enforced)
  // --------------------------------------------------------------------------
  async addFamilyManager(data: {
    profileId: string;
    relation: string;
    managerPhoneHash: string;
    managerPhoneEncrypted?: string;
    managerPhoneIv?: string;
    managerPhoneTag?: string;
    canEditBiodata?: boolean;
    canManagePreferences?: boolean;
    canSendInterests?: boolean;
    canViewShortlists?: boolean;
  }) {
    // Explicit server-side enforcement: can_disclose_contact and can_view_verification_docs are ALWAYS FALSE
    const res = await this.query(
      `INSERT INTO public.profile_managers (
        profile_id, relation, manager_phone_hash, manager_phone_encrypted, manager_phone_iv, manager_phone_tag,
        can_edit_biodata, can_manage_preferences, can_send_interests, can_view_shortlists,
        can_disclose_contact, can_view_verification_docs, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, FALSE, 'ACTIVE'
      )
      ON CONFLICT (profile_id, manager_phone_hash) DO UPDATE SET
        relation = EXCLUDED.relation,
        can_edit_biodata = EXCLUDED.can_edit_biodata,
        can_manage_preferences = EXCLUDED.can_manage_preferences,
        can_send_interests = EXCLUDED.can_send_interests,
        can_view_shortlists = EXCLUDED.can_view_shortlists,
        status = 'ACTIVE',
        updated_at = NOW()
      RETURNING *;`,
      [
        data.profileId,
        data.relation,
        data.managerPhoneHash,
        data.managerPhoneEncrypted || null,
        data.managerPhoneIv || null,
        data.managerPhoneTag || null,
        data.canEditBiodata ?? true,
        data.canManagePreferences ?? true,
        data.canSendInterests ?? true,
        data.canViewShortlists ?? true,
      ]
    );
    return res.rows[0];
  },

  async revokeFamilyManager(profileId: string, managerId: string) {
    const res = await this.query(
      `UPDATE public.profile_managers 
       SET status = 'REVOKED', updated_at = NOW() 
       WHERE id = $1 AND profile_id = $2 
       RETURNING *;`,
      [managerId, profileId]
    );
    return res.rows[0] || null;
  },

  // --------------------------------------------------------------------------
  // VERIFICATION OPERATIONS (Milestone M4)
  // --------------------------------------------------------------------------
  async getProfileVerifications(profileId: string) {
    const res = await this.query(
      `SELECT * FROM public.verification_requests 
       WHERE profile_id = $1 
       ORDER BY created_at DESC;`,
      [profileId]
    );
    return res.rows;
  },

  async submitVerificationRequest(data: {
    profileId: string;
    verificationType: "MOBILE_OTP" | "SELFIE" | "ADMIN_MANUAL" | "OPTIONAL_ID";
    selfieStorageKey?: string;
    selfieImageData?: string;
  }) {
    const existing = await this.query(
      `SELECT id FROM public.verification_requests 
       WHERE profile_id = $1 AND verification_type = $2 
       LIMIT 1;`,
      [data.profileId, data.verificationType]
    );

    if (existing.rows.length > 0) {
      const res = await this.query(
        `UPDATE public.verification_requests 
         SET status = 'PENDING',
             selfie_storage_key = COALESCE($2, selfie_storage_key),
             selfie_image_data = COALESCE($3, selfie_image_data),
             reviewed_by = NULL,
             reviewer_notes = NULL,
             verified_at = NULL,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, profile_id, verification_type, status, selfie_storage_key, created_at, updated_at;`,
        [existing.rows[0].id, data.selfieStorageKey || null, data.selfieImageData || null]
      );
      return res.rows[0];
    } else {
      const res = await this.query(
        `INSERT INTO public.verification_requests (
          profile_id, verification_type, status, selfie_storage_key, selfie_image_data
        ) VALUES ($1, $2, 'PENDING', $3, $4)
        RETURNING id, profile_id, verification_type, status, selfie_storage_key, created_at, updated_at;`,
        [data.profileId, data.verificationType, data.selfieStorageKey || null, data.selfieImageData || null]
      );
      return res.rows[0];
    }
  },

  async getVerificationBadges(profileId: string) {
    const [profileRes, verifsRes] = await Promise.all([
      this.query(`SELECT publication_status, owner_user_id, updated_at FROM public.profiles WHERE id = $1;`, [profileId]),
      this.query(`SELECT verification_type, status, verified_at FROM public.verification_requests WHERE profile_id = $1;`, [profileId]),
    ]);

    const profile = profileRes.rows[0];
    const verifs = verifsRes.rows;

    const selfieApproved = verifs.find((v) => v.verification_type === "SELFIE" && v.status === "APPROVED");
    const selfiePending = verifs.find((v) => v.verification_type === "SELFIE" && v.status === "PENDING");
    const mobileApproved = verifs.find((v) => v.verification_type === "MOBILE_OTP" && v.status === "APPROVED");

    const badges = [
      {
        type: "MOBILE_OTP",
        label: "Mobile Verified",
        verified: true, // Every registered member has verified mobile OTP
        timestamp: mobileApproved?.verified_at || new Date().toISOString(),
        description: "Mobile number verified via secure OTP",
      },
      {
        type: "SELFIE",
        label: "Selfie Verified",
        verified: !!selfieApproved,
        pending: !!selfiePending,
        timestamp: selfieApproved?.verified_at || null,
        description: "Photo verified by moderator against live selfie",
      },
      {
        type: "ADMIN_REVIEWED",
        label: "Admin Reviewed",
        verified: profile?.publication_status === "PUBLISHED",
        pending: profile?.publication_status === "PENDING_REVIEW",
        timestamp: profile?.publication_status === "PUBLISHED" ? profile?.updated_at : null,
        description: "Community declaration and profile data reviewed by administration",
      },
      {
        type: "OPTIONAL_ID",
        label: "Government ID",
        verified: false,
        available: true,
        description: "Voluntary identity trust check (Aadhaar never mandatory)",
      },
    ];

    return {
      profileId,
      publicationStatus: profile?.publication_status,
      badges,
    };
  },

  // --------------------------------------------------------------------------
  // DISCOVERY & SEARCH (Milestone M5 - Privacy-First Sanitized Projection)
  // --------------------------------------------------------------------------
  async searchDiscoveryProfiles(filters: {
    gender?: string;
    minAge?: number;
    maxAge?: number;
    state?: string;
    city?: string;
    subCommunity?: string;
    highestEducation?: string;
    excludeProfileId?: string;
  }) {
    let sql = `
      SELECT 
        dp.id, dp.public_id, dp.first_name, dp.gender, dp.age, dp.height_cm,
        dp.marital_status, dp.country, dp.state, dp.city, dp.sub_community,
        dp.completion_score, dp.highest_education, dp.employed_in, dp.occupation, dp.diet,
        (SELECT id FROM public.profile_photos WHERE profile_id = dp.id AND moderation_status = 'APPROVED' AND image_data IS NOT NULL ORDER BY is_primary DESC, created_at DESC LIMIT 1) as photo_id,
        (SELECT storage_key FROM public.profile_photos WHERE profile_id = dp.id AND visibility = 'PUBLIC_TO_MEMBERS' AND moderation_status = 'APPROVED' ORDER BY is_primary DESC, created_at DESC LIMIT 1) as photo_key,
        (SELECT visibility FROM public.profile_photos WHERE profile_id = dp.id AND moderation_status = 'APPROVED' ORDER BY is_primary DESC, created_at DESC LIMIT 1) as photo_visibility,
        (SELECT status = 'APPROVED' FROM public.verification_requests WHERE profile_id = dp.id AND verification_type = 'SELFIE' LIMIT 1) as selfie_verified
      FROM public.discovery_profiles dp
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.excludeProfileId) {
      sql += ` AND dp.id <> $${paramIndex++}`;
      params.push(filters.excludeProfileId);
    }
    if (filters.gender) {
      sql += ` AND dp.gender = $${paramIndex++}`;
      params.push(filters.gender);
    }
    if (filters.minAge !== undefined && !Number.isNaN(filters.minAge)) {
      sql += ` AND dp.age >= $${paramIndex++}`;
      params.push(filters.minAge);
    }
    if (filters.maxAge !== undefined && !Number.isNaN(filters.maxAge)) {
      sql += ` AND dp.age <= $${paramIndex++}`;
      params.push(filters.maxAge);
    }
    if (filters.state) {
      sql += ` AND dp.state ILIKE $${paramIndex++}`;
      params.push(`%${filters.state}%`);
    }
    if (filters.city) {
      sql += ` AND dp.city ILIKE $${paramIndex++}`;
      params.push(`%${filters.city}%`);
    }
    if (filters.subCommunity) {
      sql += ` AND dp.sub_community ILIKE $${paramIndex++}`;
      params.push(`%${filters.subCommunity}%`);
    }
    if (filters.highestEducation) {
      sql += ` AND dp.highest_education ILIKE $${paramIndex++}`;
      params.push(`%${filters.highestEducation}%`);
    }

    sql += ` ORDER BY dp.completion_score DESC, dp.created_at DESC LIMIT 50;`;

    const res = await this.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      publicId: r.public_id,
      firstName: r.first_name,
      gender: r.gender,
      age: r.age,
      heightCm: r.height_cm,
      maritalStatus: r.marital_status,
      state: r.state,
      city: r.city,
      subCommunity: r.sub_community,
      completionScore: r.completion_score,
      highestEducation: r.highest_education,
      employedIn: r.employed_in,
      occupation: r.occupation,
      diet: r.diet,
      photoId: r.photo_id || null,
      photoKey: r.photo_key,
      photoVisibility: r.photo_visibility || "APPROVAL_REQUIRED",
      selfieVerified: !!r.selfie_verified,
    }));
  },

  async getPublicProfileByPublicId(publicId: string, viewerProfileId?: string) {
    const pRes = await this.query(
      `SELECT 
         p.*,
         pd.highest_education, pd.education_detail, pd.employed_in, pd.occupation,
         pd.annual_income_range, pd.mother_tongue, pd.diet, pd.about_me,
         fd.father_occupation, fd.mother_occupation, fd.family_type, fd.family_values, fd.about_family,
         pp.min_age, pp.max_age, pp.preferred_states
       FROM public.profiles p
       LEFT JOIN public.profile_details pd ON p.id = pd.profile_id
       LEFT JOIN public.family_details fd ON p.id = fd.profile_id
       LEFT JOIN public.profile_preferences pp ON p.id = pp.profile_id
       WHERE p.public_id = $1 AND p.publication_status = 'PUBLISHED'
       LIMIT 1;`,
      [publicId]
    );
    const row = pRes.rows[0];
    if (!row) return null;

    const [photosRes, badgesRes, interestRes, contactRes, biodataShareRes] = await Promise.all([
      this.query(
        `SELECT id, storage_key, visibility, is_primary,
                (image_data IS NOT NULL AND length(image_data) > 0) as has_image
         FROM public.profile_photos
         WHERE profile_id = $1 AND moderation_status = 'APPROVED'
         ORDER BY is_primary DESC, created_at DESC;`,
        [row.id]
      ),
      this.getVerificationBadges(row.id),
      viewerProfileId
        ? this.query(
            `SELECT * FROM public.interests WHERE (sender_profile_id = $1 AND receiver_profile_id = $2) OR (sender_profile_id = $2 AND receiver_profile_id = $1) LIMIT 1;`,
            [viewerProfileId, row.id]
          )
        : { rows: [] },
      viewerProfileId
        ? this.query(
            `SELECT * FROM public.contact_exchange_requests WHERE (sender_profile_id = $1 AND receiver_profile_id = $2) OR (sender_profile_id = $2 AND receiver_profile_id = $1) LIMIT 1;`,
            [viewerProfileId, row.id]
          )
        : { rows: [] },
      viewerProfileId
        ? this.query(
            `SELECT * FROM public.biodata_shares WHERE owner_profile_id = $1 AND requester_profile_id = $2 LIMIT 1;`,
            [row.id, viewerProfileId]
          )
        : { rows: [] },
    ]);

    const age = Math.floor(
      (new Date().getTime() - new Date(row.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    return {
      id: row.id,
      publicId: row.public_id,
      firstName: row.first_name,
      gender: row.gender,
      age,
      heightCm: row.height_cm,
      maritalStatus: row.marital_status,
      state: row.state,
      city: row.city,
      subCommunity: row.sub_community,
      completionScore: row.completion_score,
      highestEducation: row.highest_education,
      educationDetail: row.education_detail,
      employedIn: row.employed_in,
      occupation: row.occupation,
      annualIncomeRange: row.annual_income_range,
      motherTongue: row.mother_tongue,
      diet: row.diet,
      aboutMe: row.about_me,
      fatherOccupation: row.father_occupation,
      motherOccupation: row.mother_occupation,
      familyType: row.family_type,
      familyValues: row.family_values,
      aboutFamily: row.about_family,
      prefMinAge: row.min_age,
      prefMaxAge: row.max_age,
      prefStates: row.preferred_states,
      photos: photosRes.rows.map((p) => ({
        id: p.id,
        storageKey: p.storage_key,
        visibility: p.visibility,
        isPrimary: p.is_primary,
        hasImage: !!p.has_image,
      })),
      badges: badgesRes.badges,
      relationshipState: {
        interest: interestRes.rows[0] || null,
        contactExchange: contactRes.rows[0] || null,
        biodataShare: biodataShareRes.rows[0] || null,
      },
    };
  },

  // --------------------------------------------------------------------------
  // INTERESTS & SHORTLISTS (Milestone M5)
  // --------------------------------------------------------------------------
  async sendInterest(senderProfileId: string, receiverProfileId: string) {
    if (senderProfileId === receiverProfileId) {
      throw new Error("Cannot send interest to yourself");
    }
    const res = await this.query(
      `INSERT INTO public.interests (sender_profile_id, receiver_profile_id, status)
       VALUES ($1, $2, 'SENT')
       ON CONFLICT (sender_profile_id, receiver_profile_id) DO UPDATE SET
         status = 'SENT', updated_at = NOW()
       RETURNING *;`,
      [senderProfileId, receiverProfileId]
    );
    await this.logAuditEvent({
      actorId: senderProfileId,
      action: "INTEREST_SENT",
      targetType: "PROFILE",
      targetId: receiverProfileId,
    });
    return res.rows[0];
  },

  async respondInterest(interestId: string, receiverProfileId: string, status: "ACCEPTED" | "DECLINED") {
    const res = await this.query(
      `UPDATE public.interests 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND receiver_profile_id = $3
       RETURNING *;`,
      [status, interestId, receiverProfileId]
    );
    if (res.rows[0]) {
      await this.logAuditEvent({
        actorId: receiverProfileId,
        action: `INTEREST_${status}`,
        targetType: "INTEREST",
        targetId: interestId,
      });
    }
    return res.rows[0] || null;
  },

  async getInterestsForProfile(profileId: string) {
    const [receivedRes, sentRes] = await Promise.all([
      this.query(
        `SELECT i.*, p.public_id, p.first_name, p.gender, p.state, p.city,
                pd.highest_education, pd.occupation
         FROM public.interests i
         JOIN public.profiles p ON i.sender_profile_id = p.id
         LEFT JOIN public.profile_details pd ON p.id = pd.profile_id
         WHERE i.receiver_profile_id = $1
         ORDER BY i.created_at DESC;`,
        [profileId]
      ),
      this.query(
        `SELECT i.*, p.public_id, p.first_name, p.gender, p.state, p.city,
                pd.highest_education, pd.occupation
         FROM public.interests i
         JOIN public.profiles p ON i.receiver_profile_id = p.id
         LEFT JOIN public.profile_details pd ON p.id = pd.profile_id
         WHERE i.sender_profile_id = $1
         ORDER BY i.created_at DESC;`,
        [profileId]
      ),
    ]);

    return {
      received: receivedRes.rows,
      sent: sentRes.rows,
    };
  },

  async toggleShortlist(profileId: string, targetProfileId: string) {
    if (profileId === targetProfileId) throw new Error("Cannot shortlist yourself");
    const existing = await this.query(
      `SELECT id FROM public.shortlists WHERE profile_id = $1 AND shortlisted_profile_id = $2;`,
      [profileId, targetProfileId]
    );
    if (existing.rows.length > 0) {
      await this.query(`DELETE FROM public.shortlists WHERE id = $1;`, [existing.rows[0].id]);
      return { shortlisted: false };
    } else {
      await this.query(
        `INSERT INTO public.shortlists (profile_id, shortlisted_profile_id) VALUES ($1, $2);`,
        [profileId, targetProfileId]
      );
      return { shortlisted: true };
    }
  },

  async getShortlistsForProfile(profileId: string) {
    const res = await this.query(
      `SELECT s.id as shortlist_id, s.created_at as shortlisted_at,
              p.id, p.public_id, p.first_name, p.gender, p.state, p.city,
              pd.highest_education, pd.occupation
       FROM public.shortlists s
       JOIN public.profiles p ON s.shortlisted_profile_id = p.id
       LEFT JOIN public.profile_details pd ON p.id = pd.profile_id
       WHERE s.profile_id = $1
       ORDER BY s.created_at DESC;`,
      [profileId]
    );
    return res.rows;
  },

  // --------------------------------------------------------------------------
  // DUAL-APPROVAL BILATERAL CONTACT EXCHANGE STATE MACHINE (Milestone M5)
  // --------------------------------------------------------------------------
  async initiateContactExchange(
    senderProfileId: string,
    receiverProfileId: string,
    disclosePhone = true,
    discloseEmail = false
  ) {
    if (senderProfileId === receiverProfileId) throw new Error("Cannot exchange contact with yourself");

    const res = await this.query(
      `INSERT INTO public.contact_exchange_requests (
        sender_profile_id, receiver_profile_id, status,
        sender_disclose_phone, sender_disclose_email, sender_approved_at
      ) VALUES ($1, $2, 'SENDER_APPROVED', $3, $4, NOW())
      ON CONFLICT (sender_profile_id, receiver_profile_id) DO UPDATE SET
        status = 'SENDER_APPROVED',
        sender_disclose_phone = EXCLUDED.sender_disclose_phone,
        sender_disclose_email = EXCLUDED.sender_disclose_email,
        sender_approved_at = NOW(),
        updated_at = NOW()
      RETURNING *;`,
      [senderProfileId, receiverProfileId, disclosePhone, discloseEmail]
    );

    await this.logAuditEvent({
      actorId: senderProfileId,
      action: "CONTACT_EXCHANGE_INITIATED",
      targetType: "PROFILE",
      targetId: receiverProfileId,
      metadata: { disclosePhone, discloseEmail },
    });

    return res.rows[0];
  },

  async respondContactExchange(
    requestId: string,
    respondingProfileId: string,
    action: "APPROVE" | "REJECT" | "WITHDRAW",
    disclosePhone = true,
    discloseEmail = false
  ) {
    const reqRes = await this.query(
      `SELECT * FROM public.contact_exchange_requests WHERE id = $1;`,
      [requestId]
    );
    const request = reqRes.rows[0];
    if (!request) return null;

    let newStatus = request.status;
    let receiverApprovedAt = request.receiver_approved_at;
    let disclosedAt = request.disclosed_at;

    if (action === "REJECT") {
      newStatus = "REJECTED";
    } else if (action === "WITHDRAW") {
      newStatus = "WITHDRAWN";
    } else if (action === "APPROVE") {
      if (request.receiver_profile_id === respondingProfileId) {
        newStatus = "BOTH_APPROVED";
        receiverApprovedAt = new Date();
        disclosedAt = new Date();
      }
    }

    const res = await this.query(
      `UPDATE public.contact_exchange_requests 
       SET status = $1,
           receiver_disclose_phone = $2,
           receiver_disclose_email = $3,
           receiver_approved_at = COALESCE($4, receiver_approved_at),
           disclosed_at = COALESCE($5, disclosed_at),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *;`,
      [newStatus, disclosePhone, discloseEmail, receiverApprovedAt, disclosedAt, requestId]
    );

    await this.logAuditEvent({
      actorId: respondingProfileId,
      action: `CONTACT_EXCHANGE_${newStatus}`,
      targetType: "CONTACT_EXCHANGE_REQUEST",
      targetId: requestId,
      metadata: { newStatus, action },
    });

    return res.rows[0];
  },

  async getDisclosedContact(requestId: string, viewerProfileId: string) {
    const reqRes = await this.query(
      `SELECT * FROM public.contact_exchange_requests 
       WHERE id = $1 AND (sender_profile_id = $2 OR receiver_profile_id = $2)
       LIMIT 1;`,
      [requestId, viewerProfileId]
    );
    const request = reqRes.rows[0];
    if (!request) throw new Error("Contact exchange request not found");

    if (request.status !== "BOTH_APPROVED") {
      throw new Error(
        "PRIVACY VIOLATION: Contact information is hidden until bilateral mutual approval (BOTH_APPROVED)."
      );
    }

    const isViewerSender = request.sender_profile_id === viewerProfileId;
    const targetProfileId = isViewerSender ? request.receiver_profile_id : request.sender_profile_id;
    const canViewPhone = isViewerSender ? request.receiver_disclose_phone : request.sender_disclose_phone;
    const canViewEmail = isViewerSender ? request.receiver_disclose_email : request.sender_disclose_email;

    const targetRes = await this.query(
      `SELECT u.phone_encrypted, u.phone_iv, u.phone_tag, u.email, p.first_name, p.public_id
       FROM public.profiles p
       JOIN public.users u ON p.owner_user_id = u.id
       WHERE p.id = $1;`,
      [targetProfileId]
    );
    const target = targetRes.rows[0];
    if (!target) throw new Error("Target user record not found");

    // Dynamic decryption using decryptData
    let decryptedPhone: string | null = null;
    if (canViewPhone && target.phone_encrypted && target.phone_iv && target.phone_tag) {
      try {
        const raw = decryptData(target.phone_encrypted, target.phone_iv, target.phone_tag);
        decryptedPhone = raw.startsWith("google:") ? null : raw;
      } catch {
        decryptedPhone = null;
      }
    }

    await this.logAuditEvent({
      actorId: viewerProfileId,
      action: "CONTACT_DISCLOSED_VIEWED",
      targetType: "PROFILE",
      targetId: targetProfileId,
      metadata: { requestId, dualApprovalVerified: true },
    });

    return {
      publicId: target.public_id,
      firstName: target.first_name,
      phone: canViewPhone ? decryptedPhone : null,
      email: canViewEmail ? target.email : null,
      disclosedAt: request.disclosed_at,
    };
  },

  async getUserContactRequests(profileId: string) {
    const res = await this.query(
      `SELECT c.*,
              sp.public_id as sender_public_id, sp.first_name as sender_name,
              rp.public_id as receiver_public_id, rp.first_name as receiver_name
       FROM public.contact_exchange_requests c
       JOIN public.profiles sp ON c.sender_profile_id = sp.id
       JOIN public.profiles rp ON c.receiver_profile_id = rp.id
       WHERE c.sender_profile_id = $1 OR c.receiver_profile_id = $1
       ORDER BY c.updated_at DESC;`,
      [profileId]
    );
    return res.rows;
  },

  // --------------------------------------------------------------------------
  // BIODATA SHARES & PHOTO ACCESS (Milestone M6 - Privacy Controls)
  // --------------------------------------------------------------------------
  async requestBiodataShare(ownerProfileId: string, requesterProfileId: string) {
    if (ownerProfileId === requesterProfileId) {
      throw new Error("Cannot request biodata share with yourself");
    }

    const res = await this.query(
      `INSERT INTO public.biodata_shares (
        owner_profile_id, requester_profile_id, status, updated_at
      ) VALUES ($1, $2, 'REQUESTED', NOW())
      ON CONFLICT (owner_profile_id, requester_profile_id)
      DO UPDATE SET status = 'REQUESTED', updated_at = NOW()
      RETURNING *;`,
      [ownerProfileId, requesterProfileId]
    );

    await this.logAuditEvent({
      actorId: requesterProfileId,
      action: "BIODATA_SHARE_REQUESTED",
      targetType: "PROFILE",
      targetId: ownerProfileId,
      metadata: { shareId: res.rows[0].id },
    });

    return res.rows[0];
  },

  async respondBiodataShare(
    shareId: string,
    ownerProfileId: string,
    action: "APPROVE" | "DECLINE" | "REVOKE"
  ) {
    const existingRes = await this.query(
      `SELECT * FROM public.biodata_shares WHERE id = $1 AND owner_profile_id = $2;`,
      [shareId, ownerProfileId]
    );
    if (!existingRes.rows[0]) {
      throw new Error("Biodata share request not found or unauthorized");
    }

    let newStatus = "REQUESTED";
    let expiresAt: Date | null = null;

    if (action === "APPROVE") {
      newStatus = "APPROVED";
      // 30 days validity
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (action === "DECLINE") {
      newStatus = "DECLINED";
    } else if (action === "REVOKE") {
      newStatus = "REVOKED";
    }

    const res = await this.query(
      `UPDATE public.biodata_shares
       SET status = $1, expires_at = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *;`,
      [newStatus, expiresAt, shareId]
    );

    await this.logAuditEvent({
      actorId: ownerProfileId,
      action: `BIODATA_SHARE_${action}`,
      targetType: "BIODATA_SHARE",
      targetId: shareId,
      metadata: { newStatus, expiresAt },
    });

    return res.rows[0];
  },

  async getBiodataShares(profileId: string) {
    const [incomingRes, outgoingRes] = await Promise.all([
      this.query(
        `SELECT bs.*, 
                rp.public_id as requester_public_id, rp.first_name as requester_name,
                rp.gender as requester_gender, rp.state as requester_state
         FROM public.biodata_shares bs
         JOIN public.profiles rp ON bs.requester_profile_id = rp.id
         WHERE bs.owner_profile_id = $1
         ORDER BY bs.updated_at DESC;`,
        [profileId]
      ),
      this.query(
        `SELECT bs.*, 
                op.public_id as owner_public_id, op.first_name as owner_name,
                op.gender as owner_gender, op.state as owner_state
         FROM public.biodata_shares bs
         JOIN public.profiles op ON bs.owner_profile_id = op.id
         WHERE bs.requester_profile_id = $1
         ORDER BY bs.updated_at DESC;`,
        [profileId]
      ),
    ]);

    return {
      incoming: incomingRes.rows,
      outgoing: outgoingRes.rows,
    };
  },

  async checkBiodataAccess(ownerProfileId: string, requesterProfileId: string): Promise<boolean> {
    if (ownerProfileId === requesterProfileId) return true;
    const res = await this.query(
      `SELECT 1 FROM public.biodata_shares 
       WHERE owner_profile_id = $1 AND requester_profile_id = $2 
         AND status = 'APPROVED' 
         AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1;`,
      [ownerProfileId, requesterProfileId]
    );
    return res.rows.length > 0;
  },

  // --------------------------------------------------------------------------
  // DPDP ACT 2025 CONSENT & RIGHT TO BE FORGOTTEN (Milestone M6)
  // --------------------------------------------------------------------------
  async getConsentRecords(userId: string) {
    const res = await this.query(
      `SELECT id, consent_purpose, granted, policy_version, timestamp, withdrawn_at
       FROM public.consent_records
       WHERE user_id = $1
       ORDER BY timestamp DESC;`,
      [userId]
    );
    return res.rows;
  },

  async withdrawConsent(userId: string, consentPurpose: string) {
    const res = await this.query(
      `UPDATE public.consent_records
       SET granted = FALSE, withdrawn_at = NOW()
       WHERE user_id = $1 AND consent_purpose = $2
       RETURNING *;`,
      [userId, consentPurpose]
    );

    await this.logAuditEvent({
      actorId: userId,
      action: "CONSENT_WITHDRAWN",
      targetType: "USER",
      targetId: userId,
      metadata: { consentPurpose },
    });

    return res.rows;
  },

  async requestAccountDeletion(userId: string, reason?: string) {
    await this.query(
      `UPDATE public.users SET status = 'SUSPENDED' WHERE id = $1;`,
      [userId]
    );

    const profRes = await this.query(
      `UPDATE public.profiles 
       SET publication_status = 'SUSPENDED', is_discoverable = FALSE, updated_at = NOW()
       WHERE owner_user_id = $1
       RETURNING id;`,
      [userId]
    );

    const profileId = profRes.rows[0]?.id;

    if (profileId) {
      await this.query(
        `UPDATE public.biodata_shares 
         SET status = 'REVOKED', updated_at = NOW()
         WHERE owner_profile_id = $1 OR requester_profile_id = $1;`,
        [profileId]
      );
    }

    await this.logAuditEvent({
      actorId: userId,
      action: "DPDP_ACCOUNT_DELETION_REQUESTED",
      targetType: "USER",
      targetId: userId,
      metadata: {
        reason: reason || "User initiated DPDP right to be forgotten",
        retentionWindowDays: 30,
        requestedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      retentionDays: 30,
      profileArchived: !!profileId,
      notice: "Account scheduled for permanent erasure following 30-day statutory retention window.",
    };
  },

  // --------------------------------------------------------------------------
  // IN-APP ENCRYPTED MESSAGING & SAFETY (Milestone M7)
  // --------------------------------------------------------------------------
  async isBlocked(profileId1: string, profileId2: string): Promise<boolean> {
    const res = await this.query(
      `SELECT 1 FROM public.blocks 
       WHERE (blocker_profile_id = $1 AND blocked_profile_id = $2)
          OR (blocker_profile_id = $2 AND blocked_profile_id = $1)
       LIMIT 1;`,
      [profileId1, profileId2]
    );
    return res.rows.length > 0;
  },

  async blockProfile(blockerProfileId: string, blockedProfileId: string) {
    if (blockerProfileId === blockedProfileId) throw new Error("Cannot block yourself");

    await this.query(
      `INSERT INTO public.blocks (blocker_profile_id, blocked_profile_id)
       VALUES ($1, $2)
       ON CONFLICT (blocker_profile_id, blocked_profile_id) DO NOTHING;`,
      [blockerProfileId, blockedProfileId]
    );

    await this.logAuditEvent({
      actorId: blockerProfileId,
      action: "PROFILE_BLOCKED",
      targetType: "PROFILE",
      targetId: blockedProfileId,
    });

    return { success: true };
  },

  async unblockProfile(blockerProfileId: string, blockedProfileId: string) {
    await this.query(
      `DELETE FROM public.blocks 
       WHERE blocker_profile_id = $1 AND blocked_profile_id = $2;`,
      [blockerProfileId, blockedProfileId]
    );

    await this.logAuditEvent({
      actorId: blockerProfileId,
      action: "PROFILE_UNBLOCKED",
      targetType: "PROFILE",
      targetId: blockedProfileId,
    });

    return { success: true };
  },

  async reportProfile(reporterProfileId: string, reportedProfileId: string, category: string, details?: string) {
    if (reporterProfileId === reportedProfileId) throw new Error("Cannot report yourself");

    const validCategories = [
      "FAKE_PROFILE",
      "HARASSMENT",
      "INAPPROPRIATE_CONTENT",
      "COMMERCIAL_SPAM",
      "UNDERAGE",
      "OTHER",
    ];

    if (!validCategories.includes(category)) {
      throw new Error(`Invalid report category: ${category}`);
    }

    const res = await this.query(
      `INSERT INTO public.reports (
        reporter_profile_id, reported_profile_id, category, details, status
      ) VALUES ($1, $2, $3, $4, 'PENDING')
      RETURNING *;`,
      [reporterProfileId, reportedProfileId, category, details || null]
    );

    await this.logAuditEvent({
      actorId: reporterProfileId,
      action: "PROFILE_REPORTED",
      targetType: "REPORT",
      targetId: res.rows[0].id,
      metadata: { category, reportedProfileId },
    });

    return res.rows[0];
  },

  async sendMessage(senderProfileId: string, receiverProfileId: string, plainText: string) {
    if (senderProfileId === receiverProfileId) throw new Error("Cannot message yourself");
    if (!plainText || !plainText.trim()) throw new Error("Message body cannot be empty");

    // 1. Invariant: Check if either party blocked the other
    const blocked = await this.isBlocked(senderProfileId, receiverProfileId);
    if (blocked) {
      throw new Error("Cannot send message: Communication is restricted between these profiles.");
    }

    // 2. Invariant: Check if mutual interest accepted (both approved)
    const mutualRes = await this.query(
      `SELECT status FROM public.interests 
       WHERE ((sender_profile_id = $1 AND receiver_profile_id = $2)
          OR (sender_profile_id = $2 AND receiver_profile_id = $1))
         AND status = 'ACCEPTED'
       LIMIT 1;`,
      [senderProfileId, receiverProfileId]
    );

    if (mutualRes.rows.length === 0) {
      throw new Error(
        "PRIVACY VIOLATION: In-app messaging is unlocked ONLY after mutual interest acceptance."
      );
    }

    // 3. Encrypt message at rest using AES-256-GCM
    const encrypted = encryptData(plainText.trim());

    const res = await this.query(
      `INSERT INTO public.messages (
        sender_profile_id, receiver_profile_id, encrypted_body, iv, tag
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, sender_profile_id, receiver_profile_id, created_at, read_at;`,
      [senderProfileId, receiverProfileId, encrypted.ciphertext, encrypted.iv, encrypted.tag]
    );

    await this.logAuditEvent({
      actorId: senderProfileId,
      action: "MESSAGE_SENT",
      targetType: "PROFILE",
      targetId: receiverProfileId,
      metadata: { messageId: res.rows[0].id },
    });

    return {
      id: res.rows[0].id,
      senderProfileId: res.rows[0].sender_profile_id,
      receiverProfileId: res.rows[0].receiver_profile_id,
      body: plainText.trim(),
      createdAt: res.rows[0].created_at,
      readAt: res.rows[0].read_at,
    };
  },

  async getMessages(profileId1: string, profileId2: string) {
    const res = await this.query(
      `SELECT id, sender_profile_id, receiver_profile_id, encrypted_body, iv, tag, read_at, created_at
       FROM public.messages
       WHERE (sender_profile_id = $1 AND receiver_profile_id = $2)
          OR (sender_profile_id = $2 AND receiver_profile_id = $1)
       ORDER BY created_at ASC;`,
      [profileId1, profileId2]
    );

    return res.rows.map((r) => {
      let decryptedText = "[Encrypted Content]";
      try {
        decryptedText = decryptData(r.encrypted_body, r.iv, r.tag);
      } catch {
        decryptedText = "[Error decrypting message]";
      }
      return {
        id: r.id,
        senderProfileId: r.sender_profile_id,
        receiverProfileId: r.receiver_profile_id,
        body: decryptedText,
        readAt: r.read_at,
        createdAt: r.created_at,
      };
    });
  },

  async markMessagesAsRead(viewerProfileId: string, partnerProfileId: string) {
    const res = await this.query(
      `UPDATE public.messages
       SET read_at = NOW()
       WHERE receiver_profile_id = $1 AND sender_profile_id = $2 AND read_at IS NULL
       RETURNING id;`,
      [viewerProfileId, partnerProfileId]
    );
    return { markedCount: res.rows.length };
  },

  async getConversationsList(profileId: string) {
    const partnersRes = await this.query(
      `SELECT DISTINCT
         CASE WHEN i.sender_profile_id = $1 THEN i.receiver_profile_id ELSE i.sender_profile_id END AS partner_id
       FROM public.interests i
       WHERE (i.sender_profile_id = $1 OR i.receiver_profile_id = $1)
         AND i.status = 'ACCEPTED';`,
      [profileId]
    );

    const conversations = [];

    for (const row of partnersRes.rows) {
      const partnerId = row.partner_id;
      const blocked = await this.isBlocked(profileId, partnerId);

      const [pRes, lastMsgRes, unreadRes] = await Promise.all([
        this.query(
          `SELECT p.id, p.public_id, p.first_name, p.gender, p.state, p.city,
                  (SELECT storage_key FROM public.profile_photos WHERE profile_id = p.id AND visibility = 'PUBLIC_TO_MEMBERS' LIMIT 1) as photo_key
           FROM public.profiles p WHERE p.id = $1;`,
          [partnerId]
        ),
        this.query(
          `SELECT id, sender_profile_id, encrypted_body, iv, tag, created_at, read_at
           FROM public.messages
           WHERE (sender_profile_id = $1 AND receiver_profile_id = $2)
              OR (sender_profile_id = $2 AND receiver_profile_id = $1)
           ORDER BY created_at DESC LIMIT 1;`,
          [profileId, partnerId]
        ),
        this.query(
          `SELECT COUNT(*)::int as count FROM public.messages
           WHERE receiver_profile_id = $1 AND sender_profile_id = $2 AND read_at IS NULL;`,
          [profileId, partnerId]
        ),
      ]);

      const partner = pRes.rows[0];
      if (!partner) continue;

      let lastMessage = null;
      if (lastMsgRes.rows[0]) {
        const m = lastMsgRes.rows[0];
        let text = "[Encrypted Content]";
        try {
          text = decryptData(m.encrypted_body, m.iv, m.tag);
        } catch {}
        lastMessage = {
          body: text,
          senderProfileId: m.sender_profile_id,
          createdAt: m.created_at,
          readAt: m.read_at,
        };
      }

      conversations.push({
        partnerId: partner.id,
        partnerPublicId: partner.public_id,
        partnerName: partner.first_name,
        partnerGender: partner.gender,
        partnerLocation: `${partner.city || ""}, ${partner.state || ""}`,
        partnerPhotoKey: partner.photo_key,
        lastMessage,
        unreadCount: unreadRes.rows[0]?.count || 0,
        isBlocked: blocked,
      });
    }

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return conversations;
  },

  // --------------------------------------------------------------------------
  // AUDIT LOGGING & DPDP COMPLIANCE
  // --------------------------------------------------------------------------
  async logAuditEvent(event: {
    actorId?: string;
    action: string;
    targetType: string;
    targetId?: string;
    ipHash?: string;
    metadata?: Record<string, any>;
  }) {
    await this.query(
      `INSERT INTO public.audit_logs (
        actor_id, action, target_type, target_id, ip_hash, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6);`,
      [
        event.actorId || null,
        event.action,
        event.targetType,
        event.targetId || null,
        event.ipHash || null,
        JSON.stringify(event.metadata || {}),
      ]
    );
  },

  // --------------------------------------------------------------------------
  // DEMO / SEED ENSURER
  // --------------------------------------------------------------------------
  async seedDemoProfileIfEmpty(): Promise<string> {
    const existing = await this.query(`SELECT id FROM public.profiles LIMIT 1;`);
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Seed default user
    const userId = "00000000-0000-0000-0000-000000000001";
    const profileId = "00000000-0000-0000-0000-000000000002";
    const demoPhoneHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    await this.query(
      `INSERT INTO public.users (
        id, email, phone_encrypted, phone_iv, phone_tag, phone_lookup_hash, status
      ) VALUES ($1, 'demo@palmatrimony.in', 'enc_demo', 'iv_demo', 'tag_demo', $2, 'ACTIVE')
      ON CONFLICT (id) DO NOTHING;`,
      [userId, demoPhoneHash]
    );

    await this.query(
      `INSERT INTO public.profiles (
        id, public_id, owner_user_id, managed_by, first_name, gender, dob, height_cm,
        marital_status, state, city, sub_community, publication_status, is_discoverable, completion_score
      ) VALUES (
        $1, 'PAL100001', $2, 'SELF', 'राजेश पाल', 'MALE', '1998-05-15', 175,
        'NEVER_MARRIED', 'Uttar Pradesh', 'Agra', 'पाल (धनगर)', 'PENDING_REVIEW', TRUE, 65
      ) ON CONFLICT (id) DO NOTHING;`,
      [profileId, userId]
    );

    await this.query(
      `INSERT INTO public.profile_details (
        profile_id, highest_education, education_detail, employed_in, occupation,
        annual_income_range, mother_tongue, diet, about_me
      ) VALUES (
        $1, 'B.Tech in Computer Science', 'AKTU University', 'PRIVATE', 'Software Engineer',
        '₹10 Lakh - ₹15 Lakh', 'Hindi', 'VEGETARIAN',
        'साधारण एवं संस्कारवान परिवार से। आधुनिक विचारों के साथ पारिवारिक मूल्यों में विश्वास।'
      ) ON CONFLICT (profile_id) DO NOTHING;`,
      [profileId]
    );

    await this.query(
      `INSERT INTO public.family_details (
        profile_id, father_occupation, mother_occupation, brothers_count, sisters_count,
        family_type, family_values, family_location, about_family
      ) VALUES (
        $1, 'Government Employee (Retired)', 'Homemaker', 1, 1,
        'NUCLEAR', 'MODERATE', 'Agra, Uttar Pradesh',
        'पारिवारिक प्रतिष्ठा एवं उच्च नैतिक मूल्यों वाला परिवार।'
      ) ON CONFLICT (profile_id) DO NOTHING;`,
      [profileId]
    );

    await this.query(
      `INSERT INTO public.profile_preferences (
        profile_id, min_age, max_age, min_height_cm, max_height_cm,
        marital_status_allowed, preferred_states
      ) VALUES (
        $1, 23, 27, 155, 170, ARRAY['NEVER_MARRIED'], ARRAY['Uttar Pradesh', 'Delhi-NCR']
      ) ON CONFLICT (profile_id) DO NOTHING;`,
      [profileId]
    );

    return profileId;
  },

  // --------------------------------------------------------------------------
  // ADMIN CORE & MODERATION (Milestone M3)
  // --------------------------------------------------------------------------
  async seedAdminIfEmpty() {
    const adminId = "10000000-0000-0000-0000-000000000001";
    await this.query(
      `INSERT INTO public.admin_users (id, email, role, mfa_enabled)
       VALUES ($1, 'admin@palmatrimony.in', 'SUPER_ADMIN', TRUE)
       ON CONFLICT (email) DO NOTHING;`,
      [adminId]
    );
    return adminId;
  },

  async getAdminByEmail(email: string) {
    const res = await this.query(
      `SELECT * FROM public.admin_users WHERE email = $1 LIMIT 1;`,
      [email.toLowerCase().trim()]
    );
    return res.rows[0] || null;
  },

  async getAdminById(id: string) {
    const res = await this.query(
      `SELECT * FROM public.admin_users WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  },

  async getAdminDashboardStats() {
    const res = await this.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public.profiles WHERE publication_status = 'PENDING_REVIEW') AS pending_profiles,
        (SELECT COUNT(*)::int FROM public.profiles WHERE publication_status = 'PUBLISHED') AS published_profiles,
        (SELECT COUNT(*)::int FROM public.profiles) AS total_profiles,
        (SELECT COUNT(*)::int FROM public.profile_photos WHERE moderation_status = 'PENDING') AS pending_photos,
        (SELECT COUNT(*)::int FROM public.verification_requests WHERE status = 'PENDING') AS pending_verifications,
        (SELECT COUNT(*)::int FROM public.reports WHERE status IN ('PENDING', 'INVESTIGATING')) AS active_reports,
        (SELECT COUNT(*)::int FROM public.users WHERE status = 'ACTIVE') AS total_users;
    `);
    const r = res.rows[0] || {};
    return {
      pendingProfiles: r.pending_profiles || 0,
      publishedProfiles: r.published_profiles || 0,
      totalProfiles: r.total_profiles || 0,
      pendingPhotos: r.pending_photos || 0,
      pendingVerifications: r.pending_verifications || 0,
      activeReports: r.active_reports || 0,
      totalUsers: r.total_users || 0,
    };
  },

  async getAdminProfiles(statusFilter: string = "PENDING_REVIEW", search?: string) {
    const validStatuses = ["PENDING_REVIEW", "PUBLISHED", "REJECTED", "SUSPENDED", "DRAFT"];
    const useAll = statusFilter === "ALL" || !validStatuses.includes(statusFilter);
    const searchTerm = search?.trim() ? `%${search.trim()}%` : null;

    const res = await this.query(
      `SELECT 
        p.id, p.public_id, p.first_name, p.gender, p.dob, p.height_cm,
        p.marital_status, p.state, p.city, p.sub_community, p.publication_status,
        p.is_discoverable, p.completion_score, p.created_at,
        u.email as user_email, u.status as user_status,
        pd.highest_education, pd.occupation, pd.employed_in, pd.annual_income_range,
        pd.diet, pd.about_me,
        fd.father_occupation, fd.family_type, fd.about_family
      FROM public.profiles p
      JOIN public.users u ON p.owner_user_id = u.id
      LEFT JOIN public.profile_details pd ON p.id = pd.profile_id
      LEFT JOIN public.family_details fd ON p.id = fd.profile_id
      WHERE ($1::boolean OR p.publication_status = $2)
        AND (
          $3::text IS NULL
          OR p.public_id ILIKE $3
          OR p.first_name ILIKE $3
          OR p.city ILIKE $3
          OR p.state ILIKE $3
          OR COALESCE(p.sub_community, '') ILIKE $3
          OR COALESCE(u.email, '') ILIKE $3
        )
      ORDER BY p.created_at DESC
      LIMIT 100;`,
      [useAll, statusFilter, searchTerm]
    );

    return res.rows.map((row) => ({
      id: row.id,
      publicId: row.public_id,
      firstName: row.first_name,
      gender: row.gender,
      dob: row.dob,
      age: Math.floor((new Date().getTime() - new Date(row.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
      heightCm: row.height_cm,
      maritalStatus: row.marital_status,
      state: row.state,
      city: row.city,
      subCommunity: row.sub_community,
      publicationStatus: row.publication_status,
      isDiscoverable: row.is_discoverable,
      completionScore: row.completion_score,
      createdAt: row.created_at,
      userEmail: row.user_email,
      userStatus: row.user_status,
      highestEducation: row.highest_education,
      occupation: row.occupation,
      employedIn: row.employed_in,
      annualIncomeRange: row.annual_income_range,
      diet: row.diet,
      aboutMe: row.about_me,
      fatherOccupation: row.father_occupation,
      familyType: row.family_type,
      aboutFamily: row.about_family,
    }));
  },

  async getPendingProfiles() {
    return this.getAdminProfiles("PENDING_REVIEW");
  },

  async moderateProfile(
    adminId: string,
    profileId: string,
    action: "PUBLISHED" | "REJECTED" | "SUSPENDED",
    notes: string
  ) {
    const res = await this.query(
      `UPDATE public.profiles 
       SET publication_status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *;`,
      [action, profileId]
    );

    await this.logAuditEvent({
      actorId: adminId,
      action: `ADMIN_PROFILE_${action}`,
      targetType: "PROFILE",
      targetId: profileId,
      metadata: { action, notes },
    });

    return res.rows[0];
  },

  async getVerificationQueue() {
    const res = await this.query(`
      SELECT 
        v.id, v.profile_id, v.verification_type, v.status, v.selfie_storage_key,
        v.selfie_image_data, v.created_at, v.reviewer_notes,
        p.public_id, p.first_name, p.gender, p.city, p.state
      FROM public.verification_requests v
      JOIN public.profiles p ON v.profile_id = p.id
      WHERE v.status = 'PENDING'
      ORDER BY v.created_at ASC;
    `);
    return res.rows;
  },

  async getRecentAuditLogs(limit = 25) {
    const res = await this.query(
      `SELECT id, actor_id, action, target_type, target_id, metadata, created_at
       FROM public.audit_logs
       ORDER BY created_at DESC
       LIMIT $1;`,
      [limit]
    );
    return res.rows;
  },

  async moderateVerification(
    adminId: string,
    verificationId: string,
    action: "APPROVED" | "REJECTED" | "REVOKED",
    notes: string
  ) {
    const res = await this.query(
      `UPDATE public.verification_requests 
       SET status = $1, reviewed_by = $2, reviewer_notes = $3, 
           verified_at = CASE WHEN $1 = 'APPROVED' THEN NOW() ELSE verified_at END,
           updated_at = NOW() 
       WHERE id = $4 
       RETURNING *;`,
      [action, adminId, notes, verificationId]
    );

    await this.logAuditEvent({
      actorId: adminId,
      action: `ADMIN_VERIFICATION_${action}`,
      targetType: "VERIFICATION_REQUEST",
      targetId: verificationId,
      metadata: { action, notes },
    });

    return res.rows[0];
  },

  async getReportsQueue() {
    const res = await this.query(`
      SELECT 
        r.id, r.category, r.details, r.status, r.created_at,
        rep.public_id as reporter_public_id,
        tgt.public_id as reported_public_id,
        tgt.first_name as reported_name,
        tgt.owner_user_id as reported_user_id
      FROM public.reports r
      JOIN public.profiles rep ON r.reporter_profile_id = rep.id
      JOIN public.profiles tgt ON r.reported_profile_id = tgt.id
      WHERE r.status IN ('PENDING', 'INVESTIGATING')
      ORDER BY r.created_at ASC;
    `);
    return res.rows;
  },

  async resolveReport(
    adminId: string,
    reportId: string,
    resolution: "RESOLVED" | "DISMISSED",
    notes: string,
    suspendReportedUser?: boolean
  ) {
    const res = await this.query(
      `UPDATE public.reports 
       SET status = $1, resolved_by = $2, resolution_notes = $3, updated_at = NOW() 
       WHERE id = $4 
       RETURNING *;`,
      [resolution, adminId, notes, reportId]
    );

    const report = res.rows[0];
    if (suspendReportedUser && report) {
      const pRes = await this.query(
        `SELECT owner_user_id FROM public.profiles WHERE id = $1;`,
        [report.reported_profile_id]
      );
      const userId = pRes.rows[0]?.owner_user_id;
      if (userId) {
        await this.query(`UPDATE public.users SET status = 'SUSPENDED' WHERE id = $1;`, [userId]);
        await this.query(`UPDATE public.profiles SET publication_status = 'SUSPENDED' WHERE id = $1;`, [report.reported_profile_id]);
      }
    }

    await this.logAuditEvent({
      actorId: adminId,
      action: `ADMIN_REPORT_${resolution}`,
      targetType: "REPORT",
      targetId: reportId,
      metadata: { resolution, notes, suspendReportedUser },
    });

    return report;
  },
};
