-- ============================================================================
-- PAL MATRIMONY — PER-TABLE ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 20261102000002_rls_policies.sql
-- Resolves: Codvian Finding GL1 (HANDOFF_DESIGNER_BUILDER §7 & AGENT_COMMUNICATION_CHAIN D-002)
-- ============================================================================

-- Helper function to check if the current session user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user owns a profile
CREATE OR REPLACE FUNCTION public.owns_profile(p_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_profile_id AND owner_user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1. USERS POLICIES
-- ============================================================================
CREATE POLICY "users_select_own" 
ON public.users FOR SELECT 
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "users_update_own" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "users_insert_signup" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- ============================================================================
-- 2. PROFILES POLICIES
-- ============================================================================
CREATE POLICY "profiles_select_accessible" 
ON public.profiles FOR SELECT 
USING (
    owner_user_id = auth.uid() 
    OR (publication_status = 'PUBLISHED' AND is_discoverable = TRUE)
    OR public.is_admin()
);

CREATE POLICY "profiles_insert_own" 
ON public.profiles FOR INSERT 
WITH CHECK (owner_user_id = auth.uid() OR auth.uid() IS NULL);

CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE 
USING (owner_user_id = auth.uid() OR public.is_admin());

-- ============================================================================
-- 3. PROFILE DETAILS & BIODATA POLICIES
-- ============================================================================
CREATE POLICY "profile_details_select" 
ON public.profile_details FOR SELECT 
USING (
    public.owns_profile(profile_id)
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = profile_details.profile_id 
          AND publication_status = 'PUBLISHED' 
          AND is_discoverable = TRUE
    )
    OR public.is_admin()
);

CREATE POLICY "profile_details_insert_own" 
ON public.profile_details FOR INSERT 
WITH CHECK (public.owns_profile(profile_id) OR auth.uid() IS NULL);

CREATE POLICY "profile_details_update_own" 
ON public.profile_details FOR UPDATE 
USING (public.owns_profile(profile_id));

-- ============================================================================
-- 4. FAMILY DETAILS POLICIES
-- ============================================================================
CREATE POLICY "family_details_select" 
ON public.family_details FOR SELECT 
USING (
    public.owns_profile(profile_id)
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = family_details.profile_id 
          AND publication_status = 'PUBLISHED' 
          AND is_discoverable = TRUE
    )
    OR public.is_admin()
);

CREATE POLICY "family_details_insert_own" 
ON public.family_details FOR INSERT 
WITH CHECK (public.owns_profile(profile_id) OR auth.uid() IS NULL);

CREATE POLICY "family_details_update_own" 
ON public.family_details FOR UPDATE 
USING (public.owns_profile(profile_id));

-- ============================================================================
-- 5. PARTNER PREFERENCES POLICIES
-- ============================================================================
CREATE POLICY "preferences_select" 
ON public.profile_preferences FOR SELECT 
USING (
    public.owns_profile(profile_id)
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = profile_preferences.profile_id 
          AND publication_status = 'PUBLISHED'
    )
);

CREATE POLICY "preferences_insert_own" 
ON public.profile_preferences FOR INSERT 
WITH CHECK (public.owns_profile(profile_id) OR auth.uid() IS NULL);

CREATE POLICY "preferences_update_own" 
ON public.profile_preferences FOR UPDATE 
USING (public.owns_profile(profile_id));

-- ============================================================================
-- 6. PROFILE PHOTOS POLICIES (Private Storage Gate)
-- ============================================================================
CREATE POLICY "photos_select" 
ON public.profile_photos FOR SELECT 
USING (
    public.owns_profile(profile_id)
    OR (moderation_status = 'APPROVED' AND visibility = 'PUBLIC_TO_MEMBERS')
    OR public.is_admin()
);

CREATE POLICY "photos_insert_own" 
ON public.profile_photos FOR INSERT 
WITH CHECK (public.owns_profile(profile_id));

CREATE POLICY "photos_delete_own" 
ON public.profile_photos FOR DELETE 
USING (public.owns_profile(profile_id));

-- ============================================================================
-- 7. VERIFICATION REQUESTS POLICIES
-- ============================================================================
CREATE POLICY "verification_select" 
ON public.verification_requests FOR SELECT 
USING (public.owns_profile(profile_id) OR public.is_admin());

CREATE POLICY "verification_insert_own" 
ON public.verification_requests FOR INSERT 
WITH CHECK (public.owns_profile(profile_id));

CREATE POLICY "verification_update_admin" 
ON public.verification_requests FOR UPDATE 
USING (public.is_admin());

-- ============================================================================
-- 8. INTERESTS POLICIES
-- ============================================================================
CREATE POLICY "interests_select_involved" 
ON public.interests FOR SELECT 
USING (
    public.owns_profile(sender_profile_id) 
    OR public.owns_profile(receiver_profile_id)
    OR public.is_admin()
);

CREATE POLICY "interests_insert_sender" 
ON public.interests FOR INSERT 
WITH CHECK (public.owns_profile(sender_profile_id));

