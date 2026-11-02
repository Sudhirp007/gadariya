-- ============================================================================
-- PAL MATRIMONY — INITIAL DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Version: 1.0
-- Constraints: Underage check, Blind indexing, Dual-approval contact exchange
-- ============================================================================

-- Enable pgcrypto for UUIDs and hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sequence for unique PAL###### public IDs
CREATE SEQUENCE IF NOT EXISTS profile_public_id_seq START WITH 100001;

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    phone_encrypted TEXT,
    phone_iv TEXT,
    phone_tag TEXT,
    phone_lookup_hash TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DELETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id TEXT UNIQUE NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    managed_by TEXT NOT NULL DEFAULT 'SELF' CHECK (managed_by IN ('SELF', 'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'RELATIVE', 'GUARDIAN')),
    first_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
    dob DATE NOT NULL,
    height_cm INTEGER CHECK (height_cm BETWEEN 100 AND 250),
    marital_status TEXT NOT NULL DEFAULT 'NEVER_MARRIED' CHECK (marital_status IN ('NEVER_MARRIED', 'DIVORCED', 'WIDOWED', 'AWAITING_DIVORCE')),
    country TEXT NOT NULL DEFAULT 'India',
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    community_declaration BOOLEAN NOT NULL DEFAULT TRUE CHECK (community_declaration = TRUE),
    sub_community TEXT,
    publication_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (publication_status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'SUSPENDED', 'REJECTED')),
    is_discoverable BOOLEAN NOT NULL DEFAULT TRUE,
    completion_score INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce legal adult age (18+) at database level
    CONSTRAINT chk_underage_rejected CHECK (dob <= CURRENT_DATE - INTERVAL '18 years')
);

-- ============================================================================
-- 3. PROFILE DETAILS & BIODATA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_details (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    highest_education TEXT,
    education_detail TEXT,
    employed_in TEXT CHECK (employed_in IN ('PRIVATE', 'GOVERNMENT', 'BUSINESS', 'DEFENCE', 'NOT_WORKING', 'OTHER')),
    occupation TEXT,
    annual_income_range TEXT,
    mother_tongue TEXT NOT NULL DEFAULT 'Hindi',
    diet TEXT CHECK (diet IN ('VEGETARIAN', 'NON_VEGETARIAN', 'EGGETARIAN', 'JAIN')),
    smoking TEXT CHECK (smoking IN ('NO', 'OCCASIONALLY', 'YES')),
    drinking TEXT CHECK (drinking IN ('NO', 'OCCASIONALLY', 'YES')),
    about_me TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. FAMILY DETAILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.family_details (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    father_occupation TEXT,
    mother_occupation TEXT,
    brothers_count INTEGER NOT NULL DEFAULT 0 CHECK (brothers_count >= 0),
    sisters_count INTEGER NOT NULL DEFAULT 0 CHECK (sisters_count >= 0),
    family_type TEXT CHECK (family_type IN ('NUCLEAR', 'JOINT')),
    family_values TEXT CHECK (family_values IN ('TRADITIONAL', 'MODERATE', 'LIBERAL')),
    family_location TEXT,
    about_family TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. PARTNER PREFERENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_preferences (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    min_age INTEGER DEFAULT 18 CHECK (min_age >= 18),
    max_age INTEGER DEFAULT 70 CHECK (max_age >= min_age),
    min_height_cm INTEGER DEFAULT 120,
    max_height_cm INTEGER DEFAULT 220,
    marital_status_allowed TEXT[] DEFAULT ARRAY['NEVER_MARRIED'],
    preferred_states TEXT[],
    preferred_cities TEXT[],
    preferred_education TEXT[],
    preferred_occupation TEXT[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. PROFILE PHOTOS (Private Storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    visibility TEXT NOT NULL DEFAULT 'APPROVAL_REQUIRED' CHECK (visibility IN ('PUBLIC_TO_MEMBERS', 'BLURRED', 'APPROVAL_REQUIRED')),
    moderation_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. VERIFICATION REQUESTS & BADGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL CHECK (verification_type IN ('MOBILE_OTP', 'SELFIE', 'ADMIN_MANUAL', 'OPTIONAL_ID')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED')),
    selfie_storage_key TEXT,
    reviewer_notes TEXT,
    reviewed_by UUID,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. INTERESTS & SHORTLISTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_interest CHECK (sender_profile_id <> receiver_profile_id),
    CONSTRAINT uq_sender_receiver UNIQUE (sender_profile_id, receiver_profile_id)
);

CREATE TABLE IF NOT EXISTS public.shortlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shortlisted_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_shortlist CHECK (profile_id <> shortlisted_profile_id),
    CONSTRAINT uq_shortlist UNIQUE (profile_id, shortlisted_profile_id)
);

-- ============================================================================
-- 9. BILATERAL CONTACT EXCHANGE STATE MACHINE (Dual Approval)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contact_exchange_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
        'INITIATED', 
        'SENDER_APPROVED', 
        'RECEIVER_APPROVED', 
        'BOTH_APPROVED', 
        'REJECTED', 
        'WITHDRAWN'
    )),
    sender_disclose_phone BOOLEAN NOT NULL DEFAULT TRUE,
    sender_disclose_email BOOLEAN NOT NULL DEFAULT FALSE,
    receiver_disclose_phone BOOLEAN NOT NULL DEFAULT TRUE,
    receiver_disclose_email BOOLEAN NOT NULL DEFAULT FALSE,
    sender_approved_at TIMESTAMPTZ,
    receiver_approved_at TIMESTAMPTZ,
    disclosed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_contact_exchange CHECK (sender_profile_id <> receiver_profile_id),
    CONSTRAINT uq_contact_exchange UNIQUE (sender_profile_id, receiver_profile_id)
);

-- ============================================================================
-- 10. BIODATA SHARES (Watermarked PDF Permissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biodata_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requester_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'DECLINED', 'REVOKED')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_biodata_share UNIQUE (owner_profile_id, requester_profile_id)
);

