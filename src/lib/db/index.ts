import pg from "pg";
const { Pool } = pg;

// Global singleton pool across hot reloads in Next.js development
declare global {
  // eslint-disable-next-line no-var
  var __dbPool: pg.Pool | undefined;
}

function getConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    if (fs.existsSync(".env.local")) {
      const lines = fs.readFileSync(".env.local", "utf-8").split("\n");
      for (const line of lines) {
        if (line.startsWith("DATABASE_URL=")) {
          return line.slice("DATABASE_URL=".length).trim();
        }
      }
    }
  } catch {
    // ignore
  }
  return "postgresql://postgres:postgres@localhost:5432/postgres";
}

function getPool(): pg.Pool {
  if (global.__dbPool) {
    return global.__dbPool;
  }

  const connectionString = getConnectionString();

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  if (process.env.NODE_ENV !== "production") {
    global.__dbPool = pool;
  }

  return pool;
}

export const db = {
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
    const pRes = await this.query(
      `SELECT * FROM public.profiles WHERE id = $1 LIMIT 1;`,
      [profileId]
    );
    const profile = pRes.rows[0];
    if (!profile) return null;

    const [detailsRes, familyRes, prefsRes, photosRes, managersRes] = await Promise.all([
      this.query(`SELECT * FROM public.profile_details WHERE profile_id = $1;`, [profileId]),
      this.query(`SELECT * FROM public.family_details WHERE profile_id = $1;`, [profileId]),
      this.query(`SELECT * FROM public.profile_preferences WHERE profile_id = $1;`, [profileId]),
      this.query(
        `SELECT id, storage_key, visibility, moderation_status, is_primary 
         FROM public.profile_photos WHERE profile_id = $1 ORDER BY created_at DESC;`,
        [profileId]
      ),
      this.query(
        `SELECT id, relation, status, can_edit_biodata, can_manage_preferences,
                can_send_interests, can_view_shortlists, can_disclose_contact, can_view_verification_docs,
                manager_phone_hash, created_at
         FROM public.profile_managers WHERE profile_id = $1 AND status <> 'REVOKED';`,
        [profileId]
      ),
    ]);

    const details = detailsRes.rows[0] || {};
    const family = familyRes.rows[0] || {};
    const prefs = prefsRes.rows[0] || {};

    const age = Math.floor(
      (new Date().getTime() - new Date(profile.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    return {
      id: profile.id,
      publicId: profile.public_id,
      userId: profile.owner_user_id,
      managedBy: profile.managed_by,
      firstName: profile.first_name,
      gender: profile.gender,
      dob: profile.dob instanceof Date ? profile.dob.toISOString().split("T")[0] : profile.dob,
      age,
      heightCm: profile.height_cm,
      maritalStatus: profile.marital_status,
      country: profile.country,
      state: profile.state,
      city: profile.city,
      subCommunity: profile.sub_community,
      publicationStatus: profile.publication_status,
      isDiscoverable: profile.is_discoverable,
      completionScore: profile.completion_score,
      // Details
      highestEducation: details.highest_education,
      educationDetail: details.education_detail,
      employedIn: details.employed_in,
      occupation: details.occupation,
      annualIncomeRange: details.annual_income_range,
      motherTongue: details.mother_tongue || "Hindi",
      diet: details.diet,
      aboutMe: details.about_me,
      // Family
      fatherOccupation: family.father_occupation,
      motherOccupation: family.mother_occupation,
      brothersCount: family.brothers_count || 0,
      sistersCount: family.sisters_count || 0,
      familyType: family.family_type,
      familyValues: family.family_values,
      familyLocation: family.family_location,
      aboutFamily: family.about_family,
      // Preferences
      prefMinAge: prefs.min_age || 18,
      prefMaxAge: prefs.max_age || 70,
      prefMinHeightCm: prefs.min_height_cm || 120,
      prefMaxHeightCm: prefs.max_height_cm || 220,
      prefMaritalStatus: prefs.marital_status_allowed || ["NEVER_MARRIED"],
      prefStates: prefs.preferred_states || [],
      prefCities: prefs.preferred_cities || [],
      // Photos
      photos: photosRes.rows.map((r) => ({
        id: r.id,
        storageKey: r.storage_key,
        visibility: r.visibility,
        moderationStatus: r.moderation_status,
        isPrimary: r.is_primary,
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
      completionScore?: number;
      publicationStatus?: string;
      details?: {
        highestEducation?: string;
        educationDetail?: string;
        employedIn?: string;
        occupation?: string;
        annualIncomeRange?: string;
        motherTongue?: string;
        diet?: string;
        aboutMe?: string;
      };
      family?: {
        fatherOccupation?: string;
        motherOccupation?: string;
        brothersCount?: number;
        sistersCount?: number;
        familyType?: string;
        familyValues?: string;
        familyLocation?: string;
        aboutFamily?: string;
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
    if (updates.completionScore !== undefined || updates.publicationStatus !== undefined) {
      await this.query(
        `UPDATE public.profiles 
         SET completion_score = COALESCE($2, completion_score),
             publication_status = COALESCE($3, publication_status),
             updated_at = NOW()
         WHERE id = $1;`,
        [profileId, updates.completionScore, updates.publicationStatus]
      );
    }

    if (updates.details) {
      const d = updates.details;
      await this.query(
        `INSERT INTO public.profile_details (
          profile_id, highest_education, education_detail, employed_in, occupation,
          annual_income_range, mother_tongue, diet, about_me, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (profile_id) DO UPDATE SET
          highest_education = COALESCE(EXCLUDED.highest_education, public.profile_details.highest_education),
          education_detail = COALESCE(EXCLUDED.education_detail, public.profile_details.education_detail),
          employed_in = COALESCE(EXCLUDED.employed_in, public.profile_details.employed_in),
          occupation = COALESCE(EXCLUDED.occupation, public.profile_details.occupation),
          annual_income_range = COALESCE(EXCLUDED.annual_income_range, public.profile_details.annual_income_range),
          mother_tongue = COALESCE(EXCLUDED.mother_tongue, public.profile_details.mother_tongue),
          diet = COALESCE(EXCLUDED.diet, public.profile_details.diet),
          about_me = COALESCE(EXCLUDED.about_me, public.profile_details.about_me),
          updated_at = NOW();`,
        [
          profileId,
          d.highestEducation || null,
          d.educationDetail || null,
          d.employedIn || null,
          d.occupation || null,
          d.annualIncomeRange || null,
          d.motherTongue || "Hindi",
          d.diet || null,
          d.aboutMe || null,
        ]
      );
    }

    if (updates.family) {
      const f = updates.family;
      await this.query(
        `INSERT INTO public.family_details (
          profile_id, father_occupation, mother_occupation, brothers_count, sisters_count,
          family_type, family_values, family_location, about_family, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (profile_id) DO UPDATE SET
          father_occupation = COALESCE(EXCLUDED.father_occupation, public.family_details.father_occupation),
          mother_occupation = COALESCE(EXCLUDED.mother_occupation, public.family_details.mother_occupation),
          brothers_count = COALESCE(EXCLUDED.brothers_count, public.family_details.brothers_count),
          sisters_count = COALESCE(EXCLUDED.sisters_count, public.family_details.sisters_count),
          family_type = COALESCE(EXCLUDED.family_type, public.family_details.family_type),
          family_values = COALESCE(EXCLUDED.family_values, public.family_details.family_values),
          family_location = COALESCE(EXCLUDED.family_location, public.family_details.family_location),
          about_family = COALESCE(EXCLUDED.about_family, public.family_details.about_family),
          updated_at = NOW();`,
        [
          profileId,
          f.fatherOccupation || null,
          f.motherOccupation || null,
          f.brothersCount ?? 0,
          f.sistersCount ?? 0,
          f.familyType || null,
          f.familyValues || null,
          f.familyLocation || null,
          f.aboutFamily || null,
        ]
      );
    }

    if (updates.preferences) {
      const p = updates.preferences;
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
          p.minAge || 18,
          p.maxAge || 70,
          p.minHeightCm || 120,
          p.maxHeightCm || 220,
          p.maritalStatusAllowed || ["NEVER_MARRIED"],
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
  }) {
    const res = await this.query(
      `INSERT INTO public.profile_photos (
        profile_id, storage_key, visibility, moderation_status, is_primary
      ) VALUES ($1, $2, $3, 'PENDING', $4)
      RETURNING *;`,
      [data.profileId, data.storageKey, data.visibility, data.isPrimary ?? false]
    );
    return res.rows[0];
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
    const [profilesRes, verificationsRes, reportsRes, usersRes] = await Promise.all([
      this.query(`SELECT COUNT(*)::int as count FROM public.profiles WHERE publication_status = 'PENDING_REVIEW';`),
      this.query(`SELECT COUNT(*)::int as count FROM public.verification_requests WHERE status = 'PENDING';`),
      this.query(`SELECT COUNT(*)::int as count FROM public.reports WHERE status IN ('PENDING', 'INVESTIGATING');`),
      this.query(`SELECT COUNT(*)::int as count FROM public.users WHERE status = 'ACTIVE';`),
    ]);

    return {
      pendingProfiles: profilesRes.rows[0]?.count || 0,
      pendingVerifications: verificationsRes.rows[0]?.count || 0,
      activeReports: reportsRes.rows[0]?.count || 0,
      totalUsers: usersRes.rows[0]?.count || 0,
    };
  },

  async getPendingProfiles() {
    const res = await this.query(`
      SELECT 
        p.id, p.public_id, p.first_name, p.gender, p.dob, p.height_cm,
        p.marital_status, p.state, p.city, p.sub_community, p.publication_status,
        p.completion_score, p.created_at,
        pd.highest_education, pd.occupation, pd.employed_in, pd.annual_income_range,
        pd.diet, pd.about_me,
        fd.father_occupation, fd.family_type, fd.about_family
      FROM public.profiles p
      LEFT JOIN public.profile_details pd ON p.id = pd.profile_id
      LEFT JOIN public.family_details fd ON p.id = fd.profile_id
      WHERE p.publication_status = 'PENDING_REVIEW'
      ORDER BY p.created_at ASC;
    `);

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
      completionScore: row.completion_score,
      createdAt: row.created_at,
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
        v.created_at, v.reviewer_notes,
        p.public_id, p.first_name, p.gender, p.city, p.state
      FROM public.verification_requests v
      JOIN public.profiles p ON v.profile_id = p.id
      WHERE v.status = 'PENDING'
      ORDER BY v.created_at ASC;
    `);
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
