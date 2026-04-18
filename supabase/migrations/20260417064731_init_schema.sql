-- ============================================================================
-- AgarthaOS â€” Enterprise ERP Schema
-- Description: Complete 3NF-compliant schema for a fresh Supabase project.
--              Execute via: psql --single-transaction
-- ============================================================================


-- ============================================================================
-- 0. EXTENSIONS & PROJECT SETTINGS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron    WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net     WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS ltree WITH SCHEMA extensions;

-- Facility timezone: used by attendance triggers instead of hardcoded strings.
-- Stored in public.app_config (key = 'facility_timezone'). See section 2b.


-- ============================================================================
-- 1. TYPES & ENUMS
-- ============================================================================

-- â”€â”€ IAM â”€â”€
CREATE TYPE access_level AS ENUM ('admin', 'manager', 'crew');
CREATE TYPE employment_status AS ENUM ('active', 'pending', 'on_leave', 'suspended', 'terminated');
CREATE TYPE iam_request_type AS ENUM ('provisioning', 'transfer', 'suspension', 'termination', 'reactivation');
CREATE TYPE iam_request_status AS ENUM ('pending_it', 'approved', 'rejected');

-- â”€â”€ IT Infrastructure â”€â”€
CREATE TYPE device_status AS ENUM ('online', 'offline', 'maintenance', 'decommissioned');
CREATE TYPE heartbeat_status AS ENUM ('online', 'offline', 'degraded');

-- â”€â”€ Attendance â”€â”€
CREATE TYPE punch_type AS ENUM ('clock_in', 'clock_out');
CREATE TYPE punch_source AS ENUM ('mobile', 'kiosk', 'manual');
CREATE TYPE exception_type AS ENUM (
    'late_arrival',
    'early_departure',
    'missing_clock_in',
    'missing_clock_out',
    'absent'
);
CREATE TYPE exception_status AS ENUM ('unjustified', 'justified');

-- â”€â”€ Leave â”€â”€
CREATE TYPE leave_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE leave_transaction_type AS ENUM (
    'accrual',
    'usage',
    'adjustment',
    'carry_forward',
    'forfeiture'
);
CREATE TYPE accrual_frequency AS ENUM ('annual_upfront', 'monthly_prorated');

-- â”€â”€ Booking & Payments â”€â”€
CREATE TYPE booking_status AS ENUM (
    'pending_payment',
    'confirmed',
    'checked_in',
    'completed',
    'no_show',
    'cancelled'
);
CREATE TYPE payment_method AS ENUM ('card', 'face_pay', 'digital_wallet', 'cash');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE attendee_type AS ENUM ('adult', 'child');
CREATE TYPE slot_constraint_type AS ENUM (
    'maintenance',
    'private_event',
    'safety_incident',
    'weather',
    'staffing',
    'other'
);

-- â”€â”€ Procurement â”€â”€
CREATE TYPE po_status AS ENUM ('draft', 'sent', 'partially_received', 'completed', 'cancelled');

-- â”€â”€ POS & Inventory â”€â”€
CREATE TYPE order_status AS ENUM ('preparing', 'completed', 'cancelled');
CREATE TYPE disposal_reason AS ENUM (
    'expired',
    'damaged',
    'contaminated',
    'preparation_error',
    'overproduction',
    'quality_defect'
);
CREATE TYPE inventory_task_status AS ENUM (
    'pending',
    'in_progress',
    'pending_review',
    'completed',
    'cancelled'
);

-- â”€â”€ Materials (unified material master) â”€â”€
CREATE TYPE material_type AS ENUM (
    'raw',              -- ROH: raw material (coffee beans, tomatoes, milk)
    'semi_finished',    -- HALB: pre-made component (burger sauce, dough batch)
    'finished',         -- FERT: assembled sellable item (latte, burger)
    'trading',          -- HAWA: buy-and-sell-as-is (t-shirts, souvenirs)
    'consumable',       -- NLAG: non-stocked consumable (napkins, cleaning supplies)
    'service'           -- DIEN: non-physical (add-on experiences, gift wrapping)
);

-- â”€â”€ Communications â”€â”€
CREATE TYPE announcement_target_type AS ENUM ('global', 'role', 'org_unit', 'user');

-- â”€â”€ Marketing â”€â”€
CREATE TYPE lifecycle_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

-- â”€â”€ Incidents & Safety â”€â”€
CREATE TYPE incident_category AS ENUM (
    'fire', 'safety_hazard', 'biohazard', 'suspicious_package', 'spill',
    'medical_emergency', 'heat_exhaustion', 'guest_injury',
    'theft', 'vandalism', 'unauthorized_access', 'altercation',
    'guest_complaint', 'lost_child', 'found_child', 'crowd_congestion',
    'lost_property', 'found_property',
    'other',
    'structural', 'prop_damage',
    'equipment_failure', 'pos_failure', 'hardware_failure',
    'power_outage', 'network_outage'
);
CREATE TYPE incident_status AS ENUM ('open', 'resolved');

-- â”€â”€ Maintenance â”€â”€
CREATE TYPE mo_topology AS ENUM ('remote', 'onsite');
CREATE TYPE mo_status AS ENUM ('draft', 'scheduled', 'active', 'completed', 'cancelled');

-- â”€â”€ Vehicles â”€â”€
CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'retired');

-- â”€â”€ Surveys & Reports â”€â”€
CREATE TYPE survey_type AS ENUM ('post_visit', 'nps', 'csat', 'exit_survey', 'staff_captured');
CREATE TYPE survey_sentiment AS ENUM ('positive', 'neutral', 'negative');
CREATE TYPE survey_source AS ENUM ('in_app', 'email', 'kiosk', 'qr_code');
CREATE TYPE report_status AS ENUM ('processing', 'completed', 'failed');


-- ============================================================================
-- 2. UTILITY FUNCTIONS
-- ============================================================================

