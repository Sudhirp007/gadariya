-- ============================================================================
-- PAL MATRIMONY — PROFILE MANAGERS & SCOPED DELEGATION
-- Migration: 20261102000003_profile_managers.sql
-- Resolves: Feature Database C-01 to C-06 (Family Manager Authority & Privacy Invariant)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    manager_phone_encrypted TEXT,
    manager_phone_iv TEXT,
    manager_phone_tag TEXT,
    manager_phone_hash TEXT NOT NULL,
    manager_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    relation TEXT NOT NULL CHECK (relation IN ('FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'RELATIVE', 'GUARDIAN')),
    can_edit_biodata BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_preferences BOOLEAN NOT NULL DEFAULT TRUE,
    can_send_interests BOOLEAN NOT NULL DEFAULT TRUE,
    can_view_shortlists BOOLEAN NOT NULL DEFAULT TRUE,
    -- CRITICAL PRIVACY INVARIANT C-06: Family managers NEVER inherit power to disclose contact info or verification documents
    can_disclose_contact BOOLEAN NOT NULL DEFAULT FALSE CHECK (can_disclose_contact = FALSE),
    can_view_verification_docs BOOLEAN NOT NULL DEFAULT FALSE CHECK (can_view_verification_docs = FALSE),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_INVITE', 'ACTIVE', 'REVOKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_profile_manager UNIQUE (profile_id, manager_phone_hash)
);

ALTER TABLE public.profile_managers ENABLE ROW LEVEL SECURITY;

-- Profile owner has full control over their family managers
CREATE POLICY "profile_managers_owner_all"
ON public.profile_managers FOR ALL
USING (public.owns_profile(profile_id));

-- Manager user can view profiles they manage
CREATE POLICY "profile_managers_self_select"
ON public.profile_managers FOR SELECT
USING (manager_user_id = auth.uid() OR public.owns_profile(profile_id) OR public.is_admin());