CREATE POLICY "interests_update_involved" 
ON public.interests FOR UPDATE 
USING (
    public.owns_profile(sender_profile_id) 
    OR public.owns_profile(receiver_profile_id)
);

-- ============================================================================
-- 9. DUAL-APPROVAL CONTACT EXCHANGE POLICIES
-- ============================================================================
CREATE POLICY "contact_exchange_select_involved" 
ON public.contact_exchange_requests FOR SELECT 
USING (
    public.owns_profile(sender_profile_id) 
    OR public.owns_profile(receiver_profile_id)
    OR public.is_admin()
);

CREATE POLICY "contact_exchange_insert_sender" 
ON public.contact_exchange_requests FOR INSERT 
WITH CHECK (public.owns_profile(sender_profile_id));

CREATE POLICY "contact_exchange_update_involved" 
ON public.contact_exchange_requests FOR UPDATE 
USING (
    public.owns_profile(sender_profile_id) 
    OR public.owns_profile(receiver_profile_id)
);

-- View revealing contact details ONLY after dual bilateral approval
CREATE OR REPLACE VIEW public.contact_disclosures AS
SELECT 
    cer.id AS request_id,
    cer.status,
    cer.disclosed_at,
    -- Sender Details
    sp.public_id AS sender_public_id,
    CASE WHEN cer.status = 'BOTH_APPROVED' AND cer.sender_disclose_phone THEN su.phone_encrypted ELSE NULL END AS sender_phone_encrypted,
    CASE WHEN cer.status = 'BOTH_APPROVED' AND cer.sender_disclose_email THEN su.email ELSE NULL END AS sender_email,
    -- Receiver Details
    rp.public_id AS receiver_public_id,
    CASE WHEN cer.status = 'BOTH_APPROVED' AND cer.receiver_disclose_phone THEN ru.phone_encrypted ELSE NULL END AS receiver_phone_encrypted,
    CASE WHEN cer.status = 'BOTH_APPROVED' AND cer.receiver_disclose_email THEN ru.email ELSE NULL END AS receiver_email
FROM public.contact_exchange_requests cer
JOIN public.profiles sp ON cer.sender_profile_id = sp.id
JOIN public.users su ON sp.owner_user_id = su.id
JOIN public.profiles rp ON cer.receiver_profile_id = rp.id
JOIN public.users ru ON rp.owner_user_id = ru.id
WHERE cer.status = 'BOTH_APPROVED';

-- ============================================================================
-- 10. BIODATA SHARES POLICIES
-- ============================================================================
CREATE POLICY "biodata_shares_select" 
ON public.biodata_shares FOR SELECT 
USING (
    public.owns_profile(owner_profile_id) 
    OR public.owns_profile(requester_profile_id)
);

CREATE POLICY "biodata_shares_insert" 
ON public.biodata_shares FOR INSERT 
WITH CHECK (public.owns_profile(requester_profile_id));

CREATE POLICY "biodata_shares_update" 
ON public.biodata_shares FOR UPDATE 
USING (public.owns_profile(owner_profile_id));

-- ============================================================================
-- 11. MESSAGES POLICIES (Gated to Mutual Interest Only)
-- ============================================================================
CREATE POLICY "messages_select_involved" 
ON public.messages FOR SELECT 
USING (
    public.owns_profile(sender_profile_id) 
    OR public.owns_profile(receiver_profile_id)
);

CREATE POLICY "messages_insert_mutual" 
ON public.messages FOR INSERT 
WITH CHECK (
    public.owns_profile(sender_profile_id)
    AND EXISTS (
        SELECT 1 FROM public.interests
        WHERE ((sender_profile_id = messages.sender_profile_id AND receiver_profile_id = messages.receiver_profile_id)
           OR (sender_profile_id = messages.receiver_profile_id AND receiver_profile_id = messages.sender_profile_id))
          AND status = 'ACCEPTED'
    )
);

-- ============================================================================
-- 12. BLOCKS & REPORTS POLICIES
-- ============================================================================
CREATE POLICY "blocks_manage" 
ON public.blocks FOR ALL 
USING (public.owns_profile(blocker_profile_id));

CREATE POLICY "reports_insert" 
ON public.reports FOR INSERT 
WITH CHECK (public.owns_profile(reporter_profile_id));

CREATE POLICY "reports_select_admin" 
ON public.reports FOR SELECT 
USING (public.owns_profile(reporter_profile_id) OR public.is_admin());

-- ============================================================================
-- 13. AUDIT LOGS & CONSENT RECORDS POLICIES (DPDP Compliance)
-- ============================================================================
CREATE POLICY "audit_logs_insert" 
ON public.audit_logs FOR INSERT 
WITH CHECK (TRUE);

CREATE POLICY "audit_logs_select_admin" 
ON public.audit_logs FOR SELECT 
USING (public.is_admin());

CREATE POLICY "consent_records_select_own" 
ON public.consent_records FOR SELECT 
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "consent_records_insert_own" 
ON public.consent_records FOR INSERT 
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);