-- 2a. set_updated_at() â€” generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2b. Application configuration table (replaces ALTER DATABASE app.settings.*)
-- Stores non-secret config. Secrets go in vault.secrets (see below).
CREATE TABLE IF NOT EXISTS public.app_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY “app_config_select” ON public.app_config FOR SELECT TO authenticated USING (true);
CREATE POLICY “app_config_admin_write” ON public.app_config FOR ALL TO authenticated
    USING ((auth.jwt()->'app_metadata'->'domains'->'system') ? 'u')
    WITH CHECK ((auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE TRIGGER trg_app_config_updated_at BEFORE UPDATE ON public.app_config
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed required config keys
INSERT INTO public.app_config (key, value, description) VALUES
    ('facility_timezone', 'Asia/Kuala_Lumpur', 'IANA timezone for attendance, cron, and reporting'),
    ('supabase_url', '', 'Project URL â€” set after project creation')
ON CONFLICT (key) DO NOTHING;

-- Vault for secrets (supabase_vault + pgsodium are pre-installed on hosted Supabase)
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Seed vault secrets (empty â€” populate via Dashboard > Vault after deployment)
-- Required keys: 'service_role_key', 'cron_secret'
-- Dashboard path: Database > Vault > Secrets > New Secret

-- 2c. get_app_config(key) â€” unified config reader (replaces current_setting)
CREATE OR REPLACE FUNCTION public.get_app_config(p_key TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
    SELECT value FROM public.app_config WHERE key = p_key;
$$;

-- 2d. get_vault_secret(key) â€” reads from vault.decrypted_secrets
CREATE OR REPLACE FUNCTION public.get_vault_secret(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
    SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = p_name LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_vault_secret FROM PUBLIC, anon, authenticated;

-- 2e. audit_trigger_fn() â€” generic audit trail trigger
-- On UPDATE: logs ONLY changed columns (enterprise diff-only pattern).
-- On INSERT/DELETE: logs full row for forensic recovery.
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    _old  JSONB;
    _new  JSONB;
    _diff JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        _old := NULL;
        _new := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        _old := to_jsonb(OLD);
        _new := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        _old := NULL;
        SELECT jsonb_object_agg(key, value) INTO _diff
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key;
        _new := _diff;
    END IF;

    INSERT INTO public.system_audit_log (action, entity_type, entity_id, old_values, new_values, performed_by)
    VALUES (
        lower(TG_OP),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id)::text,
        _old,
        _new,
        (SELECT auth.uid())
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;




-- ============================================================================
-- 3. IDENTITY & ACCESS MANAGEMENT (IAM), ORG UNITS, RBAC
-- ============================================================================

-- â”€â”€ 3a. Tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Organizational hierarchy (replaces flat departments table)
CREATE TABLE org_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES org_units(id) ON DELETE RESTRICT,
    unit_type TEXT NOT NULL CHECK (unit_type IN ('company', 'division', 'department')),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    path extensions.ltree NOT NULL,
    manager_id UUID,  -- deferred FK â†’ profiles(id), added after profiles table
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    access_level access_level NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE staff_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name TEXT NOT NULL,
    personal_email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    national_id_enc TEXT,
    bank_name TEXT,
    bank_account_enc TEXT,
    salary_enc TEXT,
    org_unit_id UUID REFERENCES org_units(id) ON DELETE RESTRICT,
    org_unit_path extensions.ltree,  -- denormalized from org_units.path (R14), populated by trigger
    contract_start DATE NOT NULL,
    contract_end DATE,
    kin_name TEXT,
    kin_relationship TEXT,
    kin_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    email TEXT UNIQUE,
    employee_id TEXT UNIQUE,
    staff_record_id UUID UNIQUE REFERENCES staff_records(id) ON DELETE RESTRICT,
    employment_status employment_status DEFAULT 'pending',
    password_set BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_reason TEXT,
    locked_at TIMESTAMPTZ,
    locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_permission_update TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2c. is_claims_fresh() â€” JWT claims staleness guard
-- Used in every RLS policy to reject requests with stale JWT tokens.
-- If the DB timestamp is newer than the JWT timestamp, the policy rejects
-- the request, forcing the frontend to call supabase.auth.refreshSession().
CREATE OR REPLACE FUNCTION public.is_claims_fresh()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER STABLE
SET search_path = ''
AS $$
    SELECT COALESCE(
        (
            (SELECT auth.jwt()) -> 'app_metadata' ->> 'last_permission_update'
        )::TIMESTAMPTZ
        >=
        (
            SELECT p.last_permission_update
            FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
        ),
        true  -- Allow if no last_permission_update in JWT yet (fresh user, no role assigned)
    )
$$;

-- Deferred FK: org_units.manager_id â†’ profiles(id)
ALTER TABLE org_units ADD CONSTRAINT org_units_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;

CREATE TABLE iam_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type iam_request_type NOT NULL,
    status iam_request_status DEFAULT 'pending_it',
    staff_record_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE RESTRICT,
    target_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    current_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    hr_remark TEXT,
    it_remark TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    invite_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RBAC domain definitions
CREATE TABLE permission_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Role â†’ domain permission mapping (full CRUD separation)
CREATE TABLE role_domain_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES permission_domains(id) ON DELETE CASCADE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_read BOOLEAN NOT NULL DEFAULT FALSE,
    can_update BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (role_id, domain_id)
);


-- â”€â”€ 3b. Auth Sync Triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync email changes from auth.users to profiles
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles
    SET email = new.email
    WHERE id = new.id;
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    WHEN (OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION public.handle_user_update();

-- Role change + staff_record change sync: resolves staff_role, access_level,
-- org_unit_path, AND full domains JSONB from role_domain_permissions.
-- Injects ALL into auth.users.raw_app_meta_data. (R16)
CREATE OR REPLACE FUNCTION public.handle_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    _role_name TEXT;
    _access_level TEXT;
    _org_unit_path TEXT;
    _domains JSONB;
    _now TIMESTAMPTZ := NOW();
BEGIN
    IF NEW.role_id IS DISTINCT FROM OLD.role_id
       OR NEW.staff_record_id IS DISTINCT FROM OLD.staff_record_id THEN

        -- Resolve role info
        SELECT r.name, r.access_level::TEXT INTO _role_name, _access_level
        FROM public.roles r WHERE r.id = NEW.role_id;

        -- Resolve org_unit_path from staff_record â†’ org_unit
        SELECT ou.path::TEXT INTO _org_unit_path
        FROM public.staff_records sr
        JOIN public.org_units ou ON ou.id = sr.org_unit_id
        WHERE sr.id = NEW.staff_record_id;

        -- Resolve domain permissions as JSONB: {"hr": ["c","r","u","d"], ...}
        SELECT COALESCE(jsonb_object_agg(pd.code,
            to_jsonb(ARRAY_REMOVE(ARRAY[
                CASE WHEN rdp.can_create THEN 'c' END,
                CASE WHEN rdp.can_read   THEN 'r' END,
                CASE WHEN rdp.can_update THEN 'u' END,
                CASE WHEN rdp.can_delete THEN 'd' END
            ], NULL))
        ), '{}'::jsonb) INTO _domains
        FROM public.role_domain_permissions rdp
        JOIN public.permission_domains pd ON pd.id = rdp.domain_id
        WHERE rdp.role_id = NEW.role_id
          AND (rdp.can_create OR rdp.can_read OR rdp.can_update OR rdp.can_delete);

        UPDATE auth.users SET raw_app_meta_data =
            COALESCE(raw_app_meta_data, '{}'::jsonb)
            || jsonb_build_object(
                'staff_role', _role_name,
                'access_level', _access_level,
                'org_unit_path', _org_unit_path,
                'domains', _domains,
                'last_permission_update', _now
            )
        WHERE id = NEW.id;

        NEW.last_permission_update := _now;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_role_changed
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_profile_role_change();

-- JWT domain propagation on permission table changes (R16)
-- Fires on role_domain_permissions INSERT/UPDATE/DELETE.
-- Resolves full domain set for affected role and injects into ALL users with that role.
CREATE OR REPLACE FUNCTION public.fn_role_domain_permissions_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    _affected_role_id UUID;
    _domains JSONB;
    _now TIMESTAMPTZ := NOW();
BEGIN
    _affected_role_id := COALESCE(NEW.role_id, OLD.role_id);

    -- Resolve full domain permission set for this role
    SELECT COALESCE(jsonb_object_agg(pd.code,
        to_jsonb(ARRAY_REMOVE(ARRAY[
            CASE WHEN rdp.can_create THEN 'c' END,
            CASE WHEN rdp.can_read   THEN 'r' END,
            CASE WHEN rdp.can_update THEN 'u' END,
            CASE WHEN rdp.can_delete THEN 'd' END
        ], NULL))
    ), '{}'::jsonb) INTO _domains
    FROM public.role_domain_permissions rdp
    JOIN public.permission_domains pd ON pd.id = rdp.domain_id
    WHERE rdp.role_id = _affected_role_id
      AND (rdp.can_create OR rdp.can_read OR rdp.can_update OR rdp.can_delete);

    -- Inject domains into all users with this role
    UPDATE auth.users u SET raw_app_meta_data =
        COALESCE(u.raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
            'domains', _domains,
            'last_permission_update', _now
        )
    FROM public.profiles p
    WHERE p.role_id = _affected_role_id
      AND u.id = p.id;

    -- Stamp profiles for is_claims_fresh() invalidation
    UPDATE public.profiles
    SET last_permission_update = _now
    WHERE role_id = _affected_role_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_role_domain_permissions_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.role_domain_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_role_domain_permissions_changed();


-- â”€â”€ 3c. Seed Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Roles (19)
INSERT INTO roles (name, display_name, access_level) VALUES
    ('it_admin',                  'IT Admin',                    'admin'),
    ('business_admin',            'Business Admin',              'admin'),
    ('pos_manager',               'POS Manager',                 'manager'),
    ('procurement_manager',       'Procurement Manager',         'manager'),
    ('maintenance_manager',       'Maintenance Manager',         'manager'),
    ('inventory_manager',         'Inventory Manager',           'manager'),
    ('marketing_manager',         'Marketing Manager',           'manager'),
    ('human_resources_manager',   'Human Resources Manager',     'manager'),
    ('compliance_manager',        'Compliance Manager',          'manager'),
    ('operations_manager',        'Operations Manager',          'manager'),
    ('fnb_crew',                  'F&B Crew',                    'crew'),
    ('service_crew',              'Service Crew',                'crew'),
    ('giftshop_crew',             'Gift Shop Crew',              'crew'),
    ('runner_crew',               'Runner Crew',                 'crew'),
    ('security_crew',             'Security Crew',               'crew'),
    ('health_crew',               'Health Crew',                 'crew'),
    ('cleaning_crew',             'Cleaning Crew',               'crew'),
    ('experience_crew',           'Experience Crew',             'crew'),
    ('internal_maintenance_crew', 'Internal Maintenance Crew',   'crew')
ON CONFLICT (name) DO NOTHING;

-- Org units hierarchy (DD2)
INSERT INTO org_units (parent_id, code, name, unit_type, path) VALUES
    (NULL, 'agartha', 'Agartha', 'company', 'agartha')
ON CONFLICT (code) DO NOTHING;

INSERT INTO org_units (parent_id, code, name, unit_type, path) VALUES
    ((SELECT id FROM org_units WHERE code = 'agartha'), 'ops',       'Operations', 'division', 'agartha.ops'),
    ((SELECT id FROM org_units WHERE code = 'agartha'), 'support',   'Support',    'division', 'agartha.support'),
    ((SELECT id FROM org_units WHERE code = 'agartha'), 'corp',      'Corporate',  'division', 'agartha.corp'),
    ((SELECT id FROM org_units WHERE code = 'agartha'), 'logistics', 'Logistics',  'department', 'agartha.logistics')
ON CONFLICT (code) DO NOTHING;

INSERT INTO org_units (parent_id, code, name, unit_type, path) VALUES
    ((SELECT id FROM org_units WHERE code = 'ops'), 'fnb',         'Food & Beverage', 'department', 'agartha.ops.fnb'),
    ((SELECT id FROM org_units WHERE code = 'ops'), 'giftshop',    'Gift Shop',       'department', 'agartha.ops.giftshop'),
    ((SELECT id FROM org_units WHERE code = 'ops'), 'experiences', 'Experiences',     'department', 'agartha.ops.experiences'),
    ((SELECT id FROM org_units WHERE code = 'ops'), 'security',    'Security',        'department', 'agartha.ops.security')
ON CONFLICT (code) DO NOTHING;

INSERT INTO org_units (parent_id, code, name, unit_type, path) VALUES
    ((SELECT id FROM org_units WHERE code = 'support'), 'maintenance_dept', 'Maintenance', 'department', 'agartha.support.maintenance'),
    ((SELECT id FROM org_units WHERE code = 'support'), 'cleaning',         'Cleaning',    'department', 'agartha.support.cleaning'),
    ((SELECT id FROM org_units WHERE code = 'support'), 'health',           'Health',      'department', 'agartha.support.health')
ON CONFLICT (code) DO NOTHING;

INSERT INTO org_units (parent_id, code, name, unit_type, path) VALUES
    ((SELECT id FROM org_units WHERE code = 'corp'), 'hr',         'Human Resources', 'department', 'agartha.corp.hr'),
    ((SELECT id FROM org_units WHERE code = 'corp'), 'it',         'IT',              'department', 'agartha.corp.it'),
    ((SELECT id FROM org_units WHERE code = 'corp'), 'marketing',  'Marketing',       'department', 'agartha.corp.marketing'),
    ((SELECT id FROM org_units WHERE code = 'corp'), 'compliance', 'Compliance',      'department', 'agartha.corp.compliance')
ON CONFLICT (code) DO NOTHING;

-- Permission domains (13)
INSERT INTO permission_domains (code, name, description) VALUES
    ('system',        'System',                'Roles, org units, locations, POS points, units, UOM, storage bins'),
    ('hr',            'Human Resources',       'Staff records, profiles, IAM, shifts, rosters, leave, attendance'),
    ('inventory',     'Inventory',             'Materials master, stock cache, valuation, movement types'),
    ('inventory_ops', 'Inventory Operations',  'Goods movements, write-offs, requisitions, reconciliations, equipment'),
    ('pos',           'Point of Sale',         'Orders, order items, sales data, display categories, modifiers, BOM, price lists'),
    ('procurement',   'Procurement',           'Purchase orders, PO items, suppliers'),
    ('booking',       'Booking',               'Experiences, tiers, scheduler, time slots, bookings, payments'),
    ('ops',           'Operations',            'Incidents, zones, zone telemetry, crew zones, vehicles'),
    ('it',            'IT Infrastructure',     'Devices, device types, heartbeats, VLANs'),
    ('maintenance',   'Maintenance',           'Maintenance vendors, maintenance orders'),
    ('marketing',     'Marketing',             'Campaigns, promo codes, promo valid tiers'),
    ('comms',         'Communications',        'Announcements, announcement targets, announcement reads'),
    ('reports',       'Reports & Compliance',  'Reports, report executions, survey responses, system audit log')
ON CONFLICT (code) DO NOTHING;

-- Role-domain permissions matrix (DD8)
-- Admins: all domains, full CRUD
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, true, true, true, true
FROM roles rl CROSS JOIN permission_domains pd
WHERE rl.name IN ('it_admin', 'business_admin')
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- human_resources_manager: hr:crud, comms:cru, system:r, reports:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('hr',      true,  true,  true,  true),
    ('comms',   true,  true,  true,  false),
    ('system',  false, true,  false, false),
    ('reports', false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'human_resources_manager'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- inventory_manager: inventory:crud, inventory_ops:crud, procurement:r, comms:cru, system:r, reports:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('inventory',     true,  true,  true,  true),
    ('inventory_ops', true,  true,  true,  true),
    ('procurement',   false, true,  false, false),
    ('comms',         true,  true,  true,  false),
    ('system',        false, true,  false, false),
    ('reports',       false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'inventory_manager'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- pos_manager: pos:crud, inventory:r, comms:cru, system:r, reports:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('pos',       true,  true,  true,  true),
    ('inventory', false, true,  false, false),
    ('comms',     true,  true,  true,  false),
    ('system',    false, true,  false, false),
    ('reports',   false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'pos_manager'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- procurement_manager: procurement:crud, inventory:r, comms:cru, system:r, reports:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('procurement', true,  true,  true,  true),
    ('inventory',   false, true,  false, false),
    ('comms',       true,  true,  true,  false),
    ('system',      false, true,  false, false),
    ('reports',     false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'procurement_manager'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- operations_manager: ops:crud, booking:crud, maintenance:r, comms:cru, system:r, reports:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('ops',         true,  true,  true,  true),
    ('booking',     true,  true,  true,  true),
    ('maintenance', false, true,  false, false),
    ('comms',       true,  true,  true,  false),
    ('system',      false, true,  false, false),
    ('reports',     false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'operations_manager'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- maintenance_manager: maintenance:crud, it:cru, comms:cru, system:r, reports:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('maintenance', true,  true,  true,  true),
    ('it',          true,  true,  true,  false),
    ('ops',         false, false, true,  false),
    ('comms',       true,  true,  true,  false),
    ('system',      false, true,  false, false),
    ('reports',     false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'maintenance_manager'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- marketing_manager: marketing:crud, comms:cru, system:r, reports:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('marketing', true,  true,  true,  true),
    ('comms',     true,  true,  true,  false),
    ('system',    false, true,  false, false),
    ('reports',   false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'marketing_manager'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- compliance_manager: reports:crud, comms:cru, system:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('reports', true,  true,  true,  true),
    ('comms',   true,  true,  true,  false),
    ('system',  false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'compliance_manager'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- fnb_crew: pos:cru, inventory_ops:cru, hr:cr, system:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('pos',           true,  true,  true,  false),
    ('inventory_ops', true,  true,  true,  false),
    ('hr',            true,  true,  false, false),
    ('system',        false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'fnb_crew'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- giftshop_crew: pos:cru, inventory_ops:cru, hr:cr, system:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('pos',           true,  true,  true,  false),
    ('inventory_ops', true,  true,  true,  false),
    ('hr',            true,  true,  false, false),
    ('system',        false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'giftshop_crew'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- runner_crew: inventory_ops:cru, procurement:ru, hr:cr, system:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('inventory_ops', true,  true,  true,  false),
    ('procurement',   false, true,  true,  false),
    ('hr',            true,  true,  false, false),
    ('system',        false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'runner_crew'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- service_crew: booking:ru, ops:cru, hr:cr, system:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('booking', false, true,  true,  false),
    ('ops',     true,  true,  true,  false),
    ('hr',      true,  true,  false, false),
    ('system',  false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'service_crew'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- security_crew: ops:cru, hr:cr, system:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('ops',    true,  true,  true,  false),
    ('hr',     true,  true,  false, false),
    ('system', false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'security_crew'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- health_crew: ops:cru, inventory_ops:cru, hr:cr, system:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('ops',           true,  true,  true,  false),
    ('inventory_ops', true,  true,  true,  false),
    ('hr',            true,  true,  false, false),
    ('system',        false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'health_crew'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- cleaning_crew: inventory_ops:cru, hr:cr, system:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('inventory_ops', true,  true,  true,  false),
    ('hr',            true,  true,  false, false),
    ('system',        false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'cleaning_crew'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- experience_crew: booking:ru, ops:cru, hr:cr, system:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('booking', false, true,  true,  false),
    ('ops',     true,  true,  true,  false),
    ('hr',      true,  true,  false, false),
    ('system',  false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'experience_crew'
ON CONFLICT (role_id, domain_id) DO NOTHING;

-- internal_maintenance_crew: maintenance:cru, it:r, hr:cr, system:r
INSERT INTO role_domain_permissions (role_id, domain_id, can_create, can_read, can_update, can_delete)
SELECT rl.id, pd.id, v.cc, v.cr, v.cu, v.cd
FROM roles rl
CROSS JOIN (VALUES
    ('maintenance', true,  true,  true,  false),
    ('it',          false, true,  false, false),
    ('hr',          true,  true,  false, false),
    ('system',      false, true,  false, false)
) AS v(domain_code, cc, cr, cu, cd)
JOIN permission_domains pd ON pd.code = v.domain_code
WHERE rl.name = 'internal_maintenance_crew'
ON CONFLICT (role_id, domain_id) DO NOTHING;


-- â”€â”€ 3d. Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_domain_permissions ENABLE ROW LEVEL SECURITY;

-- roles: Tier 1 (system) â€” universal read, domain-gated write
CREATE POLICY "roles_select" ON roles FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "roles_insert" ON roles FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c');
CREATE POLICY "roles_update" ON roles FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE POLICY "roles_delete" ON roles FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

-- org_units: Tier 1 (system)
CREATE POLICY "org_units_select" ON org_units FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "org_units_insert" ON org_units FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c');
CREATE POLICY "org_units_update" ON org_units FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE POLICY "org_units_delete" ON org_units FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

-- profiles: Tier 1 (hr) â€” universal read, domain-gated write
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c');
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- staff_records: Tier 4 (hr) â€” row-scoped via org_unit_path
-- Uses id (not staff_record_id) for self-match since this IS the staff record table
CREATE POLICY "staff_records_select" ON staff_records FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'
        AND (
            id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "staff_records_insert" ON staff_records FOR INSERT TO authenticated
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c'
        AND (
            id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "staff_records_update" ON staff_records FOR UPDATE TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u'
    )
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u'
    );
CREATE POLICY "staff_records_delete" ON staff_records FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- iam_requests: Tier 3 (hr) â€” domain-gated CRUD
CREATE POLICY "iam_requests_select" ON iam_requests FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r');
CREATE POLICY "iam_requests_insert" ON iam_requests FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c');
CREATE POLICY "iam_requests_update" ON iam_requests FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "iam_requests_delete" ON iam_requests FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- permission_domains: Tier 1 (system)
CREATE POLICY "permission_domains_select" ON permission_domains FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "permission_domains_insert" ON permission_domains FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c');
CREATE POLICY "permission_domains_update" ON permission_domains FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE POLICY "permission_domains_delete" ON permission_domains FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

-- role_domain_permissions: Tier 3 (system)
CREATE POLICY "role_domain_permissions_select" ON role_domain_permissions FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'r');
CREATE POLICY "role_domain_permissions_insert" ON role_domain_permissions FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c');
CREATE POLICY "role_domain_permissions_update" ON role_domain_permissions FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE POLICY "role_domain_permissions_delete" ON role_domain_permissions FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');


-- â”€â”€ 3e. Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE INDEX idx_org_units_parent_id ON org_units(parent_id);
CREATE INDEX idx_org_units_manager_id ON org_units(manager_id);
CREATE INDEX idx_org_units_path ON org_units USING gist (path);

CREATE INDEX idx_staff_records_org_unit_id ON staff_records(org_unit_id);
CREATE INDEX idx_staff_records_org_unit_path ON staff_records USING gist (org_unit_path);

CREATE INDEX idx_profiles_role_id ON profiles(role_id);
CREATE INDEX idx_profiles_staff_record_id ON profiles(staff_record_id);
CREATE INDEX idx_profiles_locked_by ON profiles(locked_by);

CREATE INDEX idx_iam_requests_staff_record_id ON iam_requests(staff_record_id);
CREATE INDEX idx_iam_requests_target_role_id ON iam_requests(target_role_id);
CREATE INDEX idx_iam_requests_current_role_id ON iam_requests(current_role_id);
CREATE INDEX idx_iam_requests_approved_by ON iam_requests(approved_by);

CREATE INDEX idx_role_domain_permissions_role_id ON role_domain_permissions(role_id);
CREATE INDEX idx_role_domain_permissions_domain_id ON role_domain_permissions(domain_id);


-- ============================================================================
-- 4. FACILITY, ZONES, DEVICES
-- ============================================================================

-- â”€â”€ 4a. Tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    org_unit_id UUID REFERENCES org_units(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Hierarchical category tree (replaces flat product_categories + item_categories)
CREATE TABLE material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES material_categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    depth INTEGER NOT NULL DEFAULT 0,
    path extensions.ltree NOT NULL,
    is_bom_eligible BOOLEAN DEFAULT FALSE,
    is_consumable BOOLEAN DEFAULT FALSE,
    default_valuation TEXT,
    accounting_category TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (parent_id, name)
);

-- Junction: which material categories a location is allowed to stock
CREATE TABLE location_allowed_categories (
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES material_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (location_id, category_id)
);

CREATE TABLE pos_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    is_active BOOLEAN DEFAULT TRUE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE zone_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    current_occupancy INTEGER DEFAULT 0,
    temperature NUMERIC,
    humidity NUMERIC,
    co2_level NUMERIC,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE crew_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_record_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    org_unit_path extensions.ltree,  -- denormalized for Tier 4 RLS (populated by trigger)
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Placeholder for future warehouse bin management (DD5)
CREATE TABLE storage_bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT,
    bin_type TEXT,
    capacity NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (location_id, code)
);

-- IT Infrastructure
CREATE TABLE device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE vlans (
    id SERIAL PRIMARY KEY,
    vlan_id INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE RESTRICT,
    serial_number TEXT UNIQUE,
    asset_tag TEXT UNIQUE,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    status device_status DEFAULT 'online',
    ip_address INET,
    mac_address MACADDR,
    vlan_id INTEGER REFERENCES vlans(vlan_id) ON DELETE SET NULL,
    parent_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    port_number INTEGER,
    manufacturer TEXT,
    model TEXT,
    firmware_version TEXT,
    commission_date DATE,
    warranty_expiry DATE,
    maintenance_vendor_id UUID,  -- deferred FK â†’ maintenance_vendors(id), added in Section 12
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE device_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    status heartbeat_status NOT NULL DEFAULT 'online',
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);


-- â”€â”€ 4b. Seed Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO locations (name) VALUES
    ('Warehouse'), ('Cafe'), ('Giftshop'), ('Agartha World'), ('Entrance')
ON CONFLICT (name) DO NOTHING;

INSERT INTO pos_points (name, display_name, location_id) VALUES
    ('cafe',            'CafÃ©',             (SELECT id FROM locations WHERE name = 'Cafe')),
    ('giftshop',        'Gift Shop',        (SELECT id FROM locations WHERE name = 'Giftshop')),
    ('vending_machine', 'Vending Machine',  (SELECT id FROM locations WHERE name = 'Agartha World'))
ON CONFLICT (name) DO NOTHING;

INSERT INTO device_types (name, display_name) VALUES
    ('pos_terminal',    'POS Terminal'),
    ('ip_camera',       'IP Camera'),
    ('access_reader',   'Access Reader'),
    ('iot_sensor',      'IoT Sensor'),
    ('network_switch',  'Network Switch'),
    ('router',          'Router'),
    ('wireless_ap',     'Wireless Access Point'),
    ('kiosk',           'Kiosk'),
    ('display',         'Display'),
    ('printer',         'Printer'),
    ('server',          'Server')
ON CONFLICT (name) DO NOTHING;


-- â”€â”€ 4c. Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_allowed_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vlans ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_heartbeats ENABLE ROW LEVEL SECURITY;

-- locations: Tier 1 (system)
CREATE POLICY "locations_select" ON locations FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "locations_insert" ON locations FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c');
CREATE POLICY "locations_update" ON locations FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE POLICY "locations_delete" ON locations FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

-- material_categories: Tier 1 (procurement OR pos) â€” both domains can manage category hierarchy
CREATE POLICY "material_categories_select" ON material_categories FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "material_categories_insert" ON material_categories FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'c' OR
        (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c'));
CREATE POLICY "material_categories_update" ON material_categories FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u' OR
        (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u'))
    WITH CHECK (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u' OR
        (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u'));
CREATE POLICY "material_categories_delete" ON material_categories FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'd' OR
        (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd'));

-- location_allowed_categories: Tier 1 (system)
CREATE POLICY "location_allowed_categories_select" ON location_allowed_categories FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "location_allowed_categories_insert" ON location_allowed_categories FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c');
CREATE POLICY "location_allowed_categories_update" ON location_allowed_categories FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE POLICY "location_allowed_categories_delete" ON location_allowed_categories FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

-- pos_points: Tier 1 (system)
CREATE POLICY "pos_points_select" ON pos_points FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "pos_points_insert" ON pos_points FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c');
CREATE POLICY "pos_points_update" ON pos_points FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE POLICY "pos_points_delete" ON pos_points FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

-- zones: Tier 1 (ops + system) â€” ops manages capacity/active state, system creates during facility setup
CREATE POLICY "zones_select" ON zones FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "zones_insert" ON zones FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'c' OR
        (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c'));
CREATE POLICY "zones_update" ON zones FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'u' OR
        (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u'))
    WITH CHECK (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'u' OR
        (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u'));
CREATE POLICY "zones_delete" ON zones FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'd' OR
        (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd'));

-- zone_telemetry: Tier 1 (ops)
CREATE POLICY "zone_telemetry_select" ON zone_telemetry FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "zone_telemetry_insert" ON zone_telemetry FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'c');
CREATE POLICY "zone_telemetry_update" ON zone_telemetry FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'u');
CREATE POLICY "zone_telemetry_delete" ON zone_telemetry FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'd');

-- crew_zones: Tier 4 (ops) â€” row-scoped via org_unit_path
-- Note: org_unit_path added to crew_zones (not in R14 explicit list) for zero-subquery Tier 4 RLS
CREATE POLICY "crew_zones_select" ON crew_zones FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'r'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
-- Tier 2 universal INSERT: zone declaration is a facility-wide safety operation â€” all crew must scan
CREATE POLICY "crew_zones_insert" ON crew_zones FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh());
CREATE POLICY "crew_zones_update" ON crew_zones FOR UPDATE TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'u'
    )
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'u'
    );
CREATE POLICY "crew_zones_delete" ON crew_zones FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'd');

-- storage_bins: Tier 1 (system)
CREATE POLICY "storage_bins_select" ON storage_bins FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "storage_bins_insert" ON storage_bins FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c');
CREATE POLICY "storage_bins_update" ON storage_bins FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE POLICY "storage_bins_delete" ON storage_bins FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

-- device_types: Tier 1 (it)
CREATE POLICY "device_types_select" ON device_types FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "device_types_insert" ON device_types FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'c');
CREATE POLICY "device_types_update" ON device_types FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'u');
CREATE POLICY "device_types_delete" ON device_types FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'd');

-- vlans: Tier 3 (it)
CREATE POLICY "vlans_select" ON vlans FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'r');
CREATE POLICY "vlans_insert" ON vlans FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'c');
CREATE POLICY "vlans_update" ON vlans FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'u');
CREATE POLICY "vlans_delete" ON vlans FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'd');

-- devices: Tier 3 (it)
CREATE POLICY "devices_select" ON devices FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'r');
CREATE POLICY "devices_insert" ON devices FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'c');
CREATE POLICY "devices_update" ON devices FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'u');
CREATE POLICY "devices_delete" ON devices FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'd');

-- device_heartbeats: Tier 3 (it)
CREATE POLICY "device_heartbeats_select" ON device_heartbeats FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'r');
CREATE POLICY "device_heartbeats_insert" ON device_heartbeats FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'c');
CREATE POLICY "device_heartbeats_update" ON device_heartbeats FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'u');
CREATE POLICY "device_heartbeats_delete" ON device_heartbeats FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'it') ? 'd');


-- â”€â”€ 4d. Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE INDEX idx_locations_org_unit_id ON locations(org_unit_id);

CREATE INDEX idx_material_categories_parent_id ON material_categories(parent_id);
CREATE INDEX idx_material_categories_path ON material_categories USING gist (path);

CREATE INDEX idx_pos_points_location_id ON pos_points(location_id);

CREATE INDEX idx_zones_location_id ON zones(location_id);

CREATE INDEX idx_zone_telemetry_zone_id ON zone_telemetry(zone_id);

CREATE INDEX idx_crew_zones_staff_record_id ON crew_zones(staff_record_id);
CREATE INDEX idx_crew_zones_zone_id ON crew_zones(zone_id);
CREATE INDEX idx_crew_zones_scanned_at ON crew_zones(scanned_at);
CREATE INDEX idx_crew_zones_org_unit_path ON crew_zones USING gist (org_unit_path);

CREATE INDEX idx_storage_bins_location_id ON storage_bins(location_id);

CREATE INDEX idx_devices_device_type_id ON devices(device_type_id);
CREATE INDEX idx_devices_zone_id ON devices(zone_id);
CREATE INDEX idx_devices_vlan_id ON devices(vlan_id);
CREATE INDEX idx_devices_parent_device_id ON devices(parent_device_id);
CREATE INDEX idx_devices_maintenance_vendor_id ON devices(maintenance_vendor_id);
CREATE INDEX idx_devices_metadata ON devices USING gin (metadata);

CREATE INDEX idx_device_heartbeats_device_id ON device_heartbeats(device_id);
CREATE INDEX idx_device_heartbeats_recorded_at ON device_heartbeats(recorded_at DESC);
CREATE INDEX idx_device_heartbeats_device_recorded ON device_heartbeats(device_id, recorded_at DESC);


-- ============================================================================
-- 5. HR & WORKFORCE MANAGEMENT
-- ============================================================================

-- â”€â”€ 5a. Tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Baseline enterprise leave types. Downstream: leave_policy_entitlements and
-- leave_requests both require rows here. Mirrored in supabase/seed.sql so
-- existing environments (where init_schema already ran without this block)
-- still get populated on the next seed run.
INSERT INTO leave_types (code, name, is_paid, is_active) VALUES
    ('annual', 'Annual Leave', TRUE,  TRUE),
    ('sick',   'Sick Leave',   TRUE,  TRUE),
    ('unpaid', 'Unpaid Leave', FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE shift_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color TEXT DEFAULT '#38bdf8' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_early_clock_in_minutes INTEGER NOT NULL DEFAULT 60 CHECK (max_early_clock_in_minutes >= 0),
    max_late_clock_out_minutes INTEGER NOT NULL DEFAULT 60 CHECK (max_late_clock_out_minutes >= 0),
    max_late_clock_in_minutes INTEGER NOT NULL DEFAULT 120 CHECK (max_late_clock_in_minutes >= 0),
    grace_late_arrival_minutes INTEGER NOT NULL DEFAULT 5 CHECK (grace_late_arrival_minutes >= 0),
    grace_early_departure_minutes INTEGER NOT NULL DEFAULT 5 CHECK (grace_early_departure_minutes >= 0),
    break_duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (break_duration_minutes >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE roster_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    cycle_length_days INTEGER NOT NULL CHECK (cycle_length_days > 0 AND cycle_length_days <= 366),
    anchor_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE public_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE roster_template_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES roster_templates(id) ON DELETE CASCADE,
    day_index INTEGER NOT NULL CHECK (day_index >= 1),
    shift_type_id UUID NOT NULL REFERENCES shift_types(id) ON DELETE RESTRICT,
    UNIQUE (template_id, day_index),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE staff_roster_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_record_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE RESTRICT,
    roster_template_id UUID NOT NULL REFERENCES roster_templates(id) ON DELETE RESTRICT,
    effective_start_date DATE NOT NULL,
    effective_end_date DATE,
    org_unit_path extensions.ltree,  -- denormalized for Tier 4 RLS (populated by trigger)
    EXCLUDE USING gist (
        staff_record_id WITH =,
        daterange(effective_start_date, effective_end_date, '[]') WITH &&
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE leave_policy_entitlements (
    policy_id UUID NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    days_per_year NUMERIC NOT NULL CHECK (days_per_year >= 0),
    frequency accrual_frequency NOT NULL DEFAULT 'annual_upfront',
    PRIMARY KEY (policy_id, leave_type_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Link staff to their leave policy (deferred â€” staff_records created in Chunk 2)
ALTER TABLE staff_records ADD COLUMN IF NOT EXISTS leave_policy_id UUID
    REFERENCES leave_policies(id) ON DELETE SET NULL;

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_record_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE RESTRICT,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    requested_days NUMERIC NOT NULL CHECK (requested_days > 0),
    reason TEXT,
    status leave_request_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    org_unit_path extensions.ltree,  -- denormalized for Tier 4 RLS (R14)
    CHECK (start_date <= end_date),
    CHECK (status != 'rejected' OR rejection_reason IS NOT NULL),
    CHECK (
        status NOT IN ('approved', 'rejected') OR
        (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    ),
    EXCLUDE USING gist (
        staff_record_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
    ) WHERE (status IN ('pending', 'approved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE shift_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_record_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE RESTRICT,
    shift_date DATE NOT NULL,
    shift_type_id UUID NOT NULL REFERENCES shift_types(id) ON DELETE RESTRICT,
    expected_start_time TIME,
    expected_end_time TIME,
    is_override BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason TEXT,
    org_unit_path extensions.ltree,  -- denormalized for Tier 4 RLS (R14)
    UNIQUE (staff_record_id, shift_date),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE leave_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_record_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE RESTRICT,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type leave_transaction_type NOT NULL,
    days NUMERIC NOT NULL,
    leave_request_id UUID REFERENCES leave_requests(id) ON DELETE RESTRICT,
    org_unit_path extensions.ltree,  -- denormalized for Tier 4 RLS (R14)
    notes TEXT,
    CHECK (
        (transaction_type IN ('accrual', 'carry_forward') AND days > 0) OR
        (transaction_type IN ('usage', 'forfeiture') AND days < 0) OR
        (transaction_type = 'adjustment')
    ),
    CHECK (transaction_type != 'usage' OR leave_request_id IS NOT NULL),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_leave_ledger_no_dup_carry_forward
    ON leave_ledger (staff_record_id, leave_type_id, fiscal_year)
    WHERE transaction_type = 'carry_forward';

CREATE UNIQUE INDEX idx_leave_ledger_no_dup_monthly_accrual
    ON leave_ledger (staff_record_id, leave_type_id, fiscal_year, (date_trunc('month', transaction_date::TIMESTAMP)::DATE))
    WHERE transaction_type = 'accrual';

CREATE TABLE timecard_punches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_record_id UUID NOT NULL REFERENCES staff_records(id) ON DELETE RESTRICT,
    shift_schedule_id UUID NOT NULL REFERENCES shift_schedules(id) ON DELETE RESTRICT,
    punch_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    punch_type punch_type NOT NULL,
    source punch_source NOT NULL DEFAULT 'mobile',
    remark TEXT,
    gps_coordinates JSONB,
    selfie_url TEXT,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    org_unit_path extensions.ltree,  -- denormalized for Tier 4 RLS (R14)
    CHECK (
        (voided_at IS NULL AND voided_by IS NULL) OR
        (voided_at IS NOT NULL AND voided_by IS NOT NULL)
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_timecard_punches_one_active_per_type
    ON timecard_punches (shift_schedule_id, punch_type)
    WHERE voided_at IS NULL;

CREATE TABLE attendance_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_schedule_id UUID NOT NULL REFERENCES shift_schedules(id) ON DELETE CASCADE,
    staff_record_id UUID,  -- denormalized for Tier 4 self-check (R14)
    type exception_type NOT NULL,
    detail TEXT,
    status exception_status NOT NULL DEFAULT 'unjustified',
    staff_clarification TEXT,
    justification_reason TEXT,
    justified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    justified_at TIMESTAMPTZ,
    org_unit_path extensions.ltree,  -- denormalized for Tier 4 RLS (R14)
    CHECK (
        (status = 'unjustified' AND justified_at IS NULL) OR
        (status = 'justified' AND justified_at IS NOT NULL AND justified_by IS NOT NULL)
    ),
    UNIQUE (shift_schedule_id, type),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);


-- â”€â”€ 5b. Views â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE VIEW v_daily_timecards WITH (security_invoker = true) AS
SELECT
    tp.shift_schedule_id,
    tp.staff_record_id,
    MIN(tp.punch_time) FILTER (WHERE tp.punch_type = 'clock_in')  AS first_in,
    MAX(tp.punch_time) FILTER (WHERE tp.punch_type = 'clock_out') AS last_out,
    MIN(tp.remark) FILTER (WHERE tp.punch_type = 'clock_in')  AS clock_in_remark,
    MIN(tp.remark) FILTER (WHERE tp.punch_type = 'clock_out') AS clock_out_remark,
    (array_agg(tp.gps_coordinates) FILTER (WHERE tp.punch_type = 'clock_in'))[1]  AS clock_in_gps,
    MIN(tp.selfie_url)      FILTER (WHERE tp.punch_type = 'clock_in')  AS clock_in_selfie,
    (array_agg(tp.gps_coordinates) FILTER (WHERE tp.punch_type = 'clock_out'))[1] AS clock_out_gps,
    MIN(tp.selfie_url)      FILTER (WHERE tp.punch_type = 'clock_out') AS clock_out_selfie,
    MIN(tp.source) FILTER (WHERE tp.punch_type = 'clock_in')  AS clock_in_source,
    MIN(tp.source) FILTER (WHERE tp.punch_type = 'clock_out') AS clock_out_source,
    CASE
        WHEN MIN(tp.punch_time) FILTER (WHERE tp.punch_type = 'clock_in') IS NOT NULL
         AND MAX(tp.punch_time) FILTER (WHERE tp.punch_type = 'clock_out') IS NOT NULL
        THEN EXTRACT(EPOCH FROM (
            MAX(tp.punch_time) FILTER (WHERE tp.punch_type = 'clock_out') -
            MIN(tp.punch_time) FILTER (WHERE tp.punch_type = 'clock_in')
        ))::INTEGER
    END AS gross_worked_seconds
FROM timecard_punches tp
WHERE tp.voided_at IS NULL
GROUP BY tp.shift_schedule_id, tp.staff_record_id;

CREATE OR REPLACE VIEW v_shift_attendance WITH (security_invoker = true) AS
SELECT
    ss.id              AS shift_schedule_id,
    ss.staff_record_id,
    ss.shift_date,
    ss.shift_type_id,
    st.code            AS shift_code,
    st.name            AS shift_name,
    ss.expected_start_time,
    ss.expected_end_time,
    ss.is_override,
    ss.override_reason,
    tc.first_in,
    tc.last_out,
    tc.clock_in_remark,
    tc.clock_out_remark,
    tc.clock_in_gps,
    tc.clock_in_selfie,
    tc.clock_out_gps,
    tc.clock_out_selfie,
    tc.clock_in_source,
    tc.clock_out_source,
    tc.gross_worked_seconds,
    CASE
        WHEN tc.gross_worked_seconds IS NOT NULL
        THEN GREATEST(tc.gross_worked_seconds - (st.break_duration_minutes * 60), 0)
    END AS net_worked_seconds,
    CASE
        WHEN ss.expected_start_time IS NOT NULL AND ss.expected_end_time IS NOT NULL THEN
            EXTRACT(EPOCH FROM (
                CASE
                    WHEN ss.expected_end_time >= ss.expected_start_time
                    THEN ss.expected_end_time - ss.expected_start_time
                    ELSE (ss.expected_end_time + INTERVAL '24 hours') - ss.expected_start_time
                END
            ))::INTEGER - (st.break_duration_minutes * 60)
    END AS expected_net_seconds,
    lr.id              AS leave_request_id,
    lt.code            AS leave_type_code,
    lt.name            AS leave_type_name,
    lt.is_paid         AS leave_is_paid,
    ph.id              AS public_holiday_id,
    ph.name            AS public_holiday_name,
    ae.exception_types,
    ae.has_unjustified,
    CASE
        WHEN lr.id IS NOT NULL THEN 'on_leave'
        WHEN ph.id IS NOT NULL THEN 'public_holiday'
        WHEN tc.first_in IS NOT NULL AND tc.last_out IS NOT NULL THEN 'completed'
        WHEN tc.first_in IS NOT NULL AND tc.last_out IS NULL THEN 'in_progress'
        WHEN ss.shift_date < CURRENT_DATE AND tc.first_in IS NULL THEN 'absent'
        ELSE 'scheduled'
    END AS derived_status
FROM shift_schedules ss
JOIN shift_types st ON st.id = ss.shift_type_id
LEFT JOIN LATERAL (
    SELECT
        MIN(tp.punch_time)      FILTER (WHERE tp.punch_type = 'clock_in')  AS first_in,
        MAX(tp.punch_time)      FILTER (WHERE tp.punch_type = 'clock_out') AS last_out,
        MIN(tp.remark)          FILTER (WHERE tp.punch_type = 'clock_in')  AS clock_in_remark,
        MIN(tp.remark)          FILTER (WHERE tp.punch_type = 'clock_out') AS clock_out_remark,
        (array_agg(tp.gps_coordinates) FILTER (WHERE tp.punch_type = 'clock_in'))[1]  AS clock_in_gps,
        MIN(tp.selfie_url)      FILTER (WHERE tp.punch_type = 'clock_in')  AS clock_in_selfie,
        (array_agg(tp.gps_coordinates) FILTER (WHERE tp.punch_type = 'clock_out'))[1] AS clock_out_gps,
        MIN(tp.selfie_url)      FILTER (WHERE tp.punch_type = 'clock_out') AS clock_out_selfie,
        MIN(tp.source)          FILTER (WHERE tp.punch_type = 'clock_in')  AS clock_in_source,
        MIN(tp.source)          FILTER (WHERE tp.punch_type = 'clock_out') AS clock_out_source,
        CASE
            WHEN MIN(tp.punch_time) FILTER (WHERE tp.punch_type = 'clock_in') IS NOT NULL
             AND MAX(tp.punch_time) FILTER (WHERE tp.punch_type = 'clock_out') IS NOT NULL
            THEN EXTRACT(EPOCH FROM (
                MAX(tp.punch_time) FILTER (WHERE tp.punch_type = 'clock_out') -
                MIN(tp.punch_time) FILTER (WHERE tp.punch_type = 'clock_in')
            ))::INTEGER
        END AS gross_worked_seconds
    FROM timecard_punches tp
    WHERE tp.shift_schedule_id = ss.id AND tp.voided_at IS NULL
) tc ON TRUE
LEFT JOIN LATERAL (
    SELECT lr2.id, lr2.leave_type_id
    FROM leave_requests lr2
    WHERE lr2.staff_record_id = ss.staff_record_id
      AND lr2.status = 'approved'
      AND ss.shift_date BETWEEN lr2.start_date AND lr2.end_date
    LIMIT 1
) lr ON TRUE
LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
LEFT JOIN public_holidays ph ON ph.holiday_date = ss.shift_date
LEFT JOIN LATERAL (
    SELECT
        string_agg(ae2.type::TEXT, ', ' ORDER BY ae2.type) AS exception_types,
        bool_or(ae2.status = 'unjustified') AS has_unjustified
    FROM attendance_exceptions ae2
    WHERE ae2.shift_schedule_id = ss.id
) ae ON TRUE;

CREATE OR REPLACE VIEW v_leave_balances WITH (security_invoker = true) AS
SELECT
    ll.staff_record_id,
    ll.leave_type_id,
    lt.code          AS leave_type_code,
    lt.name          AS leave_type_name,
    lt.is_paid,
    ll.fiscal_year,
    COALESCE(SUM(ll.days) FILTER (WHERE ll.transaction_type = 'accrual'), 0)       AS accrued_days,
    COALESCE(SUM(ll.days) FILTER (WHERE ll.transaction_type = 'carry_forward'), 0) AS carry_forward_days,
    COALESCE(SUM(ll.days) FILTER (WHERE ll.transaction_type = 'usage'), 0)         AS used_days,
    COALESCE(SUM(ll.days) FILTER (WHERE ll.transaction_type = 'adjustment'), 0)    AS adjustment_days,
    COALESCE(SUM(ll.days) FILTER (WHERE ll.transaction_type = 'forfeiture'), 0)    AS forfeiture_days,
    COALESCE(SUM(ll.days), 0) AS balance
FROM leave_ledger ll
JOIN leave_types lt ON lt.id = ll.leave_type_id
GROUP BY ll.staff_record_id, ll.leave_type_id, lt.code, lt.name, lt.is_paid, ll.fiscal_year;


-- â”€â”€ 5c. Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_template_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roster_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policy_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE timecard_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_exceptions ENABLE ROW LEVEL SECURITY;

-- shift_types: Tier 1 (hr)
CREATE POLICY "shift_types_select" ON shift_types FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "shift_types_insert" ON shift_types FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c');
CREATE POLICY "shift_types_update" ON shift_types FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "shift_types_delete" ON shift_types FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- roster_templates: Tier 1 (hr)
CREATE POLICY "roster_templates_select" ON roster_templates FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "roster_templates_insert" ON roster_templates FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c');
CREATE POLICY "roster_templates_update" ON roster_templates FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "roster_templates_delete" ON roster_templates FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- roster_template_shifts: Tier 1 (hr)
CREATE POLICY "roster_template_shifts_select" ON roster_template_shifts FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "roster_template_shifts_insert" ON roster_template_shifts FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c');
CREATE POLICY "roster_template_shifts_update" ON roster_template_shifts FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "roster_template_shifts_delete" ON roster_template_shifts FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- leave_types: Tier 1 (hr)
CREATE POLICY "leave_types_select" ON leave_types FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "leave_types_insert" ON leave_types FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c');
CREATE POLICY "leave_types_update" ON leave_types FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "leave_types_delete" ON leave_types FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- leave_policies: Tier 1 (hr)
CREATE POLICY "leave_policies_select" ON leave_policies FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "leave_policies_insert" ON leave_policies FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c');
CREATE POLICY "leave_policies_update" ON leave_policies FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "leave_policies_delete" ON leave_policies FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- leave_policy_entitlements: Tier 1 (hr)
CREATE POLICY "leave_policy_entitlements_select" ON leave_policy_entitlements FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "leave_policy_entitlements_insert" ON leave_policy_entitlements FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c');
CREATE POLICY "leave_policy_entitlements_update" ON leave_policy_entitlements FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "leave_policy_entitlements_delete" ON leave_policy_entitlements FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- public_holidays: Tier 1 (hr)
CREATE POLICY "public_holidays_select" ON public_holidays FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "public_holidays_insert" ON public_holidays FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c');
CREATE POLICY "public_holidays_update" ON public_holidays FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "public_holidays_delete" ON public_holidays FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- staff_roster_assignments: Tier 4 (hr)
CREATE POLICY "staff_roster_assignments_select" ON staff_roster_assignments FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "staff_roster_assignments_insert" ON staff_roster_assignments FOR INSERT TO authenticated
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "staff_roster_assignments_update" ON staff_roster_assignments FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "staff_roster_assignments_delete" ON staff_roster_assignments FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- leave_requests: Tier 4 (hr) â€” row-scoped via org_unit_path
CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "leave_requests_insert" ON leave_requests FOR INSERT TO authenticated
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "leave_requests_delete" ON leave_requests FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- shift_schedules: Tier 4 (hr)
CREATE POLICY "shift_schedules_select" ON shift_schedules FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "shift_schedules_insert" ON shift_schedules FOR INSERT TO authenticated
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "shift_schedules_update" ON shift_schedules FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "shift_schedules_delete" ON shift_schedules FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- timecard_punches: Tier 4 (hr)
CREATE POLICY "timecard_punches_select" ON timecard_punches FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "timecard_punches_insert" ON timecard_punches FOR INSERT TO authenticated
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "timecard_punches_update" ON timecard_punches FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "timecard_punches_delete" ON timecard_punches FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- attendance_exceptions: Tier 4 (hr) â€” uses denormalized staff_record_id + org_unit_path
CREATE POLICY "attendance_exceptions_select" ON attendance_exceptions FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "attendance_exceptions_insert" ON attendance_exceptions FOR INSERT TO authenticated
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "attendance_exceptions_update" ON attendance_exceptions FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u');
CREATE POLICY "attendance_exceptions_delete" ON attendance_exceptions FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'd');

-- leave_ledger: Tier 4 exception â€” append-only (no UPDATE/DELETE policies)
-- SELECT: domain check only (no row scoping â€” ledger is audited globally)
-- INSERT: domain-gated (triggers use SECURITY DEFINER, bypassing RLS)
CREATE POLICY "leave_ledger_select" ON leave_ledger FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'
        AND (
            staff_record_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR (auth.jwt()->'app_metadata'->>'org_unit_path')::extensions.ltree @> org_unit_path
        )
    );
CREATE POLICY "leave_ledger_insert" ON leave_ledger FOR INSERT TO authenticated
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c'
    );
-- No UPDATE or DELETE policies â€” immutability enforced by trigger (R5 pattern)


-- â”€â”€ 5d. Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE INDEX idx_roster_template_shifts_template_id ON roster_template_shifts(template_id);
CREATE INDEX idx_roster_template_shifts_shift_type_id ON roster_template_shifts(shift_type_id);

CREATE INDEX idx_staff_roster_assignments_staff_record_id ON staff_roster_assignments(staff_record_id);
CREATE INDEX idx_staff_roster_assignments_roster_template_id ON staff_roster_assignments(roster_template_id);
CREATE INDEX idx_staff_roster_assignments_org_unit_path ON staff_roster_assignments USING gist (org_unit_path);

CREATE INDEX idx_staff_records_leave_policy_id ON staff_records(leave_policy_id);

CREATE INDEX idx_leave_requests_staff_record_id ON leave_requests(staff_record_id);
CREATE INDEX idx_leave_requests_leave_type_id ON leave_requests(leave_type_id);
CREATE INDEX idx_leave_requests_reviewed_by ON leave_requests(reviewed_by);
CREATE INDEX idx_leave_requests_org_unit_path ON leave_requests USING gist (org_unit_path);

CREATE INDEX idx_shift_schedules_staff_record_id ON shift_schedules(staff_record_id);
CREATE INDEX idx_shift_schedules_shift_type_id ON shift_schedules(shift_type_id);
CREATE INDEX idx_shift_schedules_shift_date ON shift_schedules(shift_date);
CREATE INDEX idx_shift_schedules_org_unit_path ON shift_schedules USING gist (org_unit_path);

CREATE INDEX idx_leave_ledger_staff_record_id ON leave_ledger(staff_record_id);
CREATE INDEX idx_leave_ledger_leave_type_id ON leave_ledger(leave_type_id);
CREATE INDEX idx_leave_ledger_leave_request_id ON leave_ledger(leave_request_id);
CREATE INDEX idx_leave_ledger_org_unit_path ON leave_ledger USING gist (org_unit_path);

CREATE INDEX idx_timecard_punches_staff_record_id ON timecard_punches(staff_record_id);
CREATE INDEX idx_timecard_punches_shift_schedule_id ON timecard_punches(shift_schedule_id);
CREATE INDEX idx_timecard_punches_org_unit_path ON timecard_punches USING gist (org_unit_path);

CREATE INDEX idx_attendance_exceptions_shift_schedule_id ON attendance_exceptions(shift_schedule_id);
CREATE INDEX idx_attendance_exceptions_justified_by ON attendance_exceptions(justified_by);
CREATE INDEX idx_attendance_exceptions_org_unit_path ON attendance_exceptions USING gist (org_unit_path);


-- ============================================================================
-- 6. SUPPLY CHAIN (Materials, BOM, UOM, Pricing)
-- ============================================================================

-- â”€â”€ 6a. Tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    abbreviation TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Unified material master (replaces products + pos_catalog)
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    material_type material_type NOT NULL,
    category_id UUID NOT NULL REFERENCES material_categories(id) ON DELETE RESTRICT,
    base_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    reorder_point NUMERIC DEFAULT 0 CHECK (reorder_point >= 0),
    safety_stock NUMERIC DEFAULT 0 CHECK (safety_stock >= 0),
    standard_cost NUMERIC,
    valuation_method TEXT DEFAULT 'moving_avg'
        CHECK (valuation_method IN ('standard', 'moving_avg', 'fifo')),
    shelf_life_days INTEGER,
    storage_conditions TEXT,
    weight_kg NUMERIC,
    is_returnable BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- POS display grouping (lightweight, per-POS-point)
CREATE TABLE display_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pos_point_id UUID NOT NULL REFERENCES pos_points(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (pos_point_id, name),
    UNIQUE (id, pos_point_id)  -- compound FK target for material_sales_data (R12)
);

-- Sales view per POS point (replaces pos_catalog)
CREATE TABLE material_sales_data (
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    pos_point_id UUID NOT NULL REFERENCES pos_points(id) ON DELETE CASCADE,
    display_name TEXT,
    selling_price NUMERIC NOT NULL CHECK (selling_price >= 0),
    display_category_id UUID,
    image_url TEXT,
    allergens TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (material_id, pos_point_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    FOREIGN KEY (display_category_id, pos_point_id)
        REFERENCES display_categories(id, pos_point_id) ON DELETE SET NULL
);

-- Procurement view per supplier (replaces supplier_products)
-- No conversion_factor (C2) â€” use uom_conversions table instead. Retains purchase_unit_id (R20).
CREATE TABLE material_procurement_data (
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_sku TEXT,
    cost_price NUMERIC NOT NULL CHECK (cost_price >= 0),
    purchase_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    lead_time_days INTEGER DEFAULT 0 CHECK (lead_time_days >= 0),
    min_order_qty NUMERIC DEFAULT 1,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (material_id, supplier_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_material_procurement_one_default
    ON material_procurement_data(material_id) WHERE is_default = TRUE;

-- Global UOM conversion table (replaces supplier_products.conversion_factor)
CREATE TABLE uom_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,  -- NULL = global conversion
    from_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    to_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    factor NUMERIC NOT NULL CHECK (factor > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Expression-based unique index (R18) â€” COALESCE not allowed in table UNIQUE constraints
CREATE UNIQUE INDEX idx_uom_conversions_unique
    ON uom_conversions(COALESCE(material_id, '00000000-0000-0000-0000-000000000000'),
                       from_unit_id, to_unit_id);

-- Multi-level BOM with effectivity dates
CREATE TABLE bill_of_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'obsolete')),
    is_default BOOLEAN DEFAULT FALSE,
    yield_qty NUMERIC DEFAULT 1 CHECK (yield_qty > 0),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (parent_material_id, version)
);

CREATE UNIQUE INDEX idx_bom_one_active_default
    ON bill_of_materials(parent_material_id)
    WHERE status = 'active' AND is_default = TRUE;

CREATE TABLE bom_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    component_material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    scrap_pct NUMERIC DEFAULT 0 CHECK (scrap_pct >= 0 AND scrap_pct < 100),
    is_phantom BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (bom_id, component_material_id)
);

-- Price lists with effectivity dates (DD4: additive, POS uses material_sales_data.selling_price)
CREATE TABLE price_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'MYR',
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE price_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    pos_point_id UUID REFERENCES pos_points(id) ON DELETE CASCADE,
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    min_qty NUMERIC DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Expression-based unique index (R18)
CREATE UNIQUE INDEX idx_price_list_items_unique
    ON price_list_items(price_list_id, material_id,
        COALESCE(pos_point_id, '00000000-0000-0000-0000-000000000000'));


-- â”€â”€ 6b. Seed Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO units (name, abbreviation) VALUES
    ('piece',     'pc'),
    ('kilogram',  'kg'),
    ('gram',      'g'),
    ('liter',     'L'),
    ('milliliter','mL'),
    ('box',       'bx'),
    ('pack',      'pk'),
    ('case',      'cs')
ON CONFLICT (name) DO NOTHING;


-- â”€â”€ 6c. Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_procurement_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE uom_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;

-- units: Tier 1 (system)
CREATE POLICY "units_select" ON units FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "units_insert" ON units FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c');
CREATE POLICY "units_update" ON units FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE POLICY "units_delete" ON units FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

-- uom_conversions: Tier 1 read, write = system OR procurement (admin sets global, procurement sets supplier packaging)
CREATE POLICY "uom_conversions_select" ON uom_conversions FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "uom_conversions_insert" ON uom_conversions FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c' OR
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'c'));
CREATE POLICY "uom_conversions_update" ON uom_conversions FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u' OR
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u'))
    WITH CHECK (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u' OR
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u'));
CREATE POLICY "uom_conversions_delete" ON uom_conversions FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd' OR
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'd'));

-- materials: Tier 1 read, write = procurement OR pos (procurement creates raw/trading, POS creates finished)
CREATE POLICY "materials_select" ON materials FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "materials_insert" ON materials FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'c' OR
        (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c'));
CREATE POLICY "materials_update" ON materials FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u' OR
        (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u'))
    WITH CHECK (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u' OR
        (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u'));
CREATE POLICY "materials_delete" ON materials FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'd' OR
        (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd'));

-- material_sales_data: Tier 1 (pos)
CREATE POLICY "material_sales_data_select" ON material_sales_data FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "material_sales_data_insert" ON material_sales_data FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "material_sales_data_update" ON material_sales_data FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "material_sales_data_delete" ON material_sales_data FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- display_categories: Tier 1 (pos)
CREATE POLICY "display_categories_select" ON display_categories FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "display_categories_insert" ON display_categories FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "display_categories_update" ON display_categories FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "display_categories_delete" ON display_categories FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- bill_of_materials: Tier 1 (pos) â€” recipe management, owned by POS manager
CREATE POLICY "bill_of_materials_select" ON bill_of_materials FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "bill_of_materials_insert" ON bill_of_materials FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "bill_of_materials_update" ON bill_of_materials FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "bill_of_materials_delete" ON bill_of_materials FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- bom_components: Tier 1 (pos) â€” BOM line items, owned by POS manager
CREATE POLICY "bom_components_select" ON bom_components FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "bom_components_insert" ON bom_components FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "bom_components_update" ON bom_components FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "bom_components_delete" ON bom_components FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- price_lists: Tier 1 (pos) â€” selling price lists, owned by POS manager
CREATE POLICY "price_lists_select" ON price_lists FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "price_lists_insert" ON price_lists FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "price_lists_update" ON price_lists FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "price_lists_delete" ON price_lists FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- price_list_items: Tier 1 (pos) â€” selling price list line items, owned by POS manager
CREATE POLICY "price_list_items_select" ON price_list_items FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "price_list_items_insert" ON price_list_items FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "price_list_items_update" ON price_list_items FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "price_list_items_delete" ON price_list_items FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- suppliers: Tier 3 (procurement)
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'r');
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'c');
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u');
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'd');

-- material_procurement_data: Tier 3 (procurement)
CREATE POLICY "material_procurement_data_select" ON material_procurement_data FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'r');
CREATE POLICY "material_procurement_data_insert" ON material_procurement_data FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'c');
CREATE POLICY "material_procurement_data_update" ON material_procurement_data FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u');
CREATE POLICY "material_procurement_data_delete" ON material_procurement_data FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'd');


-- â”€â”€ 6d. Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE INDEX idx_materials_category_id ON materials(category_id);
CREATE INDEX idx_materials_base_unit_id ON materials(base_unit_id);
CREATE INDEX idx_materials_material_type ON materials(material_type);

CREATE INDEX idx_display_categories_pos_point_id ON display_categories(pos_point_id);

CREATE INDEX idx_material_sales_data_pos_point_id ON material_sales_data(pos_point_id);
CREATE INDEX idx_material_sales_data_display_category_id ON material_sales_data(display_category_id);

CREATE INDEX idx_material_procurement_data_supplier_id ON material_procurement_data(supplier_id);
CREATE INDEX idx_material_procurement_data_purchase_unit_id ON material_procurement_data(purchase_unit_id);

CREATE INDEX idx_uom_conversions_material_id ON uom_conversions(material_id);
CREATE INDEX idx_uom_conversions_from_unit_id ON uom_conversions(from_unit_id);
CREATE INDEX idx_uom_conversions_to_unit_id ON uom_conversions(to_unit_id);

CREATE INDEX idx_bom_parent_material_id ON bill_of_materials(parent_material_id);
CREATE INDEX idx_bom_components_bom_id ON bom_components(bom_id);
CREATE INDEX idx_bom_components_component_material_id ON bom_components(component_material_id);

CREATE INDEX idx_price_list_items_price_list_id ON price_list_items(price_list_id);
CREATE INDEX idx_price_list_items_material_id ON price_list_items(material_id);
CREATE INDEX idx_price_list_items_pos_point_id ON price_list_items(pos_point_id);


-- ============================================================================
-- 7. INVENTORY LEDGER (Movements, Stock, Valuation)
-- ============================================================================

-- â”€â”€ 7a. Tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Enterprise movement type catalog (replaces transfer_type ENUM + inventory_tx_source ENUM)
CREATE TABLE movement_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'transfer', 'neutral')),
    requires_source_doc BOOLEAN DEFAULT FALSE,
    requires_cost_center BOOLEAN DEFAULT FALSE,
    auto_reverse_code TEXT,
    debit_account_rule TEXT,
    credit_account_rule TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Unified write-off / disposal (replaces inventory_disposals with XOR fork)
CREATE TABLE write_offs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    reason disposal_reason NOT NULL,
    explode_bom BOOLEAN NOT NULL,
    bom_id UUID REFERENCES bill_of_materials(id) ON DELETE SET NULL,
    unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    cost_center_id UUID,
    notes TEXT,
    photo_proof_url TEXT,
    disposed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Unified goods movement document (replaces 5 independent stock-mutation triggers)
-- Source document FKs are bare UUIDs â€” deferred constraints added after target tables exist
CREATE TABLE goods_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_type_id UUID NOT NULL REFERENCES movement_types(id) ON DELETE RESTRICT,
    document_date DATE NOT NULL DEFAULT CURRENT_DATE,
    posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    purchase_order_id UUID,
    requisition_id UUID,
    reconciliation_id UUID,
    order_id UUID,
    disposal_id UUID REFERENCES write_offs(id) ON DELETE SET NULL,
    reversed_by_id UUID REFERENCES goods_movements(id) ON DELETE SET NULL,
    reverses_id UUID REFERENCES goods_movements(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CHECK (num_nonnulls(purchase_order_id, requisition_id, reconciliation_id, order_id, disposal_id) <= 1)
);

-- Ledger line items â€” signed quantity, location-specific, cost-attributed
CREATE TABLE goods_movement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_movement_id UUID NOT NULL REFERENCES goods_movements(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL,  -- signed: positive = inflow, negative = outflow
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC GENERATED ALWAYS AS (ABS(quantity) * unit_cost) STORED,
    bom_id UUID REFERENCES bill_of_materials(id) ON DELETE SET NULL,
    cost_center_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Performance cache â€” synced by trigger on goods_movement_items INSERT
-- POLICY: Negative stock is ALLOWED. POS sales and requisitions may drive current_qty
-- below zero. This is intentional â€” operations are never blocked by stock discrepancies.
-- Reconciliation (WF-11) corrects drift periodically.
-- The nightly v_stock_on_hand vs cache comparison detects drift.
CREATE TABLE stock_balance_cache (
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    current_qty NUMERIC NOT NULL DEFAULT 0,
    stock_value NUMERIC NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (material_id, location_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Stock valuation per material per location
CREATE TABLE material_valuation (
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    standard_cost NUMERIC,
    moving_avg_cost NUMERIC,
    last_purchase_cost NUMERIC,
    PRIMARY KEY (material_id, location_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WARNING: This view scans the entire goods_movement_items table.
-- At scale (100K+ rows) it takes seconds. NEVER use in RLS, RPCs, or real-time queries.
-- Use stock_balance_cache for operational reads. This view exists solely for nightly drift detection.
CREATE OR REPLACE VIEW v_stock_on_hand AS
SELECT
    gmi.material_id,
    gmi.location_id,
    SUM(gmi.quantity) AS current_qty,
    SUM(gmi.total_cost) AS stock_value
FROM goods_movement_items gmi
GROUP BY gmi.material_id, gmi.location_id;


-- â”€â”€ 7b. Seed Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO movement_types (code, name, direction, requires_source_doc, requires_cost_center) VALUES
    ('101', 'Goods Receipt from PO',            'in',       TRUE,  FALSE),
    ('102', 'Reversal of GR from PO',           'out',      TRUE,  FALSE),
    ('122', 'Return to Vendor',                  'out',      FALSE, FALSE),
    ('311', 'Transfer Between Locations',        'transfer', FALSE, FALSE),
    ('312', 'Reversal of Transfer',              'transfer', FALSE, FALSE),
    ('201', 'Issue to Cost Center (Consumable)', 'out',      FALSE, TRUE),
    ('202', 'Reversal of Cost Center Issue',     'in',       FALSE, TRUE),
    ('261', 'Issue for Production / BOM',        'out',      FALSE, FALSE),
    ('601', 'Goods Issue for Sale (POS)',        'out',      TRUE,  FALSE),
    ('602', 'Reversal of Sale (Return/Void)',    'in',       TRUE,  FALSE),
    ('551', 'Scrapping / Disposal',              'out',      FALSE, FALSE),
    ('552', 'Reversal of Scrapping',             'in',       FALSE, FALSE),
    ('701', 'Positive Adjustment (Recon)',        'in',       FALSE, FALSE),
    ('702', 'Negative Adjustment (Recon)',        'out',      FALSE, FALSE),
    ('561', 'Initial Inventory Entry',            'in',       FALSE, FALSE)
ON CONFLICT (code) DO NOTHING;


-- â”€â”€ 7c. Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE movement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_movement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_valuation ENABLE ROW LEVEL SECURITY;

-- movement_types: Tier 1 (inventory)
CREATE POLICY "movement_types_select" ON movement_types FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "movement_types_insert" ON movement_types FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'c');
CREATE POLICY "movement_types_update" ON movement_types FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'u');
CREATE POLICY "movement_types_delete" ON movement_types FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'd');

-- write_offs: Tier 3 (inventory_ops)
CREATE POLICY "write_offs_select" ON write_offs FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'r'
        OR (
            (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'r'
            AND (
                EXISTS (SELECT 1 FROM public.material_sales_data msd WHERE msd.material_id = write_offs.material_id)
                OR EXISTS (SELECT 1 FROM public.bom_components bc
                           JOIN public.bill_of_materials bom ON bom.id = bc.bom_id
                           JOIN public.material_sales_data msd ON msd.material_id = bom.parent_material_id
                           WHERE bc.component_material_id = write_offs.material_id AND bom.status = 'active')
            )
        )
    ));
CREATE POLICY "write_offs_insert" ON write_offs FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'c');
CREATE POLICY "write_offs_update" ON write_offs FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u'
        OR (
            (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u'
            AND (
                EXISTS (SELECT 1 FROM public.material_sales_data msd WHERE msd.material_id = write_offs.material_id)
                OR EXISTS (SELECT 1 FROM public.bom_components bc
                           JOIN public.bill_of_materials bom ON bom.id = bc.bom_id
                           JOIN public.material_sales_data msd ON msd.material_id = bom.parent_material_id
                           WHERE bc.component_material_id = write_offs.material_id AND bom.status = 'active')
            )
        )
    ))
    WITH CHECK (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u'
        OR (
            (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u'
            AND (
                EXISTS (SELECT 1 FROM public.material_sales_data msd WHERE msd.material_id = write_offs.material_id)
                OR EXISTS (SELECT 1 FROM public.bom_components bc
                           JOIN public.bill_of_materials bom ON bom.id = bc.bom_id
                           JOIN public.material_sales_data msd ON msd.material_id = bom.parent_material_id
                           WHERE bc.component_material_id = write_offs.material_id AND bom.status = 'active')
            )
        )
    ));
CREATE POLICY "write_offs_delete" ON write_offs FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'd');

-- goods_movements: Tier 3 (inventory_ops) â€” append-only exception (no UPDATE/DELETE policies)
CREATE POLICY "goods_movements_select" ON goods_movements FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'r');
CREATE POLICY "goods_movements_insert" ON goods_movements FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'c');
-- No UPDATE/DELETE policies â€” immutability enforced by trigger (R5)