-- ============================================================================
-- 11. ENCRYPTED MESSAGES (Mutual Interest Only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    encrypted_body TEXT NOT NULL,
    iv TEXT NOT NULL,
    tag TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. BLOCKS & REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_block UNIQUE (blocker_profile_id, blocked_profile_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('FAKE_PROFILE', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'COMMERCIAL_SPAM', 'UNDERAGE', 'OTHER')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
    resolution_notes TEXT,
    resolved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 13. AUDIT LOGS & CONSENT RECORDS (DPDP ACT 2025 COMPLIANCE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    ip_hash TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    consent_purpose TEXT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    policy_version TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ
);

-- ============================================================================
-- 14. ADMIN USERS & RBAC
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'MODERATOR', 'VERIFICATION_ADMIN', 'SUPPORT')),
    mfa_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Sanitized Discovery View: NEVER exposes phone, email, full address, or raw DOB
CREATE OR REPLACE VIEW public.discovery_profiles AS
SELECT 
    p.id,
    p.public_id,
    p.first_name,
    p.gender,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.dob))::INTEGER AS age,
    p.height_cm,
    p.marital_status,
    p.country,
    p.state,
    p.city,
    p.sub_community,
    p.publication_status,
    p.completion_score,
    p.created_at,
    pd.highest_education,
    pd.employed_in,
    pd.occupation,
    pd.diet
FROM public.profiles p
LEFT JOIN public.profile_details pd ON p.id = pd.profile_id
WHERE p.publication_status = 'PUBLISHED' 
  AND p.is_discoverable = TRUE;

-- ============================================================================
-- AUTOMATED TRIGGERS
-- ============================================================================

-- Generate PAL###### public ID automatically on profile insert
CREATE OR REPLACE FUNCTION set_public_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
        NEW.public_id := 'PAL' || LPAD(nextval('profile_public_id_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_public_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION set_public_id();