-- goods_movement_items: Tier 3 (inventory_ops) â€” append-only exception
CREATE POLICY "goods_movement_items_select" ON goods_movement_items FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'r');
CREATE POLICY "goods_movement_items_insert" ON goods_movement_items FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'c');
-- No UPDATE/DELETE policies â€” immutability enforced by trigger (R5)

-- stock_balance_cache: Tier 3 (inventory OR inventory_ops read)
CREATE POLICY "stock_balance_cache_select" ON stock_balance_cache FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'r'
        OR (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'r'
    ));
CREATE POLICY "stock_balance_cache_insert" ON stock_balance_cache FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'c');
CREATE POLICY "stock_balance_cache_update" ON stock_balance_cache FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'u');
CREATE POLICY "stock_balance_cache_delete" ON stock_balance_cache FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'd');

-- material_valuation: Tier 3 (inventory OR inventory_ops read)
CREATE POLICY "material_valuation_select" ON material_valuation FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'r'
        OR (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'r'
    ));
CREATE POLICY "material_valuation_insert" ON material_valuation FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'c');
CREATE POLICY "material_valuation_update" ON material_valuation FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'u');
CREATE POLICY "material_valuation_delete" ON material_valuation FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory') ? 'd');


-- â”€â”€ 7d. Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE INDEX idx_write_offs_material_id ON write_offs(material_id);
CREATE INDEX idx_write_offs_location_id ON write_offs(location_id);
CREATE INDEX idx_write_offs_bom_id ON write_offs(bom_id);

CREATE INDEX idx_goods_movements_movement_type_id ON goods_movements(movement_type_id);
CREATE INDEX idx_goods_movements_purchase_order_id ON goods_movements(purchase_order_id);
CREATE INDEX idx_goods_movements_requisition_id ON goods_movements(requisition_id);
CREATE INDEX idx_goods_movements_reconciliation_id ON goods_movements(reconciliation_id);
CREATE INDEX idx_goods_movements_order_id ON goods_movements(order_id);
CREATE INDEX idx_goods_movements_disposal_id ON goods_movements(disposal_id);

CREATE INDEX idx_goods_movement_items_goods_movement_id ON goods_movement_items(goods_movement_id);
CREATE INDEX idx_gmi_material_location ON goods_movement_items(material_id, location_id);  -- R11
CREATE INDEX idx_goods_movement_items_unit_id ON goods_movement_items(unit_id);
CREATE INDEX idx_goods_movement_items_location_id ON goods_movement_items(location_id);
CREATE INDEX idx_goods_movement_items_bom_id ON goods_movement_items(bom_id);


-- ============================================================================
-- 8. REQUISITIONS, RECONCILIATION, PROCUREMENT, EQUIPMENT
-- ============================================================================

-- â”€â”€ 8a. Tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Material requisitions (replaces inventory_transfers)
CREATE TABLE material_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    to_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
    status inventory_task_status DEFAULT 'pending',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requester_remark TEXT,
    runner_remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CHECK (from_location_id IS DISTINCT FROM to_location_id)
);

-- Per-line movement type (replaces transfer_type ENUM forced split)
CREATE TABLE material_requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID NOT NULL REFERENCES material_requisitions(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    movement_type_code TEXT NOT NULL,  -- references movement_types.code (e.g. '311', '201')
    requested_qty NUMERIC NOT NULL CHECK (requested_qty > 0),
    delivered_qty NUMERIC CHECK (delivered_qty >= 0),
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE (requisition_id, material_id)
);

-- Stock count audits
CREATE TABLE inventory_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    scheduled_date DATE DEFAULT CURRENT_DATE NOT NULL,
    scheduled_time TIME DEFAULT CURRENT_TIME NOT NULL,
    status inventory_task_status DEFAULT 'pending',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    discrepancy_found BOOLEAN DEFAULT FALSE,
    manager_remark TEXT,
    crew_remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE inventory_reconciliation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_id UUID NOT NULL REFERENCES inventory_reconciliations(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    system_qty NUMERIC NOT NULL,
    physical_qty NUMERIC NOT NULL DEFAULT 0,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE (reconciliation_id, material_id)
);

-- Custody ledger for returnable equipment (DD3)
CREATE TABLE equipment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    condition_on_return TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Purchase orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    receiving_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    status po_status DEFAULT 'draft',
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    expected_qty NUMERIC NOT NULL CHECK (expected_qty > 0),
    received_qty NUMERIC DEFAULT 0 CHECK (received_qty >= 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    photo_proof_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Deferred FKs from goods_movements (Chunk 7) â†’ tables created in this chunk
ALTER TABLE goods_movements ADD CONSTRAINT goods_movements_purchase_order_id_fkey
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
ALTER TABLE goods_movements ADD CONSTRAINT goods_movements_requisition_id_fkey
    FOREIGN KEY (requisition_id) REFERENCES material_requisitions(id) ON DELETE SET NULL;
ALTER TABLE goods_movements ADD CONSTRAINT goods_movements_reconciliation_id_fkey
    FOREIGN KEY (reconciliation_id) REFERENCES inventory_reconciliations(id) ON DELETE SET NULL;


-- â”€â”€ 8b. Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE material_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- material_requisitions: Tier 3b (inventory_ops) â€” ownership-scoped
CREATE POLICY "material_requisitions_select" ON material_requisitions FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'r'
        AND (
            (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'd'
            OR assigned_to IS NULL
            OR assigned_to = (SELECT auth.uid())
            OR created_by = (SELECT auth.uid())
        )
    );
CREATE POLICY "material_requisitions_insert" ON material_requisitions FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'c');
CREATE POLICY "material_requisitions_update" ON material_requisitions FOR UPDATE TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u'
        AND (
            (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'd'
            OR assigned_to = (SELECT auth.uid())
            OR created_by = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u'
    );
CREATE POLICY "material_requisitions_delete" ON material_requisitions FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'd');

-- material_requisition_items: Tier 3 (inventory_ops)
CREATE POLICY "material_requisition_items_select" ON material_requisition_items FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'r');
CREATE POLICY "material_requisition_items_insert" ON material_requisition_items FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'c');
CREATE POLICY "material_requisition_items_update" ON material_requisition_items FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u');
CREATE POLICY "material_requisition_items_delete" ON material_requisition_items FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'd');

-- inventory_reconciliations: Tier 3 (inventory_ops)
CREATE POLICY "inventory_reconciliations_select" ON inventory_reconciliations FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'r');
CREATE POLICY "inventory_reconciliations_insert" ON inventory_reconciliations FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'c');
CREATE POLICY "inventory_reconciliations_update" ON inventory_reconciliations FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u');
CREATE POLICY "inventory_reconciliations_delete" ON inventory_reconciliations FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'd');

-- inventory_reconciliation_items: Tier 3 (inventory_ops)
CREATE POLICY "inventory_reconciliation_items_select" ON inventory_reconciliation_items FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'r');
CREATE POLICY "inventory_reconciliation_items_insert" ON inventory_reconciliation_items FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'c');
CREATE POLICY "inventory_reconciliation_items_update" ON inventory_reconciliation_items FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u');
CREATE POLICY "inventory_reconciliation_items_delete" ON inventory_reconciliation_items FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'd');

-- equipment_assignments: Tier 3 (inventory_ops)
CREATE POLICY "equipment_assignments_select" ON equipment_assignments FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'r');
CREATE POLICY "equipment_assignments_insert" ON equipment_assignments FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'c');
CREATE POLICY "equipment_assignments_update" ON equipment_assignments FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u');
CREATE POLICY "equipment_assignments_delete" ON equipment_assignments FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'd');

-- purchase_orders: Tier 3 (procurement)
CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'r');
CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'c');
CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u');
CREATE POLICY "purchase_orders_delete" ON purchase_orders FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'd');

-- purchase_order_items: Tier 3 (procurement)
CREATE POLICY "purchase_order_items_select" ON purchase_order_items FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'r');
CREATE POLICY "purchase_order_items_insert" ON purchase_order_items FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'c');
CREATE POLICY "purchase_order_items_update" ON purchase_order_items FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'u');
CREATE POLICY "purchase_order_items_delete" ON purchase_order_items FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'd');


-- â”€â”€ 8c. Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE INDEX idx_material_requisitions_status ON material_requisitions(status);
CREATE INDEX idx_material_requisitions_from_location ON material_requisitions(from_location_id);
CREATE INDEX idx_material_requisitions_to_location ON material_requisitions(to_location_id);
CREATE INDEX idx_material_requisitions_assigned_to ON material_requisitions(assigned_to);

CREATE INDEX idx_material_requisition_items_requisition_id ON material_requisition_items(requisition_id);
CREATE INDEX idx_material_requisition_items_material_id ON material_requisition_items(material_id);

CREATE INDEX idx_inventory_reconciliations_location_id ON inventory_reconciliations(location_id);
CREATE INDEX idx_inventory_reconciliations_status ON inventory_reconciliations(status);
CREATE INDEX idx_inventory_reconciliations_assigned_to ON inventory_reconciliations(assigned_to);

CREATE INDEX idx_inventory_recon_items_reconciliation_id ON inventory_reconciliation_items(reconciliation_id);
CREATE INDEX idx_inventory_recon_items_material_id ON inventory_reconciliation_items(material_id);

CREATE INDEX idx_equipment_assignments_material_id ON equipment_assignments(material_id);
CREATE INDEX idx_equipment_assignments_assigned_to ON equipment_assignments(assigned_to);

CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_receiving_location_id ON purchase_orders(receiving_location_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

CREATE INDEX idx_purchase_order_items_po_id ON purchase_order_items(po_id);
CREATE INDEX idx_purchase_order_items_material_id ON purchase_order_items(material_id);


-- ============================================================================
-- 9. POS & ORDERS (incl. Modifier Recipes)
-- ============================================================================

-- â”€â”€ 9a. Tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pos_point_id UUID NOT NULL REFERENCES pos_points(id) ON DELETE RESTRICT,
    status order_status DEFAULT 'preparing',
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    payment_method payment_method,
    prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CHECK (status != 'completed' OR payment_method IS NOT NULL)
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- POS modifier system (e.g., "Size: Large +$2", "Milk: Oat +$1")
CREATE TABLE pos_modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    min_selections INTEGER DEFAULT 0 CHECK (min_selections >= 0),
    max_selections INTEGER DEFAULT 1 CHECK (max_selections >= 1),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE pos_modifier_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES pos_modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_delta NUMERIC NOT NULL DEFAULT 0,
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    quantity_delta NUMERIC NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (group_id, name)
);

-- Which modifier groups apply to which materials
CREATE TABLE material_modifier_groups (
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES pos_modifier_groups(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (material_id, modifier_group_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Modifier selections per order item (snapshot at order time)
CREATE TABLE order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_option_id UUID NOT NULL REFERENCES pos_modifier_options(id) ON DELETE RESTRICT,
    option_name TEXT NOT NULL,
    price_delta NUMERIC NOT NULL DEFAULT 0,
    material_id UUID,
    quantity_delta NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Deferred FK: goods_movements â†’ orders (Chunk 7 table â†’ this chunk's table)
ALTER TABLE goods_movements ADD CONSTRAINT goods_movements_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;


-- â”€â”€ 9b. Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;

-- orders: Tier 3 (pos)
CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'r');
CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "orders_delete" ON orders FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- order_items: Tier 3 (pos)
CREATE POLICY "order_items_select" ON order_items FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'r');
CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "order_items_update" ON order_items FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "order_items_delete" ON order_items FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- order_item_modifiers: Tier 3 (pos)
CREATE POLICY "order_item_modifiers_select" ON order_item_modifiers FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'r');
CREATE POLICY "order_item_modifiers_insert" ON order_item_modifiers FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "order_item_modifiers_update" ON order_item_modifiers FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "order_item_modifiers_delete" ON order_item_modifiers FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- pos_modifier_groups: Tier 1 (pos)
CREATE POLICY "pos_modifier_groups_select" ON pos_modifier_groups FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "pos_modifier_groups_insert" ON pos_modifier_groups FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "pos_modifier_groups_update" ON pos_modifier_groups FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "pos_modifier_groups_delete" ON pos_modifier_groups FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- pos_modifier_options: Tier 1 (pos)
CREATE POLICY "pos_modifier_options_select" ON pos_modifier_options FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "pos_modifier_options_insert" ON pos_modifier_options FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "pos_modifier_options_update" ON pos_modifier_options FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "pos_modifier_options_delete" ON pos_modifier_options FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- material_modifier_groups: Tier 1 (pos)
CREATE POLICY "material_modifier_groups_select" ON material_modifier_groups FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "material_modifier_groups_insert" ON material_modifier_groups FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "material_modifier_groups_update" ON material_modifier_groups FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "material_modifier_groups_delete" ON material_modifier_groups FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');


-- â”€â”€ 9c. Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE INDEX idx_orders_pos_point_id ON orders(pos_point_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_prepared_by ON orders(prepared_by);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_material_id ON order_items(material_id);

CREATE INDEX idx_pos_modifier_options_group_id ON pos_modifier_options(group_id);

CREATE INDEX idx_order_item_modifiers_order_item_id ON order_item_modifiers(order_item_id);
CREATE INDEX idx_order_item_modifiers_modifier_option_id ON order_item_modifiers(modifier_option_id);


-- ============================================================================
-- 10. EXPERIENCES & BOOKINGS
-- ============================================================================

-- â”€â”€ 10a. Tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    capacity_per_slot INTEGER CHECK (capacity_per_slot > 0),
    max_facility_capacity INTEGER NOT NULL,
    arrival_window_minutes INTEGER DEFAULT 15 CHECK (arrival_window_minutes > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_experiences_single_active ON experiences (is_active) WHERE is_active = TRUE;

CREATE TABLE tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    adult_price NUMERIC NOT NULL CHECK (adult_price >= 0),
    child_price NUMERIC NOT NULL CHECK (child_price >= 0),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE tier_perks (
    tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
    perk TEXT NOT NULL,
    PRIMARY KEY (tier_id, perk),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE experience_tiers (
    experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
    PRIMARY KEY (experience_id, tier_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE scheduler_config (
    experience_id UUID PRIMARY KEY REFERENCES experiences(id) ON DELETE CASCADE,
    days_ahead INTEGER NOT NULL DEFAULT 14 CHECK (days_ahead > 0 AND days_ahead <= 90),
    day_start_hour INTEGER NOT NULL DEFAULT 9 CHECK (day_start_hour >= 0 AND day_start_hour <= 23),
    day_end_hour INTEGER NOT NULL DEFAULT 21 CHECK (day_end_hour >= 1 AND day_end_hour <= 24),
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CHECK (day_start_hour < day_end_hour),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    booked_count INTEGER DEFAULT 0 CHECK (booked_count >= 0),
    override_capacity INTEGER CHECK (override_capacity IS NULL OR override_capacity >= 0),
    constraint_type slot_constraint_type,
    constraint_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE (experience_id, slot_date, start_time)
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE RESTRICT,
    time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE RESTRICT,
    tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE RESTRICT,
    status booking_status DEFAULT 'pending_payment',
    total_price NUMERIC NOT NULL CHECK (total_price >= 0),
    promo_code_id UUID,  -- deferred FK â†’ promo_codes(id), added in Section 14
    booking_ref TEXT NOT NULL UNIQUE,
    qr_code_ref TEXT UNIQUE,
    booker_name TEXT NOT NULL,
    booker_email TEXT NOT NULL,
    booker_phone TEXT NOT NULL,
    adult_count INTEGER DEFAULT 1 CHECK (adult_count >= 1),
    child_count INTEGER DEFAULT 0 CHECK (child_count >= 0),
    checked_in_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE booking_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    attendee_type attendee_type NOT NULL,
    attendee_index INTEGER NOT NULL,
    nickname TEXT,
    face_pay_enabled BOOLEAN DEFAULT FALSE,
    auto_capture_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE (booking_id, attendee_type, attendee_index)
);

CREATE TABLE booking_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    method payment_method NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    currency TEXT DEFAULT 'MYR',
    gateway_ref TEXT,
    payment_intent_id TEXT UNIQUE,
    status payment_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- System-only tables: all access via service_role Edge Functions (Tier 6)
CREATE TABLE otp_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_ref TEXT NOT NULL REFERENCES bookings(booking_ref) ON DELETE CASCADE,
    otp_code TEXT NOT NULL,
    ip_address INET,
    attempts INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes')
);

CREATE TABLE biometric_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendee_id UUID NOT NULL UNIQUE REFERENCES booking_attendees(id) ON DELETE CASCADE,
    vector_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE captured_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    attendee_id UUID REFERENCES booking_attendees(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);


-- â”€â”€ 10b. Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE captured_photos ENABLE ROW LEVEL SECURITY;

-- experiences: Tier 5 (booking) â€” anon-readable
CREATE POLICY "experiences_select_anon" ON experiences FOR SELECT TO anon USING (true);
CREATE POLICY "experiences_select" ON experiences FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'r');
CREATE POLICY "experiences_insert" ON experiences FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'c');
CREATE POLICY "experiences_update" ON experiences FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u');
CREATE POLICY "experiences_delete" ON experiences FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'd');

-- tiers: Tier 5 (booking)
CREATE POLICY "tiers_select_anon" ON tiers FOR SELECT TO anon USING (true);
CREATE POLICY "tiers_select" ON tiers FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'r');
CREATE POLICY "tiers_insert" ON tiers FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'c');
CREATE POLICY "tiers_update" ON tiers FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u');
CREATE POLICY "tiers_delete" ON tiers FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'd');

-- tier_perks: Tier 5 (booking)
CREATE POLICY "tier_perks_select_anon" ON tier_perks FOR SELECT TO anon USING (true);
CREATE POLICY "tier_perks_select" ON tier_perks FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'r');
CREATE POLICY "tier_perks_insert" ON tier_perks FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'c');
CREATE POLICY "tier_perks_update" ON tier_perks FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u');
CREATE POLICY "tier_perks_delete" ON tier_perks FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'd');

-- experience_tiers: Tier 5 (booking)
CREATE POLICY "experience_tiers_select_anon" ON experience_tiers FOR SELECT TO anon USING (true);
CREATE POLICY "experience_tiers_select" ON experience_tiers FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'r');
CREATE POLICY "experience_tiers_insert" ON experience_tiers FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'c');
CREATE POLICY "experience_tiers_update" ON experience_tiers FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u');
CREATE POLICY "experience_tiers_delete" ON experience_tiers FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'd');

-- time_slots: Tier 5 (booking)
CREATE POLICY "time_slots_select_anon" ON time_slots FOR SELECT TO anon USING (true);
CREATE POLICY "time_slots_select" ON time_slots FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'r');
CREATE POLICY "time_slots_insert" ON time_slots FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'c');
CREATE POLICY "time_slots_update" ON time_slots FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u');
CREATE POLICY "time_slots_delete" ON time_slots FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'd');

-- scheduler_config: Tier 3 (booking)
CREATE POLICY "scheduler_config_select" ON scheduler_config FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'r');
CREATE POLICY "scheduler_config_insert" ON scheduler_config FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'c');
CREATE POLICY "scheduler_config_update" ON scheduler_config FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u');
CREATE POLICY "scheduler_config_delete" ON scheduler_config FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'd');

-- bookings: Tier 3 (booking)
CREATE POLICY "bookings_select" ON bookings FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'r');
CREATE POLICY "bookings_insert" ON bookings FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'c');
CREATE POLICY "bookings_update" ON bookings FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u');
CREATE POLICY "bookings_delete" ON bookings FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'd');

-- booking_attendees: Tier 3 (booking)
CREATE POLICY "booking_attendees_select" ON booking_attendees FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'r');
CREATE POLICY "booking_attendees_insert" ON booking_attendees FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'c');
CREATE POLICY "booking_attendees_update" ON booking_attendees FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u');
CREATE POLICY "booking_attendees_delete" ON booking_attendees FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'd');

-- booking_payments: Tier 3 (booking)
CREATE POLICY "booking_payments_select" ON booking_payments FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'r');
CREATE POLICY "booking_payments_insert" ON booking_payments FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'c');
CREATE POLICY "booking_payments_update" ON booking_payments FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u');
CREATE POLICY "booking_payments_delete" ON booking_payments FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'booking') ? 'd');

-- otp_challenges: Tier 6 (system-only) â€” RLS enabled, ZERO authenticated policies
ALTER TABLE otp_challenges ENABLE ROW LEVEL SECURITY;
-- biometric_vectors: Tier 6 (system-only)
ALTER TABLE biometric_vectors ENABLE ROW LEVEL SECURITY;
-- captured_photos: Tier 6 (system-only)
ALTER TABLE captured_photos ENABLE ROW LEVEL SECURITY;
-- No CREATE POLICY statements for Tier 6 tables. All access via service_role key.


-- â”€â”€ 10c. Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE INDEX idx_time_slots_experience_id ON time_slots(experience_id);
CREATE INDEX idx_time_slots_slot_date ON time_slots(slot_date);

CREATE INDEX idx_bookings_experience_id ON bookings(experience_id);
CREATE INDEX idx_bookings_time_slot_id ON bookings(time_slot_id);
CREATE INDEX idx_bookings_tier_id ON bookings(tier_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_promo_code_id ON bookings(promo_code_id);
CREATE INDEX idx_bookings_booker_email ON bookings(booker_email);

CREATE INDEX idx_booking_attendees_booking_id ON booking_attendees(booking_id);
CREATE INDEX idx_booking_payments_booking_id ON booking_payments(booking_id);

CREATE INDEX idx_otp_challenges_booking_ref ON otp_challenges(booking_ref);
CREATE INDEX idx_captured_photos_booking_id ON captured_photos(booking_id);
CREATE INDEX idx_captured_photos_expires_at ON captured_photos(expires_at);


-- ============================================================================
-- 11. INCIDENTS & SAFETY
-- ============================================================================

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category incident_category NOT NULL,
    status incident_status DEFAULT 'open',
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    attachment_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- incidents: Tier 2 (ops) â€” universal read + universal insert
CREATE POLICY "incidents_select" ON incidents FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "incidents_insert" ON incidents FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh());
CREATE POLICY "incidents_update" ON incidents FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'u');
CREATE POLICY "incidents_delete" ON incidents FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'd');

CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_zone_id ON incidents(zone_id);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_incidents_metadata ON incidents USING gin (metadata);


-- ============================================================================
-- 12. MAINTENANCE ORDERS
-- ============================================================================

CREATE TABLE maintenance_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    specialization TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Deferred FK: devices.maintenance_vendor_id â†’ maintenance_vendors
ALTER TABLE devices ADD CONSTRAINT devices_maintenance_vendor_id_fkey
    FOREIGN KEY (maintenance_vendor_id) REFERENCES maintenance_vendors(id) ON DELETE SET NULL;

CREATE TABLE maintenance_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topology mo_topology NOT NULL,
    status mo_status DEFAULT 'draft',
    target_ci_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES maintenance_vendors(id) ON DELETE RESTRICT,
    maintenance_start TIMESTAMPTZ NOT NULL,
    maintenance_end TIMESTAMPTZ NOT NULL,
    mad_limit_minutes INTEGER DEFAULT 120 CHECK (mad_limit_minutes > 0),
    sponsor_id UUID REFERENCES staff_records(id) ON DELETE SET NULL,
    sponsor_remark TEXT,
    switch_port TEXT,
    network_group TEXT,
    vendor_mac_address MACADDR,
    authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    scope TEXT,
    authorized_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CHECK (maintenance_start < maintenance_end)
);

ALTER TABLE maintenance_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_orders ENABLE ROW LEVEL SECURITY;

-- maintenance_vendors: Tier 1 (maintenance)
CREATE POLICY "maintenance_vendors_select" ON maintenance_vendors FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "maintenance_vendors_insert" ON maintenance_vendors FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'c');
CREATE POLICY "maintenance_vendors_update" ON maintenance_vendors FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'u');
CREATE POLICY "maintenance_vendors_delete" ON maintenance_vendors FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'd');

-- maintenance_orders: Tier 3b (maintenance) â€” ownership-scoped via sponsor_id
CREATE POLICY "maintenance_orders_select" ON maintenance_orders FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'r'
        AND (
            (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'd'
            OR sponsor_id IS NULL
            OR sponsor_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        )
    );
CREATE POLICY "maintenance_orders_insert" ON maintenance_orders FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'c');
CREATE POLICY "maintenance_orders_update" ON maintenance_orders FOR UPDATE TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'u'
        AND (
            (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'd'
            OR sponsor_id = (SELECT staff_record_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        )
    )
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'u'
    );
CREATE POLICY "maintenance_orders_delete" ON maintenance_orders FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'maintenance') ? 'd');

-- Maintenance computed status (virtual column for expired MAD timers)
CREATE OR REPLACE FUNCTION public.computed_status(mo public.maintenance_orders)
RETURNS public.mo_status
STABLE LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
    SELECT CASE
        WHEN mo.status = 'active' AND NOW() > mo.maintenance_end THEN 'completed'::public.mo_status
        ELSE mo.status
    END;
$$;

-- RADIUS access evaluation endpoint
CREATE OR REPLACE FUNCTION public.get_active_vendors_for_radius()
RETURNS TABLE (vendor_mac_address MACADDR, network_group TEXT, switch_port TEXT)
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
    SELECT vendor_mac_address, network_group, switch_port
    FROM public.maintenance_orders
    WHERE status = 'active'
      AND vendor_mac_address IS NOT NULL
      AND NOW() BETWEEN authorized_at AND maintenance_end;
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_vendors_for_radius() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_vendors_for_radius() TO authenticated;

CREATE INDEX idx_maintenance_vendors_is_active ON maintenance_vendors(is_active);
CREATE INDEX idx_mo_status ON maintenance_orders(status);
CREATE INDEX idx_mo_vendor_id ON maintenance_orders(vendor_id);
CREATE INDEX idx_mo_target_ci_id ON maintenance_orders(target_ci_id);
CREATE INDEX idx_mo_sponsor_id ON maintenance_orders(sponsor_id);
CREATE INDEX idx_mo_maintenance_start ON maintenance_orders(maintenance_start);


-- ============================================================================
-- 13. VEHICLES
-- ============================================================================

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plate TEXT,
    vehicle_type TEXT,
    status vehicle_status DEFAULT 'active',
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- vehicles: Tier 1 (ops)
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'c');
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'u');
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'd');

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_zone_id ON vehicles(zone_id);


-- ============================================================================
-- 14. MARKETING & PROMOTIONS
-- ============================================================================

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status lifecycle_status DEFAULT 'draft',
    budget NUMERIC CHECK (budget >= 0),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type discount_type NOT NULL,
    discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
    max_uses INTEGER CHECK (max_uses > 0),
    current_uses INTEGER DEFAULT 0 CHECK (current_uses >= 0),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    status lifecycle_status DEFAULT 'draft',
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    valid_days_mask INTEGER CHECK (valid_days_mask IS NULL OR (valid_days_mask >= 1 AND valid_days_mask <= 127)),
    valid_time_start TIME,
    valid_time_end TIME,
    min_group_size INTEGER DEFAULT 1 CHECK (min_group_size >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CHECK (valid_from < valid_to)
);

CREATE TABLE promo_valid_tiers (
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
    PRIMARY KEY (promo_code_id, tier_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Deferred FK: bookings.promo_code_id â†’ promo_codes
ALTER TABLE bookings ADD CONSTRAINT bookings_promo_code_id_fkey
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL;

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_valid_tiers ENABLE ROW LEVEL SECURITY;

-- campaigns: Tier 3 (marketing)
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'r');
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'c');
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'u');
CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'd');

-- promo_codes: Tier 3 (marketing)
CREATE POLICY "promo_codes_select" ON promo_codes FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'r');
CREATE POLICY "promo_codes_insert" ON promo_codes FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'c');
CREATE POLICY "promo_codes_update" ON promo_codes FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'u');
CREATE POLICY "promo_codes_delete" ON promo_codes FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'd');

-- promo_valid_tiers: Tier 3 (marketing)
CREATE POLICY "promo_valid_tiers_select" ON promo_valid_tiers FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'r');
CREATE POLICY "promo_valid_tiers_insert" ON promo_valid_tiers FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'c');
CREATE POLICY "promo_valid_tiers_update" ON promo_valid_tiers FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'u');
CREATE POLICY "promo_valid_tiers_delete" ON promo_valid_tiers FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'd');

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_promo_codes_campaign_id ON promo_codes(campaign_id);
CREATE INDEX idx_promo_codes_status ON promo_codes(status);
CREATE INDEX idx_promo_codes_valid_window ON promo_codes(valid_from, valid_to);


-- ============================================================================
-- 15. ANNOUNCEMENTS & COMMUNICATIONS
-- ============================================================================

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Target audience: org_unit replaces department (B7)
CREATE TABLE announcement_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    target_type announcement_target_type NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    org_unit_id UUID REFERENCES org_units(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CHECK (
        (target_type = 'global' AND role_id IS NULL AND org_unit_id IS NULL AND user_id IS NULL)
        OR (target_type = 'role' AND role_id IS NOT NULL AND org_unit_id IS NULL AND user_id IS NULL)
        OR (target_type = 'org_unit' AND role_id IS NULL AND org_unit_id IS NOT NULL AND user_id IS NULL)
        OR (target_type = 'user' AND role_id IS NULL AND org_unit_id IS NULL AND user_id IS NOT NULL)
    )
);

CREATE TABLE announcement_reads (
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (announcement_id, user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- announcements: Tier 3 (comms)
CREATE POLICY "announcements_select" ON announcements FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'r');
CREATE POLICY "announcements_insert" ON announcements FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'c');
CREATE POLICY "announcements_update" ON announcements FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'u');
CREATE POLICY "announcements_delete" ON announcements FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'd');

-- announcement_targets: Tier 3 (comms)
CREATE POLICY "announcement_targets_select" ON announcement_targets FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'r');
CREATE POLICY "announcement_targets_insert" ON announcement_targets FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'c');
CREATE POLICY "announcement_targets_update" ON announcement_targets FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'u');
CREATE POLICY "announcement_targets_delete" ON announcement_targets FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'd');

-- announcement_reads: Tier 2 (comms) â€” universal read + universal insert
CREATE POLICY "announcement_reads_select" ON announcement_reads FOR SELECT TO authenticated
    USING (public.is_claims_fresh());
CREATE POLICY "announcement_reads_insert" ON announcement_reads FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh());
CREATE POLICY "announcement_reads_update" ON announcement_reads FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'u');
CREATE POLICY "announcement_reads_delete" ON announcement_reads FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'comms') ? 'd');

CREATE INDEX idx_announcements_is_published ON announcements(is_published);
CREATE INDEX idx_announcements_expires_at ON announcements(expires_at);
CREATE INDEX idx_announcement_targets_announcement_id ON announcement_targets(announcement_id);
CREATE INDEX idx_announcement_targets_target_type ON announcement_targets(target_type);
CREATE INDEX idx_announcement_targets_org_unit_id ON announcement_targets(org_unit_id);
CREATE INDEX idx_announcement_reads_user_id ON announcement_reads(user_id);


-- ============================================================================
-- 16. SURVEYS, REPORTING & COMPLIANCE
-- ============================================================================

CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    survey_type survey_type NOT NULL,
    overall_score NUMERIC CHECK (overall_score >= 0 AND overall_score <= 10),
    nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
    sentiment survey_sentiment,
    keywords JSONB DEFAULT '[]',
    feedback_text TEXT,
    source survey_source DEFAULT 'in_app',
    staff_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CHECK (
        (staff_submitted = FALSE AND submitted_by IS NULL) OR
        (staff_submitted = TRUE AND submitted_by IS NOT NULL)
    )
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',
    export_format TEXT DEFAULT 'csv',
    schedule_cron TEXT,
    recipients JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    status report_status DEFAULT 'processing',
    row_count INTEGER DEFAULT 0,
    file_url TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE system_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;

-- survey_responses: Tier 3 (reports + marketing read) + anon INSERT for guest /survey submissions
CREATE POLICY "survey_responses_select" ON survey_responses FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (
        (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r' OR
        (auth.jwt()->'app_metadata'->'domains'->'marketing') ? 'r'));
CREATE POLICY "survey_responses_insert" ON survey_responses FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'c');
CREATE POLICY "survey_responses_insert_anon" ON survey_responses FOR INSERT TO anon
    WITH CHECK (true);
-- Tier 2 universal INSERT: any authenticated staff can capture guest feedback (facility-wide feature)
CREATE POLICY "survey_responses_insert_staff" ON survey_responses FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND staff_submitted = TRUE AND submitted_by = (SELECT auth.uid()));
CREATE POLICY "survey_responses_update" ON survey_responses FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'u');
CREATE POLICY "survey_responses_delete" ON survey_responses FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'd');

-- reports: Tier 3 (reports)
CREATE POLICY "reports_select" ON reports FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r');
CREATE POLICY "reports_insert" ON reports FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'c');
CREATE POLICY "reports_update" ON reports FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'u');
CREATE POLICY "reports_delete" ON reports FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'd');

-- report_executions: Tier 3 (reports)
CREATE POLICY "report_executions_select" ON report_executions FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r');
CREATE POLICY "report_executions_insert" ON report_executions FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'c');
CREATE POLICY "report_executions_update" ON report_executions FOR UPDATE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'u')
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'u');
CREATE POLICY "report_executions_delete" ON report_executions FOR DELETE TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'd');

-- system_audit_log: Tier 3 (reports) â€” domain-based replaces 7-branch OR (B9)
CREATE POLICY "system_audit_log_select" ON system_audit_log FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r');
CREATE POLICY "system_audit_log_insert" ON system_audit_log FOR INSERT TO authenticated
    WITH CHECK (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'c');
-- No UPDATE/DELETE â€” audit log is immutable

CREATE INDEX idx_survey_responses_booking_id ON survey_responses(booking_id);
CREATE INDEX idx_survey_responses_survey_type ON survey_responses(survey_type);
CREATE INDEX idx_survey_responses_keywords ON survey_responses USING gin (keywords);
CREATE INDEX idx_survey_responses_staff_submitted ON survey_responses(staff_submitted) WHERE staff_submitted = TRUE;
CREATE INDEX idx_survey_responses_submitted_by ON survey_responses(submitted_by) WHERE submitted_by IS NOT NULL;

CREATE INDEX idx_reports_report_type ON reports(report_type);
CREATE INDEX idx_report_executions_report_id ON report_executions(report_id);
CREATE INDEX idx_report_executions_status ON report_executions(status);

CREATE INDEX idx_system_audit_log_entity_type ON system_audit_log(entity_type);
CREATE INDEX idx_system_audit_log_performed_by ON system_audit_log(performed_by);
CREATE INDEX idx_system_audit_log_created_at ON system_audit_log(created_at);


-- ============================================================================
-- 17. BUSINESS LOGIC â€” TRIGGER FUNCTIONS
-- ============================================================================

-- â”€â”€ 17a. Ledger immutability (R5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.trg_ledger_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'LEDGER_IMMUTABLE: % is append-only. Create a reversal document instead.', TG_TABLE_NAME;
END;
$$;

-- â”€â”€ 17b. R14 â€” org_unit_path sync triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Populates org_unit_path on staff_records from org_units.path when org_unit_id is set.
-- On UPDATE of org_unit_id, cascades to transactional tables.
CREATE OR REPLACE FUNCTION public.trg_staff_org_unit_path_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    _new_path extensions.ltree;
BEGIN
    IF NEW.org_unit_id IS NOT NULL THEN
        SELECT path INTO _new_path FROM public.org_units WHERE id = NEW.org_unit_id;
        NEW.org_unit_path := _new_path;
    ELSE
        NEW.org_unit_path := NULL;
    END IF;

    -- On UPDATE: cascade to transactional tables if org_unit_id changed
    IF TG_OP = 'UPDATE' AND NEW.org_unit_id IS DISTINCT FROM OLD.org_unit_id THEN
        UPDATE public.leave_requests SET org_unit_path = _new_path WHERE staff_record_id = NEW.id;
        UPDATE public.shift_schedules SET org_unit_path = _new_path WHERE staff_record_id = NEW.id;
        UPDATE public.timecard_punches SET org_unit_path = _new_path WHERE staff_record_id = NEW.id;
        UPDATE public.attendance_exceptions SET org_unit_path = _new_path
        WHERE staff_record_id = NEW.id;
        UPDATE public.leave_ledger SET org_unit_path = _new_path WHERE staff_record_id = NEW.id;
        UPDATE public.crew_zones SET org_unit_path = _new_path WHERE staff_record_id = NEW.id;
        UPDATE public.staff_roster_assignments SET org_unit_path = _new_path WHERE staff_record_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Auto-populates org_unit_path on transactional HR tables from staff_records
CREATE OR REPLACE FUNCTION public.trg_populate_org_unit_path()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    SELECT sr.org_unit_path INTO NEW.org_unit_path
    FROM public.staff_records sr WHERE sr.id = NEW.staff_record_id;
    RETURN NEW;
END;
$$;

-- Attendance exceptions: resolves staff_record_id from shift_schedules, then org_unit_path
CREATE OR REPLACE FUNCTION public.trg_populate_exception_org_path()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    _staff_id UUID;
BEGIN
    SELECT ss.staff_record_id INTO _staff_id
    FROM public.shift_schedules ss WHERE ss.id = NEW.shift_schedule_id;
    NEW.staff_record_id := _staff_id;

    SELECT sr.org_unit_path INTO NEW.org_unit_path
    FROM public.staff_records sr WHERE sr.id = _staff_id;
    RETURN NEW;
END;
$$;

-- â”€â”€ 17c. HR business triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.trg_validate_day_index()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_cycle_length INTEGER;
BEGIN
    SELECT cycle_length_days INTO v_cycle_length
    FROM public.roster_templates WHERE id = NEW.template_id;
    IF v_cycle_length IS NULL THEN
        RAISE EXCEPTION 'TEMPLATE_NOT_FOUND: roster_templates.id = %', NEW.template_id;
    END IF;
    IF NEW.day_index > v_cycle_length THEN
        RAISE EXCEPTION 'INVALID_DAY_INDEX: day_index (%) exceeds cycle_length_days (%) for template %.',
            NEW.day_index, v_cycle_length, NEW.template_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_shift_schedule_mark_override()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF current_setting('app.settings.template_regeneration', true) = 'true' THEN
        RETURN NEW;
    END IF;
    IF NEW.shift_type_id IS DISTINCT FROM OLD.shift_type_id
       AND NEW.is_override IS NOT DISTINCT FROM OLD.is_override THEN
        NEW.is_override := TRUE;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_validate_punch_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_shift_date DATE; v_start_time TIME; v_end_time TIME;
    v_max_early INTEGER; v_max_late INTEGER; v_max_late_in INTEGER;
    v_start_ts TIMESTAMPTZ; v_end_ts TIMESTAMPTZ;
    v_tz TEXT := public.get_app_config('facility_timezone');
BEGIN
    SELECT ss.shift_date, ss.expected_start_time, ss.expected_end_time,
           st.max_early_clock_in_minutes, st.max_late_clock_out_minutes, st.max_late_clock_in_minutes
    INTO v_shift_date, v_start_time, v_end_time, v_max_early, v_max_late, v_max_late_in
    FROM public.shift_schedules ss JOIN public.shift_types st ON st.id = ss.shift_type_id
    WHERE ss.id = NEW.shift_schedule_id;

    IF v_start_time IS NULL THEN RETURN NEW; END IF;
    v_start_ts := (v_shift_date + v_start_time) AT TIME ZONE v_tz;
    IF v_end_time IS NOT NULL THEN
        IF v_end_time < v_start_time THEN
            v_end_ts := ((v_shift_date + INTERVAL '1 day') + v_end_time) AT TIME ZONE v_tz;
        ELSE
            v_end_ts := (v_shift_date + v_end_time) AT TIME ZONE v_tz;
        END IF;
    END IF;

    IF NEW.punch_type = 'clock_in' THEN
        IF NEW.punch_time < (v_start_ts - (v_max_early || ' minutes')::INTERVAL) THEN
            RAISE EXCEPTION 'PUNCH_TOO_EARLY: Shift starts at %, earliest allowed is %.',
                to_char(v_start_ts, 'HH24:MI'),
                to_char(v_start_ts - (v_max_early || ' minutes')::INTERVAL, 'HH24:MI');
        END IF;
        IF NEW.source != 'manual' AND
           NEW.punch_time > (v_start_ts + (v_max_late_in || ' minutes')::INTERVAL) THEN
            RAISE EXCEPTION 'CLOCK_IN_WINDOW_EXPIRED: Clock-in cutoff was %. Use manual entry.',
                to_char(v_start_ts + (v_max_late_in || ' minutes')::INTERVAL, 'HH24:MI');
        END IF;
    END IF;

    IF NEW.punch_type = 'clock_out' AND v_end_ts IS NOT NULL THEN
        IF NEW.punch_time > (v_end_ts + (v_max_late || ' minutes')::INTERVAL) THEN
            RAISE EXCEPTION 'PUNCH_TOO_LATE: Shift ended at %, latest allowed is %.',
                to_char(v_end_ts, 'HH24:MI'),
                to_char(v_end_ts + (v_max_late || ' minutes')::INTERVAL, 'HH24:MI');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_detect_discrepancies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_shift_date DATE; v_start_time TIME; v_end_time TIME;
    v_grace_late INTEGER; v_grace_early INTEGER;
    v_start_ts TIMESTAMPTZ; v_end_ts TIMESTAMPTZ; v_diff_minutes INTEGER;
    v_tz TEXT := public.get_app_config('facility_timezone');
    v_staff_record_id UUID; v_org_unit_path extensions.ltree;
BEGIN
    IF NEW.voided_at IS NOT NULL THEN RETURN NEW; END IF;

    SELECT ss.shift_date, ss.expected_start_time, ss.expected_end_time,
           st.grace_late_arrival_minutes, st.grace_early_departure_minutes
    INTO v_shift_date, v_start_time, v_end_time, v_grace_late, v_grace_early
    FROM public.shift_schedules ss JOIN public.shift_types st ON st.id = ss.shift_type_id
    WHERE ss.id = NEW.shift_schedule_id;

    IF v_start_time IS NULL THEN RETURN NEW; END IF;
    v_start_ts := (v_shift_date + v_start_time) AT TIME ZONE v_tz;
    IF v_end_time IS NOT NULL THEN
        IF v_end_time < v_start_time THEN
            v_end_ts := ((v_shift_date + INTERVAL '1 day') + v_end_time) AT TIME ZONE v_tz;
        ELSE
            v_end_ts := (v_shift_date + v_end_time) AT TIME ZONE v_tz;
        END IF;
    END IF;

    -- Resolve staff_record_id + org_unit_path for denormalized columns on attendance_exceptions
    v_staff_record_id := NEW.staff_record_id;
    SELECT sr.org_unit_path INTO v_org_unit_path
    FROM public.staff_records sr WHERE sr.id = v_staff_record_id;

    IF NEW.punch_type = 'clock_in' THEN
        IF NEW.punch_time > (v_start_ts + (v_grace_late || ' minutes')::INTERVAL) THEN
            v_diff_minutes := EXTRACT(EPOCH FROM (NEW.punch_time - v_start_ts))::INTEGER / 60;
            INSERT INTO public.attendance_exceptions (shift_schedule_id, staff_record_id, org_unit_path, type, detail, status)
            VALUES (NEW.shift_schedule_id, v_staff_record_id, v_org_unit_path,
                'late_arrival'::public.exception_type,
                'Late by ' || v_diff_minutes || ' min. Clocked in at ' ||
                    to_char(NEW.punch_time AT TIME ZONE v_tz, 'HH24:MI') ||
                    ' (Expected: ' || to_char(v_start_ts, 'HH24:MI') || ')',
                'unjustified'::public.exception_status
            ) ON CONFLICT (shift_schedule_id, type) DO NOTHING;
        END IF;
    END IF;

    IF NEW.punch_type = 'clock_out' AND v_end_ts IS NOT NULL THEN
        IF NEW.punch_time < (v_end_ts - (v_grace_early || ' minutes')::INTERVAL) THEN
            v_diff_minutes := EXTRACT(EPOCH FROM (v_end_ts - NEW.punch_time))::INTEGER / 60;
            INSERT INTO public.attendance_exceptions (shift_schedule_id, staff_record_id, org_unit_path, type, detail, status)
            VALUES (NEW.shift_schedule_id, v_staff_record_id, v_org_unit_path,
                'early_departure'::public.exception_type,
                'Early by ' || v_diff_minutes || ' min. Clocked out at ' ||
                    to_char(NEW.punch_time AT TIME ZONE v_tz, 'HH24:MI') ||
                    ' (Expected: ' || to_char(v_end_ts, 'HH24:MI') || ')',
                'unjustified'::public.exception_status
            ) ON CONFLICT (shift_schedule_id, type) DO NOTHING;
        END IF;
    END IF;

    IF NEW.punch_type = 'clock_out' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.timecard_punches tp2
            WHERE tp2.shift_schedule_id = NEW.shift_schedule_id
              AND tp2.punch_type = 'clock_in' AND tp2.voided_at IS NULL AND tp2.id != NEW.id
        ) THEN
            INSERT INTO public.attendance_exceptions (shift_schedule_id, staff_record_id, org_unit_path, type, detail, status)
            VALUES (NEW.shift_schedule_id, v_staff_record_id, v_org_unit_path,
                'missing_clock_in'::public.exception_type,
                'Staff clocked out at ' || to_char(NEW.punch_time AT TIME ZONE v_tz, 'HH24:MI') ||
                    ' without a prior clock-in',
                'unjustified'::public.exception_status
            ) ON CONFLICT (shift_schedule_id, type) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_leave_approval_linkage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_fiscal_year INTEGER;
    v_org_unit_path extensions.ltree;
BEGIN
    IF TG_OP != 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    v_fiscal_year := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;

    -- Resolve org_unit_path for leave_ledger denormalization
    SELECT sr.org_unit_path INTO v_org_unit_path
    FROM public.staff_records sr WHERE sr.id = NEW.staff_record_id;

    IF NEW.status = 'approved' THEN
        INSERT INTO public.leave_ledger (
            staff_record_id, leave_type_id, fiscal_year, transaction_date,
            transaction_type, days, leave_request_id, org_unit_path, notes
        ) VALUES (
            NEW.staff_record_id, NEW.leave_type_id, v_fiscal_year, CURRENT_DATE,
            'usage', -(NEW.requested_days), NEW.id, v_org_unit_path, 'Auto-debit: leave approved'
        );
    ELSIF OLD.status = 'approved' AND NEW.status IN ('cancelled', 'rejected') THEN
        INSERT INTO public.leave_ledger (
            staff_record_id, leave_type_id, fiscal_year, transaction_date,
            transaction_type, days, leave_request_id, org_unit_path, notes
        ) VALUES (
            NEW.staff_record_id, NEW.leave_type_id, v_fiscal_year, CURRENT_DATE,
            'adjustment', NEW.requested_days, NEW.id, v_org_unit_path,
            'Auto-reversal: leave ' || NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_leave_ledger_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'LEDGER_IMMUTABLE: leave_ledger is append-only. Insert an offsetting entry instead.';
END;
$$;

-- â”€â”€ 17d. BOM validation (R15) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.trg_bom_component_self_ref_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_parent_material_id UUID;
BEGIN
    SELECT parent_material_id INTO v_parent_material_id
    FROM public.bill_of_materials WHERE id = NEW.bom_id;
    IF NEW.component_material_id = v_parent_material_id THEN
        RAISE EXCEPTION 'BOM_SELF_REFERENCE: component_material_id cannot equal parent_material_id for bom_id %', NEW.bom_id;
    END IF;
    RETURN NEW;
END;
$$;

-- â”€â”€ 17e. Location validation for goods_movement_items (B10 retarget) â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.trg_validate_gmi_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_category_id UUID;
BEGIN
    SELECT category_id INTO v_category_id FROM public.materials WHERE id = NEW.material_id;
    IF NOT EXISTS (
        SELECT 1 FROM public.location_allowed_categories
        WHERE location_id = NEW.location_id AND category_id = v_category_id
    ) THEN
        RAISE EXCEPTION 'LOCATION_CATEGORY_MISMATCH: Location % does not allow material category %',
            NEW.location_id, v_category_id;
    END IF;
    RETURN NEW;
END;
$$;

-- â”€â”€ 17f. Requisition line validation (B12) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.trg_validate_requisition_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.movement_types WHERE code = NEW.movement_type_code AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'INVALID_MOVEMENT_TYPE: movement_type_code % not found or inactive', NEW.movement_type_code;
    END IF;
    RETURN NEW;
END;
$$;

-- â”€â”€ 17g. Stock balance cache sync (R17 â€” fires first by name) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.fn_gmi_a_cache_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.stock_balance_cache (material_id, location_id, current_qty, stock_value, last_synced_at)
    VALUES (NEW.material_id, NEW.location_id, NEW.quantity, NEW.total_cost, NOW())
    ON CONFLICT (material_id, location_id)
    DO UPDATE SET
        current_qty = public.stock_balance_cache.current_qty + NEW.quantity,
        stock_value = public.stock_balance_cache.stock_value + NEW.total_cost,
        last_synced_at = NOW(),
        updated_at = NOW();
    RETURN NEW;
END;
$$;

-- â”€â”€ 17h. Material valuation update (R17 â€” fires second by name) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.fn_gmi_b_valuation_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_old_qty NUMERIC;
    v_old_avg NUMERIC;
    v_new_avg NUMERIC;
    v_movement_type_code TEXT;
BEGIN
    -- Only update valuation on goods receipts (inflow)
    SELECT mt.code INTO v_movement_type_code
    FROM public.goods_movements gm
    JOIN public.movement_types mt ON mt.id = gm.movement_type_id
    WHERE gm.id = NEW.goods_movement_id;

    IF v_movement_type_code NOT IN ('101', '561') THEN RETURN NEW; END IF;
    IF NEW.quantity <= 0 THEN RETURN NEW; END IF;

    -- trg_gmi_a_cache_sync fires BEFORE this trigger (alphabetical ordering) and has
    -- already incremented stock_balance_cache.current_qty by NEW.quantity. Subtract it
    -- back to recover the true pre-movement balance for the moving average formula.
    SELECT current_qty - NEW.quantity INTO v_old_qty
    FROM public.stock_balance_cache
    WHERE material_id = NEW.material_id AND location_id = NEW.location_id;
    v_old_qty := COALESCE(v_old_qty, 0);

    SELECT moving_avg_cost INTO v_old_avg
    FROM public.material_valuation
    WHERE material_id = NEW.material_id AND location_id = NEW.location_id;
    v_old_avg := COALESCE(v_old_avg, 0);

    -- Moving average: ((old_qty Ã— old_avg) + (new_qty Ã— new_cost)) / (old_qty + new_qty)
    IF (v_old_qty + NEW.quantity) > 0 THEN
        v_new_avg := ((v_old_qty * v_old_avg) + (NEW.quantity * NEW.unit_cost)) / (v_old_qty + NEW.quantity);
    ELSE
        v_new_avg := NEW.unit_cost;
    END IF;

    INSERT INTO public.material_valuation (material_id, location_id, moving_avg_cost, last_purchase_cost, updated_at)
    VALUES (NEW.material_id, NEW.location_id, v_new_avg, NEW.unit_cost, NOW())
    ON CONFLICT (material_id, location_id)
    DO UPDATE SET
        moving_avg_cost = v_new_avg,
        last_purchase_cost = NEW.unit_cost,
        updated_at = NOW();
    RETURN NEW;
END;
$$;

-- â”€â”€ 17i. BOM explosion helper (R15 depth guard) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.explode_bom(
    p_material_id UUID,
    p_quantity NUMERIC,
    p_depth INTEGER DEFAULT 0
)
RETURNS TABLE (
    component_material_id UUID,
    component_qty NUMERIC,
    bom_id UUID,
    depth INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_bom_id UUID;
    rec RECORD;
BEGIN
    IF p_depth > 10 THEN
        RAISE EXCEPTION 'BOM_CIRCULAR_OR_TOO_DEEP: depth % for material_id %', p_depth, p_material_id;
    END IF;

    -- Find active default BOM for this material
    SELECT b.id INTO v_bom_id
    FROM public.bill_of_materials b
    WHERE b.parent_material_id = p_material_id
      AND b.status = 'active' AND b.is_default = TRUE
      AND b.effective_from <= CURRENT_DATE
      AND (b.effective_to IS NULL OR b.effective_to >= CURRENT_DATE);

    IF v_bom_id IS NULL THEN
        -- No BOM: return the material itself as a leaf component
        RETURN QUERY SELECT p_material_id, p_quantity, NULL::UUID, p_depth;
        RETURN;
    END IF;

    FOR rec IN
        SELECT bc.component_material_id, bc.quantity, bc.scrap_pct, bc.is_phantom
        FROM public.bom_components bc
        WHERE bc.bom_id = v_bom_id
    LOOP
        IF rec.is_phantom THEN
            -- Phantom: always explode through to next level
            RETURN QUERY SELECT * FROM public.explode_bom(
                rec.component_material_id,
                p_quantity * rec.quantity * (1 + COALESCE(rec.scrap_pct, 0) / 100.0),
                p_depth + 1
            );
        ELSE
            -- Check if component has its own BOM (semi-finished)
            IF EXISTS (
                SELECT 1 FROM public.bill_of_materials b2
                WHERE b2.parent_material_id = rec.component_material_id
                  AND b2.status = 'active' AND b2.is_default = TRUE
                  AND b2.effective_from <= CURRENT_DATE
                  AND (b2.effective_to IS NULL OR b2.effective_to >= CURRENT_DATE)
            ) THEN
                RETURN QUERY SELECT * FROM public.explode_bom(
                    rec.component_material_id,
                    p_quantity * rec.quantity * (1 + COALESCE(rec.scrap_pct, 0) / 100.0),
                    p_depth + 1
                );
            ELSE
                RETURN QUERY SELECT
                    rec.component_material_id,
                    p_quantity * rec.quantity * (1 + COALESCE(rec.scrap_pct, 0) / 100.0),
                    v_bom_id,
                    p_depth + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.explode_bom(UUID, NUMERIC, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.explode_bom(UUID, NUMERIC, INTEGER) TO authenticated;

-- â”€â”€ 17j. Reconciliation items counted check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.check_reconciliation_items_counted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NEW.status = 'pending_review' AND OLD.status != 'pending_review' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.inventory_reconciliation_items
            WHERE reconciliation_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'RECON_NO_ITEMS: Cannot submit for review â€” no items counted for reconciliation %', NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- â”€â”€ 17k. Inventory business-logic triggers (unified goods movement creators) â”€

-- (a) Order completion â†’ goods issue for sale (movement type 601)
-- Fires when orders.status â†’ 'completed'. Walks order_items through BOM explosion,
-- creates goods_movements + goods_movement_items. Cache sync fires downstream via trg_gmi_a/b.
CREATE OR REPLACE FUNCTION public.trg_order_completion_goods_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_mt_id UUID;
    v_gm_id UUID;
    v_location_id UUID;
    v_item RECORD;
    v_component RECORD;
    v_modifier RECORD;
    v_unit_cost NUMERIC;
    v_final_qty NUMERIC;
    v_deductions JSONB;  -- { material_id_text: { qty: N, bom_id: UUID } }
    v_key TEXT;
    v_entry JSONB;
    v_deduct_material_id UUID;
    v_deduct_qty NUMERIC;
    v_deduct_bom_id UUID;
BEGIN
    IF TG_OP != 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    IF NEW.status != 'completed' THEN RETURN NEW; END IF;

    SELECT mt.id INTO v_mt_id FROM public.movement_types mt WHERE mt.code = '601';
    SELECT pp.location_id INTO v_location_id
    FROM public.pos_points pp WHERE pp.id = NEW.pos_point_id;

    INSERT INTO public.goods_movements (movement_type_id, order_id, created_by)
    VALUES (v_mt_id, NEW.id, NEW.created_by)
    RETURNING id INTO v_gm_id;

    -- Process each order line item
    FOR v_item IN
        SELECT oi.id AS order_item_id, oi.material_id, oi.quantity
        FROM public.order_items oi WHERE oi.order_id = NEW.id
    LOOP
        -- Step 1: Explode standard active BOM â†’ base component quantities
        v_deductions := '{}'::JSONB;
        FOR v_component IN
            SELECT * FROM public.explode_bom(v_item.material_id, v_item.quantity)
        LOOP
            v_key := v_component.component_material_id::TEXT;
            IF v_deductions ? v_key THEN
                v_deductions := jsonb_set(v_deductions, ARRAY[v_key, 'qty'],
                    to_jsonb((v_deductions -> v_key ->> 'qty')::NUMERIC + v_component.component_qty));
            ELSE
                v_deductions := jsonb_set(v_deductions, ARRAY[v_key],
                    jsonb_build_object('qty', v_component.component_qty, 'bom_id', v_component.bom_id));
            END IF;
        END LOOP;

        -- Step 2: Apply modifier material deltas
        FOR v_modifier IN
            SELECT oim.material_id, oim.quantity_delta
            FROM public.order_item_modifiers oim
            WHERE oim.order_item_id = v_item.order_item_id
              AND oim.material_id IS NOT NULL
              AND oim.quantity_delta != 0
        LOOP
            v_key := v_modifier.material_id::TEXT;
            IF v_deductions ? v_key THEN
                -- Material exists in BOM â†’ adjust quantity (delta * order line qty)
                v_final_qty := (v_deductions -> v_key ->> 'qty')::NUMERIC
                             + (v_modifier.quantity_delta * v_item.quantity);
                v_deductions := jsonb_set(v_deductions, ARRAY[v_key, 'qty'], to_jsonb(v_final_qty));
            ELSE
                -- Material NOT in BOM â†’ add as new deduction line
                v_deductions := jsonb_set(v_deductions, ARRAY[v_key],
                    jsonb_build_object('qty', v_modifier.quantity_delta * v_item.quantity, 'bom_id', NULL));
            END IF;
        END LOOP;

        -- Step 3: Write deduction lines (skip if final quantity <= 0)
        FOR v_key, v_entry IN SELECT * FROM jsonb_each(v_deductions)
        LOOP
            v_deduct_material_id := v_key::UUID;
            v_deduct_qty := (v_entry ->> 'qty')::NUMERIC;
            v_deduct_bom_id := (v_entry ->> 'bom_id')::UUID;

            -- Skip components where modifiers zeroed out or reversed the quantity
            IF v_deduct_qty <= 0 THEN CONTINUE; END IF;

            SELECT COALESCE(mv.moving_avg_cost, 0) INTO v_unit_cost
            FROM public.material_valuation mv
            WHERE mv.material_id = v_deduct_material_id AND mv.location_id = v_location_id;
            v_unit_cost := COALESCE(v_unit_cost, 0);

            INSERT INTO public.goods_movement_items (
                goods_movement_id, material_id, quantity, unit_id,
                location_id, unit_cost, bom_id
            ) VALUES (
                v_gm_id, v_deduct_material_id, -(v_deduct_qty),
                (SELECT m.base_unit_id FROM public.materials m WHERE m.id = v_deduct_material_id),
                v_location_id, v_unit_cost, v_deduct_bom_id
            );
        END LOOP;
    END LOOP;

    -- AFTER trigger cannot modify the row via NEW, so stamp completed_at explicitly.
    UPDATE public.orders SET completed_at = NOW() WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

-- (b) PO item receive â†’ goods receipt (movement type 101)
-- Fires when purchase_order_items.received_qty increases. Converts purchase units
-- to base units via uom_conversions, creates inflow goods_movement_items.
-- Auto-transitions PO status.
CREATE OR REPLACE FUNCTION public.trg_po_receive_goods_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_mt_id UUID;
    v_gm_id UUID;
    v_po RECORD;
    v_delta NUMERIC;
    v_conversion NUMERIC;
    v_base_qty NUMERIC;
    v_purchase_unit_id UUID;
    v_base_unit_id UUID;
    v_all_received BOOLEAN;
BEGIN
    IF TG_OP != 'UPDATE' THEN RETURN NEW; END IF;
    v_delta := NEW.received_qty - COALESCE(OLD.received_qty, 0);
    IF v_delta <= 0 THEN RETURN NEW; END IF;

    SELECT po.id, po.supplier_id, po.receiving_location_id, po.status
    INTO v_po FROM public.purchase_orders po WHERE po.id = NEW.po_id;

    -- Resolve conversion factor: purchase_unit â†’ base_unit
    SELECT m.base_unit_id INTO v_base_unit_id FROM public.materials m WHERE m.id = NEW.material_id;
    SELECT mpd.purchase_unit_id INTO v_purchase_unit_id
    FROM public.material_procurement_data mpd
    WHERE mpd.material_id = NEW.material_id AND mpd.supplier_id = v_po.supplier_id;

    IF v_purchase_unit_id IS NOT NULL AND v_purchase_unit_id IS DISTINCT FROM v_base_unit_id THEN
        SELECT uc.factor INTO v_conversion
        FROM public.uom_conversions uc
        WHERE (uc.material_id = NEW.material_id OR uc.material_id IS NULL)
          AND uc.from_unit_id = v_purchase_unit_id
          AND uc.to_unit_id = v_base_unit_id
        ORDER BY uc.material_id NULLS LAST
        LIMIT 1;
        v_base_qty := v_delta * COALESCE(v_conversion, 1);
    ELSE
        v_base_qty := v_delta;
    END IF;

    SELECT mt.id INTO v_mt_id FROM public.movement_types mt WHERE mt.code = '101';

    INSERT INTO public.goods_movements (movement_type_id, purchase_order_id, created_by)
    VALUES (v_mt_id, v_po.id, (SELECT auth.uid()))
    RETURNING id INTO v_gm_id;

    INSERT INTO public.goods_movement_items (
        goods_movement_id, material_id, quantity, unit_id,
        location_id, unit_cost
    ) VALUES (
        v_gm_id, NEW.material_id, v_base_qty,
        COALESCE(v_base_unit_id, v_purchase_unit_id),
        v_po.receiving_location_id, NEW.unit_price
    );

    -- Auto-transition PO status
    SELECT bool_and(poi.received_qty >= poi.expected_qty) INTO v_all_received
    FROM public.purchase_order_items poi WHERE poi.po_id = v_po.id;

    IF v_all_received THEN
        UPDATE public.purchase_orders SET status = 'completed', updated_at = NOW() WHERE id = v_po.id;
    ELSIF v_po.status = 'sent' THEN
        UPDATE public.purchase_orders SET status = 'partially_received', updated_at = NOW() WHERE id = v_po.id;
    END IF;

    RETURN NEW;
END;
$$;

-- (c) Write-off â†’ scrapping goods movement (movement type 551)
-- Fires on INSERT into write_offs. If explode_bom = TRUE, walks BOM components;
-- otherwise deducts the material directly.
CREATE OR REPLACE FUNCTION public.trg_write_off_goods_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_mt_id UUID;
    v_gm_id UUID;
    v_component RECORD;
BEGIN
    SELECT mt.id INTO v_mt_id FROM public.movement_types mt WHERE mt.code = '551';

    INSERT INTO public.goods_movements (movement_type_id, disposal_id, created_by)
    VALUES (v_mt_id, NEW.id, NEW.created_by)
    RETURNING id INTO v_gm_id;

    IF NEW.explode_bom THEN
        FOR v_component IN
            SELECT * FROM public.explode_bom(NEW.material_id, NEW.quantity)
        LOOP
            INSERT INTO public.goods_movement_items (
                goods_movement_id, material_id, quantity, unit_id,
                location_id, unit_cost, bom_id, cost_center_id
            ) VALUES (
                v_gm_id, v_component.component_material_id, -(v_component.component_qty),
                (SELECT m.base_unit_id FROM public.materials m WHERE m.id = v_component.component_material_id),
                NEW.location_id, NEW.unit_cost, v_component.bom_id, NEW.cost_center_id
            );
        END LOOP;
    ELSE
        INSERT INTO public.goods_movement_items (
            goods_movement_id, material_id, quantity, unit_id,
            location_id, unit_cost, cost_center_id
        ) VALUES (
            v_gm_id, NEW.material_id, -(NEW.quantity),
            (SELECT m.base_unit_id FROM public.materials m WHERE m.id = NEW.material_id),
            NEW.location_id, NEW.unit_cost, NEW.cost_center_id
        );
    END IF;

    RETURN NEW;
END;
$$;

-- (d) Requisition completion â†’ transfer/consumption goods movements
-- Fires when material_requisitions.status â†’ 'completed'. Creates per-line goods
-- movements using the movement_type_code on each requisition item. Uses delivered_qty.
CREATE OR REPLACE FUNCTION public.trg_requisition_completion_goods_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_gm_id UUID;
    v_item RECORD;
    v_mt_id UUID;
    v_mt_direction TEXT;
    v_unit_cost NUMERIC;
BEGIN
    IF TG_OP != 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    IF NEW.status != 'completed' THEN RETURN NEW; END IF;

    FOR v_item IN
        SELECT mri.*, m.base_unit_id
        FROM public.material_requisition_items mri
        JOIN public.materials m ON m.id = mri.material_id
        WHERE mri.requisition_id = NEW.id AND COALESCE(mri.delivered_qty, 0) > 0
    LOOP
        SELECT mt.id, mt.direction INTO v_mt_id, v_mt_direction
        FROM public.movement_types mt WHERE mt.code = v_item.movement_type_code;

        SELECT COALESCE(mv.moving_avg_cost, 0) INTO v_unit_cost
        FROM public.material_valuation mv
        WHERE mv.material_id = v_item.material_id AND mv.location_id = NEW.from_location_id;
        v_unit_cost := COALESCE(v_unit_cost, 0);

        INSERT INTO public.goods_movements (movement_type_id, requisition_id, created_by)
        VALUES (v_mt_id, NEW.id, NEW.created_by)
        RETURNING id INTO v_gm_id;

        -- Outflow from source location
        INSERT INTO public.goods_movement_items (
            goods_movement_id, material_id, quantity, unit_id, location_id, unit_cost
        ) VALUES (
            v_gm_id, v_item.material_id, -(v_item.delivered_qty),
            v_item.base_unit_id, NEW.from_location_id, v_unit_cost
        );

        -- Inflow to destination (transfer only, not consumption)
        IF v_mt_direction = 'transfer' AND NEW.to_location_id IS NOT NULL THEN
            INSERT INTO public.goods_movement_items (
                goods_movement_id, material_id, quantity, unit_id, location_id, unit_cost
            ) VALUES (
                v_gm_id, v_item.material_id, v_item.delivered_qty,
                v_item.base_unit_id, NEW.to_location_id, v_unit_cost
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

-- (e) Reconciliation approval â†’ adjustment goods movements (types 701/702)
-- Fires when inventory_reconciliations transitions pending_review â†’ 'completed'
-- with discrepancy_found = TRUE. Adjusts stock_balance_cache to match physical counts.
CREATE OR REPLACE FUNCTION public.trg_reconciliation_approval_goods_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_gm_id UUID;
    v_item RECORD;
    v_mt_id UUID;
    v_variance NUMERIC;
    v_unit_cost NUMERIC;
BEGIN
    IF TG_OP != 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    IF NEW.status != 'completed' OR OLD.status != 'pending_review' THEN RETURN NEW; END IF;
    IF NOT COALESCE(NEW.discrepancy_found, FALSE) THEN RETURN NEW; END IF;

    FOR v_item IN
        SELECT iri.material_id, iri.system_qty, iri.physical_qty, m.base_unit_id
        FROM public.inventory_reconciliation_items iri
        JOIN public.materials m ON m.id = iri.material_id
        WHERE iri.reconciliation_id = NEW.id
          AND iri.physical_qty IS DISTINCT FROM iri.system_qty
    LOOP
        v_variance := v_item.physical_qty - v_item.system_qty;

        IF v_variance > 0 THEN
            SELECT mt.id INTO v_mt_id FROM public.movement_types mt WHERE mt.code = '701';
        ELSE
            SELECT mt.id INTO v_mt_id FROM public.movement_types mt WHERE mt.code = '702';
        END IF;

        SELECT COALESCE(mv.moving_avg_cost, 0) INTO v_unit_cost
        FROM public.material_valuation mv
        WHERE mv.material_id = v_item.material_id AND mv.location_id = NEW.location_id;
        v_unit_cost := COALESCE(v_unit_cost, 0);

        INSERT INTO public.goods_movements (movement_type_id, reconciliation_id, created_by)
        VALUES (v_mt_id, NEW.id, NEW.created_by)
        RETURNING id INTO v_gm_id;

        INSERT INTO public.goods_movement_items (
            goods_movement_id, material_id, quantity, unit_id, location_id, unit_cost
        ) VALUES (
            v_gm_id, v_item.material_id, v_variance,
            v_item.base_unit_id, NEW.location_id, v_unit_cost
        );
    END LOOP;

    RETURN NEW;
END;
$$;


-- â”€â”€ 17l. Other business triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.trg_crew_zones_auto_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    UPDATE public.crew_zones SET left_at = NOW()
    WHERE staff_record_id = NEW.staff_record_id AND left_at IS NULL;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_auto_create_iam_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.iam_requests (request_type, status, staff_record_id, created_by)
    VALUES ('provisioning'::public.iam_request_type, 'pending_it'::public.iam_request_status,
            NEW.id, (SELECT auth.uid()));
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_guest_count INTEGER;
BEGIN
    IF TG_OP != 'UPDATE' OR NEW.status = OLD.status THEN RETURN NEW; END IF;
    v_guest_count := NEW.adult_count + NEW.child_count;

    IF NEW.status = 'cancelled' AND OLD.status IN ('pending_payment', 'confirmed', 'checked_in') THEN
        UPDATE public.time_slots SET booked_count = GREATEST(0, booked_count - v_guest_count), updated_at = NOW()
        WHERE id = NEW.time_slot_id;
        IF NEW.promo_code_id IS NOT NULL THEN
            UPDATE public.promo_codes SET current_uses = GREATEST(0, current_uses - 1), updated_at = NOW()
            WHERE id = NEW.promo_code_id;
        END IF;
    ELSIF NEW.status = 'confirmed' AND OLD.status = 'cancelled' THEN
        UPDATE public.time_slots SET booked_count = booked_count + v_guest_count, updated_at = NOW()
        WHERE id = NEW.time_slot_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Announcements RPC (B7 refactored: department_id â†’ org_unit_id)
CREATE OR REPLACE FUNCTION public.get_visible_announcements(p_unread_only BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
    id UUID, title TEXT, content TEXT, created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, created_by_name TEXT, is_read BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role_id UUID;
    v_org_unit_path extensions.ltree;
BEGIN
    SELECT p.role_id INTO v_role_id FROM public.profiles p WHERE p.id = v_user_id;
    SELECT sr.org_unit_path INTO v_org_unit_path
    FROM public.profiles p JOIN public.staff_records sr ON sr.id = p.staff_record_id
    WHERE p.id = v_user_id;

    RETURN QUERY
    SELECT a.id, a.title, a.content, a.created_at, a.expires_at,
           creator.display_name AS created_by_name,
           CASE WHEN ar.read_at IS NOT NULL THEN TRUE ELSE FALSE END AS is_read
    FROM public.announcements a
    LEFT JOIN public.profiles creator ON creator.id = a.created_by
    LEFT JOIN public.announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = v_user_id
    WHERE a.is_published = TRUE
      AND (a.expires_at IS NULL OR a.expires_at > NOW())
      AND EXISTS (
          SELECT 1 FROM public.announcement_targets t
          WHERE t.announcement_id = a.id
            AND (
                t.target_type = 'global'
                OR (t.target_type = 'user' AND t.user_id = v_user_id)
                OR (t.target_type = 'role' AND t.role_id = v_role_id)
                OR (t.target_type = 'org_unit' AND t.org_unit_id IN (
                    SELECT ou.id FROM public.org_units ou
                    WHERE v_org_unit_path <@ ou.path
                ))
            )
      )
      AND (p_unread_only = FALSE OR ar.read_at IS NULL)
    ORDER BY a.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_visible_announcements(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visible_announcements(BOOLEAN) TO authenticated;


-- ============================================================================
-- 18. BUSINESS LOGIC â€” TRIGGER WIRING
-- ============================================================================

-- â”€â”€ 18a. set_updated_at triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- IAM
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_staff_records_updated_at BEFORE UPDATE ON staff_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_iam_requests_updated_at BEFORE UPDATE ON iam_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_org_units_updated_at BEFORE UPDATE ON org_units FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_permission_domains_updated_at BEFORE UPDATE ON permission_domains FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_role_domain_permissions_updated_at BEFORE UPDATE ON role_domain_permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Facility & Zones
CREATE TRIGGER trg_crew_zones_updated_at BEFORE UPDATE ON crew_zones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_device_heartbeats_updated_at BEFORE UPDATE ON device_heartbeats FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_device_types_updated_at BEFORE UPDATE ON device_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_devices_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_location_allowed_categories_updated_at BEFORE UPDATE ON location_allowed_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_material_categories_updated_at BEFORE UPDATE ON material_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pos_points_updated_at BEFORE UPDATE ON pos_points FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_storage_bins_updated_at BEFORE UPDATE ON storage_bins FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vlans_updated_at BEFORE UPDATE ON vlans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_zone_telemetry_updated_at BEFORE UPDATE ON zone_telemetry FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_zones_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- HR
CREATE TRIGGER trg_shift_types_updated_at BEFORE UPDATE ON shift_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_roster_templates_updated_at BEFORE UPDATE ON roster_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_roster_template_shifts_updated_at BEFORE UPDATE ON roster_template_shifts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_staff_roster_assignments_updated_at BEFORE UPDATE ON staff_roster_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shift_schedules_updated_at BEFORE UPDATE ON shift_schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_public_holidays_updated_at BEFORE UPDATE ON public_holidays FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_timecard_punches_updated_at BEFORE UPDATE ON timecard_punches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_attendance_exceptions_updated_at BEFORE UPDATE ON attendance_exceptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leave_types_updated_at BEFORE UPDATE ON leave_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leave_policies_updated_at BEFORE UPDATE ON leave_policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leave_policy_entitlements_updated_at BEFORE UPDATE ON leave_policy_entitlements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leave_ledger_updated_at BEFORE UPDATE ON leave_ledger FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Supply Chain
CREATE TRIGGER trg_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_material_sales_data_updated_at BEFORE UPDATE ON material_sales_data FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_material_procurement_data_updated_at BEFORE UPDATE ON material_procurement_data FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_display_categories_updated_at BEFORE UPDATE ON display_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_uom_conversions_updated_at BEFORE UPDATE ON uom_conversions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bill_of_materials_updated_at BEFORE UPDATE ON bill_of_materials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bom_components_updated_at BEFORE UPDATE ON bom_components FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_price_lists_updated_at BEFORE UPDATE ON price_lists FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_price_list_items_updated_at BEFORE UPDATE ON price_list_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_material_requisitions_updated_at BEFORE UPDATE ON material_requisitions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_material_requisition_items_updated_at BEFORE UPDATE ON material_requisition_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_reconciliations_updated_at BEFORE UPDATE ON inventory_reconciliations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_reconciliation_items_updated_at BEFORE UPDATE ON inventory_reconciliation_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_equipment_assignments_updated_at BEFORE UPDATE ON equipment_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_write_offs_updated_at BEFORE UPDATE ON write_offs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- POS
CREATE TRIGGER trg_order_item_modifiers_updated_at BEFORE UPDATE ON order_item_modifiers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pos_modifier_groups_updated_at BEFORE UPDATE ON pos_modifier_groups FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pos_modifier_options_updated_at BEFORE UPDATE ON pos_modifier_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Bookings
CREATE TRIGGER trg_experience_tiers_updated_at BEFORE UPDATE ON experience_tiers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_experiences_updated_at BEFORE UPDATE ON experiences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_promo_valid_tiers_updated_at BEFORE UPDATE ON promo_valid_tiers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tier_perks_updated_at BEFORE UPDATE ON tier_perks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tiers_updated_at BEFORE UPDATE ON tiers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_scheduler_config_updated_at BEFORE UPDATE ON scheduler_config FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_time_slots_updated_at BEFORE UPDATE ON time_slots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_booking_attendees_updated_at BEFORE UPDATE ON booking_attendees FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_booking_payments_updated_at BEFORE UPDATE ON booking_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ops, Marketing, Reporting
CREATE TRIGGER trg_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_maintenance_vendors_updated_at BEFORE UPDATE ON maintenance_vendors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_maintenance_orders_updated_at BEFORE UPDATE ON maintenance_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_promo_codes_updated_at BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- â”€â”€ 18b. Audit trail triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Logs INSERT/UPDATE/DELETE to system_audit_log via audit_trigger_fn().
-- Append-only tables use INSERT-only audit (no UPDATE/DELETE events to log).

-- IAM & RBAC
CREATE TRIGGER trg_audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_staff_records AFTER INSERT OR UPDATE OR DELETE ON staff_records FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_iam_requests AFTER INSERT OR UPDATE OR DELETE ON iam_requests FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_roles AFTER INSERT OR UPDATE OR DELETE ON roles FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_org_units AFTER INSERT OR UPDATE OR DELETE ON org_units FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Facility & Zones
CREATE TRIGGER trg_audit_locations AFTER INSERT OR UPDATE OR DELETE ON locations FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_pos_points AFTER INSERT OR UPDATE OR DELETE ON pos_points FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_devices AFTER INSERT OR UPDATE OR DELETE ON devices FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- HR & Workforce
CREATE TRIGGER trg_audit_shift_types AFTER INSERT OR UPDATE OR DELETE ON shift_types FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_roster_templates AFTER INSERT OR UPDATE OR DELETE ON roster_templates FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_roster_template_shifts AFTER INSERT OR UPDATE OR DELETE ON roster_template_shifts FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_staff_roster_assignments AFTER INSERT OR UPDATE OR DELETE ON staff_roster_assignments FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_shift_schedules AFTER INSERT OR UPDATE OR DELETE ON shift_schedules FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_public_holidays AFTER INSERT OR UPDATE OR DELETE ON public_holidays FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_timecard_punches AFTER INSERT OR UPDATE OR DELETE ON timecard_punches FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_attendance_exceptions AFTER INSERT OR UPDATE OR DELETE ON attendance_exceptions FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_leave_types AFTER INSERT OR UPDATE OR DELETE ON leave_types FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_leave_policies AFTER INSERT OR UPDATE OR DELETE ON leave_policies FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_leave_policy_entitlements AFTER INSERT OR UPDATE OR DELETE ON leave_policy_entitlements FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_leave_requests AFTER INSERT OR UPDATE OR DELETE ON leave_requests FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Supply Chain
CREATE TRIGGER trg_audit_materials AFTER INSERT OR UPDATE OR DELETE ON materials FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_material_sales_data AFTER INSERT OR UPDATE OR DELETE ON material_sales_data FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_material_categories AFTER INSERT OR UPDATE OR DELETE ON material_categories FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_material_procurement_data AFTER INSERT OR UPDATE OR DELETE ON material_procurement_data FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_display_categories AFTER INSERT OR UPDATE OR DELETE ON display_categories FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_bill_of_materials AFTER INSERT OR UPDATE OR DELETE ON bill_of_materials FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_bom_components AFTER INSERT OR UPDATE OR DELETE ON bom_components FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_suppliers AFTER INSERT OR UPDATE OR DELETE ON suppliers FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_purchase_orders AFTER INSERT OR UPDATE OR DELETE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Inventory Operations
CREATE TRIGGER trg_audit_material_requisitions AFTER INSERT OR UPDATE OR DELETE ON material_requisitions FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_equipment_assignments AFTER INSERT OR UPDATE OR DELETE ON equipment_assignments FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_write_offs AFTER INSERT OR UPDATE OR DELETE ON write_offs FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- POS & Orders
CREATE TRIGGER trg_audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_order_items AFTER INSERT OR UPDATE OR DELETE ON order_items FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Bookings & Guest
CREATE TRIGGER trg_audit_bookings AFTER INSERT OR UPDATE OR DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_time_slots AFTER INSERT OR UPDATE OR DELETE ON time_slots FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_booking_payments AFTER INSERT OR UPDATE OR DELETE ON booking_payments FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_biometric_vectors AFTER INSERT OR UPDATE OR DELETE ON biometric_vectors FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Ops, Maintenance, Marketing
CREATE TRIGGER trg_audit_incidents AFTER INSERT OR UPDATE OR DELETE ON incidents FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_maintenance_orders AFTER INSERT OR UPDATE OR DELETE ON maintenance_orders FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_vehicles AFTER INSERT OR UPDATE OR DELETE ON vehicles FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_campaigns AFTER INSERT OR UPDATE OR DELETE ON campaigns FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_promo_codes AFTER INSERT OR UPDATE OR DELETE ON promo_codes FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Append-only tables (INSERT only â€” no UPDATE/DELETE events to capture)
CREATE TRIGGER trg_audit_goods_movements AFTER INSERT ON goods_movements FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_goods_movement_items AFTER INSERT ON goods_movement_items FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_leave_ledger AFTER INSERT ON leave_ledger FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_inventory_reconciliation_items AFTER INSERT ON inventory_reconciliation_items FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER trg_audit_order_item_modifiers AFTER INSERT ON order_item_modifiers FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();


-- â”€â”€ 18c. Business logic triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- R5: Ledger immutability
CREATE TRIGGER trg_goods_movements_immutable BEFORE UPDATE OR DELETE ON goods_movements
    FOR EACH ROW EXECUTE FUNCTION trg_ledger_immutable();
CREATE TRIGGER trg_goods_movement_items_immutable BEFORE UPDATE OR DELETE ON goods_movement_items
    FOR EACH ROW EXECUTE FUNCTION trg_ledger_immutable();
CREATE TRIGGER trg_leave_ledger_immutable BEFORE UPDATE OR DELETE ON leave_ledger
    FOR EACH ROW EXECUTE FUNCTION trg_leave_ledger_immutable();

-- R14: org_unit_path population
CREATE TRIGGER trg_staff_org_unit_path_sync BEFORE INSERT OR UPDATE ON staff_records
    FOR EACH ROW EXECUTE FUNCTION trg_staff_org_unit_path_sync();
CREATE TRIGGER trg_populate_org_unit_path_leave_requests BEFORE INSERT ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION trg_populate_org_unit_path();
CREATE TRIGGER trg_populate_org_unit_path_shift_schedules BEFORE INSERT ON shift_schedules
    FOR EACH ROW EXECUTE FUNCTION trg_populate_org_unit_path();
CREATE TRIGGER trg_populate_org_unit_path_timecard_punches BEFORE INSERT ON timecard_punches
    FOR EACH ROW EXECUTE FUNCTION trg_populate_org_unit_path();
CREATE TRIGGER trg_populate_org_unit_path_leave_ledger BEFORE INSERT ON leave_ledger
    FOR EACH ROW EXECUTE FUNCTION trg_populate_org_unit_path();
CREATE TRIGGER trg_populate_org_unit_path_crew_zones BEFORE INSERT ON crew_zones
    FOR EACH ROW EXECUTE FUNCTION trg_populate_org_unit_path();
CREATE TRIGGER trg_populate_org_unit_path_roster_assignments BEFORE INSERT ON staff_roster_assignments
    FOR EACH ROW EXECUTE FUNCTION trg_populate_org_unit_path();
CREATE TRIGGER trg_populate_exception_org_path BEFORE INSERT ON attendance_exceptions
    FOR EACH ROW EXECUTE FUNCTION trg_populate_exception_org_path();

-- HR scheduling
CREATE TRIGGER trg_validate_day_index BEFORE INSERT OR UPDATE ON roster_template_shifts
    FOR EACH ROW EXECUTE FUNCTION trg_validate_day_index();
CREATE TRIGGER trg_shift_schedule_mark_override BEFORE UPDATE ON shift_schedules
    FOR EACH ROW EXECUTE FUNCTION trg_shift_schedule_mark_override();

-- Attendance
CREATE TRIGGER trg_validate_punch_window BEFORE INSERT ON timecard_punches
    FOR EACH ROW EXECUTE FUNCTION trg_validate_punch_window();
CREATE TRIGGER trg_detect_discrepancies AFTER INSERT ON timecard_punches
    FOR EACH ROW EXECUTE FUNCTION trg_detect_discrepancies();

-- Leave
CREATE TRIGGER trg_leave_approval_linkage AFTER UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION trg_leave_approval_linkage();

-- BOM validation (R15)
CREATE TRIGGER trg_bom_component_self_ref_check BEFORE INSERT OR UPDATE ON bom_components
    FOR EACH ROW EXECUTE FUNCTION trg_bom_component_self_ref_check();

-- Location validation on goods_movement_items (B10)
CREATE TRIGGER trg_validate_gmi_location BEFORE INSERT ON goods_movement_items
    FOR EACH ROW EXECUTE FUNCTION trg_validate_gmi_location();

-- Requisition line validation (B12)
CREATE TRIGGER trg_validate_requisition_item BEFORE INSERT OR UPDATE ON material_requisition_items
    FOR EACH ROW EXECUTE FUNCTION trg_validate_requisition_item();

-- R17: Stock cache sync + valuation (alphabetical naming ensures order)
CREATE TRIGGER trg_gmi_a_cache_sync AFTER INSERT ON goods_movement_items
    FOR EACH ROW EXECUTE FUNCTION fn_gmi_a_cache_sync();
CREATE TRIGGER trg_gmi_b_valuation_update AFTER INSERT ON goods_movement_items
    FOR EACH ROW EXECUTE FUNCTION fn_gmi_b_valuation_update();

-- Reconciliation guard
CREATE TRIGGER trg_check_reconciliation_items BEFORE UPDATE ON inventory_reconciliations
    FOR EACH ROW EXECUTE FUNCTION check_reconciliation_items_counted();

-- Crew zones
CREATE TRIGGER trg_crew_zones_auto_close BEFORE INSERT ON crew_zones
    FOR EACH ROW EXECUTE FUNCTION trg_crew_zones_auto_close();

-- IAM
CREATE TRIGGER trg_auto_create_iam_request AFTER INSERT ON staff_records
    FOR EACH ROW EXECUTE FUNCTION trg_auto_create_iam_request();

-- Booking
CREATE TRIGGER trg_booking_status_change AFTER UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION trg_booking_status_change();

-- Inventory business-logic triggers (goods movement creators)
CREATE TRIGGER trg_order_completion_goods_movement AFTER UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION trg_order_completion_goods_movement();
CREATE TRIGGER trg_po_receive_goods_movement AFTER UPDATE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION trg_po_receive_goods_movement();
CREATE TRIGGER trg_write_off_goods_movement AFTER INSERT ON write_offs
    FOR EACH ROW EXECUTE FUNCTION trg_write_off_goods_movement();
CREATE TRIGGER trg_requisition_completion_goods_movement AFTER UPDATE ON material_requisitions
    FOR EACH ROW EXECUTE FUNCTION trg_requisition_completion_goods_movement();
CREATE TRIGGER trg_reconciliation_approval_goods_movement AFTER UPDATE ON inventory_reconciliations
    FOR EACH ROW EXECUTE FUNCTION trg_reconciliation_approval_goods_movement();


-- ============================================================================
-- 19. RPCs â€” BOOKINGS, POS & GUEST FLOW
-- ============================================================================

-- 19a. rpc_get_available_slots
CREATE OR REPLACE FUNCTION public.rpc_get_available_slots(
    p_experience_id UUID, p_date DATE, p_tier_id UUID, p_guest_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_experience RECORD; v_tier RECORD; v_result JSONB;
BEGIN
    SELECT * INTO v_experience FROM public.experiences WHERE id = p_experience_id AND is_active = TRUE;
    IF v_experience IS NULL THEN RAISE EXCEPTION 'EXPERIENCE_NOT_FOUND'; END IF;
    SELECT t.* INTO v_tier FROM public.experience_tiers et JOIN public.tiers t ON t.id = et.tier_id
    WHERE et.experience_id = p_experience_id AND et.tier_id = p_tier_id;
    IF v_tier IS NULL THEN RAISE EXCEPTION 'TIER_NOT_FOUND'; END IF;
    IF p_guest_count < 1 THEN RAISE EXCEPTION 'INVALID_GUEST_COUNT'; END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'slot_id', s.slot_id, 'start_time', s.start_time, 'end_time', s.end_time,
        'slot_remaining', s.slot_remaining, 'is_available', s.is_available
    ) ORDER BY s.start_time), '[]'::JSONB) INTO v_result
    FROM (
        WITH day_occupancy AS (
            SELECT ts.start_time AS occ_start,
                   ts.start_time + (t.duration_minutes || ' minutes')::INTERVAL AS occ_end,
                   b.adult_count + b.child_count AS pax
            FROM public.bookings b
            JOIN public.time_slots ts ON ts.id = b.time_slot_id
            JOIN public.tiers t ON t.id = b.tier_id
            WHERE b.experience_id = p_experience_id
              AND b.status IN ('pending_payment', 'confirmed', 'checked_in')
              AND ts.slot_date = p_date
        )
        SELECT ts.id AS slot_id, ts.start_time, ts.end_time,
            COALESCE(ts.override_capacity, v_experience.capacity_per_slot) - ts.booked_count AS slot_remaining,
            (
                (COALESCE(ts.override_capacity, v_experience.capacity_per_slot) - ts.booked_count) >= p_guest_count
                AND (v_experience.max_facility_capacity - fac.overlap) >= p_guest_count
            ) AS is_available
        FROM public.time_slots ts
        CROSS JOIN LATERAL (
            SELECT COALESCE(SUM(d.pax), 0)::INTEGER AS overlap FROM day_occupancy d
            WHERE d.occ_start < (ts.start_time + (v_tier.duration_minutes || ' minutes')::INTERVAL)
              AND d.occ_end > ts.start_time
        ) fac
        WHERE ts.experience_id = p_experience_id AND ts.slot_date = p_date
          AND ts.constraint_type IS NULL
          AND COALESCE(ts.override_capacity, v_experience.capacity_per_slot) > 0
        ORDER BY ts.start_time
    ) s;
    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_available_slots FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_available_slots TO anon, authenticated;

-- 19b. rpc_validate_promo_code (read-only preview)
CREATE OR REPLACE FUNCTION public.rpc_validate_promo_code(
    p_promo_code TEXT, p_tier_id UUID, p_slot_date DATE,
    p_slot_start_time TIME, p_adult_count INT, p_child_count INT
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_promo RECORD; v_total_guests INT; v_total_price NUMERIC; v_tier RECORD; v_discount NUMERIC;
BEGIN
    v_total_guests := p_adult_count + p_child_count;
    SELECT * INTO v_tier FROM public.tiers WHERE id = p_tier_id;
    IF v_tier IS NULL THEN RETURN jsonb_build_object('valid', FALSE, 'reason', 'TIER_NOT_FOUND'); END IF;
    v_total_price := (v_tier.adult_price * p_adult_count) + (v_tier.child_price * p_child_count);

    SELECT * INTO v_promo FROM public.promo_codes WHERE code = upper(p_promo_code);
    IF v_promo IS NULL THEN RETURN jsonb_build_object('valid', FALSE, 'reason', 'PROMO_NOT_FOUND'); END IF;
    IF v_promo.status != 'active' THEN RETURN jsonb_build_object('valid', FALSE, 'reason', 'PROMO_INACTIVE'); END IF;
    IF NOT (now() BETWEEN v_promo.valid_from AND v_promo.valid_to) THEN RETURN jsonb_build_object('valid', FALSE, 'reason', 'PROMO_EXPIRED'); END IF;
    IF v_promo.current_uses >= v_promo.max_uses THEN RETURN jsonb_build_object('valid', FALSE, 'reason', 'PROMO_MAX_USES_REACHED'); END IF;
    IF v_promo.min_group_size > v_total_guests THEN RETURN jsonb_build_object('valid', FALSE, 'reason', 'PROMO_GROUP_TOO_SMALL', 'min_group_size', v_promo.min_group_size); END IF;
    IF EXISTS (SELECT 1 FROM public.promo_valid_tiers WHERE promo_code_id = v_promo.id)
       AND NOT EXISTS (SELECT 1 FROM public.promo_valid_tiers WHERE promo_code_id = v_promo.id AND tier_id = p_tier_id) THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'PROMO_TIER_MISMATCH');
    END IF;
    IF v_promo.valid_days_mask IS NOT NULL AND (v_promo.valid_days_mask & (1 << (EXTRACT(ISODOW FROM p_slot_date)::INT - 1))) = 0 THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'PROMO_DAY_INVALID');
    END IF;
    IF v_promo.valid_time_start IS NOT NULL AND NOT (p_slot_start_time >= v_promo.valid_time_start AND p_slot_start_time < COALESCE(v_promo.valid_time_end, '23:59'::TIME)) THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'PROMO_TIME_INVALID');
    END IF;
    IF v_promo.campaign_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = v_promo.campaign_id AND c.status = 'active') THEN
            RETURN jsonb_build_object('valid', FALSE, 'reason', 'PROMO_CAMPAIGN_INACTIVE');
        END IF;
    END IF;

    SELECT CASE v_promo.discount_type WHEN 'percentage' THEN v_total_price * (v_promo.discount_value / 100.0) WHEN 'fixed' THEN LEAST(v_promo.discount_value, v_total_price) ELSE 0 END INTO v_discount;
    RETURN jsonb_build_object('valid', TRUE, 'promo_code', v_promo.code, 'discount_type', v_promo.discount_type, 'discount_value', v_promo.discount_value, 'discount_amount', v_discount, 'final_price', GREATEST(0, v_total_price - v_discount));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_validate_promo_code FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_validate_promo_code TO anon, authenticated;

-- 19c. rpc_create_booking (transactional with capacity + fire code)
CREATE OR REPLACE FUNCTION public.rpc_create_booking(
    p_experience_id UUID, p_time_slot_id UUID, p_tier_id UUID,
    p_booker_name TEXT, p_booker_email TEXT, p_booker_phone TEXT,
    p_adult_count INT, p_child_count INT, p_promo_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_slot RECORD; v_tier RECORD; v_experience RECORD;
    v_effective_capacity INT; v_total_guests INT; v_total_price NUMERIC;
    v_booking_ref TEXT; v_qr_ref TEXT; v_booking_id UUID;
    v_promo_id UUID := NULL; v_discount NUMERIC := 0; v_result JSONB;
    v_new_checkin TIME; v_new_checkout TIME; v_overlapping_guests INT; v_promo_rec RECORD;
BEGIN
    v_total_guests := p_adult_count + p_child_count;
    SELECT * INTO v_experience FROM public.experiences WHERE id = p_experience_id;
    IF v_experience IS NULL THEN RAISE EXCEPTION 'EXPERIENCE_NOT_FOUND'; END IF;
    SELECT * INTO v_slot FROM public.time_slots WHERE id = p_time_slot_id AND experience_id = p_experience_id FOR UPDATE;
    IF v_slot IS NULL THEN RAISE EXCEPTION 'TIME_SLOT_NOT_FOUND'; END IF;
    v_effective_capacity := COALESCE(v_slot.override_capacity, v_experience.capacity_per_slot);
    IF (v_slot.booked_count + v_total_guests) > v_effective_capacity THEN RAISE EXCEPTION 'SLOT_FULL'; END IF;

    SELECT t.* INTO v_tier FROM public.experience_tiers et JOIN public.tiers t ON t.id = et.tier_id
    WHERE et.experience_id = p_experience_id AND et.tier_id = p_tier_id;
    IF v_tier IS NULL THEN RAISE EXCEPTION 'TIER_NOT_FOUND'; END IF;

    v_new_checkin := v_slot.start_time;
    v_new_checkout := v_slot.start_time + (v_tier.duration_minutes || ' minutes')::INTERVAL;
    SELECT COALESCE(SUM(b.adult_count + b.child_count), 0) INTO v_overlapping_guests
    FROM public.bookings b JOIN public.time_slots ts ON ts.id = b.time_slot_id JOIN public.tiers t ON t.id = b.tier_id
    WHERE b.experience_id = p_experience_id AND b.status IN ('pending_payment', 'confirmed', 'checked_in', 'completed')
      AND ts.slot_date = v_slot.slot_date AND ts.start_time < v_new_checkout
      AND (ts.start_time + (t.duration_minutes || ' minutes')::INTERVAL) > v_new_checkin
    FOR SHARE OF b;
    IF (v_overlapping_guests + v_total_guests) > v_experience.max_facility_capacity THEN RAISE EXCEPTION 'FACILITY_AT_CAPACITY'; END IF;

    v_total_price := (v_tier.adult_price * p_adult_count) + (v_tier.child_price * p_child_count);

    IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
        SELECT * INTO v_promo_rec FROM public.promo_codes WHERE code = upper(p_promo_code) FOR UPDATE;
        IF v_promo_rec IS NULL THEN RAISE EXCEPTION 'PROMO_NOT_FOUND'; END IF;
        IF v_promo_rec.status != 'active' THEN RAISE EXCEPTION 'PROMO_INACTIVE'; END IF;
        IF NOT (now() BETWEEN v_promo_rec.valid_from AND v_promo_rec.valid_to) THEN RAISE EXCEPTION 'PROMO_EXPIRED'; END IF;
        IF v_promo_rec.current_uses >= v_promo_rec.max_uses THEN RAISE EXCEPTION 'PROMO_MAX_USES_REACHED'; END IF;
        IF v_promo_rec.min_group_size > v_total_guests THEN RAISE EXCEPTION 'PROMO_GROUP_TOO_SMALL'; END IF;
        IF EXISTS (SELECT 1 FROM public.promo_valid_tiers WHERE promo_code_id = v_promo_rec.id)
           AND NOT EXISTS (SELECT 1 FROM public.promo_valid_tiers WHERE promo_code_id = v_promo_rec.id AND tier_id = p_tier_id) THEN RAISE EXCEPTION 'PROMO_TIER_MISMATCH'; END IF;
        IF v_promo_rec.valid_days_mask IS NOT NULL AND (v_promo_rec.valid_days_mask & (1 << (EXTRACT(ISODOW FROM v_slot.slot_date)::INT - 1))) = 0 THEN RAISE EXCEPTION 'PROMO_DAY_INVALID'; END IF;
        IF v_promo_rec.valid_time_start IS NOT NULL AND NOT (v_slot.start_time >= v_promo_rec.valid_time_start AND v_slot.start_time < COALESCE(v_promo_rec.valid_time_end, '23:59'::TIME)) THEN RAISE EXCEPTION 'PROMO_TIME_INVALID'; END IF;
        IF v_promo_rec.campaign_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = v_promo_rec.campaign_id AND c.status = 'active') THEN
                RAISE EXCEPTION 'PROMO_CAMPAIGN_INACTIVE';
            END IF;
        END IF;

        v_promo_id := v_promo_rec.id;
        SELECT CASE v_promo_rec.discount_type WHEN 'percentage' THEN v_total_price * (v_promo_rec.discount_value / 100.0) WHEN 'fixed' THEN LEAST(v_promo_rec.discount_value, v_total_price) ELSE 0 END INTO v_discount;
        v_total_price := GREATEST(0, v_total_price - v_discount);
        UPDATE public.promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo_id;
    END IF;

    v_booking_ref := 'AG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)) || '-' || lpad(floor(extract(epoch from now()) * 100 % 10000)::text, 4, '0');
    v_qr_ref := 'AGARTHA:' || v_tier.name || ':' || v_total_guests || ':' || extract(epoch from now())::text;

    INSERT INTO public.bookings (experience_id, time_slot_id, tier_id, status, total_price, booking_ref, booker_email, booker_name, booker_phone, adult_count, child_count, qr_code_ref, promo_code_id)
    VALUES (p_experience_id, p_time_slot_id, p_tier_id, 'pending_payment', v_total_price, v_booking_ref, lower(p_booker_email), p_booker_name, p_booker_phone, p_adult_count, p_child_count, v_qr_ref, v_promo_id)
    RETURNING id INTO v_booking_id;

    UPDATE public.time_slots SET booked_count = booked_count + v_total_guests, updated_at = now() WHERE id = p_time_slot_id;

    FOR i IN 1..p_adult_count LOOP
        INSERT INTO public.booking_attendees (booking_id, attendee_type, attendee_index, face_pay_enabled, auto_capture_enabled) VALUES (v_booking_id, 'adult', i, FALSE, FALSE);
    END LOOP;
    FOR i IN 1..p_child_count LOOP
        INSERT INTO public.booking_attendees (booking_id, attendee_type, attendee_index, face_pay_enabled, auto_capture_enabled) VALUES (v_booking_id, 'child', i, FALSE, FALSE);
    END LOOP;

    INSERT INTO public.booking_payments (booking_id, method, amount, status) VALUES (v_booking_id, 'card', v_total_price, 'pending');

    SELECT jsonb_build_object('booking_id', v_booking_id, 'booking_ref', v_booking_ref, 'qr_code_ref', v_qr_ref, 'tier_name', v_tier.name, 'total_price', v_total_price, 'adult_count', p_adult_count, 'child_count', p_child_count, 'slot_date', v_slot.slot_date, 'start_time', v_slot.start_time, 'status', 'pending_payment', 'discount_applied', v_discount) INTO v_result;
    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_create_booking FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_booking TO authenticated;

-- 19d. rpc_get_booking_by_ref
CREATE OR REPLACE FUNCTION public.rpc_get_booking_by_ref(p_booking_ref VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_booking RECORD; v_slot RECORD; v_attendees JSONB; v_tier RECORD; v_perks JSONB;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE booking_ref = upper(p_booking_ref);
    IF v_booking IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
    SELECT * INTO v_slot FROM public.time_slots WHERE id = v_booking.time_slot_id;
    SELECT t.* INTO v_tier FROM public.tiers t WHERE t.id = v_booking.tier_id;
    SELECT COALESCE(jsonb_agg(tp.perk ORDER BY tp.perk), '[]'::JSONB) INTO v_perks FROM public.tier_perks tp WHERE tp.tier_id = v_booking.tier_id;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', ba.id, 'attendee_type', ba.attendee_type, 'attendee_index', ba.attendee_index, 'nickname', ba.nickname, 'face_pay_enabled', ba.face_pay_enabled, 'auto_capture_enabled', ba.auto_capture_enabled, 'has_biometric', EXISTS(SELECT 1 FROM public.biometric_vectors bv WHERE bv.attendee_id = ba.id)) ORDER BY ba.attendee_type, ba.attendee_index), '[]'::JSONB) INTO v_attendees FROM public.booking_attendees ba WHERE ba.booking_id = v_booking.id;
    RETURN jsonb_build_object('id', v_booking.id, 'booking_ref', v_booking.booking_ref, 'status', v_booking.status, 'tier_name', v_tier.name, 'total_price', v_booking.total_price, 'booker_name', v_booking.booker_name, 'booker_email', v_booking.booker_email, 'adult_count', v_booking.adult_count, 'child_count', v_booking.child_count, 'qr_code_ref', v_booking.qr_code_ref, 'checked_in_at', v_booking.checked_in_at, 'slot_date', v_slot.slot_date, 'start_time', v_slot.start_time, 'end_time', v_slot.end_time, 'duration_minutes', v_tier.duration_minutes, 'perks', v_perks, 'attendees', v_attendees);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_booking_by_ref FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_booking_by_ref TO authenticated;

-- 19e. rpc_get_booking_identity (OTP flow)
CREATE OR REPLACE FUNCTION public.rpc_get_booking_identity(p_booking_ref VARCHAR, p_ip_address INET DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_booking RECORD; v_masked_email TEXT; v_otp_code VARCHAR; v_email_parts TEXT[]; v_local_part TEXT;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE booking_ref = upper(p_booking_ref) AND status IN ('confirmed', 'checked_in', 'completed');
    IF v_booking IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
    v_email_parts := string_to_array(v_booking.booker_email, '@');
    v_local_part := v_email_parts[1];
    v_masked_email := substr(v_local_part, 1, 1) || '***' || substr(v_local_part, length(v_local_part), 1) || '@' || v_email_parts[2];
    IF (SELECT COUNT(*) FROM public.otp_challenges WHERE booking_ref = upper(p_booking_ref) AND created_at > NOW() - INTERVAL '15 minutes') >= 3 THEN RAISE EXCEPTION 'OTP_RATE_LIMITED'; END IF;
    v_otp_code := lpad(floor(random() * 999999)::text, 6, '0');
    DELETE FROM public.otp_challenges WHERE booking_ref = upper(p_booking_ref) AND verified = false;
    INSERT INTO public.otp_challenges (booking_ref, otp_code, ip_address, expires_at) VALUES (upper(p_booking_ref), v_otp_code, p_ip_address, now() + interval '5 minutes');
    RETURN jsonb_build_object('masked_email', v_masked_email, 'booking_ref', v_booking.booking_ref, 'otp_sent', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_booking_identity FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_booking_identity TO anon, authenticated;

-- 19f. rpc_verify_otp
CREATE OR REPLACE FUNCTION public.rpc_verify_otp(p_booking_ref VARCHAR, p_otp_code VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_challenge RECORD;
BEGIN
    SELECT * INTO v_challenge FROM public.otp_challenges WHERE booking_ref = upper(p_booking_ref) AND verified = false AND expires_at > now() ORDER BY created_at DESC LIMIT 1;
    IF v_challenge IS NULL THEN RAISE EXCEPTION 'OTP_EXPIRED'; END IF;
    IF v_challenge.attempts >= 5 THEN UPDATE public.otp_challenges SET verified = false WHERE id = v_challenge.id; RAISE EXCEPTION 'OTP_LOCKED'; END IF;
    IF v_challenge.otp_code != p_otp_code THEN UPDATE public.otp_challenges SET attempts = attempts + 1 WHERE id = v_challenge.id; RAISE EXCEPTION 'OTP_INVALID'; END IF;
    UPDATE public.otp_challenges SET verified = true WHERE id = v_challenge.id;
    RETURN jsonb_build_object('verified', true, 'booking_ref', upper(p_booking_ref));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_verify_otp FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_verify_otp TO anon, authenticated;

-- 19g. rpc_modify_booking (B1 fix: corrected audit_log columns)
CREATE OR REPLACE FUNCTION public.rpc_modify_booking(p_booking_ref TEXT, p_new_time_slot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_booking RECORD; v_old_slot RECORD; v_new_slot RECORD; v_experience RECORD;
    v_guest_count INT; v_effective_capacity INT; v_promo RECORD; v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE booking_ref = upper(p_booking_ref);
    IF v_booking IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
    IF v_booking.status != 'confirmed' THEN RAISE EXCEPTION 'RESCHEDULE_NOT_ALLOWED'; END IF;
    v_guest_count := v_booking.adult_count + v_booking.child_count;
    SELECT * INTO v_experience FROM public.experiences WHERE id = v_booking.experience_id;

    SELECT * INTO v_old_slot FROM public.time_slots WHERE id = v_booking.time_slot_id FOR UPDATE;
    IF (v_old_slot.slot_date + v_old_slot.start_time) - v_now < INTERVAL '2 hours' THEN RAISE EXCEPTION 'RESCHEDULE_TOO_LATE'; END IF;
    IF v_booking.time_slot_id = p_new_time_slot_id THEN RAISE EXCEPTION 'SAME_SLOT'; END IF;

    SELECT * INTO v_new_slot FROM public.time_slots WHERE id = p_new_time_slot_id AND experience_id = v_booking.experience_id FOR UPDATE;
    IF v_new_slot IS NULL THEN RAISE EXCEPTION 'NEW_SLOT_NOT_FOUND'; END IF;
    IF (v_new_slot.slot_date + v_new_slot.start_time) < v_now THEN RAISE EXCEPTION 'SLOT_IN_PAST'; END IF;

    v_effective_capacity := COALESCE(v_new_slot.override_capacity, v_experience.capacity_per_slot);
    IF (v_new_slot.booked_count + v_guest_count) > v_effective_capacity THEN RAISE EXCEPTION 'SLOT_FULL'; END IF;

    -- Facility overlap check on new slot
    DECLARE v_tier RECORD; v_new_checkout TIME; v_overlapping_guests INT;
    BEGIN
        SELECT t.* INTO v_tier FROM public.tiers t WHERE t.id = v_booking.tier_id;
        v_new_checkout := v_new_slot.start_time + (v_tier.duration_minutes || ' minutes')::INTERVAL;
        SELECT COALESCE(SUM(b.adult_count + b.child_count), 0) INTO v_overlapping_guests
        FROM public.bookings b JOIN public.time_slots ts ON ts.id = b.time_slot_id JOIN public.tiers t ON t.id = b.tier_id
        WHERE b.experience_id = v_booking.experience_id AND b.id != v_booking.id AND b.status IN ('confirmed', 'checked_in')
          AND ts.slot_date = v_new_slot.slot_date AND ts.start_time < v_new_checkout
          AND (ts.start_time + (t.duration_minutes || ' minutes')::INTERVAL) > v_new_slot.start_time;
        IF (v_overlapping_guests + v_guest_count) > v_experience.max_facility_capacity THEN RAISE EXCEPTION 'FACILITY_AT_CAPACITY'; END IF;
    END;

    -- Promo re-validation against new slot
    IF v_booking.promo_code_id IS NOT NULL THEN
        SELECT * INTO v_promo FROM public.promo_codes WHERE id = v_booking.promo_code_id;
        IF v_promo.valid_days_mask IS NOT NULL AND (v_promo.valid_days_mask & (1 << (EXTRACT(ISODOW FROM v_new_slot.slot_date)::INT - 1))) = 0 THEN RAISE EXCEPTION 'PROMO_DAY_INVALID_AFTER_RESCHEDULE'; END IF;
        IF v_promo.valid_time_start IS NOT NULL AND NOT (v_new_slot.start_time >= v_promo.valid_time_start AND v_new_slot.start_time < COALESCE(v_promo.valid_time_end, '23:59'::TIME)) THEN RAISE EXCEPTION 'PROMO_TIME_INVALID_AFTER_RESCHEDULE'; END IF;
    END IF;

    UPDATE public.time_slots SET booked_count = GREATEST(0, booked_count - v_guest_count), updated_at = NOW() WHERE id = v_booking.time_slot_id;
    UPDATE public.time_slots SET booked_count = booked_count + v_guest_count, updated_at = NOW() WHERE id = p_new_time_slot_id;
    UPDATE public.bookings SET time_slot_id = p_new_time_slot_id, updated_at = NOW() WHERE id = v_booking.id;

    -- B1 fix: correct column names for system_audit_log
    INSERT INTO public.system_audit_log (action, entity_type, entity_id, new_values, performed_by)
    VALUES ('RESCHEDULE', 'bookings', v_booking.id::TEXT,
        jsonb_build_object('old_slot_id', v_booking.time_slot_id, 'new_slot_id', p_new_time_slot_id,
            'old_date', v_old_slot.slot_date, 'old_time', v_old_slot.start_time,
            'new_date', v_new_slot.slot_date, 'new_time', v_new_slot.start_time),
        NULL);

    RETURN jsonb_build_object('success', TRUE, 'booking_ref', v_booking.booking_ref, 'new_slot_date', v_new_slot.slot_date, 'new_start_time', v_new_slot.start_time);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_modify_booking FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_modify_booking TO authenticated;

-- 19h. rpc_lookup_booking
CREATE OR REPLACE FUNCTION public.rpc_lookup_booking(p_qr_code_ref TEXT DEFAULT NULL, p_booking_ref TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_booking RECORD; v_slot RECORD; v_tier RECORD; v_experience RECORD;
BEGIN
    IF p_qr_code_ref IS NOT NULL THEN SELECT * INTO v_booking FROM public.bookings WHERE qr_code_ref = p_qr_code_ref;
    ELSIF p_booking_ref IS NOT NULL THEN SELECT * INTO v_booking FROM public.bookings WHERE booking_ref = upper(p_booking_ref);
    ELSE RAISE EXCEPTION 'PROVIDE_QR_OR_REF'; END IF;
    IF v_booking IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
    SELECT * INTO v_slot FROM public.time_slots WHERE id = v_booking.time_slot_id;
    SELECT * INTO v_tier FROM public.tiers WHERE id = v_booking.tier_id;
    SELECT * INTO v_experience FROM public.experiences WHERE id = v_booking.experience_id;
    RETURN jsonb_build_object('booking_id', v_booking.id, 'booking_ref', v_booking.booking_ref, 'status', v_booking.status, 'booker_name', v_booking.booker_name, 'adult_count', v_booking.adult_count, 'child_count', v_booking.child_count, 'total_price', v_booking.total_price, 'tier_name', v_tier.name, 'tier_duration_minutes', v_tier.duration_minutes, 'experience_name', v_experience.name, 'arrival_window_minutes', v_experience.arrival_window_minutes, 'slot_date', v_slot.slot_date, 'start_time', v_slot.start_time, 'checked_in_at', v_booking.checked_in_at);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_lookup_booking FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_lookup_booking TO authenticated;

-- 19i. rpc_search_bookings_by_email
CREATE OR REPLACE FUNCTION public.rpc_search_bookings_by_email(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_results JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('booking_id', b.id, 'booking_ref', b.booking_ref, 'status', b.status, 'booker_name', b.booker_name, 'adult_count', b.adult_count, 'child_count', b.child_count, 'tier_name', t.name, 'slot_date', ts.slot_date, 'start_time', ts.start_time, 'checked_in_at', b.checked_in_at) ORDER BY ts.slot_date DESC, ts.start_time DESC), '[]'::JSONB) INTO v_results
    FROM public.bookings b JOIN public.time_slots ts ON ts.id = b.time_slot_id JOIN public.tiers t ON t.id = b.tier_id
    WHERE b.booker_email = lower(p_email) AND b.status NOT IN ('cancelled');
    RETURN v_results;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_search_bookings_by_email FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_search_bookings_by_email TO authenticated;

-- 19j. rpc_checkin_booking
CREATE OR REPLACE FUNCTION public.rpc_checkin_booking(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_booking RECORD; v_tier_name TEXT;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u') THEN RAISE EXCEPTION 'Forbidden: booking:u required'; END IF;
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
    IF v_booking IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
    IF v_booking.status = 'cancelled' THEN RAISE EXCEPTION 'BOOKING_CANCELLED'; END IF;
    IF v_booking.status = 'pending_payment' THEN RAISE EXCEPTION 'PAYMENT_NOT_COMPLETED'; END IF;
    IF v_booking.status = 'checked_in' THEN RAISE EXCEPTION 'ALREADY_CHECKED_IN'; END IF;
    IF v_booking.status = 'completed' THEN RAISE EXCEPTION 'BOOKING_ALREADY_COMPLETED'; END IF;
    UPDATE public.bookings SET status = 'checked_in', checked_in_at = NOW(), updated_at = NOW() WHERE id = p_booking_id;
    SELECT t.name INTO v_tier_name FROM public.tiers t WHERE t.id = v_booking.tier_id;
    RETURN jsonb_build_object('booking_id', v_booking.id, 'booking_ref', v_booking.booking_ref, 'booker_name', v_booking.booker_name, 'tier_name', v_tier_name, 'adult_count', v_booking.adult_count, 'child_count', v_booking.child_count, 'checked_in_at', NOW());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_checkin_booking FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_checkin_booking TO authenticated;

-- 19k. rpc_preview_slot_override + rpc_confirm_slot_override
CREATE OR REPLACE FUNCTION public.rpc_preview_slot_override(p_slot_id UUID, p_new_capacity INTEGER)
RETURNS TABLE (booking_id UUID, current_slot_id UUID, current_slot_date DATE, current_slot_time TIME, target_slot_id UUID, target_slot_date DATE, target_slot_time TIME)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_slot RECORD; v_overflow INTEGER; v_booking RECORD; v_target RECORD; v_moved INTEGER := 0;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u') THEN RAISE EXCEPTION 'Forbidden: booking:u required'; END IF;
    SELECT ts.*, e.capacity_per_slot INTO v_slot FROM public.time_slots ts JOIN public.experiences e ON e.id = ts.experience_id WHERE ts.id = p_slot_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Slot not found'; END IF;
    v_overflow := v_slot.booked_count - p_new_capacity;
    IF v_overflow <= 0 THEN RETURN; END IF;
    FOR v_booking IN SELECT b.id, b.time_slot_id, (b.adult_count + b.child_count) AS guest_count FROM public.bookings b WHERE b.time_slot_id = p_slot_id AND b.status IN ('confirmed') ORDER BY b.created_at DESC LOOP
        IF v_moved >= v_overflow THEN EXIT; END IF;
        SELECT ts.id, ts.slot_date, ts.start_time INTO v_target FROM public.time_slots ts JOIN public.experiences e ON e.id = ts.experience_id WHERE ts.experience_id = v_slot.experience_id AND ts.constraint_type IS NULL AND (ts.override_capacity IS NULL OR ts.override_capacity > 0) AND (ts.slot_date > v_slot.slot_date OR (ts.slot_date = v_slot.slot_date AND ts.start_time > v_slot.start_time)) AND (COALESCE(ts.override_capacity, e.capacity_per_slot) - ts.booked_count) >= v_booking.guest_count AND ts.id != p_slot_id ORDER BY ts.slot_date, ts.start_time LIMIT 1;
        IF FOUND THEN
            booking_id := v_booking.id; current_slot_id := p_slot_id; current_slot_date := v_slot.slot_date; current_slot_time := v_slot.start_time;
            target_slot_id := v_target.id; target_slot_date := v_target.slot_date; target_slot_time := v_target.start_time;
            v_moved := v_moved + v_booking.guest_count; RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_preview_slot_override FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_preview_slot_override TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_confirm_slot_override(p_slot_id UUID, p_new_capacity INTEGER, p_constraint_type public.slot_constraint_type DEFAULT NULL, p_constraint_notes TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_slot RECORD; v_overflow INTEGER; v_booking RECORD; v_target RECORD; v_moved_pax INTEGER := 0; v_moved_bookings JSONB := '[]'::JSONB; v_unmoved_bookings JSONB := '[]'::JSONB;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u') THEN RAISE EXCEPTION 'Forbidden: booking:u required'; END IF;
    SELECT ts.*, e.capacity_per_slot INTO v_slot FROM public.time_slots ts JOIN public.experiences e ON e.id = ts.experience_id WHERE ts.id = p_slot_id FOR UPDATE OF ts;
    IF NOT FOUND THEN RAISE EXCEPTION 'Slot not found'; END IF;
    UPDATE public.time_slots SET override_capacity = p_new_capacity, constraint_type = p_constraint_type, constraint_notes = p_constraint_notes, updated_at = NOW() WHERE id = p_slot_id;
    v_overflow := v_slot.booked_count - p_new_capacity;
    IF v_overflow > 0 THEN
        FOR v_booking IN SELECT b.id, (b.adult_count + b.child_count) AS guest_count, b.booking_ref, b.booker_name FROM public.bookings b WHERE b.time_slot_id = p_slot_id AND b.status IN ('confirmed') ORDER BY b.created_at DESC LOOP
            IF v_moved_pax >= v_overflow THEN EXIT; END IF;
            SELECT ts.id, ts.slot_date, ts.start_time INTO v_target FROM public.time_slots ts JOIN public.experiences e ON e.id = ts.experience_id WHERE ts.experience_id = v_slot.experience_id AND ts.constraint_type IS NULL AND (ts.override_capacity IS NULL OR ts.override_capacity > 0) AND (ts.slot_date > v_slot.slot_date OR (ts.slot_date = v_slot.slot_date AND ts.start_time > v_slot.start_time)) AND (COALESCE(ts.override_capacity, e.capacity_per_slot) - ts.booked_count) >= v_booking.guest_count AND ts.id != p_slot_id ORDER BY ts.slot_date, ts.start_time LIMIT 1;
            IF FOUND THEN
                UPDATE public.bookings SET time_slot_id = v_target.id, updated_at = NOW() WHERE id = v_booking.id;
                UPDATE public.time_slots SET booked_count = booked_count + v_booking.guest_count, updated_at = NOW() WHERE id = v_target.id;
                v_moved_pax := v_moved_pax + v_booking.guest_count;
                v_moved_bookings := v_moved_bookings || jsonb_build_object('booking_id', v_booking.id, 'booking_ref', v_booking.booking_ref, 'guest_count', v_booking.guest_count, 'target_slot_date', v_target.slot_date, 'target_slot_time', v_target.start_time);
            ELSE
                v_unmoved_bookings := v_unmoved_bookings || jsonb_build_object('booking_id', v_booking.id, 'booking_ref', v_booking.booking_ref, 'guest_count', v_booking.guest_count, 'reason', 'No remaining capacity');
            END IF;
        END LOOP;
        UPDATE public.time_slots SET booked_count = GREATEST(0, booked_count - v_moved_pax), updated_at = NOW() WHERE id = p_slot_id;
    END IF;
    RETURN jsonb_build_object('slot_id', p_slot_id, 'new_capacity', p_new_capacity, 'overflow_pax', GREATEST(0, v_overflow), 'moved_pax', v_moved_pax, 'moved_bookings', v_moved_bookings, 'unmoved_bookings', v_unmoved_bookings);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_confirm_slot_override FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_confirm_slot_override TO authenticated;


-- ============================================================================
-- 20. RPCs â€” HR, ADMIN & CREW SELF-SERVICE
-- ============================================================================

-- 20a. admin_lock_account (R21: domain guard replaces access_level)
CREATE OR REPLACE FUNCTION public.admin_lock_account(p_target_user_id UUID, p_lock BOOLEAN, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'system') ? 'd') THEN RAISE EXCEPTION 'Forbidden: system:d required'; END IF;
    IF p_target_user_id = (SELECT auth.uid()) THEN RAISE EXCEPTION 'Cannot lock your own account'; END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN RAISE EXCEPTION 'User not found: %', p_target_user_id; END IF;
    IF p_lock THEN
        UPDATE auth.users SET banned_until = '2099-12-31T23:59:59Z'::TIMESTAMPTZ WHERE id = p_target_user_id;
        UPDATE public.profiles SET is_locked = TRUE, locked_reason = p_reason, locked_at = NOW(), locked_by = (SELECT auth.uid()) WHERE id = p_target_user_id;
    ELSE
        UPDATE auth.users SET banned_until = NULL WHERE id = p_target_user_id;
        UPDATE public.profiles SET is_locked = FALSE, locked_reason = NULL, locked_at = NULL, locked_by = NULL WHERE id = p_target_user_id;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_lock_account FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_lock_account TO authenticated;

-- 20b. rpc_wipe_biometric_data (R21: domain guard)
CREATE OR REPLACE FUNCTION public.rpc_wipe_biometric_data(p_booking_ref TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_booking_id UUID; v_deleted_count INT;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'system') ? 'd') THEN RAISE EXCEPTION 'Forbidden: system:d required'; END IF;
    SELECT id INTO v_booking_id FROM public.bookings WHERE booking_ref = upper(p_booking_ref);
    IF v_booking_id IS NULL THEN RETURN jsonb_build_object('status', 'NOT_FOUND', 'booking_ref', p_booking_ref); END IF;
    DELETE FROM public.biometric_vectors WHERE attendee_id IN (SELECT id FROM public.booking_attendees WHERE booking_id = v_booking_id);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN jsonb_build_object('status', 'PURGED', 'booking_ref', p_booking_ref, 'deleted_count', v_deleted_count, 'purged_at', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_wipe_biometric_data FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_wipe_biometric_data TO authenticated;

-- 20c. rpc_generate_time_slots (R21: domain guard)
CREATE OR REPLACE FUNCTION public.rpc_generate_time_slots(p_experience_id UUID, p_start_date DATE, p_days INT, p_slot_interval_minutes INT DEFAULT 15, p_day_start_hour INT DEFAULT 9, p_day_end_hour INT DEFAULT 21)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_current_date DATE; v_slot_start TIME; v_slot_end TIME; v_total_slots INT := 0;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'booking') ? 'c') THEN RAISE EXCEPTION 'Forbidden: booking:c required'; END IF;
    FOR d IN 0..(p_days - 1) LOOP
        v_current_date := p_start_date + d;
        v_slot_start := (p_day_start_hour || ':00')::TIME;
        WHILE v_slot_start < (p_day_end_hour || ':00')::TIME LOOP
            v_slot_end := v_slot_start + (p_slot_interval_minutes || ' minutes')::INTERVAL;
            IF NOT EXISTS (SELECT 1 FROM public.time_slots WHERE experience_id = p_experience_id AND slot_date = v_current_date AND start_time = v_slot_start) THEN
                INSERT INTO public.time_slots (experience_id, slot_date, start_time, end_time, booked_count) VALUES (p_experience_id, v_current_date, v_slot_start, v_slot_end, 0);
                v_total_slots := v_total_slots + 1;
            END IF;
            v_slot_start := v_slot_end;
        END LOOP;
    END LOOP;
    RETURN jsonb_build_object('total_slots_created', v_total_slots, 'start_date', p_start_date, 'days', p_days);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_generate_time_slots FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_generate_time_slots TO authenticated;

-- 20d. rpc_confirm_password_set (self-service, no guard change)
CREATE OR REPLACE FUNCTION public.rpc_confirm_password_set()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF (SELECT password_set FROM public.profiles WHERE id = (SELECT auth.uid())) = TRUE THEN RETURN; END IF;
    UPDATE public.profiles SET password_set = TRUE, updated_at = now() WHERE id = (SELECT auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_confirm_password_set FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_confirm_password_set TO authenticated;

-- 20e. rpc_update_own_avatar (self-service)
CREATE OR REPLACE FUNCTION public.rpc_update_own_avatar(p_avatar_url TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles SET avatar_url = p_avatar_url, updated_at = NOW() WHERE id = (SELECT auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_update_own_avatar FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_update_own_avatar TO authenticated;

-- 20f. submit_pos_order (B15 refactor: material_sales_data + modifiers; R21 domain guard)
CREATE OR REPLACE FUNCTION public.submit_pos_order(p_pos_point_id UUID, p_items JSONB, p_payment_method TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_order_id UUID; v_total_amount NUMERIC := 0; v_item JSONB;
    v_material_id UUID; v_quantity NUMERIC; v_server_price NUMERIC; v_modifier_total NUMERIC;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c') THEN RAISE EXCEPTION 'Forbidden: pos:c required'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.pos_points WHERE id = p_pos_point_id) THEN RAISE EXCEPTION 'POS_POINT_NOT_FOUND: %', p_pos_point_id; END IF;

    -- First pass: validate all items and compute total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_material_id := (v_item ->> 'material_id')::UUID;
        v_quantity := (v_item ->> 'quantity')::NUMERIC;
        SELECT selling_price INTO v_server_price FROM public.material_sales_data
        WHERE material_id = v_material_id AND pos_point_id = p_pos_point_id AND is_active = TRUE;
        IF NOT FOUND THEN RAISE EXCEPTION 'MATERIAL_NOT_FOUND_OR_INACTIVE: %', v_material_id; END IF;

        -- Sum modifier price deltas
        v_modifier_total := 0;
        IF v_item ? 'modifiers' THEN
            SELECT COALESCE(SUM((mo.price_delta)::NUMERIC), 0) INTO v_modifier_total
            FROM jsonb_array_elements_text(v_item -> 'modifiers') AS mid
            JOIN public.pos_modifier_options mo ON mo.id = mid::UUID;
        END IF;
        v_total_amount := v_total_amount + ((v_server_price + v_modifier_total) * v_quantity);
    END LOOP;

    INSERT INTO public.orders (pos_point_id, status, total_amount, payment_method, created_by)
    VALUES (p_pos_point_id, 'preparing', v_total_amount, p_payment_method::public.payment_method, (SELECT auth.uid()))
    RETURNING id INTO v_order_id;

    -- Second pass: create line items + modifier snapshots
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_material_id := (v_item ->> 'material_id')::UUID;
        v_quantity := (v_item ->> 'quantity')::NUMERIC;
        SELECT selling_price INTO v_server_price FROM public.material_sales_data WHERE material_id = v_material_id AND pos_point_id = p_pos_point_id;

        v_modifier_total := 0;
        IF v_item ? 'modifiers' THEN
            SELECT COALESCE(SUM((mo.price_delta)::NUMERIC), 0) INTO v_modifier_total
            FROM jsonb_array_elements_text(v_item -> 'modifiers') AS mid
            JOIN public.pos_modifier_options mo ON mo.id = mid::UUID;
        END IF;

        DECLARE v_order_item_id UUID;
        BEGIN
            INSERT INTO public.order_items (order_id, material_id, quantity, unit_price)
            VALUES (v_order_id, v_material_id, v_quantity, v_server_price + v_modifier_total)
            RETURNING id INTO v_order_item_id;

            -- Snapshot modifier selections (price + material impact)
            IF v_item ? 'modifiers' THEN
                INSERT INTO public.order_item_modifiers (order_item_id, modifier_option_id, option_name, price_delta, material_id, quantity_delta)
                SELECT v_order_item_id, mo.id, mo.name, mo.price_delta, mo.material_id, mo.quantity_delta
                FROM jsonb_array_elements_text(v_item -> 'modifiers') AS mid
                JOIN public.pos_modifier_options mo ON mo.id = mid::UUID;
            END IF;
        END;
    END LOOP;
    RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_pos_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_pos_order TO authenticated;

-- 20g. rpc_reorder_dashboard (B14: complete rewrite for new tables)
CREATE OR REPLACE FUNCTION public.rpc_reorder_dashboard()
RETURNS TABLE (
    material_id UUID, material_name TEXT, material_sku TEXT, category_id UUID, category_name TEXT,
    default_supplier_id UUID, default_supplier_name TEXT, sell_through_30d NUMERIC,
    on_hand NUMERIC, on_order NUMERIC, effective_stock NUMERIC, reorder_point NUMERIC,
    reorder_amt NUMERIC, cost_price NUMERIC, purchase_unit_abbr TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'procurement') ? 'r') THEN
        RAISE EXCEPTION 'Forbidden: procurement:r required';
    END IF;
    RETURN QUERY
    WITH material_data AS (
        SELECT
            m.id, m.name, m.sku, m.category_id,
            mc.name AS category_name, m.reorder_point,
            mpd.supplier_id AS default_supplier_id,
            s.name AS default_supplier_name,
            mpd.cost_price,
            u.abbreviation AS purchase_unit_abbr,
            COALESCE((SELECT SUM(sbc.current_qty) FROM public.stock_balance_cache sbc WHERE sbc.material_id = m.id), 0) AS on_hand,
            COALESCE((SELECT SUM(poi.expected_qty - poi.received_qty) FROM public.purchase_order_items poi JOIN public.purchase_orders po ON po.id = poi.po_id WHERE poi.material_id = m.id AND po.status IN ('sent', 'partially_received')), 0) AS on_order,
            COALESCE((
                SELECT SUM(ABS(gmi.quantity))
                FROM public.goods_movement_items gmi
                JOIN public.goods_movements gm ON gm.id = gmi.goods_movement_id
                JOIN public.movement_types mt ON mt.id = gm.movement_type_id
                WHERE gmi.material_id = m.id AND mt.code = '601' AND gmi.created_at >= NOW() - INTERVAL '30 days'
            ), 0) AS sell_through_30d
        FROM public.materials m
        LEFT JOIN public.material_categories mc ON mc.id = m.category_id
        LEFT JOIN public.material_procurement_data mpd ON mpd.material_id = m.id AND mpd.is_default = TRUE
        LEFT JOIN public.suppliers s ON s.id = mpd.supplier_id
        LEFT JOIN public.units u ON u.id = mpd.purchase_unit_id
        WHERE m.is_active = TRUE AND m.material_type IN ('raw', 'trading', 'consumable', 'semi_finished')
    )
    SELECT md.id, md.name, md.sku, md.category_id, md.category_name,
        md.default_supplier_id, md.default_supplier_name, md.sell_through_30d,
        md.on_hand, md.on_order, (md.on_hand + md.on_order) AS effective_stock,
        md.reorder_point, GREATEST(0, md.reorder_point - (md.on_hand + md.on_order)) AS reorder_amt,
        md.cost_price, md.purchase_unit_abbr
    FROM material_data md ORDER BY md.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_reorder_dashboard FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_reorder_dashboard TO authenticated;

-- 20h. HR RPCs (unchanged â€” clock_in, clock_out, cancel_leave_request)
CREATE OR REPLACE FUNCTION public.rpc_clock_in(p_gps JSONB DEFAULT NULL, p_selfie_url TEXT DEFAULT NULL, p_remark TEXT DEFAULT NULL, p_source punch_source DEFAULT 'mobile')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_staff_record_id UUID; v_schedule RECORD; v_punch_id UUID; v_today DATE := (NOW() AT TIME ZONE public.get_app_config('facility_timezone'))::DATE;
BEGIN
    SELECT p.staff_record_id INTO v_staff_record_id FROM public.profiles p WHERE p.id = (SELECT auth.uid());
    IF v_staff_record_id IS NULL THEN RAISE EXCEPTION 'STAFF_RECORD_NOT_LINKED'; END IF;
    SELECT ss.* INTO v_schedule FROM public.shift_schedules ss WHERE ss.staff_record_id = v_staff_record_id AND ss.shift_date = v_today;
    IF v_schedule IS NULL THEN RAISE EXCEPTION 'NO_SHIFT_SCHEDULED_TODAY'; END IF;
    IF EXISTS (SELECT 1 FROM public.leave_requests lr WHERE lr.staff_record_id = v_staff_record_id AND lr.status = 'approved' AND v_today BETWEEN lr.start_date AND lr.end_date) THEN RAISE EXCEPTION 'ON_APPROVED_LEAVE'; END IF;
    IF EXISTS (SELECT 1 FROM public.public_holidays WHERE holiday_date = v_today) THEN RAISE EXCEPTION 'PUBLIC_HOLIDAY'; END IF;
    IF EXISTS (SELECT 1 FROM public.timecard_punches tp WHERE tp.shift_schedule_id = v_schedule.id AND tp.punch_type = 'clock_in' AND tp.voided_at IS NULL) THEN RAISE EXCEPTION 'ALREADY_CLOCKED_IN'; END IF;
    INSERT INTO public.timecard_punches (staff_record_id, shift_schedule_id, punch_time, punch_type, source, gps_coordinates, selfie_url, remark)
    VALUES (v_staff_record_id, v_schedule.id, NOW(), 'clock_in', p_source, p_gps, p_selfie_url, p_remark) RETURNING id INTO v_punch_id;
    RETURN jsonb_build_object('punch_id', v_punch_id, 'shift_date', v_today, 'clock_in', NOW(), 'expected_start_time', v_schedule.expected_start_time);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_clock_in FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_clock_in TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_clock_out(p_gps JSONB DEFAULT NULL, p_selfie_url TEXT DEFAULT NULL, p_remark TEXT DEFAULT NULL, p_source punch_source DEFAULT 'mobile')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_staff_record_id UUID; v_schedule RECORD; v_clock_in_time TIMESTAMPTZ; v_punch_id UUID; v_today DATE := (NOW() AT TIME ZONE public.get_app_config('facility_timezone'))::DATE;
BEGIN
    SELECT p.staff_record_id INTO v_staff_record_id FROM public.profiles p WHERE p.id = (SELECT auth.uid());
    IF v_staff_record_id IS NULL THEN RAISE EXCEPTION 'STAFF_RECORD_NOT_LINKED'; END IF;
    SELECT ss.* INTO v_schedule FROM public.shift_schedules ss WHERE ss.staff_record_id = v_staff_record_id AND ss.shift_date = v_today;
    IF v_schedule IS NULL THEN RAISE EXCEPTION 'NO_SHIFT_SCHEDULED_TODAY'; END IF;
    SELECT tp.punch_time INTO v_clock_in_time FROM public.timecard_punches tp WHERE tp.shift_schedule_id = v_schedule.id AND tp.punch_type = 'clock_in' AND tp.voided_at IS NULL;
    IF EXISTS (SELECT 1 FROM public.timecard_punches tp WHERE tp.shift_schedule_id = v_schedule.id AND tp.punch_type = 'clock_out' AND tp.voided_at IS NULL) THEN RAISE EXCEPTION 'ALREADY_CLOCKED_OUT'; END IF;
    INSERT INTO public.timecard_punches (staff_record_id, shift_schedule_id, punch_time, punch_type, source, gps_coordinates, selfie_url, remark)
    VALUES (v_staff_record_id, v_schedule.id, NOW(), 'clock_out', p_source, p_gps, p_selfie_url, p_remark) RETURNING id INTO v_punch_id;
    RETURN jsonb_build_object('punch_id', v_punch_id, 'clock_in', v_clock_in_time, 'clock_out', NOW());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_clock_out FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_clock_out TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_cancel_leave_request(p_leave_request_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_staff_record_id UUID; v_request RECORD;
BEGIN
    SELECT p.staff_record_id INTO v_staff_record_id FROM public.profiles p WHERE p.id = (SELECT auth.uid());
    IF v_staff_record_id IS NULL THEN RAISE EXCEPTION 'STAFF_RECORD_NOT_LINKED'; END IF;
    SELECT * INTO v_request FROM public.leave_requests WHERE id = p_leave_request_id AND staff_record_id = v_staff_record_id FOR UPDATE;
    IF v_request IS NULL THEN RAISE EXCEPTION 'LEAVE_REQUEST_NOT_FOUND'; END IF;
    IF v_request.status != 'pending' THEN RAISE EXCEPTION 'ONLY_PENDING_CAN_BE_CANCELLED'; END IF;
    UPDATE public.leave_requests SET status = 'cancelled', updated_at = NOW() WHERE id = p_leave_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_cancel_leave_request FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_cancel_leave_request TO authenticated;

-- 20h-2. rpc_add_exception_clarification (staff self-service: explain own exceptions)
CREATE OR REPLACE FUNCTION public.rpc_add_exception_clarification(p_exception_id UUID, p_text TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_staff_record_id UUID; v_exception_staff_id UUID;
BEGIN
    SELECT p.staff_record_id INTO v_staff_record_id FROM public.profiles p WHERE p.id = (SELECT auth.uid());
    IF v_staff_record_id IS NULL THEN RAISE EXCEPTION 'STAFF_RECORD_NOT_FOUND'; END IF;

    SELECT ae.staff_record_id INTO v_exception_staff_id
    FROM public.attendance_exceptions ae WHERE ae.id = p_exception_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'EXCEPTION_NOT_FOUND: %', p_exception_id; END IF;
    IF v_exception_staff_id != v_staff_record_id THEN RAISE EXCEPTION 'FORBIDDEN: not your exception'; END IF;

    UPDATE public.attendance_exceptions
    SET staff_clarification = p_text, updated_at = NOW()
    WHERE id = p_exception_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_add_exception_clarification FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_add_exception_clarification TO authenticated;

-- 20h-3. rpc_convert_exception_to_leave (HR converts unjustified absence to approved leave)
CREATE OR REPLACE FUNCTION public.rpc_convert_exception_to_leave(
    p_exception_id UUID,
    p_leave_type_id UUID,
    p_days NUMERIC DEFAULT 1,
    p_note TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_exception RECORD;
    v_shift_date DATE;
    v_staff_record_id UUID;
    v_leave_type_name TEXT;
    v_leave_request_id UUID;
BEGIN
    -- Guard: caller must have hr:u
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u') THEN
        RAISE EXCEPTION 'Forbidden: hr:u required';
    END IF;

    -- Guard: exception must exist and be unjustified
    SELECT ae.id, ae.staff_record_id, ae.type, ae.status, ae.shift_schedule_id
    INTO v_exception
    FROM public.attendance_exceptions ae WHERE ae.id = p_exception_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'EXCEPTION_NOT_FOUND: %', p_exception_id; END IF;
    IF v_exception.status != 'unjustified' THEN RAISE EXCEPTION 'EXCEPTION_ALREADY_JUSTIFIED: %', p_exception_id; END IF;

    -- Guard: only absent or missing_clock_in can be converted
    IF v_exception.type NOT IN ('absent', 'missing_clock_in') THEN
        RAISE EXCEPTION 'INVALID_EXCEPTION_TYPE: % â€” only absent or missing_clock_in can be converted to leave', v_exception.type;
    END IF;

    -- Resolve shift_date and staff_record_id
    SELECT ss.shift_date INTO v_shift_date
    FROM public.shift_schedules ss WHERE ss.id = v_exception.shift_schedule_id;
    v_staff_record_id := v_exception.staff_record_id;

    -- Resolve leave type name for justification reason
    SELECT lt.name INTO v_leave_type_name
    FROM public.leave_types lt WHERE lt.id = p_leave_type_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'LEAVE_TYPE_NOT_FOUND: %', p_leave_type_id; END IF;

    -- Create approved leave request.
    -- NOTE: trg_leave_approval_linkage fires on UPDATE only (pendingâ†’approved transition).
    -- Direct INSERT as 'approved' bypasses the trigger, so we debit leave_ledger explicitly.
    INSERT INTO public.leave_requests (
        staff_record_id, leave_type_id, start_date, end_date, requested_days,
        status, reviewed_by, reviewed_at, reason
    ) VALUES (
        v_staff_record_id, p_leave_type_id, v_shift_date, v_shift_date, p_days,
        'approved', (SELECT auth.uid()), NOW(),
        COALESCE(p_note, 'Converted from attendance exception')
    )
    RETURNING id INTO v_leave_request_id;

    -- Explicit leave_ledger debit (replaces the trigger path)
    INSERT INTO public.leave_ledger (
        staff_record_id, leave_type_id, fiscal_year, transaction_date,
        transaction_type, days, leave_request_id, org_unit_path, notes
    ) VALUES (
        v_staff_record_id, p_leave_type_id,
        EXTRACT(YEAR FROM v_shift_date)::INTEGER, CURRENT_DATE,
        'usage', -(p_days), v_leave_request_id,
        NULL,  -- org_unit_path populated by trg_populate_org_unit_path_leave_ledger
        'Auto-debit: converted from attendance exception'
    );

    -- Justify the exception
    UPDATE public.attendance_exceptions
    SET status = 'justified',
        justification_reason = 'Converted to ' || v_leave_type_name,
        justified_by = (SELECT auth.uid()),
        justified_at = NOW(),
        updated_at = NOW()
    WHERE id = p_exception_id;

    RETURN v_leave_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_convert_exception_to_leave FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_convert_exception_to_leave TO authenticated;

-- 20i. rpc_generate_schedules (daily cron schedule generation)
CREATE OR REPLACE FUNCTION public.rpc_generate_schedules(p_days_ahead INTEGER DEFAULT 14)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_start_date DATE; v_end_date DATE; v_count INTEGER := 0; v_assignment RECORD; v_target DATE; v_day_index INTEGER; v_shift RECORD;
BEGIN
    PERFORM set_config('app.settings.template_regeneration', 'true', true);
    v_start_date := CURRENT_DATE + 1; v_end_date := CURRENT_DATE + p_days_ahead;
    FOR v_assignment IN
        SELECT sra.staff_record_id, sra.roster_template_id, sra.effective_start_date, rt.cycle_length_days, rt.anchor_date
        FROM public.staff_roster_assignments sra JOIN public.roster_templates rt ON rt.id = sra.roster_template_id
        JOIN public.staff_records sr ON sr.id = sra.staff_record_id JOIN public.profiles p ON p.staff_record_id = sr.id
        WHERE p.employment_status = 'active' AND rt.is_active = TRUE AND sra.effective_start_date <= v_end_date
          AND (sra.effective_end_date IS NULL OR sra.effective_end_date >= v_start_date)
    LOOP
        v_target := GREATEST(v_start_date, v_assignment.effective_start_date);
        WHILE v_target <= v_end_date AND (v_assignment.effective_end_date IS NULL OR v_target <= v_assignment.effective_end_date) LOOP
            v_day_index := (((v_target - v_assignment.anchor_date) % v_assignment.cycle_length_days) + v_assignment.cycle_length_days) % v_assignment.cycle_length_days + 1;
            SELECT rts.shift_type_id, st.start_time, st.end_time INTO v_shift
            FROM public.roster_template_shifts rts JOIN public.shift_types st ON st.id = rts.shift_type_id
            WHERE rts.template_id = v_assignment.roster_template_id AND rts.day_index = v_day_index;
            IF v_shift IS NOT NULL THEN
                INSERT INTO public.shift_schedules (staff_record_id, shift_date, shift_type_id, expected_start_time, expected_end_time, is_override)
                VALUES (v_assignment.staff_record_id, v_target, v_shift.shift_type_id, v_shift.start_time, v_shift.end_time, FALSE)
                ON CONFLICT (staff_record_id, shift_date) DO NOTHING;
                IF FOUND THEN v_count := v_count + 1; END IF;
            END IF;
            v_target := v_target + 1;
        END LOOP;
    END LOOP;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_generate_schedules FROM PUBLIC, anon, authenticated;

-- 20j. rpc_request_recount
CREATE OR REPLACE FUNCTION public.rpc_request_recount(p_reconciliation_id UUID, p_new_runner_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u') THEN
        RAISE EXCEPTION 'Forbidden: inventory_ops:u required';
    END IF;
    UPDATE public.inventory_reconciliations
    SET status = 'in_progress', assigned_to = COALESCE(p_new_runner_id, assigned_to),
        discrepancy_found = FALSE, updated_at = NOW()
    WHERE id = p_reconciliation_id AND status = 'pending_review';
    IF NOT FOUND THEN RAISE EXCEPTION 'RECON_NOT_PENDING_REVIEW'; END IF;
    DELETE FROM public.inventory_reconciliation_items WHERE reconciliation_id = p_reconciliation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_request_recount FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_request_recount TO authenticated;

-- 20k. rpc_preview_pattern_change â€” dry-run preview of roster template propagation
CREATE OR REPLACE FUNCTION public.rpc_preview_pattern_change(
    p_from_date        DATE,
    p_to_date          DATE,
    p_staff_record_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_assignment RECORD;
    v_target     DATE;
    v_day_index  INTEGER;
    v_shift_type_id UUID;
    v_existing   RECORD;
    v_affected_staff UUID[] := '{}';
    v_shifts_to_update   INTEGER := 0;
    v_shifts_to_insert   INTEGER := 0;
    v_stale_rest_rows    INTEGER := 0;
    v_overrides_on_work  INTEGER := 0;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u') THEN
        RAISE EXCEPTION 'Forbidden: hr:u required';
    END IF;
    IF p_from_date > p_to_date THEN RAISE EXCEPTION 'INVALID_DATE_RANGE'; END IF;
    IF p_from_date <= CURRENT_DATE THEN RAISE EXCEPTION 'CANNOT_MODIFY_PAST_SCHEDULES'; END IF;

    FOR v_assignment IN
        SELECT sra.staff_record_id, sra.roster_template_id, sra.effective_start_date,
               sra.effective_end_date, rt.cycle_length_days, rt.anchor_date
        FROM public.staff_roster_assignments sra
        JOIN public.roster_templates rt ON rt.id = sra.roster_template_id
        JOIN public.staff_records sr ON sr.id = sra.staff_record_id
        JOIN public.profiles p ON p.staff_record_id = sr.id
        WHERE p.employment_status = 'active' AND rt.is_active = TRUE
          AND sra.effective_start_date <= p_to_date
          AND (sra.effective_end_date IS NULL OR sra.effective_end_date >= p_from_date)
          AND (p_staff_record_ids IS NULL OR sra.staff_record_id = ANY(p_staff_record_ids))
    LOOP
        IF NOT v_assignment.staff_record_id = ANY(v_affected_staff) THEN
            v_affected_staff := v_affected_staff || v_assignment.staff_record_id;
        END IF;

        v_target := GREATEST(p_from_date, v_assignment.effective_start_date);
        WHILE v_target <= p_to_date
              AND (v_assignment.effective_end_date IS NULL OR v_target <= v_assignment.effective_end_date)
        LOOP
            v_day_index := (((v_target - v_assignment.anchor_date) % v_assignment.cycle_length_days)
                + v_assignment.cycle_length_days) % v_assignment.cycle_length_days + 1;

            SELECT rts.shift_type_id INTO v_shift_type_id
            FROM public.roster_template_shifts rts
            WHERE rts.template_id = v_assignment.roster_template_id AND rts.day_index = v_day_index;

            IF v_shift_type_id IS NOT NULL THEN
                SELECT id, is_override, shift_type_id INTO v_existing
                FROM public.shift_schedules
                WHERE staff_record_id = v_assignment.staff_record_id AND shift_date = v_target;

                IF v_existing IS NULL THEN
                    v_shifts_to_insert := v_shifts_to_insert + 1;
                ELSIF v_existing.is_override THEN
                    v_overrides_on_work := v_overrides_on_work + 1;
                ELSIF v_existing.shift_type_id IS DISTINCT FROM v_shift_type_id THEN
                    v_shifts_to_update := v_shifts_to_update + 1;
                END IF;
            ELSE
                IF EXISTS (
                    SELECT 1 FROM public.shift_schedules
                    WHERE staff_record_id = v_assignment.staff_record_id AND shift_date = v_target
                ) THEN
                    v_stale_rest_rows := v_stale_rest_rows + 1;
                END IF;
            END IF;

            v_target := v_target + 1;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'affected_staff_count', COALESCE(array_length(v_affected_staff, 1), 0),
        'shifts_to_insert', v_shifts_to_insert,
        'shifts_to_update', v_shifts_to_update,
        'stale_rest_day_rows', v_stale_rest_rows,
        'work_day_overrides', v_overrides_on_work
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_preview_pattern_change FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_preview_pattern_change TO authenticated;

-- 20l. rpc_apply_pattern_change â€” execute roster template propagation
CREATE OR REPLACE FUNCTION public.rpc_apply_pattern_change(
    p_from_date        DATE,
    p_to_date          DATE,
    p_force_all        BOOLEAN DEFAULT FALSE,
    p_staff_record_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_count      INTEGER := 0;
    v_assignment RECORD;
    v_target     DATE;
    v_day_index  INTEGER;
    v_shift      RECORD;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u') THEN
        RAISE EXCEPTION 'Forbidden: hr:u required';
    END IF;
    IF p_from_date > p_to_date THEN RAISE EXCEPTION 'INVALID_DATE_RANGE'; END IF;
    IF p_from_date <= CURRENT_DATE THEN RAISE EXCEPTION 'CANNOT_MODIFY_PAST_SCHEDULES'; END IF;

    PERFORM set_config('app.settings.template_regeneration', 'true', true);

    FOR v_assignment IN
        SELECT sra.staff_record_id, sra.roster_template_id, sra.effective_start_date,
               sra.effective_end_date, rt.cycle_length_days, rt.anchor_date
        FROM public.staff_roster_assignments sra
        JOIN public.roster_templates rt ON rt.id = sra.roster_template_id
        JOIN public.staff_records sr ON sr.id = sra.staff_record_id
        JOIN public.profiles p ON p.staff_record_id = sr.id
        WHERE p.employment_status = 'active' AND rt.is_active = TRUE
          AND sra.effective_start_date <= p_to_date
          AND (sra.effective_end_date IS NULL OR sra.effective_end_date >= p_from_date)
          AND (p_staff_record_ids IS NULL OR sra.staff_record_id = ANY(p_staff_record_ids))
    LOOP
        v_target := GREATEST(p_from_date, v_assignment.effective_start_date);
        WHILE v_target <= p_to_date
              AND (v_assignment.effective_end_date IS NULL OR v_target <= v_assignment.effective_end_date)
        LOOP
            v_day_index := (((v_target - v_assignment.anchor_date) % v_assignment.cycle_length_days)
                + v_assignment.cycle_length_days) % v_assignment.cycle_length_days + 1;

            SELECT rts.shift_type_id, st.start_time, st.end_time INTO v_shift
            FROM public.roster_template_shifts rts
            JOIN public.shift_types st ON st.id = rts.shift_type_id
            WHERE rts.template_id = v_assignment.roster_template_id AND rts.day_index = v_day_index;

            IF v_shift IS NOT NULL THEN
                IF p_force_all THEN
                    INSERT INTO public.shift_schedules (
                        staff_record_id, shift_date, shift_type_id,
                        expected_start_time, expected_end_time, is_override
                    ) VALUES (
                        v_assignment.staff_record_id, v_target, v_shift.shift_type_id,
                        v_shift.start_time, v_shift.end_time, FALSE
                    )
                    ON CONFLICT (staff_record_id, shift_date) DO UPDATE SET
                        shift_type_id = EXCLUDED.shift_type_id,
                        expected_start_time = EXCLUDED.expected_start_time,
                        expected_end_time = EXCLUDED.expected_end_time,
                        is_override = FALSE,
                        updated_at = NOW();
                ELSE
                    INSERT INTO public.shift_schedules (
                        staff_record_id, shift_date, shift_type_id,
                        expected_start_time, expected_end_time, is_override
                    ) VALUES (
                        v_assignment.staff_record_id, v_target, v_shift.shift_type_id,
                        v_shift.start_time, v_shift.end_time, FALSE
                    )
                    ON CONFLICT (staff_record_id, shift_date) DO UPDATE SET
                        shift_type_id = EXCLUDED.shift_type_id,
                        expected_start_time = EXCLUDED.expected_start_time,
                        expected_end_time = EXCLUDED.expected_end_time,
                        is_override = FALSE,
                        updated_at = NOW()
                    WHERE public.shift_schedules.is_override = FALSE;
                END IF;
                IF FOUND THEN v_count := v_count + 1; END IF;
            ELSE
                DELETE FROM public.shift_schedules
                WHERE staff_record_id = v_assignment.staff_record_id AND shift_date = v_target;
            END IF;

            v_target := v_target + 1;
        END LOOP;
    END LOOP;

    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_apply_pattern_change FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_apply_pattern_change TO authenticated;

-- 20m. rpc_mark_day_off â€” insert/update public holiday
CREATE OR REPLACE FUNCTION public.rpc_mark_day_off(
    p_date   DATE,
    p_name   TEXT DEFAULT 'Company Day Off'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_holiday_id UUID;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'hr') ? 'c') THEN
        RAISE EXCEPTION 'Forbidden: hr:c required';
    END IF;
    IF p_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'CANNOT_MODIFY_PAST_DATES';
    END IF;

    INSERT INTO public.public_holidays (holiday_date, name, created_by)
    VALUES (p_date, p_name, (SELECT auth.uid()))
    ON CONFLICT (holiday_date) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW()
    RETURNING id INTO v_holiday_id;

    RETURN v_holiday_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_mark_day_off FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_mark_day_off TO authenticated;


-- ============================================================================
-- 21. REPORT FUNCTIONS & DISPATCHER
-- ============================================================================

-- 21a. Date range helper
CREATE OR REPLACE FUNCTION public._report_date_range(p_params JSONB)
RETURNS TABLE(range_start DATE, range_end DATE)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_timeframe TEXT; v_today DATE;
BEGIN
    IF p_params->>'start_date' IS NOT NULL AND p_params->>'end_date' IS NOT NULL THEN
        range_start := (p_params->>'start_date')::DATE; range_end := (p_params->>'end_date')::DATE; RETURN NEXT; RETURN;
    END IF;
    v_today := (NOW() AT TIME ZONE public.get_app_config('facility_timezone'))::DATE;
    v_timeframe := COALESCE(p_params->>'timeframe', 'last_30_days');
    CASE v_timeframe
        WHEN 'today' THEN range_start := v_today; range_end := v_today;
        WHEN 'yesterday' THEN range_start := v_today - 1; range_end := v_today - 1;
        WHEN 'last_7_days' THEN range_start := v_today - 7; range_end := v_today;
        WHEN 'last_30_days' THEN range_start := v_today - 30; range_end := v_today;
        WHEN 'this_month' THEN range_start := DATE_TRUNC('month', v_today)::DATE; range_end := v_today;
        WHEN 'last_month' THEN range_start := (DATE_TRUNC('month', v_today) - INTERVAL '1 month')::DATE; range_end := (DATE_TRUNC('month', v_today) - INTERVAL '1 day')::DATE;
        WHEN 'this_year' THEN range_start := DATE_TRUNC('year', v_today)::DATE; range_end := v_today;
        WHEN 'last_year' THEN range_start := (DATE_TRUNC('year', v_today) - INTERVAL '1 year')::DATE; range_end := (DATE_TRUNC('year', v_today) - INTERVAL '1 day')::DATE;
        ELSE range_start := v_today; range_end := v_today;
    END CASE;
    RETURN NEXT;
END;
$$;

-- 21b. HR reports (B8: sr.department_id â†’ sr.org_unit_id)
CREATE OR REPLACE FUNCTION public._report_monthly_attendance_summary(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_staff_id UUID; v_org_unit_id UUID; v_role_id UUID;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_staff_id := (p_params->>'staff_record_id')::UUID; v_org_unit_id := (p_params->>'org_unit_id')::UUID; v_role_id := (p_params->>'role_id')::UUID;
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT sr.id AS staff_record_id, p.display_name,
            COUNT(*) FILTER (WHERE sa.derived_status NOT IN ('on_leave', 'public_holiday')) AS scheduled_days,
            COUNT(*) FILTER (WHERE sa.derived_status = 'completed') AS present_days,
            COUNT(*) FILTER (WHERE sa.derived_status = 'absent') AS absent_days,
            COUNT(DISTINCT ae.shift_schedule_id) FILTER (WHERE ae.type = 'late_arrival') AS late_days,
            COALESCE(ROUND(SUM(sa.net_worked_seconds / 3600.0)::NUMERIC, 2), 0) AS total_actual_hours,
            COALESCE(ROUND(SUM(sa.expected_net_seconds / 3600.0)::NUMERIC, 2), 0) AS total_expected_hours,
            COUNT(*) FILTER (WHERE sa.derived_status = 'on_leave') AS leave_days
        FROM public.v_shift_attendance sa
        JOIN public.staff_records sr ON sr.id = sa.staff_record_id
        JOIN public.profiles p ON p.staff_record_id = sr.id
        LEFT JOIN public.attendance_exceptions ae ON ae.shift_schedule_id = sa.shift_schedule_id
        WHERE sa.shift_date BETWEEN v_start AND v_end
            AND (v_staff_id IS NULL OR sr.id = v_staff_id)
            AND (v_org_unit_id IS NULL OR sr.org_unit_id = v_org_unit_id)
            AND (v_role_id IS NULL OR p.role_id = v_role_id)
        GROUP BY sr.id, p.display_name ORDER BY p.display_name
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_monthly_timesheet(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_staff_id UUID; v_org_unit_id UUID; v_role_id UUID;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_staff_id := (p_params->>'staff_record_id')::UUID; v_org_unit_id := (p_params->>'org_unit_id')::UUID; v_role_id := (p_params->>'role_id')::UUID;
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT sr.id AS staff_record_id, p.display_name, TO_CHAR(sa.shift_date, 'Dy') AS day, TO_CHAR(sa.shift_date, 'DD-Mon') AS date,
            sa.shift_code AS shift, sa.first_in, sa.last_out, sa.net_worked_seconds, sa.derived_status AS status
        FROM public.v_shift_attendance sa
        JOIN public.staff_records sr ON sr.id = sa.staff_record_id
        JOIN public.profiles p ON p.staff_record_id = sr.id
        WHERE sa.shift_date BETWEEN v_start AND v_end
            AND (v_staff_id IS NULL OR sr.id = v_staff_id) AND (v_org_unit_id IS NULL OR sr.org_unit_id = v_org_unit_id) AND (v_role_id IS NULL OR p.role_id = v_role_id)
        ORDER BY p.display_name, sa.shift_date
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_leave_balance(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_org_unit_id UUID; v_role_id UUID; v_leave_type TEXT;
BEGIN
    v_org_unit_id := (p_params->>'org_unit_id')::UUID; v_role_id := (p_params->>'role_id')::UUID; v_leave_type := p_params->>'leave_type';
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT lb.staff_record_id, p.display_name, lb.leave_type_code AS leave_type,
            (lb.accrued_days + lb.carry_forward_days) AS policy_days, lb.adjustment_days, ABS(lb.used_days) AS used_days,
            lb.balance AS remaining_days, lb.fiscal_year AS balance_year
        FROM public.v_leave_balances lb JOIN public.staff_records sr ON sr.id = lb.staff_record_id JOIN public.profiles p ON p.staff_record_id = sr.id
        WHERE (v_leave_type IS NULL OR lb.leave_type_code = v_leave_type) AND (v_org_unit_id IS NULL OR sr.org_unit_id = v_org_unit_id) AND (v_role_id IS NULL OR p.role_id = v_role_id)
        ORDER BY p.display_name, lb.leave_type_code
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_leave_usage(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_staff_id UUID; v_org_unit_id UUID; v_leave_type TEXT;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_staff_id := (p_params->>'staff_record_id')::UUID; v_org_unit_id := (p_params->>'org_unit_id')::UUID; v_leave_type := p_params->>'leave_type';
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT sr.id AS staff_record_id, p.display_name, lt.code AS leave_type, lr.status, lr.start_date, lr.end_date, lr.requested_days AS days, lr.reason
        FROM public.leave_requests lr JOIN public.leave_types lt ON lt.id = lr.leave_type_id JOIN public.staff_records sr ON sr.id = lr.staff_record_id JOIN public.profiles p ON p.staff_record_id = sr.id
        WHERE lr.start_date BETWEEN v_start AND v_end AND (v_staff_id IS NULL OR sr.id = v_staff_id) AND (v_org_unit_id IS NULL OR sr.org_unit_id = v_org_unit_id) AND (v_leave_type IS NULL OR lt.code = v_leave_type)
        ORDER BY lr.start_date, p.display_name
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_staff_roster(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_org_unit_id UUID; v_role_id UUID; v_emp_status TEXT;
BEGIN
    v_org_unit_id := (p_params->>'org_unit_id')::UUID; v_role_id := (p_params->>'role_id')::UUID; v_emp_status := p_params->>'employment_status';
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT sr.id AS staff_record_id, sr.legal_name, p.display_name, p.email AS work_email, p.employee_id,
            r.display_name AS role, r.access_level, ou.name AS org_unit, p.employment_status, sr.contract_start, sr.contract_end
        FROM public.staff_records sr JOIN public.profiles p ON p.staff_record_id = sr.id
        LEFT JOIN public.roles r ON r.id = p.role_id LEFT JOIN public.org_units ou ON ou.id = sr.org_unit_id
        WHERE (v_org_unit_id IS NULL OR sr.org_unit_id = v_org_unit_id) AND (v_role_id IS NULL OR p.role_id = v_role_id) AND (v_emp_status IS NULL OR p.employment_status::TEXT = v_emp_status)
        ORDER BY sr.legal_name
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_exception_report(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_org_unit_id UUID;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_org_unit_id := (p_params->>'org_unit_id')::UUID;
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT sr.id AS staff_record_id, p.display_name, ss.shift_date, ae.type, ae.detail, ae.status, ae.justification_reason
        FROM public.attendance_exceptions ae JOIN public.shift_schedules ss ON ss.id = ae.shift_schedule_id
        JOIN public.staff_records sr ON sr.id = ss.staff_record_id JOIN public.profiles p ON p.staff_record_id = sr.id
        WHERE ss.shift_date BETWEEN v_start AND v_end AND (v_org_unit_id IS NULL OR sr.org_unit_id = v_org_unit_id)
        ORDER BY ss.shift_date, p.display_name
    ) t), '[]'::JSONB);
END;
$$;

-- 21c. POS reports (refactored: pos_catalog â†’ materials/material_sales_data)
CREATE OR REPLACE FUNCTION public._report_daily_sales(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_pos_point_id UUID;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_pos_point_id := (p_params->>'pos_point_id')::UUID;
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT o.created_at::DATE AS sale_date, pp.display_name AS pos_point, COUNT(DISTINCT o.id) AS order_count, SUM(o.total_amount) AS revenue
        FROM public.orders o JOIN public.pos_points pp ON pp.id = o.pos_point_id
        WHERE o.status = 'completed' AND o.created_at::DATE BETWEEN v_start AND v_end AND (v_pos_point_id IS NULL OR o.pos_point_id = v_pos_point_id)
        GROUP BY o.created_at::DATE, pp.display_name ORDER BY sale_date
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_sales_by_item(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_pos_point_id UUID;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_pos_point_id := (p_params->>'pos_point_id')::UUID;
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT m.name AS item_name, m.sku, SUM(oi.quantity) AS qty_sold, SUM(oi.quantity * oi.unit_price) AS revenue
        FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id JOIN public.materials m ON m.id = oi.material_id
        WHERE o.status = 'completed' AND o.created_at::DATE BETWEEN v_start AND v_end AND (v_pos_point_id IS NULL OR o.pos_point_id = v_pos_point_id)
        GROUP BY m.name, m.sku ORDER BY revenue DESC
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_sales_by_category(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT mc.name AS category, SUM(oi.quantity) AS qty_sold, SUM(oi.quantity * oi.unit_price) AS revenue
        FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id JOIN public.materials m ON m.id = oi.material_id JOIN public.material_categories mc ON mc.id = m.category_id
        WHERE o.status = 'completed' AND o.created_at::DATE BETWEEN v_start AND v_end
        GROUP BY mc.name ORDER BY revenue DESC
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_sales_by_payment_method(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT o.payment_method, COUNT(*) AS order_count, SUM(o.total_amount) AS revenue
        FROM public.orders o WHERE o.status = 'completed' AND o.created_at::DATE BETWEEN v_start AND v_end
        GROUP BY o.payment_method ORDER BY revenue DESC
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_hourly_sales(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT EXTRACT(HOUR FROM o.created_at AT TIME ZONE public.get_app_config('facility_timezone'))::INT AS hour, COUNT(*) AS order_count, SUM(o.total_amount) AS revenue
        FROM public.orders o WHERE o.status = 'completed' AND o.created_at::DATE BETWEEN v_start AND v_end
        GROUP BY 1 ORDER BY 1
    ) t), '[]'::JSONB);
END;
$$;

-- 21d. Supply chain reports (refactored for new tables)
CREATE OR REPLACE FUNCTION public._report_stock_level(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_location_id UUID; v_category_id UUID;
BEGIN
    v_location_id := (p_params->>'location_id')::UUID; v_category_id := (p_params->>'category_id')::UUID;
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT m.name AS material_name, m.sku, l.name AS location, sbc.current_qty, m.reorder_point, mc.name AS category
        FROM public.stock_balance_cache sbc JOIN public.materials m ON m.id = sbc.material_id JOIN public.locations l ON l.id = sbc.location_id LEFT JOIN public.material_categories mc ON mc.id = m.category_id
        WHERE (v_location_id IS NULL OR sbc.location_id = v_location_id) AND (v_category_id IS NULL OR m.category_id = v_category_id)
        ORDER BY m.name, l.name
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_low_stock_alert(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT m.name AS material_name, m.sku, SUM(sbc.current_qty) AS total_on_hand, m.reorder_point, mc.name AS category
        FROM public.stock_balance_cache sbc JOIN public.materials m ON m.id = sbc.material_id LEFT JOIN public.material_categories mc ON mc.id = m.category_id
        WHERE m.is_active = TRUE AND m.reorder_point > 0
        GROUP BY m.id, m.name, m.sku, m.reorder_point, mc.name
        HAVING SUM(sbc.current_qty) < m.reorder_point ORDER BY (SUM(sbc.current_qty) - m.reorder_point)
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_purchase_order_summary(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_status TEXT;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_status := p_params->>'status';
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT po.id, s.name AS supplier, po.status, po.order_date, po.expected_delivery_date,
            COUNT(poi.id) AS line_items, SUM(poi.expected_qty * poi.unit_price) AS total_value
        FROM public.purchase_orders po JOIN public.suppliers s ON s.id = po.supplier_id LEFT JOIN public.purchase_order_items poi ON poi.po_id = po.id
        WHERE po.order_date BETWEEN v_start AND v_end AND (v_status IS NULL OR po.status::TEXT = v_status)
        GROUP BY po.id, s.name ORDER BY po.order_date DESC
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_waste_report(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_location_id UUID;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_location_id := (p_params->>'location_id')::UUID;
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT m.name AS material_name, wo.reason, l.name AS location, SUM(wo.quantity) AS qty, SUM(wo.total_cost) AS waste_value
        FROM public.write_offs wo JOIN public.materials m ON m.id = wo.material_id JOIN public.locations l ON l.id = wo.location_id
        WHERE wo.created_at::DATE BETWEEN v_start AND v_end AND (v_location_id IS NULL OR wo.location_id = v_location_id)
        GROUP BY m.name, wo.reason, l.name ORDER BY waste_value DESC
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_inventory_movement(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_material_id UUID;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_material_id := (p_params->>'material_id')::UUID;
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT gm.document_date, mt.code AS movement_type, mt.name AS movement_name, m.name AS material_name,
            gmi.quantity, l.name AS location, gmi.unit_cost, gmi.total_cost
        FROM public.goods_movement_items gmi JOIN public.goods_movements gm ON gm.id = gmi.goods_movement_id
        JOIN public.movement_types mt ON mt.id = gm.movement_type_id JOIN public.materials m ON m.id = gmi.material_id JOIN public.locations l ON l.id = gmi.location_id
        WHERE gm.document_date BETWEEN v_start AND v_end AND (v_material_id IS NULL OR gmi.material_id = v_material_id)
        ORDER BY gm.document_date DESC, gm.created_at DESC
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_reconciliation_report(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_location_id UUID;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_location_id := (p_params->>'location_id')::UUID;
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT ir.id, l.name AS location, ir.scheduled_date, ir.status, ir.discrepancy_found,
            COUNT(iri.id) AS items_counted, SUM(ABS(iri.physical_qty - iri.system_qty)) AS total_variance
        FROM public.inventory_reconciliations ir JOIN public.locations l ON l.id = ir.location_id
        LEFT JOIN public.inventory_reconciliation_items iri ON iri.reconciliation_id = ir.id
        WHERE ir.scheduled_date BETWEEN v_start AND v_end AND (v_location_id IS NULL OR ir.location_id = v_location_id)
        GROUP BY ir.id, l.name ORDER BY ir.scheduled_date DESC
    ) t), '[]'::JSONB);
END;
$$;

-- 21e. Booking & guest reports
CREATE OR REPLACE FUNCTION public._report_booking_summary(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT ts.slot_date, t.name AS tier, b.status, COUNT(*) AS booking_count, SUM(b.adult_count + b.child_count) AS total_guests, SUM(b.total_price) AS revenue
        FROM public.bookings b JOIN public.time_slots ts ON ts.id = b.time_slot_id JOIN public.tiers t ON t.id = b.tier_id
        WHERE ts.slot_date BETWEEN v_start AND v_end
        GROUP BY ts.slot_date, t.name, b.status ORDER BY ts.slot_date, t.name
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_booking_occupancy(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT ts.slot_date, ts.start_time, ts.booked_count, COALESCE(ts.override_capacity, e.capacity_per_slot) AS capacity,
            ROUND(ts.booked_count::NUMERIC / NULLIF(COALESCE(ts.override_capacity, e.capacity_per_slot), 0) * 100, 1) AS occupancy_pct
        FROM public.time_slots ts JOIN public.experiences e ON e.id = ts.experience_id
        WHERE ts.slot_date BETWEEN v_start AND v_end ORDER BY ts.slot_date, ts.start_time
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_revenue_by_experience(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT e.name AS experience, t.name AS tier, COUNT(*) AS bookings, SUM(b.adult_count) AS adults, SUM(b.child_count) AS children, SUM(b.total_price) AS revenue
        FROM public.bookings b JOIN public.time_slots ts ON ts.id = b.time_slot_id JOIN public.experiences e ON e.id = b.experience_id JOIN public.tiers t ON t.id = b.tier_id
        WHERE b.status IN ('confirmed', 'checked_in', 'completed') AND ts.slot_date BETWEEN v_start AND v_end
        GROUP BY e.name, t.name ORDER BY revenue DESC
    ) t), '[]'::JSONB);
END;
$$;

-- 21f. Ops reports (B2: device_types join; B3: feedback_text)
CREATE OR REPLACE FUNCTION public._report_incident_summary(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT i.category, i.status, COUNT(*) AS count, z.name AS zone
        FROM public.incidents i LEFT JOIN public.zones z ON z.id = i.zone_id
        WHERE i.created_at::DATE BETWEEN v_start AND v_end GROUP BY i.category, i.status, z.name ORDER BY count DESC
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_maintenance_summary(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT mo.id, mv.name AS vendor, d.name AS device_name, dt.display_name AS device_type,
            mo.topology, mo.status, mo.maintenance_start, mo.maintenance_end
        FROM public.maintenance_orders mo JOIN public.maintenance_vendors mv ON mv.id = mo.vendor_id
        JOIN public.devices d ON d.id = mo.target_ci_id JOIN public.device_types dt ON dt.id = d.device_type_id
        WHERE mo.maintenance_start::DATE BETWEEN v_start AND v_end ORDER BY mo.maintenance_start DESC
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_vehicle_status(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT v.name, v.plate, v.vehicle_type, v.status, z.name AS zone FROM public.vehicles v LEFT JOIN public.zones z ON z.id = v.zone_id ORDER BY v.name
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_guest_satisfaction(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT s.survey_type, s.sentiment, s.overall_score, s.feedback_text, s.source, s.created_at
        FROM public.survey_responses s WHERE s.created_at::DATE BETWEEN v_start AND v_end ORDER BY s.created_at DESC
    ) t), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_nps_summary(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT COUNT(*) FILTER (WHERE s.nps_score >= 9) AS promoters, COUNT(*) FILTER (WHERE s.nps_score BETWEEN 7 AND 8) AS passives,
            COUNT(*) FILTER (WHERE s.nps_score <= 6) AS detractors, COUNT(*) AS total,
            ROUND(((COUNT(*) FILTER (WHERE s.nps_score >= 9) - COUNT(*) FILTER (WHERE s.nps_score <= 6))::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) AS nps_score
        FROM public.survey_responses s WHERE s.nps_score IS NOT NULL AND s.created_at::DATE BETWEEN v_start AND v_end
    ) t), '[]'::JSONB);
END;
$$;

-- 21g. Report dispatcher
CREATE OR REPLACE FUNCTION public.execute_report(p_report_type TEXT, p_params JSONB DEFAULT '{}')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    CASE p_report_type
        WHEN 'monthly_attendance_summary' THEN RETURN public._report_monthly_attendance_summary(p_params);
        WHEN 'monthly_timesheet'          THEN RETURN public._report_monthly_timesheet(p_params);
        WHEN 'leave_balance'              THEN RETURN public._report_leave_balance(p_params);
        WHEN 'leave_usage'                THEN RETURN public._report_leave_usage(p_params);
        WHEN 'staff_roster'               THEN RETURN public._report_staff_roster(p_params);
        WHEN 'exception_report'           THEN RETURN public._report_exception_report(p_params);
        WHEN 'daily_sales'                THEN RETURN public._report_daily_sales(p_params);
        WHEN 'sales_by_item'              THEN RETURN public._report_sales_by_item(p_params);
        WHEN 'sales_by_category'          THEN RETURN public._report_sales_by_category(p_params);
        WHEN 'sales_by_payment_method'    THEN RETURN public._report_sales_by_payment_method(p_params);
        WHEN 'hourly_sales'               THEN RETURN public._report_hourly_sales(p_params);
        WHEN 'stock_level'                THEN RETURN public._report_stock_level(p_params);
        WHEN 'low_stock_alert'            THEN RETURN public._report_low_stock_alert(p_params);
        WHEN 'purchase_order_summary'     THEN RETURN public._report_purchase_order_summary(p_params);
        WHEN 'waste_report'               THEN RETURN public._report_waste_report(p_params);
        WHEN 'inventory_movement'         THEN RETURN public._report_inventory_movement(p_params);
        WHEN 'reconciliation_report'      THEN RETURN public._report_reconciliation_report(p_params);
        WHEN 'booking_summary'            THEN RETURN public._report_booking_summary(p_params);
        WHEN 'booking_occupancy'          THEN RETURN public._report_booking_occupancy(p_params);
        WHEN 'revenue_by_experience'      THEN RETURN public._report_revenue_by_experience(p_params);
        WHEN 'incident_summary'           THEN RETURN public._report_incident_summary(p_params);
        WHEN 'maintenance_summary'        THEN RETURN public._report_maintenance_summary(p_params);
        WHEN 'vehicle_status'             THEN RETURN public._report_vehicle_status(p_params);
        WHEN 'guest_satisfaction'          THEN RETURN public._report_guest_satisfaction(p_params);
        WHEN 'nps_summary'                THEN RETURN public._report_nps_summary(p_params);
        ELSE RAISE EXCEPTION 'Unknown report type: %', p_report_type;
    END CASE;
END;
$$;

-- Lock down: only service_role can call report functions (dispatcher + all sub-functions)
REVOKE EXECUTE ON FUNCTION public.execute_report(TEXT, JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_date_range(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_monthly_attendance_summary(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_monthly_timesheet(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_leave_balance(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_leave_usage(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_staff_roster(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_exception_report(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_daily_sales(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_sales_by_item(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_sales_by_category(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_sales_by_payment_method(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_hourly_sales(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_stock_level(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_low_stock_alert(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_purchase_order_summary(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_waste_report(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_inventory_movement(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_reconciliation_report(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_booking_summary(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_booking_occupancy(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_revenue_by_experience(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_incident_summary(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_maintenance_summary(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_vehicle_status(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_guest_satisfaction(JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._report_nps_summary(JSONB) FROM PUBLIC, authenticated, anon;


-- ============================================================================
-- 22. CRON SCHEDULING + NIGHTLY SWEEPS
-- ============================================================================

-- 22a. Nightly attendance sweep
CREATE OR REPLACE FUNCTION public.execute_nightly_attendance_sweep()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_target_date DATE; v_shift RECORD; v_schedule_end TIMESTAMPTZ; v_tz TEXT := public.get_app_config('facility_timezone');
    v_staff_record_id UUID; v_org_unit_path extensions.ltree;
BEGIN
    v_target_date := (CURRENT_TIMESTAMP AT TIME ZONE v_tz)::DATE - 1;
    IF EXISTS (SELECT 1 FROM public.public_holidays WHERE holiday_date = v_target_date) THEN RETURN; END IF;
    FOR v_shift IN SELECT ss.id AS schedule_id, ss.shift_date, ss.expected_start_time, ss.expected_end_time, ss.staff_record_id
        FROM public.shift_schedules ss JOIN public.shift_types st ON st.id = ss.shift_type_id
        WHERE ss.shift_date = v_target_date AND st.is_active = TRUE
    LOOP
        IF EXISTS (SELECT 1 FROM public.leave_requests lr WHERE lr.staff_record_id = v_shift.staff_record_id AND lr.status = 'approved' AND v_target_date BETWEEN lr.start_date AND lr.end_date) THEN CONTINUE; END IF;
        IF v_shift.expected_end_time IS NOT NULL AND v_shift.expected_start_time IS NOT NULL THEN
            IF v_shift.expected_end_time < v_shift.expected_start_time THEN v_schedule_end := ((v_shift.shift_date + INTERVAL '1 day') + v_shift.expected_end_time) AT TIME ZONE v_tz;
            ELSE v_schedule_end := (v_shift.shift_date + v_shift.expected_end_time) AT TIME ZONE v_tz; END IF;
            IF (CURRENT_TIMESTAMP AT TIME ZONE v_tz) <= (v_schedule_end + INTERVAL '2 hours') THEN CONTINUE; END IF;
        END IF;

        -- Resolve org_unit_path for denormalized columns
        SELECT sr.org_unit_path INTO v_org_unit_path FROM public.staff_records sr WHERE sr.id = v_shift.staff_record_id;

        DECLARE v_has_clock_in BOOLEAN; v_has_clock_out BOOLEAN;
        BEGIN
            SELECT EXISTS (SELECT 1 FROM public.timecard_punches tp WHERE tp.shift_schedule_id = v_shift.schedule_id AND tp.punch_type = 'clock_in' AND tp.voided_at IS NULL),
                   EXISTS (SELECT 1 FROM public.timecard_punches tp WHERE tp.shift_schedule_id = v_shift.schedule_id AND tp.punch_type = 'clock_out' AND tp.voided_at IS NULL)
            INTO v_has_clock_in, v_has_clock_out;

            IF NOT v_has_clock_in THEN
                INSERT INTO public.attendance_exceptions (shift_schedule_id, staff_record_id, org_unit_path, type, detail, status)
                VALUES (v_shift.schedule_id, v_shift.staff_record_id, v_org_unit_path, 'absent', 'Staff did not appear for scheduled shift on ' || v_shift.shift_date, 'unjustified')
                ON CONFLICT (shift_schedule_id, type) DO NOTHING;
            END IF;
            IF v_has_clock_in AND NOT v_has_clock_out THEN
                INSERT INTO public.attendance_exceptions (shift_schedule_id, staff_record_id, org_unit_path, type, detail, status)
                VALUES (v_shift.schedule_id, v_shift.staff_record_id, v_org_unit_path, 'missing_clock_out', 'Staff clocked in but did not clock out on ' || v_shift.shift_date, 'unjustified')
                ON CONFLICT (shift_schedule_id, type) DO NOTHING;
            END IF;
        END;
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_nightly_attendance_sweep FROM PUBLIC, anon, authenticated;

-- 22b. Booking status sweep
CREATE OR REPLACE FUNCTION public.fn_booking_status_sweep()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_no_show_count INTEGER; v_completed_count INTEGER; v_now TIMESTAMPTZ := NOW() AT TIME ZONE public.get_app_config('facility_timezone');
BEGIN
    UPDATE public.bookings b SET status = 'no_show', updated_at = NOW() FROM public.time_slots ts WHERE b.time_slot_id = ts.id AND b.status = 'confirmed' AND (ts.slot_date + ts.end_time) < v_now;
    GET DIAGNOSTICS v_no_show_count = ROW_COUNT;
    UPDATE public.bookings b SET status = 'completed', updated_at = NOW() FROM public.time_slots ts JOIN public.tiers t ON t.id = b.tier_id WHERE b.time_slot_id = ts.id AND b.status = 'checked_in' AND (ts.slot_date + ts.start_time + (t.duration_minutes || ' minutes')::INTERVAL) < v_now;
    GET DIAGNOSTICS v_completed_count = ROW_COUNT;
    RETURN jsonb_build_object('no_show_count', v_no_show_count, 'completed_count', v_completed_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_booking_status_sweep FROM PUBLIC, anon, authenticated;

-- 22c. Daily slot generation
CREATE OR REPLACE FUNCTION public.fn_generate_daily_slots()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_config RECORD; v_date DATE; v_range_start DATE; v_range_end DATE; v_slot_start TIME; v_slot_end TIME; v_interval INTERVAL;
BEGIN
    FOR v_config IN SELECT sc.*, e.arrival_window_minutes FROM public.scheduler_config sc JOIN public.experiences e ON e.id = sc.experience_id WHERE e.is_active = TRUE LOOP
        IF v_config.end_date IS NOT NULL AND v_config.end_date < CURRENT_DATE THEN CONTINUE; END IF;
        v_range_start := GREATEST(v_config.start_date, CURRENT_DATE);
        v_range_end := CURRENT_DATE + v_config.days_ahead;
        IF v_config.end_date IS NOT NULL THEN v_range_end := LEAST(v_range_end, v_config.end_date); END IF;
        v_interval := (v_config.arrival_window_minutes || ' minutes')::INTERVAL;
        v_date := v_range_start;
        WHILE v_date <= v_range_end LOOP
            v_slot_start := (v_config.day_start_hour || ':00')::TIME;
            WHILE v_slot_start < (v_config.day_end_hour || ':00')::TIME LOOP
                v_slot_end := v_slot_start + v_interval;
                INSERT INTO public.time_slots (experience_id, slot_date, start_time, end_time) VALUES (v_config.experience_id, v_date, v_slot_start, v_slot_end) ON CONFLICT (experience_id, slot_date, start_time) DO NOTHING;
                v_slot_start := v_slot_end;
            END LOOP;
            v_date := v_date + 1;
        END LOOP;
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_generate_daily_slots FROM PUBLIC, anon, authenticated;

-- 22d. Monthly leave accruals
CREATE OR REPLACE FUNCTION public.rpc_run_monthly_accruals()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count INTEGER := 0; v_staff RECORD; v_entitlement RECORD; v_monthly_days NUMERIC; v_fiscal_year INTEGER;
BEGIN
    v_fiscal_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    FOR v_staff IN
        SELECT sr.id AS staff_record_id, sr.leave_policy_id FROM public.staff_records sr JOIN public.profiles p ON p.staff_record_id = sr.id
        WHERE p.employment_status = 'active' AND sr.leave_policy_id IS NOT NULL
    LOOP
        FOR v_entitlement IN
            SELECT lpe.leave_type_id, lpe.days_per_year, lpe.frequency FROM public.leave_policy_entitlements lpe WHERE lpe.policy_id = v_staff.leave_policy_id AND lpe.frequency = 'monthly_prorated'
        LOOP
            v_monthly_days := ROUND(v_entitlement.days_per_year / 12.0, 2);
            INSERT INTO public.leave_ledger (staff_record_id, leave_type_id, fiscal_year, transaction_date, transaction_type, days, notes)
            VALUES (v_staff.staff_record_id, v_entitlement.leave_type_id, v_fiscal_year, CURRENT_DATE, 'accrual', v_monthly_days, 'Monthly accrual')
            ON CONFLICT DO NOTHING;
            IF FOUND THEN v_count := v_count + 1; END IF;
        END LOOP;
    END LOOP;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_run_monthly_accruals FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_run_monthly_accruals TO authenticated;

-- 22e. Cron job scheduling
SELECT cron.schedule('nightly-attendance-sweep', '5 16 * * *', $$SELECT public.execute_nightly_attendance_sweep()$$);
SELECT cron.schedule('employment-sync', '10 16 * * *', $$SELECT net.http_post(url := public.get_app_config('supabase_url') || '/functions/v1/cron-employment-sync', headers := jsonb_build_object('Authorization', 'Bearer ' || public.get_vault_secret('cron_secret'), 'Content-Type', 'application/json'), body := '{}'::jsonb)$$);
SELECT cron.schedule('purge-expired-otps', '0 */6 * * *', $$DELETE FROM public.otp_challenges WHERE expires_at < now() - interval '1 hour'$$);
SELECT cron.schedule('daily-slot-generation', '15 16 * * *', $$SELECT public.fn_generate_daily_slots()$$);
SELECT cron.schedule('daily-schedule-generation', '0 14 * * *', $$SELECT public.rpc_generate_schedules(14)$$);
SELECT cron.schedule('monthly-leave-accrual', '30 16 1 * *', $$SELECT public.rpc_run_monthly_accruals()$$);
SELECT cron.schedule('booking-status-sweep', '30 15 * * *', $$SELECT public.fn_booking_status_sweep()$$);
SELECT cron.schedule('cancel-expired-pending-payments', '*/15 * * * *', $$UPDATE public.bookings SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE status = 'pending_payment' AND created_at < NOW() - INTERVAL '15 minutes'$$);
SELECT cron.schedule('purge-expired-captured-photos', '0 18 * * *', $$DELETE FROM public.captured_photos WHERE expires_at < NOW()$$);
SELECT cron.schedule('purge-expired-biometrics', '0 17 * * *', $$DELETE FROM public.biometric_vectors WHERE attendee_id IN (SELECT ba.id FROM public.booking_attendees ba JOIN public.bookings b ON b.id = ba.booking_id JOIN public.time_slots ts ON ts.id = b.time_slot_id WHERE ts.slot_date < (NOW() AT TIME ZONE public.get_app_config('facility_timezone'))::DATE - INTERVAL '30 days')$$);
SELECT cron.schedule('cleanup-stale-report-executions', '*/15 * * * *', $$UPDATE public.report_executions SET status = 'failed', error_message = 'Timed out after 30 minutes', completed_at = NOW() WHERE status = 'processing' AND created_at < NOW() - INTERVAL '30 minutes'$$);


-- â”€â”€ Storage object cleanup for captured_photos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- When the purge-expired-captured-photos cron deletes DB rows, the actual
-- Storage objects (images) remain orphaned. This AFTER DELETE trigger uses
-- pg_net to async-delete the Storage object via the Supabase Storage API.
-- Requires: supabase_url in public.app_config, service_role_key in vault.secrets.
-- Set via: Dashboard > Vault > Secrets after deployment.

CREATE OR REPLACE FUNCTION public.trg_captured_photos_storage_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    _supabase_url TEXT;
    _service_key TEXT;
    _bucket TEXT := 'captured-photos';
BEGIN
    _supabase_url := public.get_app_config('supabase_url');
    _service_key := public.get_vault_secret('service_role_key');

    -- Skip cleanup if settings are not configured (dev/test environments)
    IF _supabase_url IS NULL OR _service_key IS NULL THEN
        RETURN OLD;
    END IF;

    -- Fire-and-forget async HTTP call via pg_net to delete the Storage object.
    -- Uses the Storage batch-delete endpoint (POST with prefixes array) since
    -- pg_net only supports http_post/http_get, not http_delete.
    PERFORM net.http_post(
        url := _supabase_url || '/storage/v1/object/' || _bucket,
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || _service_key,
            'apikey', _service_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('prefixes', jsonb_build_array(OLD.storage_path))
    );

    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_captured_photos_after_delete
    AFTER DELETE ON public.captured_photos
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_captured_photos_storage_cleanup();


-- ============================================================================
-- 23. STORAGE BUCKETS & POLICIES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
    ('avatars',    'avatars',    TRUE,  2097152,   '{"image/jpeg","image/png","image/webp"}'),
    ('attendance', 'attendance', FALSE, 5242880,   '{"image/jpeg","image/png","image/webp"}'),
    ('catalog',    'catalog',    TRUE,  5242880,   '{"image/jpeg","image/png","image/webp","image/svg+xml"}'),
    ('operations', 'operations', FALSE, 10485760,  '{"image/jpeg","image/png","image/webp","video/mp4","application/pdf"}'),
    ('documents',  'documents',  FALSE, 10485760,  '{"application/pdf","image/jpeg","image/png","image/webp"}'),
    ('reports',    'reports',    FALSE, 52428800,  '{"text/csv","application/pdf","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}')
ON CONFLICT (id) DO NOTHING;

-- Avatars (public): anyone reads, own-folder upload
CREATE POLICY "avatars_select_public" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND owner_id = (SELECT auth.uid())::text);
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (owner_id = (SELECT auth.uid())::text OR (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd'));

-- Attendance (private): staff uploads own, domain-gated read
CREATE POLICY "attendance_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attendance' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "attendance_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'attendance' AND (owner_id = (SELECT auth.uid())::text OR (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'));

-- Catalog (public): anyone reads, pos domain writes
CREATE POLICY "catalog_select_public" ON storage.objects FOR SELECT TO public USING (bucket_id = 'catalog');
CREATE POLICY "catalog_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalog' AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c');
CREATE POLICY "catalog_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'catalog' AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'u');
CREATE POLICY "catalog_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'catalog' AND (auth.jwt()->'app_metadata'->'domains'->'pos') ? 'd');

-- Operations (private): any authenticated uploads, ops domain reads all
CREATE POLICY "operations_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'operations');
CREATE POLICY "operations_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'operations' AND (owner_id = (SELECT auth.uid())::text OR (auth.jwt()->'app_metadata'->'domains'->'ops') ? 'r'));
CREATE POLICY "operations_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'operations' AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

-- Documents (private): system domain writes, all authenticated read
CREATE POLICY "documents_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'c');
CREATE POLICY "documents_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "documents_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents' AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'u');
CREATE POLICY "documents_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

-- Reports (private): reports domain reads, system domain deletes
CREATE POLICY "reports_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'reports' AND (auth.jwt()->'app_metadata'->'domains'->'reports') ? 'r');
CREATE POLICY "reports_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'reports' AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'd');

