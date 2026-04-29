-- ============================================================================
-- AgarthaOS — Seed data (sourced from cloud DB, INSERT format)
-- ============================================================================
-- Generated: 2026-04-29 via `supabase db dump --data-only --linked --schema public`
-- Source project: jaafuepzmbgyvevehesd (AgarthaOS v2)
--
-- INSERT format (not COPY) so `supabase db reset` can apply this in batch
-- mode — the CLI seed runner doesn't pipe stdin, so COPY ... FROM stdin
-- breaks at the first data row.
--
-- Excluded tables (sensitive, ephemeral, or runtime-managed):
--   biometric_vectors, biometric_access_log, consent_records,
--   otp_challenges, idempotency_keys, payment_webhook_events,
--   payment_webhook_events_dlq, email_dispatch_log, system_audit_log,
--   captured_photos
--
-- NOT idempotent: re-running against an already-seeded DB will fail on PK
-- conflicts. Use `supabase db reset` (which wipes first) for local refresh;
-- the cloud is updated via migrations + Server Actions, not by re-running
-- this file.
-- ============================================================================

SET session_replication_role = replica;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."announcements" ("id", "title", "content", "is_published", "expires_at", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('d3000000-0000-0000-0000-000000000002', 'POS Terminal maintenance', 'F&B main counter POS will be offline Wed 10-11 PM.', true, '2026-04-25 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, 'c0000000-0000-0000-0000-000000000003', NULL),
	('d3000000-0000-0000-0000-000000000003', 'New leave policy in effect', 'Updated annual leave policy — see HR portal.', true, '2026-06-17 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, 'c0000000-0000-0000-0000-000000000008', NULL),
	('d3000000-0000-0000-0000-000000000001', 'Welcome to AgarthaOS', 'Soft launch — report any issues to IT immediately.Soft launch — report any issues to IT immediately.Soft launch — report any issues to IT immediately.Soft launch — report any issues to IT immediately.', true, '2026-05-27 07:24:00+00', '2026-04-18 07:24:56.820039+00', '2026-04-22 04:40:25.797462+00', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
	('926c310c-c72b-41d8-ac3e-6707708242fe', '213', '213', false, NULL, '2026-04-22 05:12:10.491675+00', NULL, 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
	('4b4ef5c0-062c-411e-a23f-04972d6ea023', '213', '123213', false, NULL, '2026-04-22 05:12:23.695863+00', NULL, 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;


--
-- Data for Name: announcement_reads; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."announcement_reads" ("announcement_id", "user_id", "read_at", "created_at", "updated_at") VALUES
	('d3000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', '2026-04-22 04:39:53.269053+00', '2026-04-22 04:39:53.269053+00', NULL),
	('d3000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2026-04-22 04:39:58.018564+00', '2026-04-22 04:39:58.018564+00', NULL),
	('d3000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000011', '2026-04-22 04:44:28.027969+00', '2026-04-22 04:44:28.027969+00', NULL),
	('d3000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000011', '2026-04-22 04:44:32.559568+00', '2026-04-22 04:44:32.559568+00', NULL),
	('d3000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000011', '2026-04-22 04:44:34.049735+00', '2026-04-22 04:44:34.049735+00', NULL),
	('d3000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', '2026-04-22 06:12:43.729041+00', '2026-04-22 06:12:43.729041+00', NULL),
	('d3000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000006', '2026-04-26 11:46:38.300416+00', '2026-04-26 11:46:38.300416+00', NULL),
	('d3000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', '2026-04-26 11:46:38.300416+00', '2026-04-26 11:46:38.300416+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: org_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."org_units" ("id", "parent_id", "unit_type", "code", "name", "path", "manager_id", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('50694adb-6dd7-46eb-9963-45a585eae36c', NULL, 'company', 'agartha', 'Agartha', 'agartha', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('46e5c59a-02bc-4ab2-84ad-651755719771', '50694adb-6dd7-46eb-9963-45a585eae36c', 'division', 'ops', 'Operations', 'agartha.ops', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('609cfb37-bbf1-409e-87a5-0de98fae4c1e', '50694adb-6dd7-46eb-9963-45a585eae36c', 'division', 'support', 'Support', 'agartha.support', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('d92ee94d-9632-48b1-a85f-3c3c1019b9b4', '50694adb-6dd7-46eb-9963-45a585eae36c', 'division', 'corp', 'Corporate', 'agartha.corp', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('3649b816-4ccf-4c2e-a9c5-c3b0a5a7a6fd', '50694adb-6dd7-46eb-9963-45a585eae36c', 'department', 'logistics', 'Logistics', 'agartha.logistics', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('e6700725-163c-41d2-849b-520e9ef879e4', '46e5c59a-02bc-4ab2-84ad-651755719771', 'department', 'fnb', 'Food & Beverage', 'agartha.ops.fnb', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('ad4ccaee-2bf6-4c35-962e-b6867fa91068', '46e5c59a-02bc-4ab2-84ad-651755719771', 'department', 'giftshop', 'Gift Shop', 'agartha.ops.giftshop', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('76499534-049d-435c-b5fc-a7f3c1e7d12a', '46e5c59a-02bc-4ab2-84ad-651755719771', 'department', 'experiences', 'Experiences', 'agartha.ops.experiences', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('745acf86-c188-47d8-9c53-27c2260d55d0', '46e5c59a-02bc-4ab2-84ad-651755719771', 'department', 'security', 'Security', 'agartha.ops.security', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('86909c30-cf71-4a2a-95c9-6a226f0b3aff', '609cfb37-bbf1-409e-87a5-0de98fae4c1e', 'department', 'maintenance_dept', 'Maintenance', 'agartha.support.maintenance', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('da62bb78-e42e-46a8-8492-ec82745f213b', '609cfb37-bbf1-409e-87a5-0de98fae4c1e', 'department', 'cleaning', 'Cleaning', 'agartha.support.cleaning', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('3c0d8d6f-6c20-4c0b-a546-0cc34a70e90e', '609cfb37-bbf1-409e-87a5-0de98fae4c1e', 'department', 'health', 'Health', 'agartha.support.health', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('2655eb99-9f67-4c21-93b7-adc7ab6bcab9', 'd92ee94d-9632-48b1-a85f-3c3c1019b9b4', 'department', 'hr', 'Human Resources', 'agartha.corp.hr', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('02920b78-0bbc-40f3-9f9f-f601e698be89', 'd92ee94d-9632-48b1-a85f-3c3c1019b9b4', 'department', 'it', 'IT', 'agartha.corp.it', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('cd2d9f64-0201-4ec8-b576-ffe520bda486', 'd92ee94d-9632-48b1-a85f-3c3c1019b9b4', 'department', 'marketing', 'Marketing', 'agartha.corp.marketing', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('67804a42-cd37-4551-882e-d6dd30ed1734', 'd92ee94d-9632-48b1-a85f-3c3c1019b9b4', 'department', 'compliance', 'Compliance', 'agartha.corp.compliance', NULL, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."roles" ("id", "name", "display_name", "access_level", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('e570c586-8d07-4df7-b1e0-57fe50856f32', 'it_admin', 'IT Admin', 'admin', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('2724c5b8-049e-4b6c-ae38-a4be19180201', 'business_admin', 'Business Admin', 'admin', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('c41ce4f2-54c5-44a0-8585-30aecb2c24d9', 'pos_manager', 'POS Manager', 'manager', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('c7a731b1-311b-49fe-9456-30058f850886', 'procurement_manager', 'Procurement Manager', 'manager', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('682d91d4-8e39-40bc-b82d-825b356859aa', 'maintenance_manager', 'Maintenance Manager', 'manager', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('bcae65fa-377e-494a-bdec-eacc6dfaa7a8', 'inventory_manager', 'Inventory Manager', 'manager', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('2806ad34-3073-419f-bdd6-3ff5e420f5fe', 'marketing_manager', 'Marketing Manager', 'manager', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('10d543a2-9e56-4213-8c81-27a9952f08f5', 'human_resources_manager', 'Human Resources Manager', 'manager', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('742c1a39-a5be-4f1e-bcb5-6d34078ac93b', 'compliance_manager', 'Compliance Manager', 'manager', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('f357066a-a2be-44d0-af4b-23e8d8920f7a', 'operations_manager', 'Operations Manager', 'manager', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('a9412172-3d4d-4b46-be3c-21467b625ea2', 'fnb_crew', 'F&B Crew', 'crew', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('aa5f3066-de37-4a6a-b534-ee38d160d085', 'service_crew', 'Service Crew', 'crew', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('af202033-6758-47c6-bd5d-c6878947e936', 'giftshop_crew', 'Gift Shop Crew', 'crew', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('19516dc6-2100-4e50-9a16-952ed86ac80e', 'runner_crew', 'Runner Crew', 'crew', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('f88f1c24-d765-43af-a09b-0127f7c1a912', 'security_crew', 'Security Crew', 'crew', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('7dfd9826-5ccd-4294-900e-26796449956e', 'health_crew', 'Health Crew', 'crew', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('cbde3de5-c09e-4507-b573-26e1583b93e3', 'cleaning_crew', 'Cleaning Crew', 'crew', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('74cb42cc-e68f-4435-ac3d-e76e326d13b5', 'experience_crew', 'Experience Crew', 'crew', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('a6a0c809-2065-4e4e-8a43-84a1e8098520', 'internal_maintenance_crew', 'Internal Maintenance Crew', 'crew', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: announcement_targets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."announcement_targets" ("id", "announcement_id", "target_type", "role_id", "org_unit_id", "user_id", "created_at", "updated_at") VALUES
	('be066333-90de-4885-8616-087c8a098c94', 'd3000000-0000-0000-0000-000000000002', 'role', 'a9412172-3d4d-4b46-be3c-21467b625ea2', NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('d0b7e4c0-a687-4bf3-9c88-0c5a39c70ad0', 'd3000000-0000-0000-0000-000000000003', 'global', NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('49c8d3ed-996d-4855-af75-8271f4b81bbb', 'd3000000-0000-0000-0000-000000000001', 'global', NULL, NULL, NULL, '2026-04-22 04:40:25.797462+00', NULL),
	('0a6df5af-e68b-45f6-86af-e748b4c8c001', '926c310c-c72b-41d8-ac3e-6707708242fe', 'global', NULL, NULL, NULL, '2026-04-22 05:12:10.491675+00', NULL),
	('d947b3d4-b64a-418e-a01f-eddc12e5a799', '4b4ef5c0-062c-411e-a23f-04972d6ea023', 'global', NULL, NULL, NULL, '2026-04-22 05:12:23.695863+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: app_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."app_config" ("key", "value", "description", "created_at", "updated_at") VALUES
	('facility_timezone', 'Asia/Kuala_Lumpur', 'IANA timezone for attendance, cron, and reporting', '2026-04-17 08:02:49.848099+00', '2026-04-17 08:02:49.848099+00'),
	('supabase_url', 'https://jaafuepzmbgyvevehesd.supabase.co', 'Project URL â€” set after project creation', '2026-04-17 08:02:49.848099+00', '2026-04-17 08:05:53.636193+00'),
	('cron_secret', 'dev-cron-secret-rotate-before-prod', NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: leave_policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."leave_policies" ("id", "name", "description", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('d4ac204c-6d02-46a0-a449-b4b656b725e5', 'Leaves Policy ', 'test', true, '2026-04-24 05:03:19.536261+00', '2026-04-24 05:03:31.504458+00', 'c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000008'),
	('b3000000-0000-0000-0000-000000000001', 'Default Full-Time', '14 annual + 14 sick, annual upfront', true, '2026-04-18 07:24:56.820039+00', '2026-04-24 05:18:08.299587+00', NULL, 'c0000000-0000-0000-0000-000000000008') ON CONFLICT DO NOTHING;


--
-- Data for Name: shift_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."shift_types" ("id", "code", "name", "start_time", "end_time", "color", "is_active", "max_early_clock_in_minutes", "max_late_clock_out_minutes", "max_late_clock_in_minutes", "grace_late_arrival_minutes", "grace_early_departure_minutes", "break_duration_minutes", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('b1000000-0000-0000-0000-000000000002', 'AFT', 'Afternoon (13:00–21:00)', '13:00:00', '21:00:00', '#60A5FA', true, 30, 180, 60, 10, 5, 60, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b1000000-0000-0000-0000-000000000003', 'NIGHT', 'Night (21:00–05:00)', '21:00:00', '05:00:00', '#A78BFA', true, 30, 180, 60, 10, 5, 60, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b1000000-0000-0000-0000-000000000004', 'SPLIT', 'Split (10:00–14:00 + 18:00–22:00)', '10:00:00', '22:00:00', '#F59E0B', true, 30, 180, 60, 10, 5, 240, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b1000000-0000-0000-0000-000000000001', 'MORN', 'Morning (09:00–17:00)', '09:00:00', '17:00:00', '#4ADE80', true, 30, 180, 600, 10, 5, 60, '2026-04-18 07:24:56.820039+00', '2026-04-20 05:30:30.854399+00', NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: staff_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."staff_records" ("id", "legal_name", "personal_email", "phone", "address", "national_id_enc", "bank_name", "bank_account_enc", "salary_enc", "org_unit_id", "org_unit_path", "contract_start", "contract_end", "kin_name", "kin_relationship", "kin_phone", "created_at", "updated_at", "created_by", "updated_by", "leave_policy_id") VALUES
	('c1000000-0000-0000-0000-000000000001', 'Iman Admin', 'it_admin.personal@example.com', '+60-12-000-0001', NULL, NULL, NULL, NULL, NULL, '02920b78-0bbc-40f3-9f9f-f601e698be89', 'agartha.corp.it', '2025-10-20', NULL, 'Emergency Contact 1', 'Spouse', '+60-19-000-0001', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000003', 'Pavan POSman', 'pos_manager.personal@example.com', '+60-12-000-0003', NULL, NULL, NULL, NULL, NULL, 'e6700725-163c-41d2-849b-520e9ef879e4', 'agartha.ops.fnb', '2025-10-20', NULL, 'Emergency Contact 3', 'Spouse', '+60-19-000-0003', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000004', 'Priya Procure', 'procurement_manager.personal@example.com', '+60-12-000-0004', NULL, NULL, NULL, NULL, NULL, '3649b816-4ccf-4c2e-a9c5-c3b0a5a7a6fd', 'agartha.logistics', '2025-10-20', NULL, 'Emergency Contact 4', 'Spouse', '+60-19-000-0004', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000005', 'Marcus Maintain', 'maintenance_manager.personal@example.com', '+60-12-000-0005', NULL, NULL, NULL, NULL, NULL, '86909c30-cf71-4a2a-95c9-6a226f0b3aff', 'agartha.support.maintenance', '2025-10-20', NULL, 'Emergency Contact 5', 'Spouse', '+60-19-000-0005', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000006', 'Ivan Inventory', 'inventory_manager.personal@example.com', '+60-12-000-0006', NULL, NULL, NULL, NULL, NULL, '3649b816-4ccf-4c2e-a9c5-c3b0a5a7a6fd', 'agartha.logistics', '2025-10-20', NULL, 'Emergency Contact 6', 'Spouse', '+60-19-000-0006', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000007', 'Maya Marketing', 'marketing_manager.personal@example.com', '+60-12-000-0007', NULL, NULL, NULL, NULL, NULL, 'cd2d9f64-0201-4ec8-b576-ffe520bda486', 'agartha.corp.marketing', '2025-10-20', NULL, 'Emergency Contact 7', 'Spouse', '+60-19-000-0007', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000008', 'Hana HR', 'human_resources_manager.personal@example.com', '+60-12-000-0008', NULL, NULL, NULL, NULL, NULL, '2655eb99-9f67-4c21-93b7-adc7ab6bcab9', 'agartha.corp.hr', '2025-10-20', NULL, 'Emergency Contact 8', 'Spouse', '+60-19-000-0008', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000009', 'Chen Compliance', 'compliance_manager.personal@example.com', '+60-12-000-0009', NULL, NULL, NULL, NULL, NULL, '67804a42-cd37-4551-882e-d6dd30ed1734', 'agartha.corp.compliance', '2025-10-20', NULL, 'Emergency Contact 9', 'Spouse', '+60-19-000-0009', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000010', 'Olivia Ops', 'operations_manager.personal@example.com', '+60-12-000-0010', NULL, NULL, NULL, NULL, NULL, '46e5c59a-02bc-4ab2-84ad-651755719771', 'agartha.ops', '2025-10-20', NULL, 'Emergency Contact 10', 'Spouse', '+60-19-000-0010', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000012', 'Sara Service', 'service_crew.personal@example.com', '+60-12-000-0012', NULL, NULL, NULL, NULL, NULL, '76499534-049d-435c-b5fc-a7f3c1e7d12a', 'agartha.ops.experiences', '2025-10-20', NULL, 'Emergency Contact 12', 'Spouse', '+60-19-000-0012', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000013', 'Gina Giftshop', 'giftshop_crew.personal@example.com', '+60-12-000-0013', NULL, NULL, NULL, NULL, NULL, 'ad4ccaee-2bf6-4c35-962e-b6867fa91068', 'agartha.ops.giftshop', '2025-10-20', NULL, 'Emergency Contact 13', 'Spouse', '+60-19-000-0013', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000014', 'Rahim Runner', 'runner_crew.personal@example.com', '+60-12-000-0014', NULL, NULL, NULL, NULL, NULL, '3649b816-4ccf-4c2e-a9c5-c3b0a5a7a6fd', 'agartha.logistics', '2025-10-20', NULL, 'Emergency Contact 14', 'Spouse', '+60-19-000-0014', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000015', 'Siti Security', 'security_crew.personal@example.com', '+60-12-000-0015', NULL, NULL, NULL, NULL, NULL, '745acf86-c188-47d8-9c53-27c2260d55d0', 'agartha.ops.security', '2025-10-20', NULL, 'Emergency Contact 15', 'Spouse', '+60-19-000-0015', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000011', 'Faiz F&B', 'fnb_crew.personal@example.com', '+60-12-000-0011', NULL, NULL, NULL, NULL, NULL, 'e6700725-163c-41d2-849b-520e9ef879e4', 'agartha.ops.fnb', '2025-10-20', NULL, 'Emergency Contact 11', 'Spouse', '+60-19-000-0011', '2026-04-18 07:24:56.820039+00', '2026-04-24 08:09:31.263019+00', NULL, 'c0000000-0000-0000-0000-000000000008', 'b3000000-0000-0000-0000-000000000001'),
	('c1000000-0000-0000-0000-000000000016', 'Hakim Health', 'health_crew.personal@example.com', '+60-12-000-0016', NULL, NULL, NULL, NULL, NULL, '3c0d8d6f-6c20-4c0b-a546-0cc34a70e90e', 'agartha.support.health', '2025-10-20', NULL, 'Emergency Contact 16', 'Spouse', '+60-19-000-0016', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000018', 'Ethan Experience', 'experience_crew.personal@example.com', '+60-12-000-0018', NULL, NULL, NULL, NULL, NULL, '76499534-049d-435c-b5fc-a7f3c1e7d12a', 'agartha.ops.experiences', '2025-10-20', NULL, 'Emergency Contact 18', 'Spouse', '+60-19-000-0018', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('c1000000-0000-0000-0000-000000000019', 'Imran Internal', 'internal_maintenance_crew.personal@example.com', '+60-12-000-0019', NULL, NULL, NULL, NULL, NULL, '86909c30-cf71-4a2a-95c9-6a226f0b3aff', 'agartha.support.maintenance', '2025-10-20', NULL, 'Emergency Contact 19', 'Spouse', '+60-19-000-0019', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL, NULL),
	('0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', 'Esam B FnB', 'esam@agarthaworld.com', NULL, NULL, NULL, NULL, NULL, NULL, 'e6700725-163c-41d2-849b-520e9ef879e4', 'agartha.ops.fnb', '2026-04-23', NULL, NULL, NULL, NULL, '2026-04-23 04:58:20.725731+00', '2026-04-23 06:25:30.057438+00', NULL, NULL, NULL),
	('f2bb47fd-e30f-4786-984b-73ed3f67d3c7', 'esam2', 'esam2@agartha.com', NULL, NULL, NULL, NULL, NULL, NULL, '3649b816-4ccf-4c2e-a9c5-c3b0a5a7a6fd', 'agartha.logistics', '2026-04-24', NULL, NULL, NULL, NULL, '2026-04-23 09:49:09.154957+00', NULL, 'c0000000-0000-0000-0000-000000000008', NULL, NULL),
	('c1000000-0000-0000-0000-000000000002', 'Bella Business', 'business_admin.personal@example.com', '+60-12-000-0002', NULL, NULL, NULL, NULL, NULL, 'd92ee94d-9632-48b1-a85f-3c3c1019b9b4', 'agartha.corp', '2025-10-20', NULL, 'Emergency Contact 2', 'Spouse', '+60-19-000-0002', '2026-04-18 07:24:56.820039+00', '2026-04-24 05:29:21.197248+00', NULL, 'c0000000-0000-0000-0000-000000000008', 'b3000000-0000-0000-0000-000000000001'),
	('c1000000-0000-0000-0000-000000000017', 'Cindy Cleaning', 'cleaning_crew.personal@example.com', '+60-12-000-0017', NULL, NULL, NULL, NULL, NULL, 'da62bb78-e42e-46a8-8492-ec82745f213b', 'agartha.support.cleaning', '2025-10-20', NULL, 'Emergency Contact 17', 'Spouse', '+60-19-000-0017', '2026-04-18 07:24:56.820039+00', '2026-04-27 06:43:14.545553+00', NULL, 'c0000000-0000-0000-0000-000000000008', 'd4ac204c-6d02-46a0-a449-b4b656b725e5') ON CONFLICT DO NOTHING;


--
-- Data for Name: shift_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."shift_schedules" ("id", "staff_record_id", "shift_date", "shift_type_id", "expected_start_time", "expected_end_time", "is_override", "override_reason", "org_unit_path", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('e865dbf4-cdb6-4c3d-8006-173557912003', 'c1000000-0000-0000-0000-000000000001', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('4ae74bb2-85b9-4e8e-8ad6-0005d82e68f5', 'c1000000-0000-0000-0000-000000000001', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('102ac8d9-8c1a-4ca1-bcb5-685dde4c9b9c', 'c1000000-0000-0000-0000-000000000001', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('41080d00-72a5-41fe-95d8-d98d305b4b70', 'c1000000-0000-0000-0000-000000000001', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('c78f67b9-2d08-498c-a344-4bc07e1d5281', 'c1000000-0000-0000-0000-000000000002', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('81ea7613-ea3a-4a5e-be17-4942e6eb84d6', 'c1000000-0000-0000-0000-000000000002', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('f32b4b51-0b55-4ba2-a520-d31859e9014d', 'c1000000-0000-0000-0000-000000000002', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('03065bb8-e720-40d5-b63c-ce6e115b7824', 'c1000000-0000-0000-0000-000000000002', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('fb175a2d-0f0a-46dc-99d4-565863124ec2', 'c1000000-0000-0000-0000-000000000003', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('09bdcba5-48b9-4aec-a0fd-6b7fc6d09538', 'c1000000-0000-0000-0000-000000000003', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('2ea0c31e-475b-408f-8deb-cd15bc717abb', 'c1000000-0000-0000-0000-000000000003', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ae0111bd-20e7-455f-995c-c63a1c53e713', 'c1000000-0000-0000-0000-000000000003', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('606068b6-08cc-40f3-a4d0-bc313cab8f29', 'c1000000-0000-0000-0000-000000000004', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('4aa42890-241c-4cb6-8eac-dc7f9d25303a', 'c1000000-0000-0000-0000-000000000004', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('2c43ad61-b711-4128-81d0-cefb7e513c09', 'c1000000-0000-0000-0000-000000000004', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('70e94109-3c80-473c-aefc-f2bcbfcb90ab', 'c1000000-0000-0000-0000-000000000004', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('79719a8f-cea0-4da1-9afa-82c0aecfde7f', 'c1000000-0000-0000-0000-000000000005', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('4882126c-4947-43c7-9d2b-a75fdec497b7', 'c1000000-0000-0000-0000-000000000005', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('73f3606e-bf04-44b0-9f9f-0e597a4f41cf', 'c1000000-0000-0000-0000-000000000005', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('f108411a-ed83-47d6-9968-205bbf163a49', 'c1000000-0000-0000-0000-000000000005', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('d3f21472-f549-485f-ad27-fa9f9e23dc28', 'c1000000-0000-0000-0000-000000000005', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('0906bc39-bcf8-44db-b255-ea0c4135401a', 'c1000000-0000-0000-0000-000000000011', '2026-05-01', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:45:17.801706+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('a908ce75-89a0-4bfe-9c20-7d73c702a851', 'c1000000-0000-0000-0000-000000000006', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('08d54b65-37b8-416d-b415-af3896a9bca8', 'c1000000-0000-0000-0000-000000000002', '2026-04-20', 'b1000000-0000-0000-0000-000000000002', '09:00:00', '17:00:00', true, NULL, 'agartha.corp', '2026-04-18 07:24:56.820039+00', '2026-04-24 03:14:15.539856+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('933136d4-1927-4a88-b9f9-7a344d64373a', 'c1000000-0000-0000-0000-000000000003', '2026-04-20', 'b1000000-0000-0000-0000-000000000002', '09:00:00', '17:00:00', true, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', '2026-04-24 03:14:21.308711+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('668dc33e-1be4-4300-bbe1-8028d37b2869', 'c1000000-0000-0000-0000-000000000004', '2026-04-20', 'b1000000-0000-0000-0000-000000000002', '09:00:00', '17:00:00', true, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 03:14:29.384521+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('e27d5f15-d6ef-4d67-9a71-9718fcf8fbac', 'c1000000-0000-0000-0000-000000000006', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('6f28f688-9e39-416a-86e4-cd3180d34bab', 'c1000000-0000-0000-0000-000000000006', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('134a9213-0265-40f1-8d46-3074547e2f76', 'c1000000-0000-0000-0000-000000000006', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('f2f85910-d2eb-4d52-95b2-79464ed7fb76', 'c1000000-0000-0000-0000-000000000006', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('5065334c-b2da-4f23-bdf5-24d2e6912553', 'c1000000-0000-0000-0000-000000000007', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('44243b6a-0598-477c-89da-c1156338f3a8', 'c1000000-0000-0000-0000-000000000007', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('549af527-31f9-403c-8fe9-add83468b03c', 'c1000000-0000-0000-0000-000000000007', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bfabdde3-06e8-4f5d-bf55-b1a47ba7dc20', 'c1000000-0000-0000-0000-000000000007', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('83420f0b-f2e3-424a-ba2c-55b0370e8b03', 'c1000000-0000-0000-0000-000000000007', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('e5adf561-9f33-400d-8a9b-72d6a717edfc', 'c1000000-0000-0000-0000-000000000008', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.hr', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bde0271f-8cfb-45ac-9942-31625b8c2587', 'c1000000-0000-0000-0000-000000000008', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.hr', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('9184a448-abd1-4b0b-a8a6-edc072b49ab3', 'c1000000-0000-0000-0000-000000000008', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.hr', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('1cfb9263-13df-4f91-8983-1c3c69aa0c2c', 'c1000000-0000-0000-0000-000000000008', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.hr', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('0197976e-6017-4247-bafc-168e4ad41621', 'c1000000-0000-0000-0000-000000000008', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.hr', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('03c56e10-dfa8-483f-8b4a-9918e20165df', 'c1000000-0000-0000-0000-000000000009', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('494c31b3-82d9-48ac-a377-327143e676ee', 'c1000000-0000-0000-0000-000000000009', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('edd2bad4-29c8-46e5-b88b-c6aee2b3c0f7', 'c1000000-0000-0000-0000-000000000009', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('02f48c82-9f0b-4132-97bc-9530dbeba770', 'c1000000-0000-0000-0000-000000000009', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a4a86147-edd3-4380-b6e4-95a6dcaa86f6', 'c1000000-0000-0000-0000-000000000009', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('0c72f360-9fd7-415b-bb82-58a8d6e8352d', 'c1000000-0000-0000-0000-000000000010', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('d52e8eda-be3c-4245-8cdd-8814e1278929', 'c1000000-0000-0000-0000-000000000010', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('e5fe1501-9143-4ef5-bc33-4bcee8fb2300', 'c1000000-0000-0000-0000-000000000010', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('5d875e7b-86e4-4f8e-bd8d-788ca88ffa5e', 'c1000000-0000-0000-0000-000000000010', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('3637c7d8-3dc9-45af-812b-166e8df8cb16', 'c1000000-0000-0000-0000-000000000010', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('911a9395-8871-4e88-9f6a-14c54de8e9fe', 'c1000000-0000-0000-0000-000000000011', '2026-05-10', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('73362858-1a99-4a49-a477-bd15c7d6c756', 'c1000000-0000-0000-0000-000000000011', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('40e741af-a75f-4e07-b2a0-a9bf2ee8acf4', 'c1000000-0000-0000-0000-000000000011', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('4ac37f15-5945-4632-8fe5-1d8efa86c1cf', 'c1000000-0000-0000-0000-000000000011', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('e2e66012-8524-49ba-8270-ce47a4e0f78b', 'c1000000-0000-0000-0000-000000000011', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('affec4a7-841b-4c75-8815-3558beb6afcb', 'c1000000-0000-0000-0000-000000000011', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a7903ffd-d314-4d10-9cbf-145035b3cc70', 'c1000000-0000-0000-0000-000000000012', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('3216858b-fcd9-4b3e-89d8-4591b55c03dc', 'c1000000-0000-0000-0000-000000000012', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('80b01fa6-969b-427c-9ce9-de3a1cbf7a2a', 'c1000000-0000-0000-0000-000000000012', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b4ccebc4-f7d8-4a92-94e9-b3e9138f8653', 'c1000000-0000-0000-0000-000000000012', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('975d7416-906e-41b6-8e79-a561cae41ae6', 'c1000000-0000-0000-0000-000000000012', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('7a64f837-0334-4d4b-90a0-760f119144b1', 'c1000000-0000-0000-0000-000000000013', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('84f87619-990a-4663-8ebb-84579c2875ce', 'c1000000-0000-0000-0000-000000000013', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('0a630b73-10dc-44cf-8870-33c0a147a8f1', 'c1000000-0000-0000-0000-000000000013', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('78b59698-9296-44ee-ba8e-5b621ae74d42', 'c1000000-0000-0000-0000-000000000013', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('2d8d7d82-e898-4e5a-8e02-eae84e9dc274', 'c1000000-0000-0000-0000-000000000013', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('3fe8a960-01a3-4f8b-9847-9b64df435b26', 'c1000000-0000-0000-0000-000000000014', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ff880828-4c05-41d7-af71-650e564cade3', 'c1000000-0000-0000-0000-000000000014', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('6259ac79-9749-425d-916d-d1334f940f78', 'c1000000-0000-0000-0000-000000000014', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a5cf6494-7381-4a9d-abd4-747b3c9b4ccb', 'c1000000-0000-0000-0000-000000000014', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('8767e9d0-0be6-4714-86b1-33ca4e0009cd', 'c1000000-0000-0000-0000-000000000014', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('93af7eea-a029-4256-92e7-57195d094d6d', 'c1000000-0000-0000-0000-000000000015', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('4c9f9975-1bae-4d89-bebd-e7d0e6d31d72', 'c1000000-0000-0000-0000-000000000015', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('d4ea0c1a-a3c6-4503-9820-4b6198f256ef', 'c1000000-0000-0000-0000-000000000015', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('782666f0-db49-4583-9a2c-2c490cae8c37', 'c1000000-0000-0000-0000-000000000015', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('0e1e03d4-a498-4439-884a-c5ecd0316015', 'c1000000-0000-0000-0000-000000000015', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cc63bebf-acad-4b2c-95e0-718d00160c74', 'c1000000-0000-0000-0000-000000000016', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.health', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('6aa5f3f4-3e81-4045-a87b-4cde54f61325', 'c1000000-0000-0000-0000-000000000016', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.health', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('16de5490-daa4-490b-8a7e-e2aff0e990d4', 'c1000000-0000-0000-0000-000000000016', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.health', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('6f1c2d02-9640-4d1d-b940-058a6756a57a', 'c1000000-0000-0000-0000-000000000016', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.health', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('676a3b51-c245-46b4-ad8f-87c21f76865b', 'c1000000-0000-0000-0000-000000000016', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.health', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('c8dd2440-0233-446c-835b-8a80839b31b5', 'c1000000-0000-0000-0000-000000000017', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('60c9140f-0337-4b50-a0d9-1cf715a59878', 'c1000000-0000-0000-0000-000000000017', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b90e7919-30cc-4294-83e3-65607df14605', 'c1000000-0000-0000-0000-000000000017', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('65214827-a51f-474b-ab9c-ef90fa2dfc0a', 'c1000000-0000-0000-0000-000000000017', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ede9b4a3-9e32-4152-9782-e72ae5135346', 'c1000000-0000-0000-0000-000000000017', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('8577ccbb-6070-40f8-9e55-06e6f7d8255c', 'c1000000-0000-0000-0000-000000000018', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('52ce8cf0-da77-4359-a632-f9b882e774e8', 'c1000000-0000-0000-0000-000000000018', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('260f0971-649b-4588-9a27-80f5383926d6', 'c1000000-0000-0000-0000-000000000018', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('888a1a94-c107-4167-a3e2-9f78295a129c', 'c1000000-0000-0000-0000-000000000018', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('dcdd0664-8cef-46d0-95a5-ab29a278d43e', 'c1000000-0000-0000-0000-000000000018', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('6038b3ef-a3c3-4198-a26a-854ddbaa6686', 'c1000000-0000-0000-0000-000000000019', '2026-04-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('89db2425-885f-47bf-8e60-1e2d424f4b25', 'c1000000-0000-0000-0000-000000000019', '2026-04-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('f77bd0c4-07db-4ab1-9055-9302a4bc18c9', 'c1000000-0000-0000-0000-000000000019', '2026-04-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('06a28644-801b-41a7-adab-a7be310cf44c', 'c1000000-0000-0000-0000-000000000019', '2026-04-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('1be30e8d-4b17-4d28-98c8-a7fd01cd3394', 'c1000000-0000-0000-0000-000000000019', '2026-04-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('d52c8d04-f490-4f6e-9961-2dc23a4ff9c1', 'c1000000-0000-0000-0000-000000000001', '2026-04-20', 'b1000000-0000-0000-0000-000000000003', '09:00:00', '17:00:00', true, NULL, 'agartha.corp.it', '2026-04-18 07:24:56.820039+00', '2026-04-24 02:41:54.029303+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('da1c69b9-2e63-4d9b-8d61-df0aecc3fb4e', 'c1000000-0000-0000-0000-000000000011', '2026-04-25', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('dd4ac86f-d626-4bf9-9faa-2ab4c2dfaba6', 'c1000000-0000-0000-0000-000000000011', '2026-04-26', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('b084c052-3316-4de1-9179-b9058de276c1', 'c1000000-0000-0000-0000-000000000011', '2026-04-27', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('bb52c07d-3e59-4f37-9cc0-0104b9c265e5', 'c1000000-0000-0000-0000-000000000011', '2026-05-02', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('8168a22a-a2fa-4591-8b2e-14f39ffbb41b', 'c1000000-0000-0000-0000-000000000011', '2026-05-03', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('78867429-0aca-4dc6-8097-55798d85e297', 'c1000000-0000-0000-0000-000000000011', '2026-05-04', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('e8cc5e8e-6292-437a-9d7e-7400950bb457', 'c1000000-0000-0000-0000-000000000011', '2026-05-05', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('468d7de7-f196-41f1-8789-c31e7e33ce17', 'c1000000-0000-0000-0000-000000000011', '2026-05-06', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f8e033d5-8536-4b11-b4a4-59e2c12f9ed1', 'c1000000-0000-0000-0000-000000000011', '2026-05-11', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('90c1cb15-eda0-436c-bf6b-f970791c0263', 'c1000000-0000-0000-0000-000000000011', '2026-05-12', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('a0f04210-2410-4679-909c-d2e514ba5b44', 'c1000000-0000-0000-0000-000000000011', '2026-05-13', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('631c8677-b70f-4ae2-9d5a-97f1768ae95d', 'c1000000-0000-0000-0000-000000000011', '2026-05-14', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('2ba8b785-65b1-4763-b4ac-012f21a6f5c6', 'c1000000-0000-0000-0000-000000000011', '2026-05-15', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b111e6f5-6826-4b9d-bf06-a5c65ec62eef', 'c1000000-0000-0000-0000-000000000011', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('939e046d-ec64-4d79-b9db-761733ee0359', 'c1000000-0000-0000-0000-000000000011', '2026-05-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('126a60e6-005a-4de7-9e5b-4af31aa097ee', 'c1000000-0000-0000-0000-000000000011', '2026-05-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('301d90f3-72ae-4fb4-b06b-57e2925bdbde', 'c1000000-0000-0000-0000-000000000011', '2026-05-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('8cf6c4f5-c91a-4589-9228-c62261583d16', 'c1000000-0000-0000-0000-000000000011', '2026-05-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('de84c923-fe24-4e57-8404-199fae939383', 'c1000000-0000-0000-0000-000000000011', '2026-05-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('44885958-0b43-4165-b051-b7561c8010e0', 'c1000000-0000-0000-0000-000000000001', '2026-04-25', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('81b7d66c-1c2a-4040-9823-2c1e862fbed4', 'c1000000-0000-0000-0000-000000000001', '2026-04-26', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('0c741566-8bd8-49b2-9299-6f72db73a38b', 'c1000000-0000-0000-0000-000000000001', '2026-04-27', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('042659e3-7d1b-41bf-aeb4-8dd50bf72f3e', 'c1000000-0000-0000-0000-000000000001', '2026-05-01', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 03:45:17.801706+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('cd18adf5-dc92-4776-b38a-3f711c72f8ee', 'c1000000-0000-0000-0000-000000000001', '2026-05-02', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('19768769-ddda-4d6c-ad81-59dc25db1d71', 'c1000000-0000-0000-0000-000000000001', '2026-05-03', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('62cbb0b8-9827-42c5-970f-f17832f4d20f', 'c1000000-0000-0000-0000-000000000001', '2026-05-04', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('718c17d8-f055-489a-a9d1-5eb967e706fa', 'c1000000-0000-0000-0000-000000000001', '2026-05-05', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('d19075b6-f4df-4780-83d8-2cad3048af4c', 'c1000000-0000-0000-0000-000000000001', '2026-05-06', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('9b8c0400-f6c0-48bf-a4b4-d8ec23eb846b', 'c1000000-0000-0000-0000-000000000001', '2026-05-10', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('ac1e5f93-9777-43f5-bb04-74c813695db0', 'c1000000-0000-0000-0000-000000000001', '2026-05-11', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('a7ca4bff-32e1-4b76-9da2-66da1d1591af', 'c1000000-0000-0000-0000-000000000001', '2026-05-12', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('8fb78971-2bc1-4c5c-a5ec-6da62620048e', 'c1000000-0000-0000-0000-000000000001', '2026-05-13', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3520b6ab-371e-4d51-8a1e-283bcf94af3a', 'c1000000-0000-0000-0000-000000000001', '2026-05-14', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('ddd0a96f-f2d1-48f2-9691-a0f16382eeae', 'c1000000-0000-0000-0000-000000000001', '2026-05-15', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('c33b6e2f-7862-4371-bcc8-a4bd1465d933', 'c1000000-0000-0000-0000-000000000001', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('9db0d821-32b8-4c95-b8f9-e0f4992ae5ce', 'c1000000-0000-0000-0000-000000000001', '2026-05-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('29cc4437-48c4-4c86-bb49-53edd577a452', 'c1000000-0000-0000-0000-000000000001', '2026-05-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('fd00bdfd-5e1b-41a9-86c3-7fcb1109347d', 'c1000000-0000-0000-0000-000000000001', '2026-05-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('c8cde25e-3221-46ab-83d9-6caecb63d1af', 'c1000000-0000-0000-0000-000000000001', '2026-05-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('bcfb4740-f1e2-44f3-8503-30b62b9aeda8', 'c1000000-0000-0000-0000-000000000001', '2026-05-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.it', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3fe16615-72a9-40a9-87b1-0c1cdf4328e5', 'c1000000-0000-0000-0000-000000000002', '2026-04-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('98d33c0b-6d68-47c1-bf8d-a0c735f01d59', 'c1000000-0000-0000-0000-000000000002', '2026-04-27', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('de51b870-a078-4bf9-a9ac-b3330b3c2dff', 'c1000000-0000-0000-0000-000000000002', '2026-04-28', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('14ab49bf-d811-4b02-b0a9-553d537fad08', 'c1000000-0000-0000-0000-000000000002', '2026-04-29', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('d50c0eef-9d35-4258-a622-1ea1ac53b5b0', 'c1000000-0000-0000-0000-000000000002', '2026-04-30', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('18fb953c-d39b-4c78-b3f4-732bcbd848ec', 'c1000000-0000-0000-0000-000000000002', '2026-05-02', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('3ebd20f3-e53c-4b11-9328-86e10f3f7036', 'c1000000-0000-0000-0000-000000000002', '2026-05-04', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('ecdc6fd7-4e6c-48ac-b581-130260b4fc83', 'c1000000-0000-0000-0000-000000000002', '2026-05-05', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('91dcb2c0-4326-4d1a-b643-e02f5f44e2e5', 'c1000000-0000-0000-0000-000000000002', '2026-05-06', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('17cdcbf7-b7f4-4ef0-b3f1-ef6c5388fd74', 'c1000000-0000-0000-0000-000000000002', '2026-05-07', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('c6e819b4-9484-469e-bea4-c77ea287f8af', 'c1000000-0000-0000-0000-000000000002', '2026-05-09', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('afaad514-583b-4b66-93b8-9c15141cae5b', 'c1000000-0000-0000-0000-000000000002', '2026-05-11', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b7aeb27e-244b-4f2d-98b4-37f77ef17c7b', 'c1000000-0000-0000-0000-000000000002', '2026-05-12', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('0fd456fa-95c6-436b-881c-bf5caa10bf81', 'c1000000-0000-0000-0000-000000000002', '2026-05-13', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('e77e45ec-3683-4306-bdc6-f21be2a53b3a', 'c1000000-0000-0000-0000-000000000002', '2026-05-14', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b9a3f72a-3478-48a0-a004-71dce3ce86fa', 'c1000000-0000-0000-0000-000000000002', '2026-05-16', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('77ab59c0-a496-4494-838c-e1069a671c69', 'c1000000-0000-0000-0000-000000000002', '2026-05-18', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f4127252-da08-4e81-95c7-dd0671a9affa', 'c1000000-0000-0000-0000-000000000002', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('d416016e-f82a-409d-b581-72f6de969b99', 'c1000000-0000-0000-0000-000000000002', '2026-05-20', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('59f34b08-e359-4f69-82a6-c9d88e515186', 'c1000000-0000-0000-0000-000000000002', '2026-05-21', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('8e4c18b1-1a34-4013-85bd-a9cf5baed532', 'c1000000-0000-0000-0000-000000000002', '2026-05-23', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('5eb5c747-0504-4932-a920-c62c03cd7bd1', 'c1000000-0000-0000-0000-000000000002', '2026-05-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('bc398847-98a1-4cc2-8663-77333c3ec82f', 'c1000000-0000-0000-0000-000000000003', '2026-04-25', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('17d33108-7678-42e9-8750-5fbc9f41660e', 'c1000000-0000-0000-0000-000000000003', '2026-04-26', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('b2079df3-74db-4b73-9e51-a936bfacfd18', 'c1000000-0000-0000-0000-000000000003', '2026-04-27', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('cebe2e94-6b1e-4f95-bd42-a42d482a340a', 'c1000000-0000-0000-0000-000000000003', '2026-05-01', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:45:17.801706+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('a88690ad-dc8f-45c2-85a4-849e7fc06d33', 'c1000000-0000-0000-0000-000000000003', '2026-05-02', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('bdd55e3d-ebde-4e30-a971-a7f142bbb79e', 'c1000000-0000-0000-0000-000000000003', '2026-05-03', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('3cee4a1d-4d73-4baf-8f7f-44648ffe5e0b', 'c1000000-0000-0000-0000-000000000003', '2026-05-04', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('e7b410d3-6249-4c80-81b8-cfe6315a5213', 'c1000000-0000-0000-0000-000000000003', '2026-05-05', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('3503a485-44a3-4940-b43c-6e6347ac79ed', 'c1000000-0000-0000-0000-000000000003', '2026-05-06', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('74013dd0-ce0f-4e7e-9550-7a912056ce43', 'c1000000-0000-0000-0000-000000000003', '2026-05-10', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('afe6b33f-090d-4fe4-849e-8e257a425109', 'c1000000-0000-0000-0000-000000000003', '2026-05-11', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('a1be3131-a00b-498b-bc13-87404af30e6e', 'c1000000-0000-0000-0000-000000000003', '2026-05-12', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('0492b485-cb65-4296-a979-10f8862cf478', 'c1000000-0000-0000-0000-000000000003', '2026-05-13', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('0cb30619-6d45-4771-9f4f-3722d25f07d2', 'c1000000-0000-0000-0000-000000000003', '2026-05-14', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f28c74ec-432f-4247-9030-dbaada9fdb77', 'c1000000-0000-0000-0000-000000000003', '2026-05-15', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('a4df5a73-cf29-45c4-af85-e1f3730f4223', 'c1000000-0000-0000-0000-000000000003', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('868e3daa-ee40-4169-9c6c-592d2d423337', 'c1000000-0000-0000-0000-000000000003', '2026-05-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('ab077441-0d7b-4786-aefb-bb1bb758f8ad', 'c1000000-0000-0000-0000-000000000003', '2026-05-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('e328ffee-bbae-4ed3-b506-d4e1cb35f0c0', 'c1000000-0000-0000-0000-000000000003', '2026-05-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3f678d96-e705-41d6-ad54-f435aebe4d51', 'c1000000-0000-0000-0000-000000000003', '2026-05-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('478f6332-c09c-485b-9eec-814634b5dae7', 'c1000000-0000-0000-0000-000000000003', '2026-05-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.fnb', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3eba25c7-0396-41da-ac5a-f0611726c76f', 'c1000000-0000-0000-0000-000000000004', '2026-04-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('32e2f9d1-9a3d-4a37-91af-d1cb384f0708', 'c1000000-0000-0000-0000-000000000004', '2026-04-27', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('2cd49c93-e419-457e-a7e5-5d0564cd8ebf', 'c1000000-0000-0000-0000-000000000004', '2026-04-28', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('2bf1ac8e-db01-433b-b87b-1c7ebbb16047', 'c1000000-0000-0000-0000-000000000004', '2026-04-29', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('3ae561f8-9834-4535-8387-a7bffb94a8dc', 'c1000000-0000-0000-0000-000000000004', '2026-04-30', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('e834f2e7-e792-4f71-ab8f-f67fc7782cfc', 'c1000000-0000-0000-0000-000000000004', '2026-05-02', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('9b44e368-952c-458b-be88-adc889c015d3', 'c1000000-0000-0000-0000-000000000004', '2026-05-04', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('0aee442c-13de-43ea-844c-50fbc0b893ae', 'c1000000-0000-0000-0000-000000000004', '2026-05-05', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('425248bf-ac6f-4580-86bf-ec88177b02ef', 'c1000000-0000-0000-0000-000000000004', '2026-05-06', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('06d0b4c2-ba0d-4221-93f4-999351bc87e1', 'c1000000-0000-0000-0000-000000000004', '2026-05-07', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('911e2105-6295-46c0-991a-ffe219bfaa73', 'c1000000-0000-0000-0000-000000000004', '2026-05-09', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('65a59b57-b91f-4bf1-ae43-f75904dcc66b', 'c1000000-0000-0000-0000-000000000004', '2026-05-11', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('20a0ee68-89f9-4c51-ae27-e5508e4d32ed', 'c1000000-0000-0000-0000-000000000004', '2026-05-12', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('048120c7-69f6-465e-b6c3-8c56aafc9180', 'c1000000-0000-0000-0000-000000000004', '2026-05-13', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('d210f2d4-63a2-410d-8d3c-33ccabd2be58', 'c1000000-0000-0000-0000-000000000004', '2026-05-14', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3167d3b2-6c14-46b6-a8a1-6cf37822ccf6', 'c1000000-0000-0000-0000-000000000004', '2026-05-16', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('68df07a7-5ad6-4989-a6c8-a19090e533cf', 'c1000000-0000-0000-0000-000000000004', '2026-05-18', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('56c99e11-3644-4d2e-b4c3-cffcc767b698', 'c1000000-0000-0000-0000-000000000004', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3b85616e-b754-463a-85dd-bbce490ad09b', 'c1000000-0000-0000-0000-000000000004', '2026-05-20', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('60271f2e-b5af-400d-8c9d-171312a9fb90', 'c1000000-0000-0000-0000-000000000004', '2026-05-21', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('e0b640a9-7429-4e6b-91dc-0be34bae6f11', 'c1000000-0000-0000-0000-000000000004', '2026-05-23', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('dab82055-0cc0-4c17-afda-ccad63c1598d', 'c1000000-0000-0000-0000-000000000004', '2026-05-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('26243b02-0ea1-4d80-a80b-4dde173784af', 'c1000000-0000-0000-0000-000000000005', '2026-04-25', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('818900c3-515e-485f-b00c-e9b41943e431', 'c1000000-0000-0000-0000-000000000005', '2026-04-26', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('14b048e2-9593-4e4f-ad2c-d8790d1b0f60', 'c1000000-0000-0000-0000-000000000005', '2026-04-27', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('66a8d98a-af1c-4692-a945-2752a182fcdb', 'c1000000-0000-0000-0000-000000000005', '2026-05-01', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:45:17.801706+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('7368feac-d634-4d2d-a5ca-6d1d2869f4b0', 'c1000000-0000-0000-0000-000000000005', '2026-05-02', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('621f3f13-93e1-490e-b2cc-ed7e1b085b22', 'c1000000-0000-0000-0000-000000000005', '2026-05-03', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('679f9b49-818b-4c73-93a6-93afe33cf43c', 'c1000000-0000-0000-0000-000000000005', '2026-05-04', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('0ecfeeca-5737-4821-a50b-c2ce3731b5c6', 'c1000000-0000-0000-0000-000000000005', '2026-05-05', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('42159e4d-51b5-4d89-8919-e70e97bcfb12', 'c1000000-0000-0000-0000-000000000005', '2026-05-06', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('470193b8-5eb0-45ad-8361-686b9f5b334b', 'c1000000-0000-0000-0000-000000000005', '2026-05-10', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('7866f6b9-1902-4796-9c3d-8ec4fd3f3191', 'c1000000-0000-0000-0000-000000000005', '2026-05-11', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('98766a08-59bd-4fc5-8b0b-e4847da2d95f', 'c1000000-0000-0000-0000-000000000005', '2026-05-12', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('35988141-67a1-45a7-bd06-e168835cd504', 'c1000000-0000-0000-0000-000000000005', '2026-05-13', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('22a7fa98-f949-469e-bbef-345ae6021ffe', 'c1000000-0000-0000-0000-000000000005', '2026-05-14', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('21e8e70d-3f48-47a0-8cfe-cb5c8061bda9', 'c1000000-0000-0000-0000-000000000005', '2026-05-15', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('9bde3265-3aaa-4672-8a22-65461d088f19', 'c1000000-0000-0000-0000-000000000005', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('c8b49118-e5d5-49c4-af51-9acc0ee5d556', 'c1000000-0000-0000-0000-000000000005', '2026-05-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('087de3c3-79fb-4781-b463-b35d341a25a7', 'c1000000-0000-0000-0000-000000000005', '2026-05-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b3d49624-db99-4f05-ad51-a47841c19bcc', 'c1000000-0000-0000-0000-000000000005', '2026-05-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3e3c7678-4fda-41b7-880e-91ef42815424', 'c1000000-0000-0000-0000-000000000005', '2026-05-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('a83f6618-234b-4aa8-9730-12009e505a4a', 'c1000000-0000-0000-0000-000000000005', '2026-05-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('ecacd726-c867-4db3-8032-fe13b80dfc52', 'c1000000-0000-0000-0000-000000000006', '2026-04-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('05372b60-3075-4feb-8067-6e260eb18188', 'c1000000-0000-0000-0000-000000000006', '2026-04-27', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('6a80b124-a44a-4b25-9307-f1cee3f80b1c', 'c1000000-0000-0000-0000-000000000006', '2026-04-28', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('e49b8d44-a20c-45fa-9029-20300b37f6f5', 'c1000000-0000-0000-0000-000000000006', '2026-04-29', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('89ce2f69-d53d-4d56-9ca6-97cac971c6f2', 'c1000000-0000-0000-0000-000000000006', '2026-04-30', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('14ca176d-4f37-4a9e-86b2-48d19ef7e5df', 'c1000000-0000-0000-0000-000000000006', '2026-05-02', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('b25df65f-36d7-40f2-a40a-7ddf467d0232', 'c1000000-0000-0000-0000-000000000006', '2026-05-04', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('cf4cbcfa-9f3a-4b8b-b05c-32d3134dc698', 'c1000000-0000-0000-0000-000000000006', '2026-05-05', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('dd403bb1-69e3-490a-bdc5-375feb871985', 'c1000000-0000-0000-0000-000000000006', '2026-05-06', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('5baa2032-1b8f-4a87-b302-79bd263608e0', 'c1000000-0000-0000-0000-000000000006', '2026-05-07', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('5541eac2-2ead-40de-b995-f5048dce32ed', 'c1000000-0000-0000-0000-000000000006', '2026-05-09', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('c766fb43-061d-4422-a6e0-eff222cc2286', 'c1000000-0000-0000-0000-000000000006', '2026-05-11', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('85ee519b-d145-4560-81fc-20973482e121', 'c1000000-0000-0000-0000-000000000006', '2026-05-12', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('d6b93455-2a10-48a7-8bdf-52455facf8c1', 'c1000000-0000-0000-0000-000000000006', '2026-05-13', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('813c1d35-4aa5-4244-8343-912265105804', 'c1000000-0000-0000-0000-000000000006', '2026-05-14', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('dba1a1e7-46c6-4b0b-956e-3b44990773e9', 'c1000000-0000-0000-0000-000000000006', '2026-05-16', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('467d0e69-b211-4a87-ade5-f75d847ba87a', 'c1000000-0000-0000-0000-000000000006', '2026-05-18', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('4c593394-7b89-4a61-8acb-3782c886539f', 'c1000000-0000-0000-0000-000000000006', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('4d26628e-6cab-424d-ab99-f5251e422660', 'c1000000-0000-0000-0000-000000000006', '2026-05-20', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('6a3b821f-c7db-42b6-bf77-02aaca209696', 'c1000000-0000-0000-0000-000000000006', '2026-05-21', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('c553700e-7698-43c4-b73e-95782ca35163', 'c1000000-0000-0000-0000-000000000006', '2026-05-23', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('c14687be-4180-4224-973a-021b5fc4202c', 'c1000000-0000-0000-0000-000000000006', '2026-05-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b2edc83a-663b-469a-8334-995e8ecb1255', 'c1000000-0000-0000-0000-000000000007', '2026-04-25', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('c5b19d2e-4dfa-480f-bf2b-3d3209e0ed56', 'c1000000-0000-0000-0000-000000000007', '2026-04-26', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('ae7fca59-6566-47e7-8ce5-db2d381f18fa', 'c1000000-0000-0000-0000-000000000007', '2026-04-27', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f443b9fc-6b5a-4306-8b2c-4309c97c7abf', 'c1000000-0000-0000-0000-000000000007', '2026-05-01', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 03:45:17.801706+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('eae0ed27-66b5-4acc-8e37-1e2bd525106f', 'c1000000-0000-0000-0000-000000000007', '2026-05-02', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('59c2e668-8994-49ae-8979-14946f83f8f1', 'c1000000-0000-0000-0000-000000000007', '2026-05-03', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f9a1550f-e6b3-46e1-b7c8-e21d13b4876c', 'c1000000-0000-0000-0000-000000000007', '2026-05-04', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('d80ee083-c142-420a-9d13-6cbd6a18ba1d', 'c1000000-0000-0000-0000-000000000007', '2026-05-05', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f86bc74a-473b-4636-a462-08845bb3214e', 'c1000000-0000-0000-0000-000000000007', '2026-05-06', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('fbfa60dc-95f0-40e0-ab31-5b4928128d1d', 'c1000000-0000-0000-0000-000000000007', '2026-05-10', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('8f6d8b9b-ba71-48ae-9943-927793a04298', 'c1000000-0000-0000-0000-000000000007', '2026-05-11', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('abb58e77-3023-42e2-a6c0-545c8a643651', 'c1000000-0000-0000-0000-000000000007', '2026-05-12', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('bb176d77-b72c-4a3d-b86a-0507e637a5f1', 'c1000000-0000-0000-0000-000000000007', '2026-05-13', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('979a312f-f5e2-4fc8-a536-143ca3c53862', 'c1000000-0000-0000-0000-000000000007', '2026-05-14', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b2ae7460-21fb-480d-8e2f-d56104eb6a36', 'c1000000-0000-0000-0000-000000000007', '2026-05-15', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('9df4cff5-c91c-4dba-ba51-115909c0e395', 'c1000000-0000-0000-0000-000000000007', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b3074e1e-5f95-4c23-9252-1a23010aa8bf', 'c1000000-0000-0000-0000-000000000007', '2026-05-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('ae3abe58-ed6c-4d9c-8fbb-83605b67fa1e', 'c1000000-0000-0000-0000-000000000007', '2026-05-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('52c610f5-b21c-4909-bfe9-eec2d5bc697b', 'c1000000-0000-0000-0000-000000000007', '2026-05-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('352d3632-aab5-4b9a-8772-c5a01c9bc0d9', 'c1000000-0000-0000-0000-000000000007', '2026-05-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f63576fe-b3c4-45ff-b6e0-2c452bc214f2', 'c1000000-0000-0000-0000-000000000007', '2026-05-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.marketing', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('88448ba8-7915-49ed-a3e4-7b82ec57aafc', 'c1000000-0000-0000-0000-000000000008', '2026-04-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('33d9eb01-1975-43e4-8d58-4d516f8577ed', 'c1000000-0000-0000-0000-000000000008', '2026-04-27', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('0b4c7677-8acc-4d5b-ae97-3590f00c1e2b', 'c1000000-0000-0000-0000-000000000008', '2026-04-28', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('2c6a6b3c-ce99-40c9-a7ac-5fa2394d8802', 'c1000000-0000-0000-0000-000000000008', '2026-04-29', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('c3d1bdb7-a049-4007-8c38-2c6eb8fe50eb', 'c1000000-0000-0000-0000-000000000008', '2026-04-30', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('9cd57236-2607-4786-9d6e-d7591196b77a', 'c1000000-0000-0000-0000-000000000008', '2026-05-02', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('3fa995e1-927c-41d9-8def-33bb34a1fed6', 'c1000000-0000-0000-0000-000000000008', '2026-05-04', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('fc24ae04-de53-4f10-8ace-3c92e5543825', 'c1000000-0000-0000-0000-000000000008', '2026-05-05', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('77a1d9d1-105d-472d-bdc2-0842b1f01e9f', 'c1000000-0000-0000-0000-000000000008', '2026-05-06', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('569acf72-8fca-4ce9-8438-ef9616c16393', 'c1000000-0000-0000-0000-000000000008', '2026-05-07', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f09dae1a-7d76-46f0-9f5c-554bd2f494ad', 'c1000000-0000-0000-0000-000000000008', '2026-05-09', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('28ab76e5-667b-4ffa-8a4c-d1d9e9f977ab', 'c1000000-0000-0000-0000-000000000008', '2026-05-11', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('597b358d-0fc5-4d2b-b87f-15a89c569c51', 'c1000000-0000-0000-0000-000000000008', '2026-05-12', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('2cb676ef-7e53-49c2-bb73-5f5c73ba738b', 'c1000000-0000-0000-0000-000000000008', '2026-05-13', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('c4f73650-4f79-41ba-a98b-157d8dec6a6b', 'c1000000-0000-0000-0000-000000000008', '2026-05-14', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('cb95737a-2579-4ed6-a052-b90d1099ed1e', 'c1000000-0000-0000-0000-000000000008', '2026-05-16', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('781fad09-4cb2-4641-986f-07548842494a', 'c1000000-0000-0000-0000-000000000008', '2026-05-18', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('4d56c936-8746-44b1-8ec3-fa41bf7cfbe3', 'c1000000-0000-0000-0000-000000000008', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('2392029a-71fe-49cd-8358-371fffc2b268', 'c1000000-0000-0000-0000-000000000008', '2026-05-20', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('97d6ca72-c218-4659-a58c-c418626f707b', 'c1000000-0000-0000-0000-000000000008', '2026-05-21', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('28d6071a-fb93-42f5-b1f0-4b9036fa45ca', 'c1000000-0000-0000-0000-000000000008', '2026-05-23', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f31b7857-f283-483e-9fab-5e9e71d46873', 'c1000000-0000-0000-0000-000000000008', '2026-05-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.hr', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('6ecb7153-9a02-40ca-a079-99491492656f', 'c1000000-0000-0000-0000-000000000009', '2026-04-25', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('c5f2d702-189a-4f27-b7e8-40af663554b7', 'c1000000-0000-0000-0000-000000000009', '2026-04-26', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('5a49933e-3273-4391-8e6d-5150f8cab9a8', 'c1000000-0000-0000-0000-000000000009', '2026-04-27', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f2c9a525-a395-4fe9-9c49-93a6fd1eeb60', 'c1000000-0000-0000-0000-000000000009', '2026-05-01', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 03:45:17.801706+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('cae79e91-82d8-4f50-9918-b00b277c4df9', 'c1000000-0000-0000-0000-000000000009', '2026-05-02', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('5c9cb9a6-8def-4337-b8b2-e53a8e131503', 'c1000000-0000-0000-0000-000000000009', '2026-05-03', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('c6d86ac2-b93b-4a06-9aa7-2d162b70a8c4', 'c1000000-0000-0000-0000-000000000009', '2026-05-04', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('9578cd8d-2add-4ff3-b22e-71ad5dfef0cd', 'c1000000-0000-0000-0000-000000000009', '2026-05-05', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('4aca496e-26b7-4c07-95b5-84adbfd97dd6', 'c1000000-0000-0000-0000-000000000009', '2026-05-06', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('6b7f90af-5fbf-42f8-837c-d146a971cb0e', 'c1000000-0000-0000-0000-000000000009', '2026-05-10', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('992f1aaf-15c6-4aa8-a735-b6d201f7403c', 'c1000000-0000-0000-0000-000000000009', '2026-05-11', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('1185269d-6726-4718-b09b-5704c5f6dd98', 'c1000000-0000-0000-0000-000000000009', '2026-05-12', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('6da9e01a-3033-4772-9b74-8d8ea8b482a9', 'c1000000-0000-0000-0000-000000000009', '2026-05-13', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('51f65f8e-1bfb-4dc9-8e26-8fe5c04a0a3a', 'c1000000-0000-0000-0000-000000000009', '2026-05-14', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('ee0da3bd-de01-4048-ba1f-66a7065b822d', 'c1000000-0000-0000-0000-000000000009', '2026-05-15', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('60ef7532-4f16-4105-8c20-85e1c9126cfe', 'c1000000-0000-0000-0000-000000000009', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('326f01d4-3893-4d03-910d-ecaffd3237ee', 'c1000000-0000-0000-0000-000000000009', '2026-05-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('7e620b6e-f6d6-403f-b551-1710b8214e71', 'c1000000-0000-0000-0000-000000000009', '2026-05-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f81a152e-eaf2-41e9-9622-0d165aff8c19', 'c1000000-0000-0000-0000-000000000009', '2026-05-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b510dd1b-34ea-4504-b5d1-762ff4a2509a', 'c1000000-0000-0000-0000-000000000009', '2026-05-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3ef68afb-954c-4a90-a348-3fb46a616ad6', 'c1000000-0000-0000-0000-000000000009', '2026-05-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.corp.compliance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('595e1eae-d477-42fa-869d-7ddaa7f8d92d', 'c1000000-0000-0000-0000-000000000010', '2026-04-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f29735ca-621b-4d24-bcc6-41747ce6a470', 'c1000000-0000-0000-0000-000000000010', '2026-04-27', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('9594031d-2e26-4ee6-ab92-72f3bab33b38', 'c1000000-0000-0000-0000-000000000010', '2026-04-28', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('8ccef8eb-5139-4a4c-8453-8dab5adc9bae', 'c1000000-0000-0000-0000-000000000010', '2026-04-29', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('d43ca2d3-2f72-425b-8046-efaf6916aaa5', 'c1000000-0000-0000-0000-000000000010', '2026-04-30', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f6dd045a-eb14-42b3-859c-713ec522505c', 'c1000000-0000-0000-0000-000000000010', '2026-05-02', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('ba7ecb38-65c5-4cba-a9b0-59bc732fff09', 'c1000000-0000-0000-0000-000000000010', '2026-05-04', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('e07aadbd-9cc4-464d-8a49-63b941f6c83e', 'c1000000-0000-0000-0000-000000000010', '2026-05-05', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('db20fc6a-7680-46e0-9195-f145a95934dd', 'c1000000-0000-0000-0000-000000000010', '2026-05-06', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('2aeeb749-a84d-4186-8fa7-5b89bc5e121c', 'c1000000-0000-0000-0000-000000000010', '2026-05-07', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('d0fdf83f-5204-4170-9b50-219a2e73c702', 'c1000000-0000-0000-0000-000000000010', '2026-05-09', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('6cd45763-68b6-4011-8fc0-7e9712a9bf37', 'c1000000-0000-0000-0000-000000000010', '2026-05-11', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('ade4d1b0-77b1-4a2b-8354-4575d4efc33b', 'c1000000-0000-0000-0000-000000000010', '2026-05-12', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('91ae9c34-1af7-4801-bd02-aff4ccade419', 'c1000000-0000-0000-0000-000000000010', '2026-05-13', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f64d7f9f-05ee-45aa-9c91-48e313882bc6', 'c1000000-0000-0000-0000-000000000010', '2026-05-14', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('8dcd6402-2608-4272-b6cc-ec4dc002433a', 'c1000000-0000-0000-0000-000000000010', '2026-05-16', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('54e6c3b9-af3a-4b05-b575-323b2be251b8', 'c1000000-0000-0000-0000-000000000010', '2026-05-18', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('80b1d068-29c1-40de-b82b-4afb7f20d4a6', 'c1000000-0000-0000-0000-000000000010', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('a27362b8-2347-4c80-a381-30122d4c28a0', 'c1000000-0000-0000-0000-000000000010', '2026-05-20', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('e95f78ba-f319-4d0c-b186-ba38d5c49c2f', 'c1000000-0000-0000-0000-000000000010', '2026-05-21', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('77161e6d-f8e4-4527-b480-9a3de5ab2bac', 'c1000000-0000-0000-0000-000000000010', '2026-05-23', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f2136456-d6cf-4970-913a-1bf4c5dc6460', 'c1000000-0000-0000-0000-000000000010', '2026-05-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('06a89e27-210a-4e54-b8c7-bd8ba0333113', 'c1000000-0000-0000-0000-000000000012', '2026-04-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('4964dd55-361d-4671-af92-76315c7a7c1b', 'c1000000-0000-0000-0000-000000000012', '2026-04-27', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('80c12d42-8484-4d68-a277-7113d02bd072', 'c1000000-0000-0000-0000-000000000012', '2026-04-28', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('38f204e5-c97a-414e-b99d-c98b8a9dd798', 'c1000000-0000-0000-0000-000000000012', '2026-04-29', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f5bfde4d-6d33-4845-a391-dd8bd9853a0f', 'c1000000-0000-0000-0000-000000000012', '2026-04-30', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('597639e7-a3a2-4d32-afa8-38689918f29a', 'c1000000-0000-0000-0000-000000000012', '2026-05-02', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('30f2bc80-d31a-4da5-a5c7-f0257bc00bab', 'c1000000-0000-0000-0000-000000000012', '2026-05-04', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('798dd762-8d8d-4ccd-abd3-77309d4805ad', 'c1000000-0000-0000-0000-000000000012', '2026-05-05', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('af5849ce-150c-482f-a472-b4fec7cedbf2', 'c1000000-0000-0000-0000-000000000012', '2026-05-06', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('7d82cb86-2f38-42ba-b26f-331aa855d6d3', 'c1000000-0000-0000-0000-000000000012', '2026-05-07', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('a6f8f594-1b4a-45b1-9b7f-7b6043c7f836', 'c1000000-0000-0000-0000-000000000012', '2026-05-09', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('0918468b-eade-41c1-bf7c-01559fa91a19', 'c1000000-0000-0000-0000-000000000012', '2026-05-11', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('4d54a2ba-1475-4c92-858f-157cdfba933b', 'c1000000-0000-0000-0000-000000000012', '2026-05-12', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('de56c4ec-f1fe-4091-aa74-d9a3bb46fd7d', 'c1000000-0000-0000-0000-000000000012', '2026-05-13', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('93e49f05-5176-44a4-a135-f17b8e5059ba', 'c1000000-0000-0000-0000-000000000012', '2026-05-14', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f7536b62-ae49-417e-9a96-ccf14ccfe631', 'c1000000-0000-0000-0000-000000000012', '2026-05-16', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('13d4a708-330c-42dc-bbdc-46e12add02ee', 'c1000000-0000-0000-0000-000000000012', '2026-05-18', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('4e102fe1-76e4-4e48-8f32-2c882f9c738f', 'c1000000-0000-0000-0000-000000000012', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('fb9d2475-3a95-4388-a03d-b96e28efaeab', 'c1000000-0000-0000-0000-000000000012', '2026-05-20', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('1cd1eb25-6561-4df6-b4fc-09d10b556d8b', 'c1000000-0000-0000-0000-000000000012', '2026-05-21', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('8a7c680d-38d7-4f54-9c8f-ad3e35396bf7', 'c1000000-0000-0000-0000-000000000012', '2026-05-23', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('2cc62b35-300a-4eb8-a96c-186d2ef6c110', 'c1000000-0000-0000-0000-000000000012', '2026-05-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('e00257c7-fc64-4506-87f0-4f87f6fbccf9', 'c1000000-0000-0000-0000-000000000013', '2026-04-25', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('8670122d-5138-41d3-8a99-ea7075bbc024', 'c1000000-0000-0000-0000-000000000013', '2026-04-26', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('ccde50f1-bd12-4567-8cef-e803ade1e271', 'c1000000-0000-0000-0000-000000000013', '2026-04-27', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('bfeeb795-1a6f-4536-9ef7-bc58b11123b5', 'c1000000-0000-0000-0000-000000000013', '2026-05-01', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 03:45:17.801706+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('af56b5de-fd97-45e7-948d-f5832e32d184', 'c1000000-0000-0000-0000-000000000013', '2026-05-02', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('949302a8-c26a-407a-abd2-5a7e88f4e237', 'c1000000-0000-0000-0000-000000000013', '2026-05-03', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f353c124-b3b5-478c-a00a-0082bef8b85e', 'c1000000-0000-0000-0000-000000000013', '2026-05-04', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('deb5e9d8-6fbe-4e09-a0d5-7d06a148a9eb', 'c1000000-0000-0000-0000-000000000013', '2026-05-05', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f0dc0371-1c60-4ba9-afde-a3f19ace0379', 'c1000000-0000-0000-0000-000000000013', '2026-05-06', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('bf2dedcd-1730-477c-b1b1-2454ee5e07c1', 'c1000000-0000-0000-0000-000000000013', '2026-05-10', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('91da1240-353f-4a1b-82ee-6d4c5531963e', 'c1000000-0000-0000-0000-000000000013', '2026-05-11', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('72c16d01-1480-495f-9f1b-aed5438db9ec', 'c1000000-0000-0000-0000-000000000013', '2026-05-12', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f4b045e3-056b-4b52-a1d2-87f5259175e4', 'c1000000-0000-0000-0000-000000000013', '2026-05-13', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('8716f900-9801-4ca8-864b-f043f316c8c8', 'c1000000-0000-0000-0000-000000000013', '2026-05-14', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('0ba1e6fd-49c5-414d-99a5-69d8a003d147', 'c1000000-0000-0000-0000-000000000013', '2026-05-15', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('022ea2b4-dd33-43d1-b48c-74a02790419e', 'c1000000-0000-0000-0000-000000000013', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('fe403fac-42f6-4c18-a515-0d454847ff20', 'c1000000-0000-0000-0000-000000000013', '2026-05-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('e9c3f631-fb07-49c1-b582-645601255994', 'c1000000-0000-0000-0000-000000000013', '2026-05-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('d20c9435-3f8c-4ef6-9d66-781a06966e25', 'c1000000-0000-0000-0000-000000000013', '2026-05-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('6f2652dc-ba94-4447-9de9-dc827ec8b235', 'c1000000-0000-0000-0000-000000000013', '2026-05-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('423dad18-5e3b-4822-9ff0-6ec19d29a5d0', 'c1000000-0000-0000-0000-000000000013', '2026-05-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.giftshop', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3021b2ee-1768-459d-bcc0-c545e55c95d1', 'c1000000-0000-0000-0000-000000000014', '2026-04-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('9d43d0c3-0030-4d1d-b6d6-85d1943654eb', 'c1000000-0000-0000-0000-000000000014', '2026-04-27', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('afd6aebe-d837-4cd5-a157-806531020bb2', 'c1000000-0000-0000-0000-000000000014', '2026-04-28', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('fd32e293-b9da-4358-8bf8-6ee787e82f6d', 'c1000000-0000-0000-0000-000000000014', '2026-04-29', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('2f3850d3-6f34-477f-b573-6be7d91400cf', 'c1000000-0000-0000-0000-000000000014', '2026-04-30', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('7c53efd9-5f3e-49b3-84b5-e40960bc6b74', 'c1000000-0000-0000-0000-000000000014', '2026-05-02', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('74cc1510-3d32-47d7-a0a0-94d0f0986ff9', 'c1000000-0000-0000-0000-000000000014', '2026-05-04', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('fac6b8c0-71bf-4f0e-af3d-8af0a8a027bf', 'c1000000-0000-0000-0000-000000000014', '2026-05-05', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('368d9672-a9b6-4a45-9bac-2eb611e38b9b', 'c1000000-0000-0000-0000-000000000014', '2026-05-06', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('0594c28f-011d-4d8f-82c7-32911a8ab16a', 'c1000000-0000-0000-0000-000000000014', '2026-05-07', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('09597e97-e544-41d9-a384-e93a577abdc1', 'c1000000-0000-0000-0000-000000000014', '2026-05-09', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('fef26c76-4a75-47a6-b719-733fc2fe10ac', 'c1000000-0000-0000-0000-000000000014', '2026-05-11', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('5b74cd06-8f82-4b7e-81de-1868b0a15139', 'c1000000-0000-0000-0000-000000000014', '2026-05-12', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3dadb103-b280-4ad4-b349-dcd0bdaa2085', 'c1000000-0000-0000-0000-000000000014', '2026-05-13', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('188db88e-9747-4dd3-8cf4-00404cbc6510', 'c1000000-0000-0000-0000-000000000014', '2026-05-14', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('04e6e9f4-1055-4faa-a21e-31f5a6b5bd7e', 'c1000000-0000-0000-0000-000000000014', '2026-05-16', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('4adabf2e-4d5e-4ef1-ac2f-f188040df892', 'c1000000-0000-0000-0000-000000000014', '2026-05-18', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('3fcc0b67-06d9-4b75-8b7b-f2f3febe23be', 'c1000000-0000-0000-0000-000000000014', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('d47af99f-842b-4715-a714-9689cd71e0b7', 'c1000000-0000-0000-0000-000000000014', '2026-05-20', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('18bf7db9-ad2f-4444-946f-81cd4c8ed760', 'c1000000-0000-0000-0000-000000000014', '2026-05-21', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('cb254016-0aa3-4f1f-8e9d-d4db7767fe3a', 'c1000000-0000-0000-0000-000000000014', '2026-05-23', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('e36fa9e9-2db7-4a07-8baf-d33705ab74c7', 'c1000000-0000-0000-0000-000000000014', '2026-05-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.logistics', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('7dd8d7b2-f9f7-4330-a562-08ebae1c0ee3', 'c1000000-0000-0000-0000-000000000015', '2026-04-25', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('c9d973ca-31ea-4955-b883-4150c0196650', 'c1000000-0000-0000-0000-000000000015', '2026-04-26', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('369964fa-fa60-4f37-a34a-fd38ed3c69b6', 'c1000000-0000-0000-0000-000000000015', '2026-04-27', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('24ef9aa0-97b0-43da-a950-8389f6441baf', 'c1000000-0000-0000-0000-000000000015', '2026-05-01', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 03:45:17.801706+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('2f6ec1b3-fb58-4706-8bdc-3079aa59060e', 'c1000000-0000-0000-0000-000000000015', '2026-05-02', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('00299420-6f0d-49d3-b900-d1ca8077b206', 'c1000000-0000-0000-0000-000000000015', '2026-05-03', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('7dc6ce0b-5679-4d46-b4b5-d65e3edc4100', 'c1000000-0000-0000-0000-000000000015', '2026-05-04', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('5d75960e-06d2-457c-aec1-22f2378b0937', 'c1000000-0000-0000-0000-000000000015', '2026-05-05', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('96f02a1a-d638-4ef3-abfe-68f6b6bf9ce3', 'c1000000-0000-0000-0000-000000000015', '2026-05-06', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('97e2455f-7619-45e2-a96c-8334b2a4847f', 'c1000000-0000-0000-0000-000000000015', '2026-05-10', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('135ea998-0a0a-46c2-acc9-3817136f9f74', 'c1000000-0000-0000-0000-000000000015', '2026-05-11', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('2bd05de7-112d-46e1-a631-2e16ef652aba', 'c1000000-0000-0000-0000-000000000015', '2026-05-12', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b668a081-b01e-4979-81f5-3f0e3c23b08e', 'c1000000-0000-0000-0000-000000000015', '2026-05-13', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('ef091d70-3f31-4ec1-b70c-251493a794fd', 'c1000000-0000-0000-0000-000000000015', '2026-05-14', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b711288d-a3c8-427a-8157-3ba7f513f042', 'c1000000-0000-0000-0000-000000000015', '2026-05-15', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('919b970f-722e-4fdf-ab4e-84439796e56b', 'c1000000-0000-0000-0000-000000000015', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('d7032e9f-f83d-49aa-ad44-d5698fa0fbc6', 'c1000000-0000-0000-0000-000000000015', '2026-05-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('a13a3af6-8e7e-4604-9c75-1b2a8c041df0', 'c1000000-0000-0000-0000-000000000015', '2026-05-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('34a81fcf-6c1d-4db5-8218-71f474b25a08', 'c1000000-0000-0000-0000-000000000015', '2026-05-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('234c03c5-8473-4f1e-a9e5-637c5b3b390a', 'c1000000-0000-0000-0000-000000000015', '2026-05-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('8ce53139-fdab-499f-8775-421635e5b5b3', 'c1000000-0000-0000-0000-000000000015', '2026-05-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.ops.security', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('e9664f23-37f0-4066-9b54-905fa85f8944', 'c1000000-0000-0000-0000-000000000016', '2026-04-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('b0a913e3-79b6-4ea7-994d-e1524be9eadd', 'c1000000-0000-0000-0000-000000000016', '2026-04-27', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('be6a4698-3f26-479b-9552-af55c0ae1bd0', 'c1000000-0000-0000-0000-000000000016', '2026-04-28', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('5923d66b-8456-494a-a656-bbe47350a80c', 'c1000000-0000-0000-0000-000000000016', '2026-04-29', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('e68aa884-a145-4a99-9c8a-b32029592e8a', 'c1000000-0000-0000-0000-000000000016', '2026-04-30', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f05b9b63-cfb7-4a55-9065-daf2efa9cccf', 'c1000000-0000-0000-0000-000000000016', '2026-05-02', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('7bfb2b85-b3e0-4a15-802f-ab276c887c8c', 'c1000000-0000-0000-0000-000000000016', '2026-05-04', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('71ac9b5b-b0f9-43bc-a4e5-78232b8d014d', 'c1000000-0000-0000-0000-000000000016', '2026-05-05', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('e3d3cb66-313a-4e50-868c-402897cdf09e', 'c1000000-0000-0000-0000-000000000016', '2026-05-06', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('65b68815-a033-46b7-b451-90d2587b0733', 'c1000000-0000-0000-0000-000000000016', '2026-05-07', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('33de2c7a-a8ec-4abb-a33d-399c8612b085', 'c1000000-0000-0000-0000-000000000016', '2026-05-09', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('391af605-847c-4325-87bd-73f3ed0eefea', 'c1000000-0000-0000-0000-000000000016', '2026-05-11', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b73de806-494d-45d5-a564-f654358758ac', 'c1000000-0000-0000-0000-000000000016', '2026-05-12', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('fcaff7b9-06aa-47e4-a438-22a119af4028', 'c1000000-0000-0000-0000-000000000016', '2026-05-13', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('d0667cbc-4441-4186-bc97-3491bffd686e', 'c1000000-0000-0000-0000-000000000016', '2026-05-14', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('840d94c4-3354-4e0f-8fe2-6c04749f3366', 'c1000000-0000-0000-0000-000000000016', '2026-05-16', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('1a48b8e9-4235-4950-9545-d46b328cbdef', 'c1000000-0000-0000-0000-000000000016', '2026-05-18', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('7d7b6711-7931-46e1-9b6e-5aa804dd36d7', 'c1000000-0000-0000-0000-000000000016', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('398a4de2-db73-46cd-9ec8-f4cad6bb3101', 'c1000000-0000-0000-0000-000000000016', '2026-05-20', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('0c34a6ee-99af-46db-8de0-d45239077e60', 'c1000000-0000-0000-0000-000000000016', '2026-05-21', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('e01c1dba-d851-4973-8da8-56588ee75220', 'c1000000-0000-0000-0000-000000000016', '2026-05-23', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('1a3bba89-439c-4ade-9402-258cd306f7bd', 'c1000000-0000-0000-0000-000000000016', '2026-05-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.health', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('0de829e2-d41a-4b17-909d-00cd1d258ecb', 'c1000000-0000-0000-0000-000000000017', '2026-04-25', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('c0c5aa23-bc52-4b6a-a4ef-58325f44e60b', 'c1000000-0000-0000-0000-000000000017', '2026-04-26', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('7c6e3eff-cfe6-4e39-8c51-0e238b99b7a6', 'c1000000-0000-0000-0000-000000000017', '2026-04-27', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('837564e3-6f19-4da2-b876-d1b607f4f97c', 'c1000000-0000-0000-0000-000000000017', '2026-05-01', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 03:45:17.801706+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('a271be43-31b2-4649-8f82-cd53d83be4aa', 'c1000000-0000-0000-0000-000000000017', '2026-05-02', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('e122ab0a-bf23-4e85-b860-72e71b863037', 'c1000000-0000-0000-0000-000000000017', '2026-05-03', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('af4f958e-3c80-48c3-93e2-5046dc763724', 'c1000000-0000-0000-0000-000000000017', '2026-05-04', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('944fac75-5aad-4321-b2fe-160c54036f02', 'c1000000-0000-0000-0000-000000000017', '2026-05-05', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('5317485c-b6a9-47bb-9bd1-95003a70b898', 'c1000000-0000-0000-0000-000000000017', '2026-05-06', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('fb9f657c-1e4a-45a4-834b-a0c697c892e5', 'c1000000-0000-0000-0000-000000000017', '2026-05-10', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('7b4b28f6-49ab-4f27-a426-e47a92bb0c28', 'c1000000-0000-0000-0000-000000000017', '2026-05-11', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('0acc2192-2988-49a7-9250-b46c6a2f8b75', 'c1000000-0000-0000-0000-000000000017', '2026-05-12', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('222246a7-7e52-4322-a183-b48324ced905', 'c1000000-0000-0000-0000-000000000017', '2026-05-13', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('93874099-2e95-4cc6-8865-0046d22897be', 'c1000000-0000-0000-0000-000000000017', '2026-05-14', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('0a4d41ab-a1ae-4ae5-8a2a-47b3b22711c4', 'c1000000-0000-0000-0000-000000000017', '2026-05-15', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('0d422138-042d-4a1c-a125-9a2cd9f1e9e1', 'c1000000-0000-0000-0000-000000000017', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f88640c7-5a9c-4902-88b0-38b3b582c87a', 'c1000000-0000-0000-0000-000000000017', '2026-05-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('88513b50-0d88-4817-8a00-f660135616ab', 'c1000000-0000-0000-0000-000000000017', '2026-05-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('a6994bbe-6381-419c-8572-107e19808800', 'c1000000-0000-0000-0000-000000000017', '2026-05-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('0da36849-0e0d-43c0-84a7-ba5a62d4927b', 'c1000000-0000-0000-0000-000000000017', '2026-05-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('57992911-a7a6-4873-a03a-9bd402f28090', 'c1000000-0000-0000-0000-000000000017', '2026-05-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.cleaning', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('4e89bd32-5783-4259-a91b-616d639f0d36', 'c1000000-0000-0000-0000-000000000018', '2026-04-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('5d1cee62-09ab-4309-8ad8-b58f1bcbbe75', 'c1000000-0000-0000-0000-000000000018', '2026-04-27', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('ae4066b2-60e4-4e8b-9e52-b79f41b6a074', 'c1000000-0000-0000-0000-000000000018', '2026-04-28', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('891e0c5e-241e-4a2b-9ff5-df75528490c7', 'c1000000-0000-0000-0000-000000000018', '2026-04-29', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('38485f2e-3ce7-4897-b72d-49e814e0a871', 'c1000000-0000-0000-0000-000000000018', '2026-04-30', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('bbea6d57-b520-4f0c-9d85-8281b33adccc', 'c1000000-0000-0000-0000-000000000018', '2026-05-02', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('afcc04c4-54e8-42c7-ae3f-2b80f57672bf', 'c1000000-0000-0000-0000-000000000018', '2026-05-04', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('c9f3a8de-1417-489f-b5fd-64cf72283186', 'c1000000-0000-0000-0000-000000000018', '2026-05-05', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('dac25701-3eba-4be7-8bf7-bf504ef6b83b', 'c1000000-0000-0000-0000-000000000018', '2026-05-06', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('2cd87a85-bf8c-4dc5-97aa-6a060e2fb84d', 'c1000000-0000-0000-0000-000000000018', '2026-05-07', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('8e172426-6fb3-42b4-ac68-703ba576c335', 'c1000000-0000-0000-0000-000000000018', '2026-05-09', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('f392a9c3-cc79-4822-a4ae-44fbc3fd85e1', 'c1000000-0000-0000-0000-000000000018', '2026-05-11', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('4006a22d-5048-4372-9fd5-cd1dd2345aec', 'c1000000-0000-0000-0000-000000000018', '2026-05-12', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('4e3ffe33-5237-4282-a3fd-e7ea684ccbbf', 'c1000000-0000-0000-0000-000000000018', '2026-05-13', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('2a691801-b025-46f3-8e0c-ff3696d82e22', 'c1000000-0000-0000-0000-000000000018', '2026-05-14', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('1fd9af6d-ef87-489b-b5be-d229606981e5', 'c1000000-0000-0000-0000-000000000018', '2026-05-16', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('f5d746b9-2f9a-43d9-b4a7-10fa10715dde', 'c1000000-0000-0000-0000-000000000018', '2026-05-18', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('5e7d7abd-d4e4-4b1c-8fee-53cc5ddf5272', 'c1000000-0000-0000-0000-000000000018', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('d46b975e-802e-46e5-b5e5-1eaaa5585aaa', 'c1000000-0000-0000-0000-000000000018', '2026-05-20', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('c76f1ffe-7a4b-488d-a3f4-ba4b38f9c30c', 'c1000000-0000-0000-0000-000000000018', '2026-05-21', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('07b27bff-bf28-4f67-9f2d-5286c49152d5', 'c1000000-0000-0000-0000-000000000018', '2026-05-23', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b51bbcbc-946a-459c-b07c-0d29d240d181', 'c1000000-0000-0000-0000-000000000018', '2026-05-25', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.ops.experiences', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('e591f68b-2df9-4b2d-bfa2-5936e9f70246', 'c1000000-0000-0000-0000-000000000019', '2026-04-25', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('a5a340b1-1c1a-4bfb-beb2-cf6d4b9b120c', 'c1000000-0000-0000-0000-000000000019', '2026-04-26', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('a6f42042-e0e0-4db5-a88d-9e2193490fa8', 'c1000000-0000-0000-0000-000000000019', '2026-04-27', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('1747a4c4-5d6a-435c-ba71-b949a769717d', 'c1000000-0000-0000-0000-000000000019', '2026-05-01', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:45:17.801706+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('bebd05b5-e5cd-4fee-8e55-2e11da3d38cc', 'c1000000-0000-0000-0000-000000000019', '2026-05-02', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('d2817f39-0b7d-496f-a67e-5ca98295f68e', 'c1000000-0000-0000-0000-000000000019', '2026-05-03', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('1c70d12f-495f-4dc6-88b3-2c51ca00677c', 'c1000000-0000-0000-0000-000000000019', '2026-05-04', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('93b29c1e-699b-4343-bf9b-7bd600c2afc9', 'c1000000-0000-0000-0000-000000000019', '2026-05-05', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('ca8f9213-63de-4ca2-9a84-132e60359e64', 'c1000000-0000-0000-0000-000000000019', '2026-05-06', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 03:43:45.769046+00', '2026-04-24 04:21:32.594776+00', NULL, NULL),
	('7a5f520b-6375-47b0-a473-14cec8642481', 'c1000000-0000-0000-0000-000000000019', '2026-05-10', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('4d63d8f6-07e1-40a4-bb45-b053cb13cbc4', 'c1000000-0000-0000-0000-000000000019', '2026-05-11', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('7fc1da9c-7af6-4e9d-b5c4-a719c2ee1ad1', 'c1000000-0000-0000-0000-000000000019', '2026-05-12', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('a19ae350-70db-4af6-a031-bb4757d2ed55', 'c1000000-0000-0000-0000-000000000019', '2026-05-13', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('6e93c53b-838e-483a-ae3a-881d2971aab6', 'c1000000-0000-0000-0000-000000000019', '2026-05-14', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('8053ad7c-70d4-497c-91a0-ad49620b10ab', 'c1000000-0000-0000-0000-000000000019', '2026-05-15', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('34f60fcf-23b4-4af9-a20f-e8343052efa6', 'c1000000-0000-0000-0000-000000000019', '2026-05-19', 'b1000000-0000-0000-0000-000000000002', '13:00:00', '21:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('b5f5ac51-d4ab-4a1d-a79d-a67268ca5909', 'c1000000-0000-0000-0000-000000000019', '2026-05-20', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('2764dd55-91b4-4c3d-97aa-26970a252b00', 'c1000000-0000-0000-0000-000000000019', '2026-05-21', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('78acbd93-70c2-4f1d-9a99-5d03c7945f7c', 'c1000000-0000-0000-0000-000000000019', '2026-05-22', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('25586176-4c73-4e00-bc1c-71ac01981707', 'c1000000-0000-0000-0000-000000000019', '2026-05-23', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL),
	('7deac111-13a5-47d6-adb6-79c2edda999d', 'c1000000-0000-0000-0000-000000000019', '2026-05-24', 'b1000000-0000-0000-0000-000000000001', '09:00:00', '17:00:00', false, NULL, 'agartha.support.maintenance', '2026-04-24 04:21:32.594776+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: attendance_exceptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."attendance_exceptions" ("id", "shift_schedule_id", "staff_record_id", "type", "detail", "status", "staff_clarification", "hr_note", "reviewed_by", "reviewed_at", "org_unit_path", "created_at", "updated_at", "updated_by", "clarification_submitted_at") VALUES
	('cc9989d7-7420-4e86-9305-630aae475976', 'e865dbf4-cdb6-4c3d-8006-173557912003', 'c1000000-0000-0000-0000-000000000001', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.it', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('3963d6af-f71f-49f6-a04a-acd36a51d5dc', 'd52c8d04-f490-4f6e-9961-2dc23a4ff9c1', 'c1000000-0000-0000-0000-000000000001', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.it', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('b8c37f83-95b4-42f9-9481-d067f7fa4bd3', '08d54b65-37b8-416d-b415-af3896a9bca8', 'c1000000-0000-0000-0000-000000000002', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('dadb8ccc-cd31-4767-8b4b-2e672eab5c63', '933136d4-1927-4a88-b9f9-7a344d64373a', 'c1000000-0000-0000-0000-000000000003', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('c8882602-5019-488b-832f-3331708675a4', '668dc33e-1be4-4300-bbe1-8028d37b2869', 'c1000000-0000-0000-0000-000000000004', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('ccd8edda-2263-498e-bb29-84be00ebea05', '79719a8f-cea0-4da1-9afa-82c0aecfde7f', 'c1000000-0000-0000-0000-000000000005', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('9220caa4-36b8-4357-b98b-16ebe086ae70', 'a908ce75-89a0-4bfe-9c20-7d73c702a851', 'c1000000-0000-0000-0000-000000000006', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('29d8b3bb-9a65-4ade-aedd-133bb24bc6ee', '5065334c-b2da-4f23-bdf5-24d2e6912553', 'c1000000-0000-0000-0000-000000000007', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.marketing', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('820aaf23-5517-40c6-861f-9ac41d16f1f1', 'e5adf561-9f33-400d-8a9b-72d6a717edfc', 'c1000000-0000-0000-0000-000000000008', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.hr', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('cd5ed1b4-dce4-4da3-8f8e-ec27d53be670', '03c56e10-dfa8-483f-8b4a-9918e20165df', 'c1000000-0000-0000-0000-000000000009', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.compliance', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('adcd7585-5d35-4420-86cb-3c75bd1cc880', '0c72f360-9fd7-415b-bb82-58a8d6e8352d', 'c1000000-0000-0000-0000-000000000010', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('9d8624f7-d4a3-403d-936b-d38928ca4569', '73362858-1a99-4a49-a477-bd15c7d6c756', 'c1000000-0000-0000-0000-000000000011', 'missing_clock_out', 'Staff clocked in but did not clock out on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('0ba2c361-a391-4401-a4b7-0cea855ea0fd', 'a7903ffd-d314-4d10-9cbf-145035b3cc70', 'c1000000-0000-0000-0000-000000000012', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('638007b8-2504-4a85-b4fe-09daf4addd39', '7a64f837-0334-4d4b-90a0-760f119144b1', 'c1000000-0000-0000-0000-000000000013', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.giftshop', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('1bbce765-e478-41c4-94fe-2395c2f53408', '3fe8a960-01a3-4f8b-9847-9b64df435b26', 'c1000000-0000-0000-0000-000000000014', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('95de8236-6238-4a1d-9320-eb1d36b2eaa6', '93af7eea-a029-4256-92e7-57195d094d6d', 'c1000000-0000-0000-0000-000000000015', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.security', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('d824c8c0-03c1-4b4a-beac-0a496c0084b6', 'cc63bebf-acad-4b2c-95e0-718d00160c74', 'c1000000-0000-0000-0000-000000000016', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.health', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('cbf94a65-873d-458c-a049-a5d9773c20c1', 'c8dd2440-0233-446c-835b-8a80839b31b5', 'c1000000-0000-0000-0000-000000000017', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.cleaning', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('2b52e83d-1dad-4ceb-9370-cfd585903f75', '8577ccbb-6070-40f8-9e55-06e6f7d8255c', 'c1000000-0000-0000-0000-000000000018', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('4652ed43-d1d6-442c-a452-829a5d881bbb', '6038b3ef-a3c3-4198-a26a-854ddbaa6686', 'c1000000-0000-0000-0000-000000000019', 'absent', 'Staff did not appear for scheduled shift on 2026-04-20', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-20 16:05:00.214821+00', NULL, NULL, NULL),
	('c05bf1c0-bfc3-4496-b7bf-e10c6eaa992b', '73362858-1a99-4a49-a477-bd15c7d6c756', 'c1000000-0000-0000-0000-000000000011', 'late_arrival', 'Late by 372 min. Clocked in at 15:12 (Expected: 09:00)', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-20 07:12:14.739697+00', '2026-04-21 09:10:48.247024+00', NULL, NULL),
	('b37dfb80-2cd2-448b-806c-706628f0944a', '40e741af-a75f-4e07-b2a0-a9bf2ee8acf4', 'c1000000-0000-0000-0000-000000000011', 'late_arrival', 'Late by 22 min. Clocked in at 09:22 (Expected: 09:00)', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-21 01:22:19.306241+00', '2026-04-21 09:10:48.247024+00', NULL, NULL),
	('187d9e5b-d165-4530-803c-bb7711b4ff80', 'c78f67b9-2d08-498c-a344-4bc07e1d5281', 'c1000000-0000-0000-0000-000000000002', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('b0faf524-5930-4387-8f6e-41175e7b2934', 'fb175a2d-0f0a-46dc-99d4-565863124ec2', 'c1000000-0000-0000-0000-000000000003', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('7be80459-5983-4233-94de-37f16f208ec2', '606068b6-08cc-40f3-a4d0-bc313cab8f29', 'c1000000-0000-0000-0000-000000000004', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('88ab68eb-400b-4a33-bb55-aed976cf2b03', '4882126c-4947-43c7-9d2b-a75fdec497b7', 'c1000000-0000-0000-0000-000000000005', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('3609bf31-9bb6-42a0-b886-4dc9c7fb5187', 'e27d5f15-d6ef-4d67-9a71-9718fcf8fbac', 'c1000000-0000-0000-0000-000000000006', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('23c6f68a-b1d4-476d-88ea-7f3fa25d9048', '44243b6a-0598-477c-89da-c1156338f3a8', 'c1000000-0000-0000-0000-000000000007', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.marketing', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('43bd9bd8-7d1b-42ad-b132-39c60446410f', 'bde0271f-8cfb-45ac-9942-31625b8c2587', 'c1000000-0000-0000-0000-000000000008', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.hr', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('ae0fe74c-2b53-4dde-9270-398d4cb5449e', '494c31b3-82d9-48ac-a377-327143e676ee', 'c1000000-0000-0000-0000-000000000009', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.compliance', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('a921dd94-8a61-4c8e-b415-3de195024782', 'd52e8eda-be3c-4245-8cdd-8814e1278929', 'c1000000-0000-0000-0000-000000000010', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('fe1b1ccf-f82a-4564-884c-171de373f58c', '40e741af-a75f-4e07-b2a0-a9bf2ee8acf4', 'c1000000-0000-0000-0000-000000000011', 'missing_clock_out', 'Staff clocked in but did not clock out on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('73e40f7d-2d63-4e37-811a-a3daff3ca245', '3216858b-fcd9-4b3e-89d8-4591b55c03dc', 'c1000000-0000-0000-0000-000000000012', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('c22fe264-c2f3-4f6c-b986-902677ab12b2', '84f87619-990a-4663-8ebb-84579c2875ce', 'c1000000-0000-0000-0000-000000000013', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.giftshop', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('806e86f5-ab81-41df-a70c-12a192bb31a8', 'ff880828-4c05-41d7-af71-650e564cade3', 'c1000000-0000-0000-0000-000000000014', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('b9be64d6-de26-4758-a365-10002709fc14', '4c9f9975-1bae-4d89-bebd-e7d0e6d31d72', 'c1000000-0000-0000-0000-000000000015', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.security', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('270661f3-5418-49e1-ac9b-67432559ced8', '6aa5f3f4-3e81-4045-a87b-4cde54f61325', 'c1000000-0000-0000-0000-000000000016', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.health', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('6e1344a1-c92f-4399-a5ca-7d265af5dfec', '60c9140f-0337-4b50-a0d9-1cf715a59878', 'c1000000-0000-0000-0000-000000000017', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.cleaning', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('1f20eb55-767a-4583-801d-42f9695fb85c', '52ce8cf0-da77-4359-a632-f9b882e774e8', 'c1000000-0000-0000-0000-000000000018', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('7cd522bb-ff62-424a-b245-8fa814f8cb7f', '89db2425-885f-47bf-8e60-1e2d424f4b25', 'c1000000-0000-0000-0000-000000000019', 'absent', 'Staff did not appear for scheduled shift on 2026-04-21', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-21 16:05:00.200375+00', NULL, NULL, NULL),
	('811e778c-b251-4435-a91b-7ac15d160723', '4ac37f15-5945-4632-8fe5-1d8efa86c1cf', 'c1000000-0000-0000-0000-000000000011', 'late_arrival', 'Late by 148 min. Clocked in at 11:28 (Expected: 09:00)', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-22 03:28:06.470154+00', NULL, NULL, NULL),
	('93375794-ef5a-4de7-8596-eac636943799', '4ae74bb2-85b9-4e8e-8ad6-0005d82e68f5', 'c1000000-0000-0000-0000-000000000001', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.it', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('c1e42f6d-824d-4c71-aef7-b8aeaa7ab4a5', '81ea7613-ea3a-4a5e-be17-4942e6eb84d6', 'c1000000-0000-0000-0000-000000000002', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('c820be34-dc3e-4c8e-b7f5-647a416c45c5', '09bdcba5-48b9-4aec-a0fd-6b7fc6d09538', 'c1000000-0000-0000-0000-000000000003', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('cc5a6f94-4a86-401c-a42d-ec14e1665aab', '4aa42890-241c-4cb6-8eac-dc7f9d25303a', 'c1000000-0000-0000-0000-000000000004', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('e6825561-8232-4416-b19f-d126149c8429', '73f3606e-bf04-44b0-9f9f-0e597a4f41cf', 'c1000000-0000-0000-0000-000000000005', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('9d62fa37-f6b3-4206-af09-ab931861e3e7', '6f28f688-9e39-416a-86e4-cd3180d34bab', 'c1000000-0000-0000-0000-000000000006', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('abbf9021-810d-40b4-8cd8-7733217b0184', '549af527-31f9-403c-8fe9-add83468b03c', 'c1000000-0000-0000-0000-000000000007', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.marketing', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('4e0179d5-d0b3-4403-b967-e0bbd9aefa1b', '9184a448-abd1-4b0b-a8a6-edc072b49ab3', 'c1000000-0000-0000-0000-000000000008', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.hr', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('69876e46-7694-45eb-a6fc-90110dbb2d9b', 'edd2bad4-29c8-46e5-b88b-c6aee2b3c0f7', 'c1000000-0000-0000-0000-000000000009', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.compliance', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('14b6be51-d484-4ac4-898a-3efd788186ba', 'e5fe1501-9143-4ef5-bc33-4bcee8fb2300', 'c1000000-0000-0000-0000-000000000010', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('880b0a66-95c6-4825-b239-6ddf75c99f6b', '4ac37f15-5945-4632-8fe5-1d8efa86c1cf', 'c1000000-0000-0000-0000-000000000011', 'missing_clock_out', 'Staff clocked in but did not clock out on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('087c42d0-8839-42a9-b816-5c80bc651402', '80b01fa6-969b-427c-9ce9-de3a1cbf7a2a', 'c1000000-0000-0000-0000-000000000012', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('7173f793-17f5-489b-b7cf-a5dc94fb90cc', '0a630b73-10dc-44cf-8870-33c0a147a8f1', 'c1000000-0000-0000-0000-000000000013', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.giftshop', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('e01b2fa4-28f8-432a-97d7-6c4ddb7ca43d', '6259ac79-9749-425d-916d-d1334f940f78', 'c1000000-0000-0000-0000-000000000014', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('b645a720-c985-4836-a68d-1b7f77929f8d', 'd4ea0c1a-a3c6-4503-9820-4b6198f256ef', 'c1000000-0000-0000-0000-000000000015', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.security', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('013c6fb4-2afb-4976-a0d4-dc58322db6dc', '16de5490-daa4-490b-8a7e-e2aff0e990d4', 'c1000000-0000-0000-0000-000000000016', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.health', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('1e1f23f6-9573-4ba6-a59e-921feae12d6e', 'b90e7919-30cc-4294-83e3-65607df14605', 'c1000000-0000-0000-0000-000000000017', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.cleaning', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('f613d117-ccbe-4e05-9944-f68ed41dbe23', '260f0971-649b-4588-9a27-80f5383926d6', 'c1000000-0000-0000-0000-000000000018', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('f643d97f-b523-40c1-bded-055874a27b3a', 'f77bd0c4-07db-4ab1-9055-9302a4bc18c9', 'c1000000-0000-0000-0000-000000000019', 'absent', 'Staff did not appear for scheduled shift on 2026-04-22', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-22 16:05:00.190439+00', NULL, NULL, NULL),
	('2535bed5-336d-473e-8c86-026ce8a3dacc', 'e2e66012-8524-49ba-8270-ce47a4e0f78b', 'c1000000-0000-0000-0000-000000000011', 'late_arrival', 'Late by 147 min. Clocked in at 11:27 (Expected: 09:00)', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-23 03:27:11.454972+00', NULL, NULL, NULL),
	('4f2e8502-1234-4619-ad7d-6a94c6dfbb99', '102ac8d9-8c1a-4ca1-bcb5-685dde4c9b9c', 'c1000000-0000-0000-0000-000000000001', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.it', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('9c0fb219-bba0-426d-844a-e72584b662e2', 'f32b4b51-0b55-4ba2-a520-d31859e9014d', 'c1000000-0000-0000-0000-000000000002', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('e8840994-dc2f-4250-b973-3a56abb16b26', '2ea0c31e-475b-408f-8deb-cd15bc717abb', 'c1000000-0000-0000-0000-000000000003', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('70982bf5-23ad-4337-b887-1ce21cb18845', '2c43ad61-b711-4128-81d0-cefb7e513c09', 'c1000000-0000-0000-0000-000000000004', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('d8bc43ed-6384-4faa-b484-5a3d9df2e14e', 'f108411a-ed83-47d6-9968-205bbf163a49', 'c1000000-0000-0000-0000-000000000005', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('5313122b-51d2-4c8f-ad5d-d0cc3db86ada', '134a9213-0265-40f1-8d46-3074547e2f76', 'c1000000-0000-0000-0000-000000000006', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('33ee0eb1-7e66-428a-b5cf-431e6be381f1', 'bfabdde3-06e8-4f5d-bf55-b1a47ba7dc20', 'c1000000-0000-0000-0000-000000000007', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.marketing', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('3f28c3f9-ca89-4c1f-b1ae-e41679eff886', '1cfb9263-13df-4f91-8983-1c3c69aa0c2c', 'c1000000-0000-0000-0000-000000000008', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.hr', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('95ce34ea-1bc9-4906-8440-1de1df5f0c4d', '02f48c82-9f0b-4132-97bc-9530dbeba770', 'c1000000-0000-0000-0000-000000000009', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.compliance', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('71db4e9b-7686-450e-bd79-c520f9a55079', '5d875e7b-86e4-4f8e-bd8d-788ca88ffa5e', 'c1000000-0000-0000-0000-000000000010', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('07c3eab4-29c6-4601-917f-dc3aa89247ea', 'e2e66012-8524-49ba-8270-ce47a4e0f78b', 'c1000000-0000-0000-0000-000000000011', 'missing_clock_out', 'Staff clocked in but did not clock out on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('d6fbd27d-7b0c-49ca-9f45-231b30c3ddcf', 'b4ccebc4-f7d8-4a92-94e9-b3e9138f8653', 'c1000000-0000-0000-0000-000000000012', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('1b725828-17bd-4df3-9ba6-267b02bf6ec1', '78b59698-9296-44ee-ba8e-5b621ae74d42', 'c1000000-0000-0000-0000-000000000013', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.giftshop', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('2142d6c7-9812-48b5-8ed9-7b765280def5', 'a5cf6494-7381-4a9d-abd4-747b3c9b4ccb', 'c1000000-0000-0000-0000-000000000014', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('fd830944-330d-4743-b9d4-1935d21eeea6', '782666f0-db49-4583-9a2c-2c490cae8c37', 'c1000000-0000-0000-0000-000000000015', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.security', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('05bdecb7-c864-4f4e-8da3-c47656048d5b', '6f1c2d02-9640-4d1d-b940-058a6756a57a', 'c1000000-0000-0000-0000-000000000016', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.health', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('e0a6f983-8d61-4a69-a5e3-f9e72c2de511', '65214827-a51f-474b-ab9c-ef90fa2dfc0a', 'c1000000-0000-0000-0000-000000000017', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.cleaning', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('f7171c1f-dea8-417d-800d-719b1d77723d', '888a1a94-c107-4167-a3e2-9f78295a129c', 'c1000000-0000-0000-0000-000000000018', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('9db48842-278c-4148-abea-374bb1227955', '06a28644-801b-41a7-adab-a7be310cf44c', 'c1000000-0000-0000-0000-000000000019', 'absent', 'Staff did not appear for scheduled shift on 2026-04-23', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-23 16:05:00.197355+00', NULL, NULL, NULL),
	('91192e8a-c5d7-40d9-a429-165fff928ceb', '41080d00-72a5-41fe-95d8-d98d305b4b70', 'c1000000-0000-0000-0000-000000000001', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.it', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('c4cf32ab-77a4-4ff2-8602-12dcd41b9576', '03065bb8-e720-40d5-b63c-ce6e115b7824', 'c1000000-0000-0000-0000-000000000002', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('34ae49ce-9192-4cbb-8c91-c38b83059eca', 'ae0111bd-20e7-455f-995c-c63a1c53e713', 'c1000000-0000-0000-0000-000000000003', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('ff7c17c9-c69f-4dfc-b047-6dd652242379', '70e94109-3c80-473c-aefc-f2bcbfcb90ab', 'c1000000-0000-0000-0000-000000000004', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('866d0086-e942-46c1-83b3-bb19321c3481', 'd3f21472-f549-485f-ad27-fa9f9e23dc28', 'c1000000-0000-0000-0000-000000000005', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('1d25cd99-5c09-420e-b55e-369d1a374e5f', 'f2f85910-d2eb-4d52-95b2-79464ed7fb76', 'c1000000-0000-0000-0000-000000000006', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('f98356d1-66d7-49b1-993b-a7f2060e7397', '83420f0b-f2e3-424a-ba2c-55b0370e8b03', 'c1000000-0000-0000-0000-000000000007', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.marketing', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('8bfa3cbe-0318-4bfc-bf21-bb7195dd5f15', '0197976e-6017-4247-bafc-168e4ad41621', 'c1000000-0000-0000-0000-000000000008', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.hr', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('5e04e8fb-c021-4979-af3c-457353d5c713', 'a4a86147-edd3-4380-b6e4-95a6dcaa86f6', 'c1000000-0000-0000-0000-000000000009', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.compliance', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('2648ba4d-6996-4d41-97c6-7134ca69e210', '3637c7d8-3dc9-45af-812b-166e8df8cb16', 'c1000000-0000-0000-0000-000000000010', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('5cd9b864-363f-4fbc-8549-32dd1995f28f', 'affec4a7-841b-4c75-8815-3558beb6afcb', 'c1000000-0000-0000-0000-000000000011', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('5efe7dad-b38c-426d-ad2d-3ac1ca8add4c', '975d7416-906e-41b6-8e79-a561cae41ae6', 'c1000000-0000-0000-0000-000000000012', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('732c7388-bab5-4bde-9ce9-900c3d83c902', '2d8d7d82-e898-4e5a-8e02-eae84e9dc274', 'c1000000-0000-0000-0000-000000000013', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.giftshop', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('48634a65-5ee4-44f4-8b94-059f709e6c25', '8767e9d0-0be6-4714-86b1-33ca4e0009cd', 'c1000000-0000-0000-0000-000000000014', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('deb79360-ed9e-4fa2-8488-3ba2f37aa99a', '0e1e03d4-a498-4439-884a-c5ecd0316015', 'c1000000-0000-0000-0000-000000000015', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.security', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('d8ea5d1a-276b-49b2-a847-9612484d64e6', '676a3b51-c245-46b4-ad8f-87c21f76865b', 'c1000000-0000-0000-0000-000000000016', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.health', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('3373bd24-8785-4d27-9ee4-1193a89f3e75', 'ede9b4a3-9e32-4152-9782-e72ae5135346', 'c1000000-0000-0000-0000-000000000017', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.cleaning', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('2715fab8-5c59-4cfb-93d8-93aa7984ca53', 'dcdd0664-8cef-46d0-95a5-ab29a278d43e', 'c1000000-0000-0000-0000-000000000018', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('4e76f8c8-f8af-4421-a756-cc3bf97c7d56', '1be30e8d-4b17-4d28-98c8-a7fd01cd3394', 'c1000000-0000-0000-0000-000000000019', 'absent', 'Staff did not appear for scheduled shift on 2026-04-24', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-24 16:05:00.231923+00', NULL, NULL, NULL),
	('5545bf8f-910a-4c6f-add2-d21d22193097', '44885958-0b43-4165-b051-b7561c8010e0', 'c1000000-0000-0000-0000-000000000001', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.it', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('0b3945b7-c5fe-4b01-8e51-9dd95dad976c', '3fe16615-72a9-40a9-87b1-0c1cdf4328e5', 'c1000000-0000-0000-0000-000000000002', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('b354b58e-fd33-42b2-9557-3f44c4b29838', 'bc398847-98a1-4cc2-8663-77333c3ec82f', 'c1000000-0000-0000-0000-000000000003', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('e08f47c0-526f-4474-8663-136cc812d401', '3eba25c7-0396-41da-ac5a-f0611726c76f', 'c1000000-0000-0000-0000-000000000004', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('3f0ed18d-905b-4815-98a0-05ca1c58af01', '26243b02-0ea1-4d80-a80b-4dde173784af', 'c1000000-0000-0000-0000-000000000005', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('9d483b7e-7290-4bfe-932c-e9fbb17caa5b', 'ecacd726-c867-4db3-8032-fe13b80dfc52', 'c1000000-0000-0000-0000-000000000006', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('7cc1ec81-ea6c-4042-811a-837c0ae3442e', 'b2edc83a-663b-469a-8334-995e8ecb1255', 'c1000000-0000-0000-0000-000000000007', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.marketing', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('b760b13d-bbe4-4b02-a2e7-f0a6453bf718', '88448ba8-7915-49ed-a3e4-7b82ec57aafc', 'c1000000-0000-0000-0000-000000000008', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.hr', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('79b88189-279d-4c33-9134-810e32ef5252', '6ecb7153-9a02-40ca-a079-99491492656f', 'c1000000-0000-0000-0000-000000000009', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.compliance', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('14fdf7a9-8539-47ad-8bd1-daa4a9cceee4', '595e1eae-d477-42fa-869d-7ddaa7f8d92d', 'c1000000-0000-0000-0000-000000000010', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('a1e07b7e-5379-4502-bef1-71256f6e2fd1', '06a89e27-210a-4e54-b8c7-bd8ba0333113', 'c1000000-0000-0000-0000-000000000012', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('3f6ac9db-c71c-4027-bdf8-67b957867e15', 'e00257c7-fc64-4506-87f0-4f87f6fbccf9', 'c1000000-0000-0000-0000-000000000013', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.giftshop', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('3cd42a10-78e3-4d8b-aaf1-f4cde3ca5b8c', '3021b2ee-1768-459d-bcc0-c545e55c95d1', 'c1000000-0000-0000-0000-000000000014', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('15de475b-9e36-4647-bb97-7b8b181a83c5', '7dd8d7b2-f9f7-4330-a562-08ebae1c0ee3', 'c1000000-0000-0000-0000-000000000015', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.security', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('3ef80c37-90bc-4b5a-8eb6-b44032f92046', 'e9664f23-37f0-4066-9b54-905fa85f8944', 'c1000000-0000-0000-0000-000000000016', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.health', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('9db5bcb1-10fd-4bdb-af31-9f7650f78388', '0de829e2-d41a-4b17-909d-00cd1d258ecb', 'c1000000-0000-0000-0000-000000000017', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.cleaning', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('a88311fe-ba32-4586-ba53-454372bfb92c', '4e89bd32-5783-4259-a91b-616d639f0d36', 'c1000000-0000-0000-0000-000000000018', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('b5d02991-bcb7-4c09-a95b-ebaa62b12684', 'e591f68b-2df9-4b2d-bfa2-5936e9f70246', 'c1000000-0000-0000-0000-000000000019', 'absent', 'Staff did not appear for scheduled shift on 2026-04-25', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-25 16:05:00.219948+00', NULL, NULL, NULL),
	('f4e67fdb-0914-4506-86e2-b6fc457fd2db', '81b7d66c-1c2a-4040-9823-2c1e862fbed4', 'c1000000-0000-0000-0000-000000000001', 'absent', 'Staff did not appear for scheduled shift on 2026-04-26', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.it', '2026-04-26 16:05:00.124633+00', NULL, NULL, NULL),
	('c47b2e9f-3a36-4edf-8ac1-22be014b2aec', '17d33108-7678-42e9-8750-5fbc9f41660e', 'c1000000-0000-0000-0000-000000000003', 'absent', 'Staff did not appear for scheduled shift on 2026-04-26', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-26 16:05:00.124633+00', NULL, NULL, NULL),
	('7dfa37d3-5f72-4227-806f-27b1c9ec63c3', '818900c3-515e-485f-b00c-e9b41943e431', 'c1000000-0000-0000-0000-000000000005', 'absent', 'Staff did not appear for scheduled shift on 2026-04-26', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-26 16:05:00.124633+00', NULL, NULL, NULL),
	('ae4d1503-19e1-44a4-bdc2-1cc8b8e4c1a2', 'c5b19d2e-4dfa-480f-bf2b-3d3209e0ed56', 'c1000000-0000-0000-0000-000000000007', 'absent', 'Staff did not appear for scheduled shift on 2026-04-26', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.marketing', '2026-04-26 16:05:00.124633+00', NULL, NULL, NULL),
	('14013906-526b-41cc-96ad-0dd5493e616c', 'c5f2d702-189a-4f27-b7e8-40af663554b7', 'c1000000-0000-0000-0000-000000000009', 'absent', 'Staff did not appear for scheduled shift on 2026-04-26', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.compliance', '2026-04-26 16:05:00.124633+00', NULL, NULL, NULL),
	('62d22cf7-4e10-44a1-931c-1e4f61237e19', '8670122d-5138-41d3-8a99-ea7075bbc024', 'c1000000-0000-0000-0000-000000000013', 'absent', 'Staff did not appear for scheduled shift on 2026-04-26', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.giftshop', '2026-04-26 16:05:00.124633+00', NULL, NULL, NULL),
	('81e6bbef-d0da-487e-8f59-b97c946303d3', 'c9d973ca-31ea-4955-b883-4150c0196650', 'c1000000-0000-0000-0000-000000000015', 'absent', 'Staff did not appear for scheduled shift on 2026-04-26', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.security', '2026-04-26 16:05:00.124633+00', NULL, NULL, NULL),
	('e086c8e7-b277-4df1-b5b7-38a525f77ae4', 'c0c5aa23-bc52-4b6a-a4ef-58325f44e60b', 'c1000000-0000-0000-0000-000000000017', 'absent', 'Staff did not appear for scheduled shift on 2026-04-26', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.cleaning', '2026-04-26 16:05:00.124633+00', NULL, NULL, NULL),
	('75abc4f7-12f9-4249-9eff-a242647b5af0', 'a5a340b1-1c1a-4bfb-beb2-cf6d4b9b120c', 'c1000000-0000-0000-0000-000000000019', 'absent', 'Staff did not appear for scheduled shift on 2026-04-26', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-26 16:05:00.124633+00', NULL, NULL, NULL),
	('87e77b5b-399d-4d4c-87f5-082f56128167', '0c741566-8bd8-49b2-9299-6f72db73a38b', 'c1000000-0000-0000-0000-000000000001', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.it', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('fd3eedf0-c43e-4515-b116-51a5142f9e13', '98d33c0b-6d68-47c1-bf8d-a0c735f01d59', 'c1000000-0000-0000-0000-000000000002', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('525c4508-c7a5-47c8-baf1-0aafa535d0d2', 'b2079df3-74db-4b73-9e51-a936bfacfd18', 'c1000000-0000-0000-0000-000000000003', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.fnb', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('b04e60e3-9b77-4e1f-8c2a-ff2fe0ebc18e', '32e2f9d1-9a3d-4a37-91af-d1cb384f0708', 'c1000000-0000-0000-0000-000000000004', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('915f35d5-1da7-4a8e-8b1b-eaa5bff78d69', '14b048e2-9593-4e4f-ad2c-d8790d1b0f60', 'c1000000-0000-0000-0000-000000000005', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('62c9c8cc-6cc9-4355-ba06-70f900120848', '05372b60-3075-4feb-8067-6e260eb18188', 'c1000000-0000-0000-0000-000000000006', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('5567e030-2693-44c9-8d35-7fd674ca8170', 'ae7fca59-6566-47e7-8ce5-db2d381f18fa', 'c1000000-0000-0000-0000-000000000007', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.marketing', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('18fda1e8-c835-4ea3-8e82-da9a2212426b', '33d9eb01-1975-43e4-8d58-4d516f8577ed', 'c1000000-0000-0000-0000-000000000008', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.hr', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('52aff7a7-5601-4aef-8dcc-7b9b05334352', '5a49933e-3273-4391-8e6d-5150f8cab9a8', 'c1000000-0000-0000-0000-000000000009', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.corp.compliance', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('01962cf7-42fe-46b8-9242-e870b83b1a64', 'f29735ca-621b-4d24-bcc6-41747ce6a470', 'c1000000-0000-0000-0000-000000000010', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('b02f97d6-b215-444e-9d96-ba1abecf099f', '4964dd55-361d-4671-af92-76315c7a7c1b', 'c1000000-0000-0000-0000-000000000012', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('4caead3c-fcdf-41a1-b4ec-3d51385d17df', 'ccde50f1-bd12-4567-8cef-e803ade1e271', 'c1000000-0000-0000-0000-000000000013', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.giftshop', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('812c363b-9a27-4f13-be13-753f4aac8ab0', '9d43d0c3-0030-4d1d-b6d6-85d1943654eb', 'c1000000-0000-0000-0000-000000000014', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.logistics', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('22bbb81a-c769-4dba-a82a-d9384b3aa822', '369964fa-fa60-4f37-a34a-fd38ed3c69b6', 'c1000000-0000-0000-0000-000000000015', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.security', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('85e00909-2ca0-4890-a73b-f1fb27a58cc0', 'b0a913e3-79b6-4ea7-994d-e1524be9eadd', 'c1000000-0000-0000-0000-000000000016', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.health', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('2b0c7587-de0b-4059-8b28-b059d18b6c49', '7c6e3eff-cfe6-4e39-8c51-0e238b99b7a6', 'c1000000-0000-0000-0000-000000000017', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.cleaning', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('75fe9f82-a5d4-4a1f-b393-c37e707ce432', '5d1cee62-09ab-4309-8ad8-b58f1bcbbe75', 'c1000000-0000-0000-0000-000000000018', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('4635eb8f-a8a7-449e-b0d7-a5e6b6839201', 'a6f42042-e0e0-4db5-a88d-9e2193490fa8', 'c1000000-0000-0000-0000-000000000019', 'absent', 'Staff did not appear for scheduled shift on 2026-04-27', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.support.maintenance', '2026-04-27 16:05:00.241757+00', NULL, NULL, NULL),
	('f8438529-ccbd-448f-9900-a8b21c148e98', '38f204e5-c97a-414e-b99d-c98b8a9dd798', 'c1000000-0000-0000-0000-000000000012', 'early_departure', 'Early by 505 min. Clocked out at 12:34 (Expected: 21:00)', 'unjustified', NULL, NULL, NULL, NULL, 'agartha.ops.experiences', '2026-04-29 04:34:40.309711+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: attendance_clarification_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: material_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."material_categories" ("id", "parent_id", "name", "code", "depth", "path", "is_bom_eligible", "is_consumable", "default_valuation", "accounting_category", "sort_order", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('cc000000-0000-0000-0000-000000000001', NULL, 'Food & Beverage', 'food', 0, 'food', true, false, NULL, NULL, 10, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cc000000-0000-0000-0000-000000000002', NULL, 'Retail Merchandise', 'retail', 0, 'retail', false, false, NULL, NULL, 20, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cc000000-0000-0000-0000-000000000003', NULL, 'Consumables', 'consumables', 0, 'consumables', false, true, NULL, NULL, 30, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cc000000-0000-0000-0000-000000000004', NULL, 'Capital Equipment', 'capital', 0, 'capital', false, false, NULL, NULL, 40, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cc000000-0000-0000-0000-000000000011', 'cc000000-0000-0000-0000-000000000001', 'Beverages', 'beverages', 0, 'food.beverages', true, false, NULL, NULL, 11, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cc000000-0000-0000-0000-000000000012', 'cc000000-0000-0000-0000-000000000001', 'Prepared Meals', 'prepared_meals', 0, 'food.prepared_meals', true, false, NULL, NULL, 12, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cc000000-0000-0000-0000-000000000013', 'cc000000-0000-0000-0000-000000000001', 'Raw Ingredients', 'raw_ingredients', 0, 'food.raw_ingredients', false, false, NULL, NULL, 13, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cc000000-0000-0000-0000-000000000021', 'cc000000-0000-0000-0000-000000000002', 'Merchandise', 'merchandise', 0, 'retail.merchandise', false, false, NULL, NULL, 21, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cc000000-0000-0000-0000-000000000031', 'cc000000-0000-0000-0000-000000000003', 'Cleaning Supplies', 'cleaning', 0, 'consumables.cleaning', false, true, NULL, NULL, 31, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cc000000-0000-0000-0000-000000000032', 'cc000000-0000-0000-0000-000000000003', 'Uniforms & PPE', 'uniforms', 0, 'consumables.uniforms', false, true, NULL, NULL, 32, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."units" ("id", "name", "abbreviation", "created_at", "updated_at") VALUES
	('b72422bc-e358-4a6f-b47f-1edfcc507e78', 'piece', 'pc', '2026-04-17 08:02:49.848099+00', NULL),
	('9c0751a2-cd90-4eb5-be1a-90a37e055d61', 'kilogram', 'kg', '2026-04-17 08:02:49.848099+00', NULL),
	('5f7bcfae-8567-4d52-8c4a-9935def8f548', 'gram', 'g', '2026-04-17 08:02:49.848099+00', NULL),
	('0daef3e9-f205-4168-8301-161656f2c831', 'liter', 'L', '2026-04-17 08:02:49.848099+00', NULL),
	('3716f20e-7487-40ad-8464-d89bdb830c69', 'milliliter', 'mL', '2026-04-17 08:02:49.848099+00', NULL),
	('6d9b2a30-1a06-48b9-9e75-e6e83e4f6df9', 'box', 'bx', '2026-04-17 08:02:49.848099+00', NULL),
	('7a856da1-1b00-4fe5-90f8-6a67a09b8aff', 'pack', 'pk', '2026-04-17 08:02:49.848099+00', NULL),
	('b97d9835-2f72-4476-82eb-a71ab13ca46a', 'case', 'cs', '2026-04-17 08:02:49.848099+00', NULL),
	('9021dc0d-80c6-4eba-9f87-510a0a970cbe', 'bottle', 'btl', '2026-04-18 07:24:56.820039+00', NULL),
	('11cdf77e-3c24-417a-bb0b-f6c5ed6f2483', 'carton', 'ctn', '2026-04-18 07:24:56.820039+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."materials" ("id", "sku", "barcode", "name", "material_type", "category_id", "base_unit_id", "reorder_point", "safety_stock", "standard_cost", "valuation_method", "shelf_life_days", "storage_conditions", "weight_kg", "is_returnable", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('a1000000-0000-0000-0000-000000000001', 'COFFEE-ARB-1KG', NULL, 'Arabica Coffee Beans 1kg', 'raw', 'cc000000-0000-0000-0000-000000000013', '9c0751a2-cd90-4eb5-be1a-90a37e055d61', 20, 5, 45.00, 'moving_avg', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000002', 'MILK-FRESH-1L', NULL, 'Fresh Milk 1L', 'raw', 'cc000000-0000-0000-0000-000000000013', '0daef3e9-f205-4168-8301-161656f2c831', 30, 10, 6.50, 'moving_avg', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000003', 'SUGAR-1KG', NULL, 'Sugar 1kg', 'raw', 'cc000000-0000-0000-0000-000000000013', '9c0751a2-cd90-4eb5-be1a-90a37e055d61', 15, 5, 3.80, 'standard', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000011', 'DRINK-LATTE', NULL, 'Latte', 'finished', 'cc000000-0000-0000-0000-000000000011', 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 0, 0, 0.00, 'standard', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000012', 'DRINK-AMERICANO', NULL, 'Americano', 'finished', 'cc000000-0000-0000-0000-000000000011', 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 0, 0, 0.00, 'standard', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000013', 'DRINK-ICECHOC', NULL, 'Iced Chocolate', 'finished', 'cc000000-0000-0000-0000-000000000011', 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 0, 0, 0.00, 'standard', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000021', 'TEE-AGARTHA-M', NULL, 'Agartha T-Shirt — M', 'trading', 'cc000000-0000-0000-0000-000000000021', 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 10, 3, 25.00, 'moving_avg', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000022', 'PLUSH-AGARTHA', NULL, 'Agartha Plush Toy', 'trading', 'cc000000-0000-0000-0000-000000000021', 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 8, 2, 18.00, 'moving_avg', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000023', 'MUG-AGARTHA', NULL, 'Souvenir Mug', 'trading', 'cc000000-0000-0000-0000-000000000021', 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 15, 5, 12.00, 'moving_avg', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000031', 'CLEAN-FLOOR-5L', NULL, 'Floor Cleaner 5L', 'consumable', 'cc000000-0000-0000-0000-000000000031', '0daef3e9-f205-4168-8301-161656f2c831', 8, 2, 35.00, 'standard', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000032', 'TRASH-BAG-100', NULL, 'Trash Bags 100pk', 'consumable', 'cc000000-0000-0000-0000-000000000031', '7a856da1-1b00-4fe5-90f8-6a67a09b8aff', 10, 3, 22.00, 'standard', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000033', 'UNI-POLO-M', NULL, 'Crew Polo Shirt — M', 'consumable', 'cc000000-0000-0000-0000-000000000032', 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 20, 5, 40.00, 'standard', NULL, NULL, NULL, true, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000034', 'PPE-HELMET', NULL, 'Safety Helmet', 'consumable', 'cc000000-0000-0000-0000-000000000032', 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 10, 3, 55.00, 'standard', NULL, NULL, NULL, true, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000041', 'SEMI-ESPRESSO', NULL, 'Espresso Shot', 'semi_finished', 'cc000000-0000-0000-0000-000000000012', 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 0, 0, 0.00, 'standard', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000051', 'SVC-VIPTOUR', NULL, 'VIP Tour Guide Service', 'service', 'cc000000-0000-0000-0000-000000000001', 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 0, 0, 0.00, 'standard', NULL, NULL, NULL, false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: bill_of_materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."bill_of_materials" ("id", "parent_material_id", "version", "effective_from", "effective_to", "status", "is_default", "yield_qty", "approved_by", "approved_at", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('6228de3f-7369-4180-ab8d-e382f97861d6', 'a1000000-0000-0000-0000-000000000011', 1, '2026-04-26', NULL, 'draft', true, 1, NULL, NULL, '2026-04-26 10:10:40.852432+00', NULL, 'c0000000-0000-0000-0000-000000000003', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: bom_components; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."campaigns" ("id", "name", "description", "status", "budget", "start_date", "end_date", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('b4000000-0000-0000-0000-000000000001', 'Launch 2026', 'Opening-season promotions', 'active', 50000.00, '2026-04-18', '2026-07-17', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: experiences; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."experiences" ("id", "name", "description", "is_active", "capacity_per_slot", "max_facility_capacity", "arrival_window_minutes", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('ab000000-0000-0000-0000-000000000001', 'Agartha Encounter', NULL, true, 50, 300, 30, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: promo_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."promo_codes" ("id", "code", "description", "discount_type", "discount_value", "max_uses", "current_uses", "campaign_id", "status", "valid_from", "valid_to", "valid_days_mask", "valid_time_start", "valid_time_end", "min_group_size", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('b5000000-0000-0000-0000-000000000001', 'LAUNCH20', 'Launch season 20% off', 'percentage', 20.00, 500, 0, 'b4000000-0000-0000-0000-000000000001', 'active', '2026-04-18 07:24:56.820039+00', '2026-07-17 07:24:56.820039+00', NULL, NULL, NULL, 1, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b5000000-0000-0000-0000-000000000002', 'FAMILY50', 'Family tier RM 50 off', 'fixed', 50.00, 200, 0, 'b4000000-0000-0000-0000-000000000001', 'active', '2026-04-18 07:24:56.820039+00', '2026-06-17 07:24:56.820039+00', NULL, NULL, NULL, 3, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b5000000-0000-0000-0000-000000000003', 'WEEKDAY10', 'Weekday 10% off', 'percentage', 10.00, 1000, 0, 'b4000000-0000-0000-0000-000000000001', 'active', '2026-04-18 07:24:56.820039+00', '2026-06-17 07:24:56.820039+00', 31, NULL, NULL, 1, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tiers" ("id", "name", "adult_price", "child_price", "duration_minutes", "sort_order", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('ac000000-0000-0000-0000-000000000001', 'Standard', 89.00, 49.00, 60, 10, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ac000000-0000-0000-0000-000000000002', 'VIP', 149.00, 99.00, 90, 20, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ac000000-0000-0000-0000-000000000003', 'Family', 249.00, 0.00, 90, 30, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: time_slots; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."time_slots" ("id", "experience_id", "slot_date", "start_time", "end_time", "booked_count", "override_capacity", "constraint_type", "constraint_notes", "created_at", "updated_at") VALUES
	('b9e99a03-e275-48d8-8e83-04055f5dd772', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('2c01e1e5-6320-410c-a49d-f75c06e0410d', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('724a50c8-c394-494d-8768-6af7dae6d21f', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('05f1f0c6-6826-47a4-bfde-377daab93fc8', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('f037c617-3150-4ef9-b292-458b90a47cd8', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('5c4acf29-663d-4099-86e5-275bf4a486db', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('89299eb4-62f5-481d-9ed5-f867f204dc04', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('af892d2f-1623-4302-8574-36e86bccab7e', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('344ca328-73d7-462f-b640-b6e5d4568fec', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('38220149-a669-4549-81c0-deef4c64844e', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('ec0bd291-738e-49c7-b52d-4fed4679dd2d', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('d8e9eb0f-7212-4aff-8203-44ab4206ae39', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('ed7bf0c2-d469-4692-a1b2-dce50d104eb8', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '10:00:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('7badf91d-6a85-4641-84ca-dc983071b6a0', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('5ef7d42f-4d91-4178-a3c6-6a4de049eec2', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('fd3719fa-896c-4766-ab8b-b3d588f1a574', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('151ec305-18e0-4569-a5f7-91dc1ffdc2c4', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('6b710ca2-b890-44e6-86b0-f1b5fdd3e837', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('52ef06bd-54e9-4b95-8d86-16afc670bb5e', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('14390a1a-5e86-456e-a47d-85041c970aac', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('11677720-d8c3-4340-b875-6eb066965336', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('248a1578-5012-4b1d-93e0-b04b83887e1e', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('884ba975-bbab-4515-bc18-1aac62fbeb85', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('fb4dfb5c-56cc-489e-bb1e-a4eaa6a52c1e', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('ddc4da46-aa5b-461c-863d-9fce9e6eec91', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('77ad18e4-ad5a-42c1-8658-dfd75bcdc857', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '11:00:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('ebc165b2-0417-4bd7-b844-a47c0aefe337', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('a48f2bf5-0cc8-4d27-8f79-e044e9fc8cb0', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('92c763a8-5f95-460b-933f-8d70857b1d6c', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('2c264060-1832-41ac-b704-f5b163434c59', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('4f89a5cd-04bc-4006-b7e5-0cf629456baf', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('b6688187-0c5c-47f1-9b32-b2538b3d08e7', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('922fa265-bdb6-40a5-ae81-9d19db9abf2c', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('faad32da-f993-4420-b318-6a89f19003b8', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('2d7ccb9e-cb19-4ee0-8425-1ffb45a91996', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('bc1fdbb8-7cbb-459b-8958-1bd118128606', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('51ff8cbe-0e8c-4511-b9dd-72f5bf851e0a', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c61678c4-859b-4570-b810-69927a47294e', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c769182a-eadc-442c-91d8-9dd30e86733c', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '12:00:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('b2537623-5a59-4d08-ad63-6d4278a90146', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('725a742b-661b-4c5b-b46d-857de4d3b975', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('ae819f4a-c114-468f-8d34-2c655b03c5ee', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('8d1032ff-5dba-40e2-aed1-879369f454a5', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('057ad213-a0be-45ce-90f8-1b7268a7fd13', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('53f46c84-41c2-4e4b-9f84-1c12b6580eac', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('a6be82c3-9242-4071-8406-f9b8d9eba061', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c5e64e96-15c5-447f-b031-fa4dc3fd142e', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('37ae0d37-f58f-4ca8-b040-b5344254d222', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('acd38ec5-a395-4375-9ca2-4a7a5698b9b9', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('fd09e1db-5629-4ff7-acc5-8360f3721a14', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('4fffa24d-3ac6-45c7-9f74-429ba52b6489', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('3d797436-d7d5-4ebb-8b7a-ab243ede8b73', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '13:00:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('1150cc5e-f97f-4b52-b4a2-5757a920a13b', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('70f49d6b-386e-4ca2-b3c1-eeadf09c1ac2', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('15421598-628d-47d1-ba90-480d017c8195', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('5e899736-0243-4932-b9e3-e06e8341e164', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('00ad5e4a-6414-4622-b5c1-da14b0e469c7', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c9d0ad56-4942-4d9c-9f9c-cf5ebf1b0f77', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('44bf9522-3e03-4dff-afcf-e81351849adc', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('f80436c7-8ba7-420b-8b0d-982f25cd899c', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('140ca11d-5ddb-488b-9653-510e4bce618f', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('8b59c5ea-2aa3-4e7d-bd08-823bb75bdacb', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('cdc70b89-2a52-4cdf-9901-ac91fbdda4cf', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('42012aeb-a5f8-45d0-aadf-f9b80fadc9a7', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('30e55ff0-401a-4fc5-a513-0e0facfbe8f3', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '14:00:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('d5819b72-647d-4644-8d16-6eb784a36a5a', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('1dae22cc-658c-431d-9eb9-cc94a598cada', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('5710014c-ce60-43dd-a63f-16ff08d34269', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('38937f0e-8276-43a5-96a1-6719cea0d5c1', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('dfe84076-8010-4ada-94ea-ac8333fc100c', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('6ac295ee-272b-4fb8-a721-72dc99428481', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('76b2e422-01fe-4484-baec-deff45b2de11', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('5951a95d-ecf3-450d-a49b-70a847cbe8cf', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('ec2ea68d-7964-4d9c-bb6a-96a95cd85524', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('571bb187-c577-4a43-bd21-6993aa40692e', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('bef65dba-bb60-4e3c-a5ad-07a6a2f4464f', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('96aa0e53-904c-4bb2-a26b-4d7d7b8ab10d', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('7150cd7e-afc8-481e-915f-9ebb218dd079', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '15:00:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('5bd07ff6-ac09-48d3-9d49-117e5a461699', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c3c47b1a-7476-4669-b6eb-4380b0dd572f', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('9cbaff3e-1ed5-4004-bd58-02baeda48841', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('1c75242c-131e-482b-92e6-3cb8fef6033f', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('20acff22-52d7-4841-8713-85285bc5db78', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('4336b572-4036-4b9e-9c52-749aad8fb4e1', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('b419a2b2-7a59-4515-9648-a2ebbb7bdb41', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('de99e9e7-e39a-4569-8fb3-fe8b529cdf61', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('3028532e-bbe3-45fb-97cd-9c79f3b7b146', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c8bdd8be-84bf-4f53-a4a2-e3744b47724f', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('83d0a5c8-f95f-4706-ba1f-1009c5aa4ab7', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('30384539-9195-4a86-a9ae-40eeb934066b', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('ea8613cc-2fde-44be-b40a-08a7aab6a658', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '16:00:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('bbf40f92-39ad-4f79-8272-61d7508a8475', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c473f164-2247-4a7d-9d32-3d36e7116187', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('733a53ed-589a-4b9b-bec8-34a5d52806f3', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('09fa52b4-dffd-4792-b7d0-6feece0e66ab', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('887abd14-0865-4994-8d79-f12820c72073', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('97511910-5460-4f63-9844-6dc5eca34288', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('1e15f9bc-dfe4-4fa9-95f0-ee18ea426ed7', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('f3f52aa7-be35-46b2-b4e3-9286945aa372', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('7ad15a0d-9831-4dfe-90b5-6dd2b3597b2a', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('70061593-f399-4d5b-860b-179955f4a666', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('730401cb-ae83-4a4f-86f0-c75e2f5b8089', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('0b7eb3d5-290d-49b7-81ae-3f0c9a12b7e7', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('305d892e-230b-4044-a3fa-5d4fce4ff970', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '17:00:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('97ac39f6-7b3e-4233-943b-8153bd98c0c6', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('363bd1da-33b7-4fd4-bb88-a0366a1313d0', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('3633f0ee-847a-4ae0-984c-2fb1883099ad', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('5c541e3c-e578-470a-bbfe-dd122a91ede5', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('9c9a56ba-3da9-4ce3-856a-ae9ca2d56fd2', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('41eed354-c33c-4b67-a268-71ba172fc5ad', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('910d75e7-85dd-443a-ae14-ebff6bcd9d0a', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('1997edda-7b85-42f9-ac15-4565938737b1', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('3dc3a264-413c-4e57-8325-ae91f8ba35ed', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('daff18a6-1ecc-4567-a49e-6aff518a0b2c', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('a41f8662-056e-4ee7-9b06-213c524fd5c5', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('5c17a54e-4e95-4d0d-b4f4-72c2bc232226', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('e94bde81-9ff3-421a-b8d9-fab32e0546b0', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('d3fb3a16-5fb5-401f-b6e3-8ccd99c996b7', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('52028a1b-765f-4301-9b5b-d80e95160a76', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('f3758c79-2934-4dfb-b3f7-eab6c92258bb', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('daf9fd88-f5c1-44e3-9b58-946b064c3646', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c8a94736-bf9b-4d2a-8b28-9fc71d649914', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('7de66dfc-8707-4dcd-ad98-aec04e895a4c', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('acf189c1-620e-4db5-9001-8bf0e04ba000', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('b7072c8a-6e41-4117-b8dc-82fab0ed465b', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('08e2ea93-f1f4-4a96-81ee-8c34f33ed784', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('f3acd322-0bae-4c7c-9796-e0b1fbd355b3', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('ed23cdcf-789d-473f-8e41-c2de55961622', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('81ff59d7-6065-43d8-88df-e922582947c2', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('ae97b48b-a849-4dda-936e-ce7b5bf64e85', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('556fc10e-5bd1-40ab-bbb1-54892e3a4191', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '19:00:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('381c9232-683d-4796-930f-567b3bd826aa', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('695df0c4-0f53-4278-979f-2fad499e2517', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c187c95c-d481-4d6f-9b15-d8309e3cbec5', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('19c35ae0-f848-4dd8-b6d5-ba718935241c', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('f5b9e54b-0cb6-4f7d-a645-4218cce4603e', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('8b26aac3-2746-4a49-8675-d4f9a73a9f83', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c4c03d0e-3f62-466c-98b1-84463a7339fb', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('d31a3060-9524-430b-912a-27c8cc3bb721', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('25021958-9a3f-4778-b052-668768cf162b', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('535af5ed-8002-4248-ac18-2ba0b7f2b938', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('000402a7-c4f1-4ff9-a682-0d1161c5fb13', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('32df78dd-bd19-4a48-a551-87750a68a43f', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('0d27ef6b-2d5d-4b89-a033-56b3a6b7d224', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('c73f4ab7-d109-40a4-9f71-cf7dd8982526', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '20:00:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('dab71544-87b3-44b3-993c-702bfc7987e1', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('e2b1eaf6-f5d5-4443-884e-1bfbd57c7d05', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('2c10e945-13ac-486b-85a1-49d4a5419938', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('44e962af-7c2d-4cb8-904c-1fbfaac9c83a', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('af194d59-c544-4479-8648-07e8368f59fc', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('fb6b700d-4051-456f-b074-2c7bf4dfdea5', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('ac497ac3-a8ed-4392-b608-636c7f81a21d', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('9b2afbe5-ebb8-4535-a239-3ed032d6d5f6', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('200e34ff-cb86-4f84-ac6b-ef633e974002', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('5a805869-0e22-456d-b814-023c7dd5efac', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('1bcf52fa-9e3d-4409-8e15-b34581dd7c5f', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('eee812fe-82ec-40af-b187-866f51ed4930', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('8808ff98-e9f8-455d-b2ba-912680cf2442', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('295bfb23-e0c2-44c7-8826-04ff551d54e6', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '21:00:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('9a899c92-14d3-4292-b4ee-dc327fb0f30e', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '10:00:00', '11:00:00', 2, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00'),
	('7b8e773f-3bcc-4096-a3aa-23e3ef67886b', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '11:00:00', '12:00:00', 2, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00'),
	('ab2258de-ab3a-4c85-a89f-dbbf1fc8be36', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '12:00:00', '13:00:00', 2, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00'),
	('84bff161-5bfe-4061-8f82-1f170310d290', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '13:00:00', '14:00:00', 2, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00'),
	('ce24e617-2abf-4f48-a997-0dbfffba8624', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '14:00:00', '15:00:00', 2, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00'),
	('5562ee48-0baa-42b7-aa46-5eac1935519d', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '15:00:00', '16:00:00', 2, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00'),
	('e2a172d6-6c33-45b4-a43d-5971fea6702b', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '16:00:00', '17:00:00', 2, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00'),
	('c5c5268f-4bca-438d-90b6-e89390702b04', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '17:00:00', '18:00:00', 2, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00'),
	('18079b0f-48be-4016-9b11-51d027030ac7', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '18:00:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:30:00.269041+00'),
	('fb0ffced-d078-4d2e-ba47-7038b9a0250b', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5cbcbfcd-2f34-496e-97af-ba0a3a8ea723', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('cd756c7a-ad32-4d04-9014-799223f495de', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a54f17b0-64fd-42b2-b39b-9b1fa4bfdb26', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('13a5ca59-2e28-45f0-92e8-428dcd3a3f3c', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('80c8d5c1-2507-4744-a5b8-4c63ffce45cf', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('1d631240-f1f7-4597-825a-4799f2e0ba86', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('0f3e38c4-3d57-4ec3-9663-339a3e7e3f71', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a7fbdd8f-807e-4740-9666-9a502e33d589', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('2dbac859-3b9f-4e1f-a665-5abc22b3d429', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('3a8ab5e2-2c37-428d-acec-eabbac894e1a', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('09ae606b-6fc2-43e5-910d-8053b4464ec5', 'ab000000-0000-0000-0000-000000000001', '2026-04-18', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a09fbbfe-1be7-4318-93e2-eb73ae43aa72', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('8994387b-0b1f-4e0d-a821-daa3e20ff42a', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('c107357f-c563-4bc0-832d-0b3859c34e83', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('21c032bd-6bf5-450d-a493-4298e5d45aa1', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('70335f73-8b17-4a6c-82c7-c739e4bb6ba3', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('69f95047-4f36-4316-a91f-8cd91c156d64', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('7cda7a5b-6360-4d13-8cca-40c693768d36', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('c55c6eae-3059-42e4-9f05-7d44251cd4b3', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('d03d71ab-2e21-4c94-a496-13ca50033b41', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('d23f08ba-743e-4b3d-8f47-a5d9a0fa311d', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('88308a37-7c8a-4645-a81a-34f52649c7f3', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('6be65b28-cf2a-400f-8613-5a952bdeabc1', 'ab000000-0000-0000-0000-000000000001', '2026-04-19', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('2ec54047-f649-4ca3-931d-16e2888f2326', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('f2315671-c09c-40e2-bcaf-7c24540c602d', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a742632d-13a4-40e0-9725-50453f87f2bf', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('d18f09f9-47bf-4f7a-884e-bd7ddef71f2a', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('c29fda2f-8813-4f5c-9153-3f54dcc0969c', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('6dabf35d-a5ef-427a-8d42-ecbfe8010ca6', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('fcdd3351-62f3-475d-8bbb-b7f02828c259', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('03ee5c56-a941-42f4-9ad6-7b24a2615722', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('d30761e2-450a-4d59-ac93-a472452d946c', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('bcefef65-ccd4-458a-84db-46b7322b4596', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('f432d90d-7190-46f4-8f6f-2ddbcd565636', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('4aa99e55-7705-4ebf-ab90-5a749e520835', 'ab000000-0000-0000-0000-000000000001', '2026-04-20', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('d2872daa-25f8-4bb7-982d-19396484c64a', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('6d5d6a7b-c3a2-4645-8322-2a45a8db4630', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('27e89a84-1147-4d6e-9858-5aa856ad3aaf', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('acd04f81-1851-431d-b4bb-6949617ef083', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('201bd51b-6e82-47c2-9c04-9e9ab0450e65', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('dfadf088-0ca4-4e07-9ad7-614d36f2894b', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a164801a-b460-4e29-a7ff-57c14b2a9ff0', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('22bba07d-5b07-47bd-89cb-2d165f291d8a', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('ad59742b-bc02-49d2-a142-e72bbdca923e', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('3b74f6b0-4342-4969-850a-fdc5d248e4a2', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('910dbc04-5e8a-4131-8e54-0f5ce6d67455', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('aa94e44b-467c-449a-9a9d-81e621f32a0b', 'ab000000-0000-0000-0000-000000000001', '2026-04-21', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('82edcd1b-b7a0-436c-9c85-49ecaa56e748', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('b9d2d1ce-6d03-4380-a22d-1c6f6dae3906', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('ba78a72a-599f-4fde-b39f-20e1e327e41e', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('0dfaf085-6838-49c3-9e71-0fe2cc545f92', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('26d933ba-0eec-436a-b711-da53572e9f5a', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('e4dc445c-f4e1-4c0e-a288-a16041b617a7', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('b88c6a9d-ca57-403e-af79-2cb168256f6b', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('53b9279e-6157-492b-9dd1-df969ba6c653', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a95486ec-ea0d-45ff-8fab-1dc9b2f9983b', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('e1781423-20bc-42a1-a3fd-f6694bfacb81', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('3481e4e7-2878-4a8d-81eb-ac03522e8305', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('f8b92cc5-2312-453b-b585-24c879d409da', 'ab000000-0000-0000-0000-000000000001', '2026-04-22', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('6db051a0-89eb-49ef-b042-4e8e1cad6aa3', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('b395e883-632f-422e-bf9a-410986342620', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a46db9e9-82d8-4b96-9655-dbe9e1c3dbed', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('9bda7caa-25fe-45e3-8810-2b04743f8139', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('38cbb09e-b2e4-4986-8b89-3ea30119f5ab', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('d984b38b-e3af-4d46-9d42-743671efbdc4', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('3dd2a55a-475c-4453-b461-a667f3b7c698', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('9cde8f04-51b4-4f4f-b0cf-c64e60ffec67', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('461f87e4-a153-44b2-aaf7-d0d0bfc1c269', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('1baef6dd-21e7-4496-bdd4-505d6a68ba2f', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('c6cf7048-d2c6-435b-871e-85bad1853e61', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('e2db638d-04c7-42c6-ab1d-dc4ef702a9f4', 'ab000000-0000-0000-0000-000000000001', '2026-04-23', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('6f6465e8-a135-4295-8638-c837776d9508', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a6e3384e-e338-459a-ad62-b0b1cd80f3c7', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('4a945232-bff5-4c25-b467-6fc688545233', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a3adc624-c240-400e-b535-678c22b0f624', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('d2ec8e00-35da-4a54-a028-4106dcd1ceae', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('d34b8d4e-9ae1-491a-a472-4aaea1378f98', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('0333f06a-bdc3-4af9-b7da-57e8632292c5', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('ff1b9446-8c8f-4596-85ea-61137cd17472', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('e8a32bd5-db2c-453b-96a1-6749804c9d85', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a5ffca8f-a9a9-44d5-9b90-41ff990db692', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('9b4f79ce-e399-4674-af9d-fb65fdb3b9fa', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('d9b23138-34d6-4ea2-a4d3-980c27e5945a', 'ab000000-0000-0000-0000-000000000001', '2026-04-24', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('b233c2a9-592c-4763-afa6-6ea7b36982bb', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('7d89a179-acbf-411e-85a3-8a74efb608c9', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('1cf59cc1-10d8-4a6a-8828-a9ed18e9e02a', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('849b302a-5fe4-48d9-8a90-4c572f377e28', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5c066234-ea35-4a6f-8e5b-8382212257a7', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('f826759b-6a36-4164-8f19-d3a75683482b', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('65b6a9af-0b5b-4e0d-83b8-c2ea7bdeb3bc', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('49319d9d-012b-4ce1-981c-50f1382326c0', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('f76a4e20-3762-404a-913d-81ee835f0075', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('530ee0d7-a1c4-420c-a332-31ce5d7714e1', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('f09599e7-084d-461c-8b12-c9020c2a0f3a', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('84829c9c-0c53-4099-b879-4324e28f62c6', 'ab000000-0000-0000-0000-000000000001', '2026-04-25', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('0be6a820-b22a-4d2f-872a-b1742dee33e2', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5b1a5ab7-1c35-4fd5-977e-a5da2208da77', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5f3407fd-f556-45a8-9267-a68358a4ed67', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('9e9306c9-bb1d-4152-a6aa-e29bed2a38e5', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('fb90a279-9d3c-40ab-bb84-753914002dd3', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('cdba67e2-8281-4e3b-9699-667282ef0008', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('76e5c39f-4597-49d8-8c33-eb36d0c729f4', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('71183b26-e100-4f99-a5e9-585c0b0ac3d7', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('234bbaf5-1e7e-43c0-92f1-0ce20c03b5b0', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5d4af53a-ad87-4ca5-9663-7014c92a8907', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('2df64799-6689-421c-afca-8ba351a1d0ba', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('7da15da8-6c3b-4fff-9c94-e458844e225b', 'ab000000-0000-0000-0000-000000000001', '2026-04-26', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('4fc3e758-4aa4-42ae-9b13-7079dd84979d', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('71c34f7b-0cf4-4240-a6e6-15362c19e86d', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('b825081b-8481-4bd8-8d96-2b85711704c3', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('75653d77-1bc6-42dc-88d3-4b6ecdec7c2a', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('169d56f6-1024-4be9-b10c-1be85a3b6af3', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('7038ec61-9c3b-4598-8dea-027eb89239b0', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('d90c77ab-1527-461d-b10d-4cd6270e2db7', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('23b52a47-7813-40a6-9c2e-088d4606434b', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('0ed381aa-ee3e-4681-9a27-b2b0a03c322c', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('87bbc5ea-0249-4d26-bcca-6c665d07fda2', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5f5e171e-95b7-437b-a48c-753975c60e99', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('2e66fb58-9c29-4eb7-8694-78cec9345aad', 'ab000000-0000-0000-0000-000000000001', '2026-04-27', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5db4f445-fa22-4e83-8986-614d5dbb745f', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('30ee138e-0fce-4c12-9beb-ac7a582ff441', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('c7605f9c-9288-4ab3-a0db-32938dd733f5', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('ea6e3e99-01dc-46af-9faf-3597a84a15e3', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('e74b523e-adf3-4fed-941d-323dcbe77bb4', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('742a6801-eaec-4f8c-8653-4fbfb918cdc9', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('9931c43c-c13a-4d18-8b21-5af8e5fb1791', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('47d62a2d-2cff-483e-b8bc-067fe4bf43df', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('dab1113e-f5dc-46f4-8d32-717edd6f1d7a', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('3c43659c-b160-4236-b19b-31d5de21acdd', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('bc124758-d88d-4cc5-8321-74bea835ff8b', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('30c3026d-758f-40ea-b594-a8ce95972ced', 'ab000000-0000-0000-0000-000000000001', '2026-04-28', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5992318a-88e4-45a9-8acf-808dfb6daf0c', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('8435d1f5-3052-43be-b205-79a9df397739', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('81c477e7-abfc-40b6-9b95-d2efaefc6f4b', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('1cd259d9-735e-4ac4-aa2e-60d189fe5f23', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('955aee3f-6d1a-44ec-9c86-e4deb20e4ed9', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('0621d929-d9e5-4b75-993a-317fae1fb3d7', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5cfa26d7-fe38-4d75-987c-43b8b3d70a84', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('3362cbfe-ab92-44bf-aeea-e5d1f6b35cc6', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('3d66ad64-865d-4c6d-a093-6cf622644df4', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('6239776e-9132-4a61-8008-0c10209ac68a', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('ccd1c4ed-3492-404e-a096-2e6eae24df20', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('c74c8bb1-9f98-47b1-81b5-1f1ea299c352', 'ab000000-0000-0000-0000-000000000001', '2026-04-29', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('08111cc5-6041-4ecf-b979-365199203413', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('636045ee-b287-4196-be9d-f52110374cb9', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('6b8b6fc8-62b4-4862-8370-5a2da6349f99', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('9709c6c0-b0f3-4e2d-8235-88906e95c00b', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5f01b985-3c19-4966-8f1f-9cfe93f48ffb', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('f3f44fd9-249c-454e-b60d-af25c782ecfd', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('7ed05a30-c528-4b9d-b0ff-9668f671b88d', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('8f497ca7-708e-49b7-8709-f22381fd0f44', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('0c51cd93-4731-430a-a4f1-14c4216323ad', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('fc2e9989-4744-44ae-85d1-7e93a26a5acd', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('9c9f4c10-37f5-409b-9f22-43eb9e0a13dd', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('cac50e36-434b-4581-a933-eaad5dec7822', 'ab000000-0000-0000-0000-000000000001', '2026-04-30', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('b5683b40-cabe-4a14-b487-b7cc2d1a43f7', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('07797c2b-39de-42cc-8173-bfc27d20f3af', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('4cb3a956-6c93-48cc-a8b4-27b78a2f96ce', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('9d314516-b6de-43e4-b76e-cd95b0b5e4ce', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a766a938-a2c6-4b95-9053-b79a336dc738', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('8964a575-94c3-4e11-bcaa-da8418493ee0', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('33b43d5a-3ffd-4f97-b2cd-91638e5ea0ba', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('36fcf840-6909-49c4-a86b-3d2874a05ba8', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('0825555a-b3b4-47ad-a0b1-02ae591ab22f', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5dcaac14-d1aa-4b2b-b819-80ddcd7ac81c', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('c69517ec-4088-4594-8baa-ccf96d83a122', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('37d04826-fbc5-448e-9910-2a9ac04bc154', 'ab000000-0000-0000-0000-000000000001', '2026-05-01', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('8bd006e3-e710-4b23-b878-5eb876cc029f', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('e479cf37-182f-4506-a82f-c3e29da80d96', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('fa0835dc-c895-4ff9-a86e-cc1d04def160', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('022588c6-7aa4-4d62-af48-ac7e81b2cf60', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('fdc2afd5-14ed-4952-a8ce-c25a62f82593', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5eb33208-11f1-4156-a931-84ae069182c0', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a44e1aab-877a-4467-8a29-6393042ac307', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('8b7f26ee-5bf3-4d8b-908e-40c9f3236f2c', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('3374ddc8-5537-4b3b-91d0-4caf47cfbf91', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('cdbe742d-6c9e-447a-9d57-d710c9e0c898', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('06535116-caec-4b85-8d7c-da3287150b9e', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('051ff052-f254-40cd-a936-35dce5e3fa11', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('5265f000-4d56-4abd-b4ed-a045940ec43f', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('6a9308f2-a9f6-48d7-b3eb-34b62512b1d7', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('4fb589d5-33ea-4399-9a26-a59eb5647b33', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('c28f7f5b-feaf-44db-9e70-6803472d8bc7', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('ffd7d10b-57b1-401e-a8ff-aa571088a123', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('71fa1fea-4487-467f-99aa-3642cbd9c84d', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('ee3b1dd5-118d-4128-9c22-4b3fef474b54', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('c5b921cc-5635-4959-96b1-8000d61d7806', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('07355338-9f6d-464e-90d9-441483316bf7', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('a633a988-701f-4f88-a536-9f4a26cb923c', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('f809cd68-071c-4480-ac7d-806f7ac83be1', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('07bad25f-a88d-4ea4-97ff-547d0cf84ebd', 'ab000000-0000-0000-0000-000000000001', '2026-05-02', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-18 16:15:00.208543+00', NULL),
	('fb0cbf39-ed7a-40b5-84f8-ad897985f9ba', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('dbb9ce71-2c03-4ca1-b824-34fe8cb15365', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('9ec6d1d9-48f4-4e5b-9ada-cefbbf992183', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('47462716-606e-4383-b775-ee43afd94b5f', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('36c907fc-b712-4471-b2c0-891d073fab48', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('4190ee54-102f-471e-875d-76816d0529ed', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('4fcb226e-e2d1-4422-8108-2d6d60614e71', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('5947ed03-45b2-4604-9d2a-4818c55e3175', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('2bcfc5ca-1c4a-4da8-8a69-ad2590ea0941', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('cf4b0869-e423-464c-97d1-1beabd98661c', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('161c68cf-ec5b-4638-b9a7-b25e93ec2cc1', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('cc11ce11-8dcc-4c9e-af54-6477ae1192cc', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('b831b69a-4cb4-4b49-8268-8823cc8b98c1', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('f73ebcf2-9851-4ae1-abed-9fed8da19e46', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('618a24cc-984e-496c-831c-683573f0e374', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('c887040e-4678-4e48-923f-1a7f5b34f56a', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('b5b3d86b-8e0c-4b0c-98b2-739b5dffed4f', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('1fe2fd6a-e4aa-4c48-8514-2dcecc38355b', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('59246051-4ef8-4b9f-a5a9-de1ea98a4210', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('7349cd7b-d2e5-4ddb-99d2-f747b3a55c77', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('51685e56-7378-4382-bf98-89580858ea04', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('bbb9b90b-5566-442b-81ca-b3c138a1d573', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('9d4a7a38-6fa7-40d1-a54c-7b1214a34364', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('c7f62d8f-dcb2-40b9-9bc8-6a89990c146b', 'ab000000-0000-0000-0000-000000000001', '2026-05-03', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-19 16:15:00.228084+00', NULL),
	('06b0920a-6438-4f55-9b6a-b6c9409fc9ae', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('88339f61-0351-47d6-a9ef-36925a8e63ba', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('a6deefa4-2cb3-44ab-9970-e3c6f2ed9cd4', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('38235fc8-5a55-4909-95ac-d52d958aec0a', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('a108ce94-90cd-4fc7-84cd-5333c9b3bfd0', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('23932fc8-8eaf-49e0-8828-b9bf31a70b5f', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('11d7928a-76d3-4e9f-b35c-75b735f18c9e', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('37160233-0ce3-490c-b9b2-758bce06884b', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('2078755a-5074-4656-aff5-b8c64fd6abe4', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('036cb12d-df89-4a92-a17a-9dccaa6adb07', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('de8fd7b8-d9e2-4c43-b3c2-ebe0ab228aba', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('a09a1d34-14dd-4d5c-a8f0-e9e88a0822ee', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('49a88673-84e7-4f45-9674-7a0eb8fa17b4', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('d92f3eab-4d29-436f-9519-0791ad124f00', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('11ede593-d555-470d-9dbe-a8a71eb1a1d2', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('187a6b69-c7e2-4834-8347-6979bfc26377', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('cdcf0a1a-685f-48fa-8c6a-bd6278dd8285', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('3f7ca05e-47f8-4b65-b0a8-dbb29f1f392a', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('1a908e0f-0f3f-4e37-87c8-752ebf07a7ed', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('a6e3c5b0-b353-4f86-9b47-11e28aab8746', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('06d69471-2a79-4a8f-a369-325036fb7f08', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('bb811318-6112-4239-bfd1-4cc3797a8610', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('9b9a1abd-56a8-49f3-9b86-55d63654d489', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('3eb6f15a-9e7f-4a2a-a034-036c1ccd95f3', 'ab000000-0000-0000-0000-000000000001', '2026-05-04', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-20 16:15:00.188767+00', NULL),
	('94b318f1-3ece-4873-8d86-e93df61c29f8', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('2e3fb503-0d55-4298-8d4e-6e0b75b3cd8f', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('78ecfb65-573b-436c-9c5e-2a2c444e2421', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('f52cdf1a-7bcf-4130-a119-2862523ac071', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('20976d41-e195-4da1-b05d-cb177eff7486', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('00945319-a1ec-4065-b9f8-4e619d724616', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('f73595ce-df6b-4e44-bd37-381a48e8557a', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('d0b8f8ca-e928-4cbc-bee0-619f7d7bc128', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('6707d550-902e-408a-b201-a2dbfa7f8d50', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('0f4ce4a4-a679-4208-9ea7-5a70f5e54d7c', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('f1204344-a450-45b0-9d3b-33a6fb928505', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('1a07f2f3-d344-4874-a185-d4258fb4e511', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('fe022930-ea41-4710-915b-21142575781a', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('cf0e22fd-e9bf-4799-8a2b-5cd861e14b26', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('36349ed2-42a6-4cf8-b7e9-03df15e9fbca', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('d8d7b327-c2ea-4e84-a497-d60ac6726ee7', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('dae35bfa-b2b6-4a1a-a6f9-741daf89b7e7', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('2ea106db-c860-4acf-a59c-2243cd388bd9', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('bdd85cb1-f6ee-4492-808a-a182fd373afd', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('b2583c61-69a2-477b-87d1-8deb29d375e8', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('4b38aa28-d7b0-4b56-8c27-27fa8f32ba17', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('6fd3d667-24e1-4dd2-b768-0ddece5ab052', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('184ab9bc-5888-4517-bc9c-aa36c60232dd', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('007c61a5-3c88-4ef9-80ad-293f24a8ef2d', 'ab000000-0000-0000-0000-000000000001', '2026-05-05', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-21 16:15:00.206656+00', NULL),
	('672466ae-b175-4e1e-8ede-2bd24d3dbed7', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('fec92ab5-a696-4f52-a72f-1a6774bc0a13', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('fd080335-88bb-42af-9ff5-00415adbc380', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('2df75bb6-42e3-48ad-8f37-219c5a82e122', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('7065aac9-bb20-478c-bf0a-c594658c4608', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('55e42810-c823-4907-b53c-7cc0cbc7de15', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('dbce5e60-bde8-4c80-875b-32c4fe088203', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('72ff93be-ac11-4b94-aff2-61e30ea3ceff', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('177ea8b9-3f5a-49f2-bf47-0e9b893b9c1e', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('415eacbf-a84c-4407-af62-4056fc0b1fc2', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('2bc0124e-a6e5-4dec-bd08-5c305bf2d867', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('8ca11a58-cd0a-44ce-82ba-81f0f3488e39', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('d4d50a01-97cc-43c3-aa04-f36a1678c6e6', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('ca530de2-f14b-4d6a-a2cd-64dff8d00d90', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('9304d167-8fe6-4150-b30d-f7662a253eed', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('0d35d283-ff93-49a5-a328-75ab2048242a', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('c0d79ef0-3f9f-450d-b201-b240e7e0f7c8', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('cacc1843-ecab-497a-be91-09bf871d1f9c', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('23348126-e2c0-48fd-a0df-d20056e46fac', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('cf0891d6-49c7-44dc-8d7d-a8635397e539', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('221afe7e-1e68-4022-9674-f3e2874a7fee', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('447e8f37-c22b-497c-9b14-65f37c1becdd', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('94970c51-95b6-44b4-b2df-e5152968556c', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('339f340e-521a-435b-af5b-467876ec168e', 'ab000000-0000-0000-0000-000000000001', '2026-05-06', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-22 16:15:00.229139+00', NULL),
	('a6da51a4-95d0-4893-bf21-bed8a63415c4', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('a69d422d-cdab-4d62-8bc9-7753d10fd71e', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('45800cb1-14fa-45ba-9674-60dda50512eb', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('6b85e946-3b03-4f4a-a43c-55486cff13cb', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('43b055cb-20de-445d-a9a1-f51c44653bc3', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('9118b270-eed7-4803-97e8-8351ebf37214', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('75e86f68-8c5e-4723-bcad-22a144863515', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('caaf6fdc-d994-4452-ae9b-3f527e77c338', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('539451ed-b528-4137-af49-58ffdf6d1992', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('c622bd23-4e4e-4aaa-a4d3-111ae562dc3c', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('6be97299-ffba-46e6-aa2d-a2aec883af5e', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('95b430ec-ef59-4525-a014-482278d94209', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('d0aa5bce-8e08-413b-a41e-85840c7f77cc', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('ca5bdf25-9646-434f-80c3-0605110cb737', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('2e7acf0b-0679-4ffa-9dbd-cc02bba08c07', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('dd75065f-cd6e-4c98-84d0-2f4a0c0f9143', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('521f12f3-b2b6-4f43-93ae-3daee6bd81c4', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('49665c84-8f06-4f0d-9940-9b6a017703d2', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('4548f090-3c4e-4ef6-a11e-a7a25b61387b', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('aed3afb6-d629-4191-8d1c-041e65a6042a', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('d835373f-c42e-4880-a0db-6388fb7b93c0', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('fb9dae16-e820-44fe-b3e6-48a895a76a4c', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('cc0f90f9-9601-4c2e-a501-01237f4aee1e', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('5ce0ea92-85b9-472e-b91c-c2d74cac12f9', 'ab000000-0000-0000-0000-000000000001', '2026-05-07', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-23 16:15:00.203562+00', NULL),
	('61453057-6fe5-4389-9588-846d86aea502', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('5a5b6656-1283-4eb9-8a40-9273f967e251', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('439f4c41-d8e9-4d19-bfed-864847c2ad8a', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('88730587-e345-4fdf-b179-b28346cab7ad', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('65a131b2-e239-4840-a004-ee9def9ea161', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('fdc2c2ed-bd28-4261-b83f-df442bbb4b0e', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('9192a87a-234c-41de-a765-c45dfee02002', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('cfe897e7-19d5-40df-810c-84946bae9dea', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('11c7f1ab-24ac-4809-8030-e9c90e5b8bb2', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('72fefce0-2fc0-461d-a596-17181a0d2cdf', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('eb0f9e2a-10ff-4794-935e-674b69571ed1', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('d2404c7c-d83f-4b31-87c4-c2df9c0dcd6b', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('9874fafd-c678-4539-9e95-08854d233ba8', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('2f57de4d-579b-4696-83ec-6f65538d3b72', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('5df2aa31-743a-49a9-8870-00433e3a406e', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('e5ad3607-22c6-483a-a7a1-63a317106735', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('353f24a1-41a5-48f3-a80a-699a98830012', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('0d9a7d57-69ce-49fe-a5ea-69a9f53e7397', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('209135e8-9870-4fa4-a367-e95f7628b628', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('223a05ce-d320-4c43-ae61-35a35744be90', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('d925b9a6-e446-4c0e-b878-eec40405ba78', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('e38adc93-0a53-4c3e-b6aa-cd16f69b4569', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('a1d3735a-a69e-499b-9056-3b3a040445bc', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('654d330f-9712-4e22-b3c6-d6c7907813c5', 'ab000000-0000-0000-0000-000000000001', '2026-05-08', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-24 16:15:00.244413+00', NULL),
	('b9b52ce6-2f23-4230-898d-1231445f15fc', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('f5415de2-92af-42a7-b93e-035108610b8d', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('d95e3d30-7985-40e3-951a-afdf34918ac0', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('a1b9db89-0597-47c4-80d1-92e49d8f47e3', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('baaff3eb-2a17-46b2-b44e-ef49055215c0', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('e3215260-630e-41c7-bd9a-4e0a05469e8b', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('098305ea-3423-404e-a8a5-8b524b6c21da', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('3c7d16ef-d6d2-45f6-b959-b5382b6d7981', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('f7775786-b478-4f2b-8297-301c578e6fac', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('58661be7-dfd0-43f8-9811-5ac20eb6ab40', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('9dc6d294-3067-461e-9033-44f703630485', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('df084285-3d17-458f-bad8-d491eecf3e92', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('1282c6c1-4e7b-4db8-a74f-39923bec5615', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('b0c8e9b7-652c-4a10-a75b-15ca3946b7ba', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('9e76cdd2-0cd3-4278-888e-b59abba2be35', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('e16d451e-6f43-4fc5-90c2-ae60e4a8777e', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('ee0d26f3-6c20-4cbe-8b19-8109f9074966', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('48b61029-3436-4cdc-bc06-f87905415df3', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('0e49bfca-00c9-4e07-976f-35332ac78ad6', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('f6459fd0-5bd5-4ea0-8e9d-f55961e81265', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('255801c0-5e21-440b-92c9-e7f3b82e3a38', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('ee3bf40a-b1ba-4833-a518-675e2cd65d1b', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('ebc3e732-8bf4-4290-aee1-833f3ddea56b', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('6af838de-0b23-4d41-adfa-2c7f8fb9639d', 'ab000000-0000-0000-0000-000000000001', '2026-05-09', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-25 16:15:00.254705+00', NULL),
	('e5d38b95-c0ae-4b9f-96b5-fbbaccd407d8', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('143ffe81-06a3-41f8-a64f-544a1e62acca', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('839e70ee-fb0b-45a3-855b-ed2423ef66c0', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('c840cbeb-2ae5-4302-86cb-303fc5b9adc1', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('6756e198-e89e-4307-8fd2-aca4da4b3b12', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('c5c4ff90-f9ba-4791-a53e-cd266a22c32e', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('67366683-638e-4067-bf9a-09f991570e67', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('a39ab212-562d-43dc-8168-7be5b8ee1ff3', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('44303a5e-6717-4af2-b8d2-3ed050bd5e86', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('30cf8397-a90f-4dfa-a713-09e40862895d', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('59390a0f-81d0-43fc-9c7a-425af7420a04', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('af5d1d8a-ed37-4deb-ac3e-1f8c32f29366', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('53c4fc0c-d865-40d9-8212-1a56cbfb1152', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('13448024-27f0-4aaa-888f-7dc6b10a5a81', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('5783a0c4-11ce-43d7-a206-a76dcfab0e2b', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('f9bfb821-eff1-4408-a45e-f579940f2830', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('2a6e153e-98b2-42f2-a366-08583251cad9', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('dc1d1740-9757-4fe1-9887-0e83d2d4004e', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('e952faf3-0c28-4845-a795-6bcf08f4fa5a', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('85d5261e-d41a-4fd0-b55c-05325931ce8f', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('244b4c0e-1f17-46f3-b9e1-2e1efdffb146', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('df0a247f-290e-4b9b-a475-b7256be5cf2c', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('f8f382a6-11e7-4d07-ae7e-511f78178e0e', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('70061ce4-1328-432f-af07-8dd526cfa9f0', 'ab000000-0000-0000-0000-000000000001', '2026-05-10', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-26 16:15:00.219445+00', NULL),
	('53a9cf3f-918c-40f1-b3a0-a59b01b52eaf', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('44ee0107-23b6-411f-8a15-5308f8ab3646', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('a301fdd5-502b-418e-9486-69ff23350d47', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('e4e47c1a-aaa4-4594-adf5-e00b9646a7f9', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('a075d689-916b-47d2-8f9b-a88700f2e98e', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('68b978a9-34e3-42c7-b76d-ff0e0fbf2059', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('70cca4e7-f950-4a38-a3de-0e2ce7f24faa', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('579ce14c-1727-414a-ab27-4ce866dd33e4', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('519b08f3-4137-4731-b4f3-c00f0fe66405', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('322fea47-0aff-4ee8-9a4d-cf5868a37546', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('8e406c3d-9c60-492f-b891-f96719bd143c', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('735434c5-3ed7-4c4b-b143-fef481ae6571', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('5f5e0202-0305-4c1e-949d-4317309cfd77', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('2d112688-1a7c-4446-8998-71e86ffcd155', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('57e50a2b-61c4-4b3f-9d43-2ba0569e0e82', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('2e9f6c3b-12a0-475b-8c37-cf8c559e58ba', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('21abf116-a430-4019-a3fc-ee2c5f3ac4cf', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('0f2ea3d6-2a13-47bf-8171-bb7994736a21', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('abcae586-5c5b-4e65-95e3-28712db635e3', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('2ab454f8-e952-463d-b99e-2fda597e560e', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('0fb19e9a-bbb2-428b-a252-e8870229daf2', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('eb8b4b5c-9c44-4c4c-8846-e152f51ab94b', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('33ffcae0-1ddb-4313-9c3f-2a0bb00ce5a0', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('f27ca4cf-d3a8-459b-98bf-205aedf8096b', 'ab000000-0000-0000-0000-000000000001', '2026-05-11', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-27 16:15:00.259616+00', NULL),
	('cbda86c0-5754-409b-b841-3bb06b1d0eaf', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '10:00:00', '10:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('abdf29f3-0c8d-4c56-a3d2-296b2951bcce', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '10:30:00', '11:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('c05bf982-14e7-4bc1-8939-77afad268b83', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '11:00:00', '11:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('dbadaf5f-3703-44c8-b39d-cbea0803f0bc', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '11:30:00', '12:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('c8a3f9b0-273a-4aa6-9817-81e481214b4e', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '12:00:00', '12:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('7c8e8985-ede0-4aad-a39d-7224257077da', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '12:30:00', '13:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('d74de42c-c8ed-45d1-ae4c-7d202257d69c', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '13:00:00', '13:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('843fc850-142d-490e-94cb-c4d35fc8c990', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '13:30:00', '14:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('c8516f6d-274f-46f4-b430-2388734a2ef4', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '14:00:00', '14:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('524ee023-8b80-44ca-82f8-42511fa36748', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '14:30:00', '15:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('9769fabc-98f8-4e82-9a08-bfa3ada0c4e2', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '15:00:00', '15:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('3c562cea-b2c0-4a80-bd85-e1c175c9e368', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '15:30:00', '16:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('af103ada-b10e-4f2c-b57f-7aa10d61a9a1', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '16:00:00', '16:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('cc4662ef-4689-4fb6-8280-e8afa44b9bdc', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '16:30:00', '17:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('6fd7f8ad-aee2-4db7-a40a-807f57f2de1e', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '17:00:00', '17:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('00c94165-8dae-4572-b09f-0afcb2a68f87', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '17:30:00', '18:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('903d261a-a4a5-4c88-9f0b-547f86b95b87', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '18:00:00', '18:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('ee99a82f-2b05-4fcb-a984-12ff3502e89f', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '18:30:00', '19:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('2ccc47b0-7bc0-4674-ab28-3d1862ca5076', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '19:00:00', '19:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('0629bef1-27e4-45e6-afa5-fb8bb582fba3', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '19:30:00', '20:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('7ca31024-308f-4d9a-bb38-eac83c015888', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '20:00:00', '20:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('11a61963-2113-4cf1-a9e5-2c7b1e520ab4', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '20:30:00', '21:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('12e14263-007a-4c8f-9226-3c495bc88968', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '21:00:00', '21:30:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL),
	('1a938b14-6c88-45cf-aad6-b6082e6653c3', 'ab000000-0000-0000-0000-000000000001', '2026-05-12', '21:30:00', '22:00:00', 0, NULL, NULL, NULL, '2026-04-28 16:15:00.238339+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."bookings" ("id", "experience_id", "time_slot_id", "tier_id", "status", "total_price", "promo_code_id", "booking_ref", "qr_code_ref", "booker_name", "booker_email", "booker_phone", "adult_count", "child_count", "checked_in_at", "cancelled_at", "created_at", "updated_at") VALUES
	('d0000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', '9a899c92-14d3-4292-b4ee-dc327fb0f30e', 'ac000000-0000-0000-0000-000000000001', 'confirmed', 178.00, NULL, 'AG-c4ca42-0001', 'AGARTHA:Standard:2:1776497098', 'Guest 1', 'guest1@example.com', '+60-11-111-0001', 2, 0, NULL, NULL, '2026-04-18 06:24:56.820039+00', NULL),
	('d0000000-0000-0000-0000-000000000002', 'ab000000-0000-0000-0000-000000000001', '7b8e773f-3bcc-4096-a3aa-23e3ef67886b', 'ac000000-0000-0000-0000-000000000001', 'confirmed', 178.00, NULL, 'AG-c81e72-0002', 'AGARTHA:Standard:2:1776497099', 'Guest 2', 'guest2@example.com', '+60-11-111-0002', 2, 0, NULL, NULL, '2026-04-18 05:24:56.820039+00', NULL),
	('d0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000001', 'ab2258de-ab3a-4c85-a89f-dbbf1fc8be36', 'ac000000-0000-0000-0000-000000000001', 'confirmed', 178.00, NULL, 'AG-eccbc8-0003', 'AGARTHA:Standard:2:1776497100', 'Guest 3', 'guest3@example.com', '+60-11-111-0003', 2, 0, NULL, NULL, '2026-04-18 04:24:56.820039+00', NULL),
	('d0000000-0000-0000-0000-000000000004', 'ab000000-0000-0000-0000-000000000001', '84bff161-5bfe-4061-8f82-1f170310d290', 'ac000000-0000-0000-0000-000000000001', 'checked_in', 178.00, NULL, 'AG-a87ff6-0004', 'AGARTHA:Standard:2:1776497101', 'Guest 4', 'guest4@example.com', '+60-11-111-0004', 2, 0, '2026-04-18 06:24:56.820039+00', NULL, '2026-04-18 03:24:56.820039+00', NULL),
	('d0000000-0000-0000-0000-000000000005', 'ab000000-0000-0000-0000-000000000001', 'ce24e617-2abf-4f48-a997-0dbfffba8624', 'ac000000-0000-0000-0000-000000000001', 'checked_in', 178.00, NULL, 'AG-e4da3b-0005', 'AGARTHA:Standard:2:1776497102', 'Guest 5', 'guest5@example.com', '+60-11-111-0005', 2, 0, '2026-04-18 06:24:56.820039+00', NULL, '2026-04-18 02:24:56.820039+00', NULL),
	('d0000000-0000-0000-0000-000000000006', 'ab000000-0000-0000-0000-000000000001', '5562ee48-0baa-42b7-aa46-5eac1935519d', 'ac000000-0000-0000-0000-000000000001', 'completed', 178.00, NULL, 'AG-167909-0006', 'AGARTHA:Standard:2:1776497103', 'Guest 6', 'guest6@example.com', '+60-11-111-0006', 2, 0, '2026-04-18 06:24:56.820039+00', NULL, '2026-04-18 01:24:56.820039+00', NULL),
	('d0000000-0000-0000-0000-000000000007', 'ab000000-0000-0000-0000-000000000001', 'e2a172d6-6c33-45b4-a43d-5971fea6702b', 'ac000000-0000-0000-0000-000000000001', 'completed', 178.00, NULL, 'AG-8f14e4-0007', 'AGARTHA:Standard:2:1776497104', 'Guest 7', 'guest7@example.com', '+60-11-111-0007', 2, 0, '2026-04-18 06:24:56.820039+00', NULL, '2026-04-18 00:24:56.820039+00', NULL),
	('d0000000-0000-0000-0000-000000000008', 'ab000000-0000-0000-0000-000000000001', 'c5c5268f-4bca-438d-90b6-e89390702b04', 'ac000000-0000-0000-0000-000000000001', 'completed', 178.00, NULL, 'AG-c9f0f8-0008', 'AGARTHA:Standard:2:1776497105', 'Guest 8', 'guest8@example.com', '+60-11-111-0008', 2, 0, '2026-04-18 06:24:56.820039+00', NULL, '2026-04-17 23:24:56.820039+00', NULL),
	('d0000000-0000-0000-0000-000000000010', 'ab000000-0000-0000-0000-000000000001', 'd3fb3a16-5fb5-401f-b6e3-8ccd99c996b7', 'ac000000-0000-0000-0000-000000000001', 'cancelled', 178.00, NULL, 'AG-d3d944-0010', 'AGARTHA:Standard:2:1776497107', 'Guest 10', 'guest10@example.com', '+60-11-111-0010', 2, 0, NULL, '2026-04-18 05:24:56.820039+00', '2026-04-17 21:24:56.820039+00', NULL),
	('d0000000-0000-0000-0000-000000000009', 'ab000000-0000-0000-0000-000000000001', '18079b0f-48be-4016-9b11-51d027030ac7', 'ac000000-0000-0000-0000-000000000001', 'cancelled', 178.00, NULL, 'AG-45c48c-0009', 'AGARTHA:Standard:2:1776497106', 'Guest 9', 'guest9@example.com', '+60-11-111-0009', 2, 0, NULL, '2026-04-18 07:30:00.269041+00', '2026-04-17 22:24:56.820039+00', '2026-04-18 07:30:00.269041+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: booking_attendees; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."booking_attendees" ("id", "booking_id", "attendee_type", "attendee_index", "nickname", "face_pay_enabled", "auto_capture_enabled", "created_at", "updated_at") VALUES
	('79b9da32-4ed0-4184-9280-0bc87b51be52', 'd0000000-0000-0000-0000-000000000001', 'adult', 1, 'Adult 1', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('d80658fd-dc84-4912-8c46-74a9e928df49', 'd0000000-0000-0000-0000-000000000001', 'adult', 2, 'Adult 2', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('eaf0153e-c45a-43ea-a6d2-0befd1479ae3', 'd0000000-0000-0000-0000-000000000002', 'adult', 1, 'Adult 1', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('29e74ddb-9fbf-454d-aa25-03191c1eed4f', 'd0000000-0000-0000-0000-000000000002', 'adult', 2, 'Adult 2', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('60c1ea97-11cb-4aa4-815e-15dd181c8be3', 'd0000000-0000-0000-0000-000000000003', 'adult', 1, 'Adult 1', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('027ef4dc-7255-4e16-aab9-1d0f6d7b3637', 'd0000000-0000-0000-0000-000000000003', 'adult', 2, 'Adult 2', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('d9f599f6-bbff-4e0c-8530-f11b193771d6', 'd0000000-0000-0000-0000-000000000004', 'adult', 1, 'Adult 1', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('4ce49868-c765-48e9-ab39-7c819babf413', 'd0000000-0000-0000-0000-000000000004', 'adult', 2, 'Adult 2', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('9b30e84e-5f93-44eb-812e-666a448b8aa2', 'd0000000-0000-0000-0000-000000000005', 'adult', 1, 'Adult 1', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('d1bd540b-1272-49ff-aade-89bfd55eb5ca', 'd0000000-0000-0000-0000-000000000005', 'adult', 2, 'Adult 2', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('7715883a-316c-4447-a2ce-8e62bd419d31', 'd0000000-0000-0000-0000-000000000006', 'adult', 1, 'Adult 1', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('7032b224-e718-4f25-8f59-0867a5386bc5', 'd0000000-0000-0000-0000-000000000006', 'adult', 2, 'Adult 2', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('9627b328-84f5-4d8d-a9c4-c4b310600166', 'd0000000-0000-0000-0000-000000000007', 'adult', 1, 'Adult 1', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('b57d4442-f9fa-4087-becc-0b489354b162', 'd0000000-0000-0000-0000-000000000007', 'adult', 2, 'Adult 2', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('7e9ce84e-8f70-44b1-aa8b-3d065d791166', 'd0000000-0000-0000-0000-000000000008', 'adult', 1, 'Adult 1', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('319cea91-1fe9-47a1-bccb-15c021ebfe10', 'd0000000-0000-0000-0000-000000000008', 'adult', 2, 'Adult 2', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('f0f23473-06f1-46e2-961d-ac29e88b7bbb', 'd0000000-0000-0000-0000-000000000009', 'adult', 1, 'Adult 1', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('9c05cea0-5bde-4a80-98b0-19a3e44f07ec', 'd0000000-0000-0000-0000-000000000009', 'adult', 2, 'Adult 2', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('b21c525a-3c8f-4dd3-8d2f-851ce02dd1a3', 'd0000000-0000-0000-0000-000000000010', 'adult', 1, 'Adult 1', false, false, '2026-04-18 07:24:56.820039+00', NULL),
	('77039d11-0684-4788-9e68-27f7639dc7b6', 'd0000000-0000-0000-0000-000000000010', 'adult', 2, 'Adult 2', false, false, '2026-04-18 07:24:56.820039+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: booking_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."booking_payments" ("id", "booking_id", "method", "amount", "currency", "gateway_ref", "payment_intent_id", "status", "paid_at", "created_at", "updated_at") VALUES
	('0a4d3ee8-7aa1-4f2a-83eb-35d94708cbff', 'd0000000-0000-0000-0000-000000000001', 'card', 178.00, 'MYR', NULL, 'pi_seed_1', 'success', '2026-04-17 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL),
	('b778d827-5f7a-40f3-bb7c-92c7a01baa19', 'd0000000-0000-0000-0000-000000000002', 'card', 178.00, 'MYR', NULL, 'pi_seed_2', 'success', '2026-04-17 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL),
	('10888b4b-4c32-4a6c-b71d-ecfefc485c2c', 'd0000000-0000-0000-0000-000000000003', 'card', 178.00, 'MYR', NULL, 'pi_seed_3', 'success', '2026-04-17 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL),
	('67a1f594-7175-4e19-b5ba-f80be9437daa', 'd0000000-0000-0000-0000-000000000004', 'card', 178.00, 'MYR', NULL, 'pi_seed_4', 'success', '2026-04-17 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL),
	('b2993eb7-5e39-4106-a821-d701938e175a', 'd0000000-0000-0000-0000-000000000005', 'card', 178.00, 'MYR', NULL, 'pi_seed_5', 'success', '2026-04-17 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL),
	('c04b32db-cb04-4033-9ee7-93cc46b6662b', 'd0000000-0000-0000-0000-000000000006', 'card', 178.00, 'MYR', NULL, 'pi_seed_6', 'success', '2026-04-17 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL),
	('0b2464e6-ae20-413b-a8b3-ef1e632810fc', 'd0000000-0000-0000-0000-000000000007', 'card', 178.00, 'MYR', NULL, 'pi_seed_7', 'success', '2026-04-17 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL),
	('9c4f6015-aab6-48f8-8e6f-3ece34b27da5', 'd0000000-0000-0000-0000-000000000008', 'card', 178.00, 'MYR', NULL, 'pi_seed_8', 'success', '2026-04-17 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL),
	('16d4691d-0f87-4b4f-a5dc-c41aff996328', 'd0000000-0000-0000-0000-000000000009', 'card', 178.00, 'MYR', NULL, 'pi_seed_9', 'pending', NULL, '2026-04-18 07:24:56.820039+00', NULL),
	('78c0bee6-1000-4026-9077-efbff83b61a5', 'd0000000-0000-0000-0000-000000000010', 'card', 178.00, 'MYR', NULL, 'pi_seed_10', 'failed', NULL, '2026-04-18 07:24:56.820039+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."locations" ("id", "name", "org_unit_id", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('aa000000-0000-0000-0000-000000000002', 'Central Warehouse', '3649b816-4ccf-4c2e-a9c5-c3b0a5a7a6fd', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('aa000000-0000-0000-0000-000000000004', 'Gift Shop', 'ad4ccaee-2bf6-4c35-962e-b6867fa91068', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('aa000000-0000-0000-0000-000000000003', 'Cafe', 'e6700725-163c-41d2-849b-520e9ef879e4', true, '2026-04-18 07:24:56.820039+00', '2026-04-27 04:52:55.00925+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000005', 'Agartha World', '76499534-049d-435c-b5fc-a7f3c1e7d12a', true, '2026-04-18 07:24:56.820039+00', '2026-04-27 04:52:55.00925+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000001', 'Entrance', '46e5c59a-02bc-4ab2-84ad-651755719771', true, '2026-04-18 07:24:56.820039+00', '2026-04-27 04:52:55.00925+00', NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."zones" ("id", "name", "description", "capacity", "is_active", "location_id", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('bb000000-0000-0000-0000-000000000001', 'Lobby', 'Main entrance lobby', 200, true, 'aa000000-0000-0000-0000-000000000001', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb000000-0000-0000-0000-000000000002', 'Reception', 'Check-in desk', 50, true, 'aa000000-0000-0000-0000-000000000001', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb000000-0000-0000-0000-000000000003', 'Lounge', 'Waiting lounge', 100, true, 'aa000000-0000-0000-0000-000000000001', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb000000-0000-0000-0000-000000000004', 'Bay A', 'Receiving bay A', 30, true, 'aa000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb000000-0000-0000-0000-000000000005', 'Bay B', 'Dispatch bay B', 30, true, 'aa000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb000000-0000-0000-0000-000000000006', 'Cold Storage', 'Refrigerated zone', 15, true, 'aa000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb000000-0000-0000-0000-000000000007', 'Prep Station', 'Kitchen prep area', 20, true, 'aa000000-0000-0000-0000-000000000003', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb000000-0000-0000-0000-000000000008', 'Hot Line', 'Kitchen cook line', 15, true, 'aa000000-0000-0000-0000-000000000003', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb000000-0000-0000-0000-000000000009', 'Retail Floor', 'Gift shop retail floor', 100, true, 'aa000000-0000-0000-0000-000000000004', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb00000a-0000-0000-0000-000000000010', 'Shop Storage', 'Gift shop stock room', 25, true, 'aa000000-0000-0000-0000-000000000004', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb00000a-0000-0000-0000-000000000011', 'Stage', 'Experience main stage', 300, true, 'aa000000-0000-0000-0000-000000000005', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bb00000a-0000-0000-0000-000000000012', 'Backstage', 'Crew prep area', 40, true, 'aa000000-0000-0000-0000-000000000005', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: crew_zones; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: device_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."device_types" ("id", "name", "display_name", "created_at", "updated_at") VALUES
	('2457e72e-66a8-46d8-a8c4-8daa25dd9d48', 'pos_terminal', 'POS Terminal', '2026-04-17 08:02:49.848099+00', NULL),
	('140a7eae-1d7b-4b27-a2ef-24a6cf490b8c', 'ip_camera', 'IP Camera', '2026-04-17 08:02:49.848099+00', NULL),
	('9d294eed-a311-4e66-8db9-705d40adb439', 'access_reader', 'Access Reader', '2026-04-17 08:02:49.848099+00', NULL),
	('2df36d65-b085-4fd8-9ffe-147b3e97d115', 'iot_sensor', 'IoT Sensor', '2026-04-17 08:02:49.848099+00', NULL),
	('5f351d5c-db0c-454f-9f39-0159f38eb89c', 'network_switch', 'Network Switch', '2026-04-17 08:02:49.848099+00', NULL),
	('91623a20-c84a-4506-b694-7a2614ba5e3c', 'router', 'Router', '2026-04-17 08:02:49.848099+00', NULL),
	('5fea7295-d47b-4788-ad7b-78a075f8737b', 'wireless_ap', 'Wireless Access Point', '2026-04-17 08:02:49.848099+00', NULL),
	('b1df5dd0-f362-4931-9414-7d96c1f81fb0', 'kiosk', 'Kiosk', '2026-04-17 08:02:49.848099+00', NULL),
	('4a2734d4-3e42-4a14-87ed-e319a39be1ca', 'display', 'Display', '2026-04-17 08:02:49.848099+00', NULL),
	('77ba8cdf-29e4-4b02-ad19-f6a77608b398', 'printer', 'Printer', '2026-04-17 08:02:49.848099+00', NULL),
	('102a019a-0629-4030-b7b9-9eedf8dc471c', 'server', 'Server', '2026-04-17 08:02:49.848099+00', NULL),
	('f1000000-0000-0000-0000-000000000004', 'camera', 'Surveillance Camera', '2026-04-18 07:24:56.820039+00', NULL),
	('f1000000-0000-0000-0000-000000000005', 'access_point', 'Wi-Fi Access Point', '2026-04-18 07:24:56.820039+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: maintenance_vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."maintenance_vendors" ("id", "name", "contact_email", "contact_phone", "specialization", "description", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('ee000000-0000-0000-0000-000000000001', 'FixIt Facilities', 'ops@fixit.my', '+60-12-555-0001', 'HVAC, electrical', 'General facilities vendor', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ee000000-0000-0000-0000-000000000002', 'NetPro Technicians', 'noc@netpro.my', '+60-12-555-0002', 'Network, POS, devices', 'IT / network vendor', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ee000000-0000-0000-0000-000000000003', 'RideSafe Engineering', 'service@ridesafe.my', '+60-12-555-0003', 'Ride mechanical safety', 'Experience ride specialist', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: vlans; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."devices" ("id", "name", "device_type_id", "serial_number", "asset_tag", "zone_id", "status", "ip_address", "mac_address", "vlan_id", "parent_device_id", "port_number", "manufacturer", "model", "firmware_version", "commission_date", "warranty_expiry", "maintenance_vendor_id", "metadata", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('f2000000-0000-0000-0000-000000000001', 'POS-KITCHEN-01', '2457e72e-66a8-46d8-a8c4-8daa25dd9d48', 'SN-POS-0001', 'AT-001', 'bb000000-0000-0000-0000-000000000008', 'online', '10.10.1.11', '00:1a:2b:3c:4d:01', NULL, NULL, NULL, 'Epson', 'TM-T88VI', '2.4.1', '2025-01-15', '2028-01-15', 'ee000000-0000-0000-0000-000000000002', '{}', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('f2000000-0000-0000-0000-000000000002', 'POS-SHOP-01', '2457e72e-66a8-46d8-a8c4-8daa25dd9d48', 'SN-POS-0002', 'AT-002', 'bb000000-0000-0000-0000-000000000009', 'online', '10.10.1.12', '00:1a:2b:3c:4d:02', NULL, NULL, NULL, 'Epson', 'TM-T88VI', '2.4.1', '2025-01-15', '2028-01-15', 'ee000000-0000-0000-0000-000000000002', '{}', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('f2000000-0000-0000-0000-000000000003', 'SW-CORE-01', '5f351d5c-db0c-454f-9f39-0159f38eb89c', 'SN-SW-0001', 'AT-010', 'bb000000-0000-0000-0000-000000000002', 'online', '10.10.0.1', '00:1a:2b:3c:4d:10', NULL, NULL, NULL, 'Cisco', 'Catalyst 9300', '17.9.1', '2024-06-01', '2029-06-01', 'ee000000-0000-0000-0000-000000000002', '{}', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('f2000000-0000-0000-0000-000000000004', 'CAM-LOBBY-01', 'f1000000-0000-0000-0000-000000000004', 'SN-CAM-0001', 'AT-020', 'bb000000-0000-0000-0000-000000000001', 'online', '10.10.2.21', '00:1a:2b:3c:4d:20', NULL, NULL, NULL, 'Hikvision', 'DS-2CD', '5.7.3', '2025-03-01', '2028-03-01', 'ee000000-0000-0000-0000-000000000001', '{}', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('f2000000-0000-0000-0000-000000000005', 'AP-STAGE-01', 'f1000000-0000-0000-0000-000000000005', 'SN-AP-0001', 'AT-030', 'bb00000a-0000-0000-0000-000000000011', 'offline', '10.10.3.31', '00:1a:2b:3c:4d:30', NULL, NULL, NULL, 'Ubiquiti', 'U6-Pro', '6.5.28', '2025-02-01', '2028-02-01', 'ee000000-0000-0000-0000-000000000002', '{}', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('8a4fa77d-b8e8-429f-bb5e-0446a6fdc8c0', 'test', '2df36d65-b085-4fd8-9ffe-147b3e97d115', NULL, NULL, 'bb00000a-0000-0000-0000-000000000012', 'online', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ee000000-0000-0000-0000-000000000001', '{}', '2026-04-23 08:14:33.402343+00', NULL, 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;


--
-- Data for Name: device_heartbeats; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pos_points; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pos_points" ("id", "name", "display_name", "location_id", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('f085e98e-19e5-43a5-8bd5-457adb10371b', 'vending_machine', 'Vending Machine', 'aa000000-0000-0000-0000-000000000005', true, '2026-04-17 08:02:49.848099+00', '2026-04-27 04:49:52.835722+00', NULL, NULL),
	('ad000000-0000-0000-0000-000000000001', 'Cafe', 'Cafe', 'aa000000-0000-0000-0000-000000000003', true, '2026-04-18 07:24:56.820039+00', '2026-04-27 06:22:05.216673+00', NULL, NULL),
	('ad000000-0000-0000-0000-000000000002', 'GiftShop', 'Gift Shop', 'aa000000-0000-0000-0000-000000000004', true, '2026-04-18 07:24:56.820039+00', '2026-04-27 06:22:23.389313+00', NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: display_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."display_categories" ("id", "pos_point_id", "name", "sort_order", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('ae000000-0000-0000-0000-000000000001', 'ad000000-0000-0000-0000-000000000001', 'Hot Drinks', 10, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ae000000-0000-0000-0000-000000000002', 'ad000000-0000-0000-0000-000000000001', 'Cold Drinks', 20, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ae000000-0000-0000-0000-000000000011', 'ad000000-0000-0000-0000-000000000002', 'Apparel', 10, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ae000000-0000-0000-0000-000000000012', 'ad000000-0000-0000-0000-000000000002', 'Souvenirs', 20, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: equipment_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."equipment_assignments" ("id", "material_id", "assigned_to", "assigned_at", "returned_at", "condition_on_return", "notes", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('b89805bf-18a6-4f80-ae15-fc9593c018ab', 'a1000000-0000-0000-0000-000000000034', 'c0000000-0000-0000-0000-000000000014', '2026-03-19 07:24:56.820039+00', NULL, NULL, 'Issued at onboarding', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('11627fba-b3e2-4b9e-bff7-aec738402fb8', 'a1000000-0000-0000-0000-000000000034', 'c0000000-0000-0000-0000-000000000015', '2026-03-19 07:24:56.820039+00', NULL, NULL, 'Issued at onboarding', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('69e64275-e273-41b4-9154-8e4a023039b9', 'a1000000-0000-0000-0000-000000000034', 'c0000000-0000-0000-0000-000000000019', '2026-03-19 07:24:56.820039+00', NULL, NULL, 'Issued at onboarding', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: experience_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."experience_tiers" ("experience_id", "tier_id", "created_at", "updated_at") VALUES
	('ab000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000001', '2026-04-18 07:24:56.820039+00', NULL),
	('ab000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL),
	('ab000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000003', '2026-04-18 07:24:56.820039+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: inventory_reconciliations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: material_requisitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."material_requisitions" ("id", "from_location_id", "to_location_id", "status", "assigned_to", "requester_remark", "runner_remark", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('4cfa69e8-b7ce-4fcc-b168-eb3ae7df823f', 'aa000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000003', 'pending', NULL, 'xx', NULL, '2026-04-27 02:06:58.724641+00', '2026-04-27 04:49:52.835722+00', 'c0000000-0000-0000-0000-000000000011', NULL),
	('1d9243f8-c1eb-4e98-b030-582a3f11d658', 'aa000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000004', 'completed', 'c0000000-0000-0000-0000-000000000014', NULL, NULL, '2026-04-27 01:43:51.950167+00', '2026-04-27 04:53:12.20019+00', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000014'),
	('f593def2-16c0-49ac-955e-0d82f370b5b6', 'aa000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000003', 'in_progress', 'c0000000-0000-0000-0000-000000000014', 'xx', NULL, '2026-04-27 01:42:33.594188+00', '2026-04-27 04:53:50.291934+00', 'c0000000-0000-0000-0000-000000000011', NULL),
	('7a1307fe-d9dc-47ed-970a-2016bc709ddd', 'aa000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000003', 'completed', 'c0000000-0000-0000-0000-000000000014', NULL, NULL, '2026-04-27 05:57:35.716354+00', '2026-04-27 05:57:46.515816+00', 'c0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000014') ON CONFLICT DO NOTHING;


--
-- Data for Name: movement_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."movement_types" ("id", "code", "name", "description", "direction", "requires_source_doc", "requires_cost_center", "auto_reverse_code", "debit_account_rule", "credit_account_rule", "is_active", "created_at", "updated_at") VALUES
	('3e6a06dc-0ffc-447d-b31d-bbf524e5e4f6', '101', 'Goods Receipt from PO', NULL, 'in', true, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('169e70ec-6e99-46a4-b99f-4d743ebcaa0e', '102', 'Reversal of GR from PO', NULL, 'out', true, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('b20d4c01-eff8-4d10-9bb5-f9718f267fea', '122', 'Return to Vendor', NULL, 'out', false, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('c5d34b0c-0d60-4124-881e-9335b9ae3ed1', '311', 'Transfer Between Locations', NULL, 'transfer', false, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('c7b1d3cd-0889-42ce-95df-0bbb9d64970b', '312', 'Reversal of Transfer', NULL, 'transfer', false, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('f2df69b7-7f88-4c48-b52d-ef5d47dfcb7d', '201', 'Issue to Cost Center (Consumable)', NULL, 'out', false, true, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('77c7f7e8-9a29-44ee-929a-943cb345248d', '202', 'Reversal of Cost Center Issue', NULL, 'in', false, true, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('8559eaec-3f21-4f5a-ad24-3fea477a7e0f', '261', 'Issue for Production / BOM', NULL, 'out', false, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('496ded03-a392-4873-b393-d0e4a5d621ad', '601', 'Goods Issue for Sale (POS)', NULL, 'out', true, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('6a076fe8-9422-43e8-9a89-f26e1387a257', '602', 'Reversal of Sale (Return/Void)', NULL, 'in', true, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('619f9629-b4f6-4720-a9b5-f2a395ce01b2', '551', 'Scrapping / Disposal', NULL, 'out', false, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('5b41dae2-e378-4318-97ca-1be458198626', '552', 'Reversal of Scrapping', NULL, 'in', false, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('9e62bc17-acd6-4602-9597-ccf16b40da35', '701', 'Positive Adjustment (Recon)', NULL, 'in', false, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('f280b059-90fe-4608-90bb-74205aef7158', '702', 'Negative Adjustment (Recon)', NULL, 'out', false, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL),
	('e6f95e4e-4b90-4fc4-836a-8abd1a5acc33', '561', 'Initial Inventory Entry', NULL, 'in', false, false, NULL, NULL, NULL, true, '2026-04-17 08:02:49.848099+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."orders" ("id", "pos_point_id", "status", "total_amount", "payment_method", "prepared_by", "notes", "completed_at", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('d1000000-0000-0000-0000-000000000003', 'ad000000-0000-0000-0000-000000000001', 'completed', 24.00, 'cash', NULL, NULL, '2026-04-18 07:22:56.820039+00', '2026-04-18 07:21:56.820039+00', NULL, NULL, NULL),
	('d1000000-0000-0000-0000-000000000004', 'ad000000-0000-0000-0000-000000000001', 'completed', 24.00, 'cash', NULL, NULL, '2026-04-18 07:21:56.820039+00', '2026-04-18 07:20:56.820039+00', NULL, NULL, NULL),
	('d1000000-0000-0000-0000-000000000005', 'ad000000-0000-0000-0000-000000000001', 'completed', 24.00, 'cash', NULL, NULL, '2026-04-18 07:20:56.820039+00', '2026-04-18 07:19:56.820039+00', NULL, NULL, NULL),
	('d1000000-0000-0000-0000-000000000002', 'ad000000-0000-0000-0000-000000000001', 'completed', 24.00, 'cash', NULL, NULL, '2026-04-23 08:41:07.999175+00', '2026-04-18 07:22:56.820039+00', '2026-04-23 08:41:07.999175+00', NULL, 'c0000000-0000-0000-0000-000000000011'),
	('d1000000-0000-0000-0000-000000000001', 'ad000000-0000-0000-0000-000000000001', 'completed', 24.00, 'cash', NULL, NULL, '2026-04-23 08:41:21.105854+00', '2026-04-18 07:23:56.820039+00', '2026-04-23 08:41:21.105854+00', NULL, 'c0000000-0000-0000-0000-000000000011'),
	('4f819bb6-f0b5-441c-9063-d9aed5a5b53b', 'ad000000-0000-0000-0000-000000000001', 'completed', 37.00, 'cash', NULL, NULL, '2026-04-27 02:06:15.615592+00', '2026-04-23 08:24:39.290985+00', '2026-04-27 02:06:15.615592+00', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000011'),
	('23414f47-d71e-4e19-8936-911a3f692c12', 'ad000000-0000-0000-0000-000000000001', 'completed', 15.00, 'cash', NULL, NULL, '2026-04-27 02:06:27.028799+00', '2026-04-27 02:06:05.279508+00', '2026-04-27 02:06:27.028799+00', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000011'),
	('b5b9a638-449a-4d49-8e37-ee69151232cf', 'ad000000-0000-0000-0000-000000000001', 'completed', 14.00, 'cash', NULL, NULL, '2026-04-27 02:16:34.667063+00', '2026-04-27 02:16:31.106661+00', '2026-04-27 02:16:34.667063+00', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000011'),
	('b65d360f-bcac-46f4-9f5a-9885a3d105e9', 'ad000000-0000-0000-0000-000000000001', 'completed', 30.00, 'cash', NULL, NULL, '2026-04-27 06:52:03.816774+00', '2026-04-27 06:51:54.604972+00', '2026-04-27 06:52:03.816774+00', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000011') ON CONFLICT DO NOTHING;


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "display_name", "avatar_url", "role_id", "email", "employee_id", "staff_record_id", "employment_status", "password_set", "is_locked", "locked_reason", "locked_at", "locked_by", "last_permission_update", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('c0000000-0000-0000-0000-000000000013', 'Gina Giftshop', NULL, 'af202033-6758-47c6-bd5d-c6878947e936', 'giftshop_crew@agartha.test', 'EMP0113', 'c1000000-0000-0000-0000-000000000013', 'active', true, false, NULL, NULL, NULL, '2026-04-27 03:00:08.296443+00', '2026-04-18 07:24:56.820039+00', '2026-04-27 03:00:08.296443+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000016', 'Hakim Health', NULL, '7dfd9826-5ccd-4294-900e-26796449956e', 'health_crew@agartha.test', 'EMP0116', 'c1000000-0000-0000-0000-000000000016', 'active', true, false, NULL, NULL, NULL, '2026-04-27 03:00:14.386864+00', '2026-04-18 07:24:56.820039+00', '2026-04-27 03:00:14.386864+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000001', 'Iman Admin', NULL, 'e570c586-8d07-4df7-b1e0-57fe50856f32', 'it_admin@agartha.test', 'EMP0101', 'c1000000-0000-0000-0000-000000000001', 'active', true, false, NULL, NULL, NULL, '2026-04-24 02:50:58.806394+00', '2026-04-18 07:24:56.820039+00', '2026-04-24 02:50:58.806394+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000011', 'Faiz F&B', 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/public/avatars/c0000000-0000-0000-0000-000000000011/avatar.png?v=1776828572930', 'a9412172-3d4d-4b46-be3c-21467b625ea2', 'fnb_crew@agartha.test', 'EMP0111', 'c1000000-0000-0000-0000-000000000011', 'active', true, false, NULL, NULL, NULL, '2026-04-27 01:54:41.905871+00', '2026-04-18 07:24:56.820039+00', '2026-04-27 01:54:41.905871+00', NULL, NULL),
	('6ae1eaa5-e8c6-4d33-8ac7-6333410aff52', 'Esam FnBs', NULL, 'a9412172-3d4d-4b46-be3c-21467b625ea2', 'esam.fnb@agartha.com', 'EMP0120', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', 'active', true, false, NULL, NULL, NULL, '2026-04-27 01:54:41.905871+00', '2026-04-23 06:47:16.920491+00', '2026-04-27 01:54:41.905871+00', NULL, 'c0000000-0000-0000-0000-000000000001'),
	('c0000000-0000-0000-0000-000000000017', 'Cindy Cleaning', NULL, 'cbde3de5-c09e-4507-b573-26e1583b93e3', 'cleaning_crew@agartha.test', 'EMP0117', 'c1000000-0000-0000-0000-000000000017', 'active', true, false, NULL, NULL, NULL, '2026-04-27 03:00:34.36216+00', '2026-04-18 07:24:56.820039+00', '2026-04-27 03:00:34.36216+00', NULL, 'c0000000-0000-0000-0000-000000000001'),
	('c0000000-0000-0000-0000-000000000009', 'Chen Compliance', NULL, '742c1a39-a5be-4f1e-bcb5-6d34078ac93b', 'compliance_manager@agartha.test', 'EMP0109', 'c1000000-0000-0000-0000-000000000009', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-27 02:24:42.088283+00', NULL, 'c0000000-0000-0000-0000-000000000001'),
	('c0000000-0000-0000-0000-000000000002', 'Bella Business', NULL, '2724c5b8-049e-4b6c-ae38-a4be19180201', 'business_admin@agartha.test', 'EMP0102', 'c1000000-0000-0000-0000-000000000002', 'active', true, false, NULL, NULL, NULL, '2026-04-26 08:18:33.681796+00', '2026-04-18 07:24:56.820039+00', '2026-04-26 08:18:33.681796+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000003', 'Pavan POSman', NULL, 'c41ce4f2-54c5-44a0-8585-30aecb2c24d9', 'pos_manager@agartha.test', 'EMP0103', 'c1000000-0000-0000-0000-000000000003', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000004', 'Priya Procure', NULL, 'c7a731b1-311b-49fe-9456-30058f850886', 'procurement_manager@agartha.test', 'EMP0104', 'c1000000-0000-0000-0000-000000000004', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000005', 'Marcus Maintain', NULL, '682d91d4-8e39-40bc-b82d-825b356859aa', 'maintenance_manager@agartha.test', 'EMP0105', 'c1000000-0000-0000-0000-000000000005', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000006', 'Ivan Inventory', NULL, 'bcae65fa-377e-494a-bdec-eacc6dfaa7a8', 'inventory_manager@agartha.test', 'EMP0106', 'c1000000-0000-0000-0000-000000000006', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000007', 'Maya Marketing', NULL, '2806ad34-3073-419f-bdd6-3ff5e420f5fe', 'marketing_manager@agartha.test', 'EMP0107', 'c1000000-0000-0000-0000-000000000007', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000008', 'Hana HR', NULL, '10d543a2-9e56-4213-8c81-27a9952f08f5', 'human_resources_manager@agartha.test', 'EMP0108', 'c1000000-0000-0000-0000-000000000008', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000010', 'Olivia Ops', NULL, 'f357066a-a2be-44d0-af4b-23e8d8920f7a', 'operations_manager@agartha.test', 'EMP0110', 'c1000000-0000-0000-0000-000000000010', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000012', 'Sara Service', NULL, 'aa5f3066-de37-4a6a-b534-ee38d160d085', 'service_crew@agartha.test', 'EMP0112', 'c1000000-0000-0000-0000-000000000012', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000014', 'Rahim Runner', NULL, '19516dc6-2100-4e50-9a16-952ed86ac80e', 'runner_crew@agartha.test', 'EMP0114', 'c1000000-0000-0000-0000-000000000014', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000015', 'Siti Security', NULL, 'f88f1c24-d765-43af-a09b-0127f7c1a912', 'security_crew@agartha.test', 'EMP0115', 'c1000000-0000-0000-0000-000000000015', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000018', 'Ethan Experience', NULL, '74cb42cc-e68f-4435-ac3d-e76e326d13b5', 'experience_crew@agartha.test', 'EMP0118', 'c1000000-0000-0000-0000-000000000018', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('c0000000-0000-0000-0000-000000000019', 'Imran Internal', NULL, 'a6a0c809-2065-4e4e-8a43-84a1e8098520', 'internal_maintenance_crew@agartha.test', 'EMP0119', 'c1000000-0000-0000-0000-000000000019', 'active', true, false, NULL, NULL, NULL, '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', '2026-04-18 07:24:56.820039+00', NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."suppliers" ("id", "name", "contact_email", "contact_phone", "address", "description", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('dd000000-0000-0000-0000-000000000001', 'Pacific Beverages Sdn Bhd', 'sales@pacificbev.my', '+60-3-1234-0001', 'Lot 12, Klang Industrial Park', 'Primary beverage supplier', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('dd000000-0000-0000-0000-000000000002', 'Fresh Produce Trading', 'orders@freshproduce.my', '+60-3-1234-0002', 'Batu Caves Wholesale Market', 'Fruits, vegetables, dairy', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('dd000000-0000-0000-0000-000000000003', 'SouvenirMart Supplies', 'b2b@souvenirmart.my', '+60-3-1234-0003', 'Petaling Jaya, Section 14', 'Gift shop merchandise', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('dd000000-0000-0000-0000-000000000004', 'CleanCo Industrial', 'service@cleanco.my', '+60-3-1234-0004', 'Shah Alam, Section 23', 'Cleaning chemicals + PPE', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('dd000000-0000-0000-0000-000000000005', 'TechStack Malaysia', 'quote@techstack.my', '+60-3-1234-0005', 'Cyberjaya', 'IT + POS hardware', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."purchase_orders" ("id", "supplier_id", "receiving_location_id", "status", "order_date", "expected_delivery_date", "notes", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('1c447061-4e96-4072-a6fc-19c7120e69c4', 'dd000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000002', 'draft', '2026-04-26', NULL, NULL, '2026-04-26 11:43:49.546429+00', NULL, 'c0000000-0000-0000-0000-000000000004', NULL),
	('0c88cdcc-1893-43e9-b281-5c533ad76276', 'dd000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000002', 'draft', '2026-04-26', NULL, NULL, '2026-04-26 11:43:49.871013+00', NULL, 'c0000000-0000-0000-0000-000000000004', NULL),
	('d09afe95-2735-4209-a31f-a7d6686cd941', 'dd000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000002', 'cancelled', '2026-04-26', NULL, NULL, '2026-04-26 11:43:50.097692+00', '2026-04-26 11:45:34.212974+00', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004') ON CONFLICT DO NOTHING;


--
-- Data for Name: write_offs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: goods_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."goods_movements" ("id", "movement_type_id", "document_date", "posting_date", "purchase_order_id", "requisition_id", "reconciliation_id", "order_id", "disposal_id", "reversed_by_id", "reverses_id", "notes", "created_at", "updated_at", "created_by") VALUES
	('6de878dc-6193-4c58-a65a-2b977553aca6', '496ded03-a392-4873-b393-d0e4a5d621ad', '2026-04-23', '2026-04-23', NULL, NULL, NULL, 'd1000000-0000-0000-0000-000000000002', NULL, NULL, NULL, NULL, '2026-04-23 08:41:07.999175+00', NULL, NULL),
	('61f163b7-d6ea-41c4-a8ec-80cb95f7255b', '496ded03-a392-4873-b393-d0e4a5d621ad', '2026-04-23', '2026-04-23', NULL, NULL, NULL, 'd1000000-0000-0000-0000-000000000001', NULL, NULL, NULL, NULL, '2026-04-23 08:41:21.105854+00', NULL, NULL),
	('caf79797-7ef1-4dca-a60e-316ade0e768e', '496ded03-a392-4873-b393-d0e4a5d621ad', '2026-04-27', '2026-04-27', NULL, NULL, NULL, '4f819bb6-f0b5-441c-9063-d9aed5a5b53b', NULL, NULL, NULL, NULL, '2026-04-27 02:06:15.615592+00', NULL, 'c0000000-0000-0000-0000-000000000011'),
	('6428498d-2f20-48d7-b4d4-6e0ececa4fbe', '496ded03-a392-4873-b393-d0e4a5d621ad', '2026-04-27', '2026-04-27', NULL, NULL, NULL, '23414f47-d71e-4e19-8936-911a3f692c12', NULL, NULL, NULL, NULL, '2026-04-27 02:06:27.028799+00', NULL, 'c0000000-0000-0000-0000-000000000011'),
	('38a97088-d68b-4316-af5c-f436c05a0da9', '496ded03-a392-4873-b393-d0e4a5d621ad', '2026-04-27', '2026-04-27', NULL, NULL, NULL, 'b5b9a638-449a-4d49-8e37-ee69151232cf', NULL, NULL, NULL, NULL, '2026-04-27 02:16:34.667063+00', NULL, 'c0000000-0000-0000-0000-000000000011'),
	('b8a4329c-4ce6-4cb5-ad40-b42ffc3c912b', 'f2df69b7-7f88-4c48-b52d-ef5d47dfcb7d', '2026-04-27', '2026-04-27', NULL, '1d9243f8-c1eb-4e98-b030-582a3f11d658', NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-27 04:53:12.20019+00', NULL, 'c0000000-0000-0000-0000-000000000011'),
	('e8e81ebd-7e1b-4dd5-b987-85a33d7bca7d', 'c5d34b0c-0d60-4124-881e-9335b9ae3ed1', '2026-04-27', '2026-04-27', NULL, '7a1307fe-d9dc-47ed-970a-2016bc709ddd', NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-27 05:57:46.515816+00', NULL, 'c0000000-0000-0000-0000-000000000014'),
	('5f39d3a9-3ec5-45d4-bd0a-2c85c2b029c5', '496ded03-a392-4873-b393-d0e4a5d621ad', '2026-04-27', '2026-04-27', NULL, NULL, NULL, 'b65d360f-bcac-46f4-9f5a-9885a3d105e9', NULL, NULL, NULL, NULL, '2026-04-27 06:52:03.816774+00', NULL, 'c0000000-0000-0000-0000-000000000011') ON CONFLICT DO NOTHING;


--
-- Data for Name: goods_movement_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."goods_movement_items" ("id", "goods_movement_id", "material_id", "quantity", "unit_id", "location_id", "unit_cost", "bom_id", "cost_center_id", "created_at", "updated_at") VALUES
	('2a32660b-6735-42a6-98cb-e3222df567db', '6de878dc-6193-4c58-a65a-2b977553aca6', 'a1000000-0000-0000-0000-000000000011', -2, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 'aa000000-0000-0000-0000-000000000003', 0, NULL, NULL, '2026-04-23 08:41:07.999175+00', NULL),
	('6e570d2e-4cb0-4874-9663-8596a9648dd4', '61f163b7-d6ea-41c4-a8ec-80cb95f7255b', 'a1000000-0000-0000-0000-000000000011', -2, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 'aa000000-0000-0000-0000-000000000003', 0, NULL, NULL, '2026-04-23 08:41:21.105854+00', NULL),
	('6db7a923-2f73-4c42-ae47-ebe3816f39d5', 'caf79797-7ef1-4dca-a60e-316ade0e768e', 'a1000000-0000-0000-0000-000000000011', -1, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 'aa000000-0000-0000-0000-000000000003', 0, NULL, NULL, '2026-04-27 02:06:15.615592+00', NULL),
	('9a22d1a8-4d0c-4d6b-9e1f-925e2471010a', 'caf79797-7ef1-4dca-a60e-316ade0e768e', 'a1000000-0000-0000-0000-000000000012', -1, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 'aa000000-0000-0000-0000-000000000003', 0, NULL, NULL, '2026-04-27 02:06:15.615592+00', NULL),
	('c4fa6fcf-f9ca-4b1c-b0e2-27ec3629f040', '6428498d-2f20-48d7-b4d4-6e0ececa4fbe', 'a1000000-0000-0000-0000-000000000012', -1, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 'aa000000-0000-0000-0000-000000000003', 0, NULL, NULL, '2026-04-27 02:06:27.028799+00', NULL),
	('205fa0d0-2f74-4f59-9d8b-f9b1ec8e0c57', '38a97088-d68b-4316-af5c-f436c05a0da9', 'a1000000-0000-0000-0000-000000000012', -1, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 'aa000000-0000-0000-0000-000000000003', 0, NULL, NULL, '2026-04-27 02:16:34.667063+00', NULL),
	('b04a623e-26f6-4bab-a3ff-7b99e79dc6a9', 'b8a4329c-4ce6-4cb5-ad40-b42ffc3c912b', 'a1000000-0000-0000-0000-000000000033', -1, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 'aa000000-0000-0000-0000-000000000002', 0, NULL, NULL, '2026-04-27 04:53:12.20019+00', NULL),
	('c13fe19a-8250-404d-890d-df8c983392e7', 'e8e81ebd-7e1b-4dd5-b987-85a33d7bca7d', 'a1000000-0000-0000-0000-000000000002', -2, '0daef3e9-f205-4168-8301-161656f2c831', 'aa000000-0000-0000-0000-000000000002', 0, NULL, NULL, '2026-04-27 05:57:46.515816+00', NULL),
	('607906a6-6a68-454b-9c3e-4f0deae16a39', 'e8e81ebd-7e1b-4dd5-b987-85a33d7bca7d', 'a1000000-0000-0000-0000-000000000002', 2, '0daef3e9-f205-4168-8301-161656f2c831', 'aa000000-0000-0000-0000-000000000003', 0, NULL, NULL, '2026-04-27 05:57:46.515816+00', NULL),
	('c5a6f1b0-b1b0-4f19-b2dd-3dba4221079e', '5f39d3a9-3ec5-45d4-bd0a-2c85c2b029c5', 'a1000000-0000-0000-0000-000000000011', -1, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 'aa000000-0000-0000-0000-000000000003', 0, NULL, NULL, '2026-04-27 06:52:03.816774+00', NULL),
	('86cccc60-a07b-4f26-a594-f3fb79fb5c0d', '5f39d3a9-3ec5-45d4-bd0a-2c85c2b029c5', 'a1000000-0000-0000-0000-000000000013', -1, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 'aa000000-0000-0000-0000-000000000003', 0, NULL, NULL, '2026-04-27 06:52:03.816774+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: iam_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."iam_requests" ("id", "request_type", "status", "staff_record_id", "target_role_id", "current_role_id", "hr_remark", "it_remark", "approved_by", "approved_at", "invite_sent_at", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('43e9cc93-7671-4f10-9519-ea06c211e223', 'provisioning', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', 'a9412172-3d4d-4b46-be3c-21467b625ea2', NULL, NULL, NULL, 'c0000000-0000-0000-0000-000000000001', '2026-04-23 06:47:13.375+00', '2026-04-23 06:47:17.838+00', '2026-04-23 04:58:20.725731+00', '2026-04-23 06:47:17.872798+00', NULL, 'c0000000-0000-0000-0000-000000000001'),
	('5115f9d2-26df-4d1b-8186-7dbeb189b4fb', 'suspension', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, 'ssss', 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:20:11.268+00', NULL, '2026-04-23 07:20:10.636157+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('b9cdf64c-a127-4063-a273-1b0bfc4dbdf2', 'reactivation', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, 'xx', 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:26:54.758+00', NULL, '2026-04-23 07:26:53.745464+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('f226d147-1bb1-4988-a074-2fcff7400039', 'reactivation', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, NULL, 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:47:37.116+00', NULL, '2026-04-23 07:47:36.015137+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('b8fb8df6-498e-44d4-a865-2d0b60c82310', 'termination', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, NULL, 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:47:40.609+00', NULL, '2026-04-23 07:47:39.472089+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('00fdc6b3-f9a0-462d-9d10-f37481a4db1b', 'suspension', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, NULL, 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:47:44.071+00', NULL, '2026-04-23 07:47:42.932234+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('a42ac7e3-1c8b-4c04-9411-27fba4feb469', 'reactivation', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, NULL, 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:47:47.488+00', NULL, '2026-04-23 07:47:46.355449+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('561f9f04-4ab0-4aab-b5e3-4d67a8ee08e4', 'termination', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, NULL, 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:48:06.9+00', NULL, '2026-04-23 07:48:05.767742+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('853d48bf-d10b-4e0c-8b59-24a7360d2d0d', 'suspension', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, NULL, 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:48:16.337+00', NULL, '2026-04-23 07:48:15.202596+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('0904b7e0-6039-4b49-9193-24d9abdda0af', 'termination', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, NULL, 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:48:20.485+00', NULL, '2026-04-23 07:48:19.352905+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('40da2c8c-42c5-4eec-84fb-97ed0d7b088f', 'suspension', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, NULL, 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:48:22.619+00', NULL, '2026-04-23 07:48:21.480519+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('cb725657-8f2c-4f4b-ad58-0c2a256603c1', 'reactivation', 'approved', '0c0ba648-5b75-4fd0-a81b-5de7ab7407cd', NULL, NULL, NULL, NULL, 'c0000000-0000-0000-0000-000000000001', '2026-04-23 07:48:24.401+00', NULL, '2026-04-23 07:48:23.263828+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('2d203e81-1d77-49e8-8b9f-ed61d8231bd2', 'suspension', 'approved', 'c1000000-0000-0000-0000-000000000009', NULL, NULL, NULL, 'xx', 'c0000000-0000-0000-0000-000000000001', '2026-04-27 02:24:34.464+00', NULL, '2026-04-27 02:24:34.429365+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('a21b64e8-ece8-44cf-a723-1a6b1ec69943', 'reactivation', 'approved', 'c1000000-0000-0000-0000-000000000009', NULL, NULL, NULL, 'xx', 'c0000000-0000-0000-0000-000000000001', '2026-04-27 02:24:41.953+00', NULL, '2026-04-27 02:24:41.570286+00', NULL, 'c0000000-0000-0000-0000-000000000001', NULL),
	('95b007c3-10ec-4696-bcdd-856f66fe06ef', 'provisioning', 'pending_it', 'f2bb47fd-e30f-4786-984b-73ed3f67d3c7', '19516dc6-2100-4e50-9a16-952ed86ac80e', NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-23 09:49:09.154957+00', '2026-04-27 06:30:24.285314+00', 'c0000000-0000-0000-0000-000000000008', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."incidents" ("id", "category", "status", "zone_id", "description", "resolved_by", "resolved_at", "attachment_url", "metadata", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('d2000000-0000-0000-0000-000000000001', 'spill', 'open', 'bb000000-0000-0000-0000-000000000001', 'Water spill near lobby entrance', NULL, NULL, NULL, '{}', '2026-04-18 06:54:56.820039+00', NULL, 'c0000000-0000-0000-0000-000000000017', NULL),
	('d2000000-0000-0000-0000-000000000002', 'guest_complaint', 'open', 'bb00000a-0000-0000-0000-000000000011', 'Guest complained about long queue', NULL, NULL, NULL, '{}', '2026-04-18 05:24:56.820039+00', NULL, 'c0000000-0000-0000-0000-000000000012', NULL),
	('d2000000-0000-0000-0000-000000000003', 'equipment_failure', 'resolved', 'bb000000-0000-0000-0000-000000000008', 'Hot line burner #2 not igniting', 'c0000000-0000-0000-0000-000000000019', '2026-04-17 07:24:56.820039+00', NULL, '{}', '2026-04-16 07:24:56.820039+00', NULL, 'c0000000-0000-0000-0000-000000000011', NULL),
	('d2000000-0000-0000-0000-000000000004', 'lost_property', 'resolved', 'bb000000-0000-0000-0000-000000000003', 'Guest lost phone in lounge', 'c0000000-0000-0000-0000-000000000015', '2026-04-18 04:24:56.820039+00', NULL, '{}', '2026-04-18 02:24:56.820039+00', NULL, 'c0000000-0000-0000-0000-000000000012', NULL),
	('d2000000-0000-0000-0000-000000000005', 'medical_emergency', 'resolved', 'bb000000-0000-0000-0000-000000000001', 'Guest feeling faint in lobby', 'c0000000-0000-0000-0000-000000000016', '2026-04-18 01:24:56.820039+00', NULL, '{}', '2026-04-18 00:24:56.820039+00', NULL, 'c0000000-0000-0000-0000-000000000015', NULL),
	('4adaf1d5-dcb3-44e1-9b41-e06f39bf2ae0', 'vandalism', 'resolved', 'bb000000-0000-0000-0000-000000000004', 'wwwwwww', 'c0000000-0000-0000-0000-000000000010', '2026-04-22 05:47:10.926+00', NULL, '{"resolution_notes": "xxx"}', '2026-04-22 05:30:10.876573+00', '2026-04-22 05:47:10.444887+00', 'c0000000-0000-0000-0000-000000000011', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: inventory_reconciliation_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: leave_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."leave_types" ("id", "code", "name", "is_paid", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('33b30aea-1e82-41d8-a184-3bd46859a9b1', 'annual', 'Annual Leave', true, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('334a0c10-be21-4ed2-881d-30f98fb552dc', 'sick', 'Sick Leave', true, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('d61828e9-8fb6-49d0-8e3c-767aaaa3d537', 'unpaid', 'Unpaid Leave', false, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."leave_requests" ("id", "staff_record_id", "leave_type_id", "start_date", "end_date", "requested_days", "reason", "status", "rejection_reason", "reviewed_by", "reviewed_at", "org_unit_path", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('64c07fe6-55fb-44d3-8ead-52bc18c5479c', 'c1000000-0000-0000-0000-000000000013', '33b30aea-1e82-41d8-a184-3bd46859a9b1', '2026-04-25', '2026-04-27', 3, 'Family trip', 'pending', NULL, NULL, NULL, 'agartha.ops.giftshop', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('14e17a22-fdba-441a-b15b-669d7ae92258', 'c1000000-0000-0000-0000-000000000011', '33b30aea-1e82-41d8-a184-3bd46859a9b1', '2026-04-25', '2026-04-27', 3, 'Family trip', 'approved', NULL, 'c0000000-0000-0000-0000-000000000008', '2026-04-24 06:18:07.824+00', 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', '2026-04-24 06:18:07.882673+00', NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: leave_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."leave_ledger" ("id", "staff_record_id", "leave_type_id", "fiscal_year", "transaction_date", "transaction_type", "days", "leave_request_id", "org_unit_path", "notes", "created_at", "updated_at", "created_by") VALUES
	('49ca7858-124b-4efd-909d-d55d585be36f', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'accrual', 3, NULL, 'agartha.corp', 'Auto-accrual: policy assigned (annual_upfront, 2026/full-year)', '2026-04-24 05:15:39.669678+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('286fc39d-b6bd-41c9-8454-c6ec1531b71b', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'accrual', 3, NULL, 'agartha.corp', 'Auto-accrual: policy assigned (annual_upfront, 2026/full-year)', '2026-04-24 05:15:39.669678+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('67582405-d283-49cf-9f66-75ffea2624cc', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'accrual', 3, NULL, 'agartha.corp', 'Auto-accrual: policy assigned (annual_upfront, 2026/full-year)', '2026-04-24 05:15:39.669678+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('77e57092-eb64-44ea-924d-a07feb73fd6e', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:23:29.915829+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('8674a98b-8e49-49b2-abaa-80fb3dec470c', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', 12, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 15 days)', '2026-04-24 05:23:29.915829+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('1e52fbcc-2fe7-4cbe-b66c-26be8e778ad3', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:23:29.915829+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('982e927e-3613-431a-b551-a2ef451dc5f8', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', -14, NULL, 'agartha.corp', 'Auto-reversal: policy removed (zeroed 14 days)', '2026-04-24 05:23:34.77217+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('8a4635ea-59b0-4c02-a400-efc21fd1ed29', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', -15, NULL, 'agartha.corp', 'Auto-reversal: policy removed (zeroed 15 days)', '2026-04-24 05:23:34.77217+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('d4c5799a-4ec2-419a-a822-4ce1f7a23ad4', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', -14, NULL, 'agartha.corp', 'Auto-reversal: policy removed (zeroed 14 days)', '2026-04-24 05:23:34.77217+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('21f97a3b-3530-4369-8921-9f22018d445c', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', 3, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (0 → 3 days)', '2026-04-24 05:24:32.029635+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('2fc9c1f8-1a7b-49ee-a9a4-fcbbce83d18e', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', 3, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (0 → 3 days)', '2026-04-24 05:24:32.029635+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('6c68d594-c152-4d02-9d22-248c3814e72e', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', 3, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (0 → 3 days)', '2026-04-24 05:24:32.029635+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('71c30724-7468-4e84-98ce-35a22621fe3f', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:24:38.630235+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('6a8dafc2-a680-44df-b45b-9ed68548c569', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', 12, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 15 days)', '2026-04-24 05:24:38.630235+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('6b440d5d-5d6d-4338-9497-e32d37a6683a', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:24:38.630235+00', NULL, 'c0000000-0000-0000-0000-000000000003'),
	('6e4358aa-1307-4b74-b542-865ca90a83e4', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', -11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (14 → 3 days)', '2026-04-24 05:25:05.927492+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('bd19de3b-c52a-4c12-8099-b12df6e632b8', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', -12, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (15 → 3 days)', '2026-04-24 05:25:05.927492+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('4e106c6d-882f-4fa8-a60f-90b622740d91', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', -11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (14 → 3 days)', '2026-04-24 05:25:05.927492+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('ef2d0393-cabc-41d7-92df-ae6f1075a8c2', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:25:09.486829+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('749b6dca-7d26-4817-a93b-bfd64a0e6875', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', 12, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 15 days)', '2026-04-24 05:25:09.486829+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('14688b1a-a2be-4132-95ae-7774accd8fe0', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:25:09.486829+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('e935febd-c476-4c61-ae84-ff474f8bc63d', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', -11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (14 → 3 days)', '2026-04-24 05:25:15.283106+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('9eac7c0c-4520-4b50-bf43-f7c2fa8c1431', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', -12, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (15 → 3 days)', '2026-04-24 05:25:15.283106+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('6096502c-6595-45c2-9e92-d3d59b725b00', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', -11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (14 → 3 days)', '2026-04-24 05:25:15.283106+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('d1af5535-c8ea-4a3e-9fe7-98ae015bc062', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:25:22.88778+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('dcda1c0b-efc9-449b-b05d-b1865c09f341', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', 12, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 15 days)', '2026-04-24 05:25:22.88778+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('cef9ad69-f2f0-4b43-9bb9-0585fe161e59', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:25:22.88778+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('dfb244f1-6207-4f7d-8f38-98b634d7f216', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', -11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (14 → 3 days)', '2026-04-24 05:25:26.598635+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('888fbcc5-dff6-4eee-9360-ac0ac44bd358', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', -12, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (15 → 3 days)', '2026-04-24 05:25:26.598635+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('f581e3cb-4a8f-419b-9d96-2e35861e71f3', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', -11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (14 → 3 days)', '2026-04-24 05:25:26.598635+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('1a193c17-10aa-460a-9966-e143cb7acda4', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:25:54.923324+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('2bfe53c6-a7ec-487a-b0fd-f84927d1486d', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', 12, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 15 days)', '2026-04-24 05:25:54.923324+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('07fbd115-5a9f-4cdf-bf86-a0187d3f9f8f', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:25:54.923324+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('83ea456b-efd5-47fd-beab-399643197a58', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', -11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (14 → 3 days)', '2026-04-24 05:29:17.860335+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('f2aa5767-75c7-483b-8b86-c91f32700b52', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', -12, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (15 → 3 days)', '2026-04-24 05:29:17.860335+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('75a6b3d9-263a-43b4-be2e-ef41ffbb2946', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', -11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (14 → 3 days)', '2026-04-24 05:29:17.860335+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('f4f643b6-0cdb-48a9-9852-a71a03155da8', 'c1000000-0000-0000-0000-000000000002', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:29:21.197248+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('d4f810e8-f36c-484f-9b60-df70fee7e3bf', 'c1000000-0000-0000-0000-000000000002', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', 12, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 15 days)', '2026-04-24 05:29:21.197248+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('1e559c86-1c63-4a27-be32-cc59055b0436', 'c1000000-0000-0000-0000-000000000002', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', 11, NULL, 'agartha.corp', 'Auto-adjustment: policy changed (3 → 14 days)', '2026-04-24 05:29:21.197248+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('5be2107b-d89d-46dc-ac25-d98c7bc7be07', 'c1000000-0000-0000-0000-000000000011', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'usage', -3, '14e17a22-fdba-441a-b15b-669d7ae92258', 'agartha.ops.fnb', 'Auto-debit: leave approved', '2026-04-24 06:18:07.882673+00', NULL, NULL),
	('4f036488-8be2-4dab-9c66-21acf0f2ea11', 'c1000000-0000-0000-0000-000000000011', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-24', 'adjustment', 14, NULL, 'agartha.ops.fnb', 'Auto-accrual: policy assigned (target 14 days)', '2026-04-24 08:09:31.263019+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('ced776fa-7c30-4a16-abae-961ab23e9e00', 'c1000000-0000-0000-0000-000000000011', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-24', 'adjustment', 18, NULL, 'agartha.ops.fnb', 'Auto-accrual: policy assigned (target 15 days)', '2026-04-24 08:09:31.263019+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('b2e1bfcd-e3c1-4ca9-aa54-90ba4fdeb906', 'c1000000-0000-0000-0000-000000000011', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-24', 'adjustment', 14, NULL, 'agartha.ops.fnb', 'Auto-accrual: policy assigned (target 14 days)', '2026-04-24 08:09:31.263019+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('9a4f25ae-5165-4077-8460-3be96e50d3f8', 'c1000000-0000-0000-0000-000000000017', '334a0c10-be21-4ed2-881d-30f98fb552dc', 2026, '2026-04-27', 'adjustment', 3, NULL, 'agartha.support.cleaning', 'Auto-accrual: policy assigned (target 3 days)', '2026-04-27 06:43:14.545553+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('b0796d05-83ba-4368-a3f8-6ff8b08d9606', 'c1000000-0000-0000-0000-000000000017', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 2026, '2026-04-27', 'adjustment', 3, NULL, 'agartha.support.cleaning', 'Auto-accrual: policy assigned (target 3 days)', '2026-04-27 06:43:14.545553+00', NULL, 'c0000000-0000-0000-0000-000000000008'),
	('fa91c864-669a-45a1-b98c-c8c6521ab824', 'c1000000-0000-0000-0000-000000000017', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 2026, '2026-04-27', 'adjustment', 3, NULL, 'agartha.support.cleaning', 'Auto-accrual: policy assigned (target 3 days)', '2026-04-27 06:43:14.545553+00', NULL, 'c0000000-0000-0000-0000-000000000008') ON CONFLICT DO NOTHING;


--
-- Data for Name: leave_policy_entitlements; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."leave_policy_entitlements" ("policy_id", "leave_type_id", "days_per_year", "frequency", "created_at", "updated_at") VALUES
	('d4ac204c-6d02-46a0-a449-b4b656b725e5', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 3, 'annual_upfront', '2026-04-24 05:03:32.274342+00', NULL),
	('d4ac204c-6d02-46a0-a449-b4b656b725e5', '334a0c10-be21-4ed2-881d-30f98fb552dc', 3, 'annual_upfront', '2026-04-24 05:03:32.274342+00', NULL),
	('d4ac204c-6d02-46a0-a449-b4b656b725e5', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 3, 'annual_upfront', '2026-04-24 05:03:32.274342+00', NULL),
	('b3000000-0000-0000-0000-000000000001', '33b30aea-1e82-41d8-a184-3bd46859a9b1', 15, 'annual_upfront', '2026-04-24 05:18:09.073398+00', NULL),
	('b3000000-0000-0000-0000-000000000001', '334a0c10-be21-4ed2-881d-30f98fb552dc', 14, 'annual_upfront', '2026-04-24 05:18:09.073398+00', NULL),
	('b3000000-0000-0000-0000-000000000001', 'd61828e9-8fb6-49d0-8e3c-767aaaa3d537', 14, 'annual_upfront', '2026-04-24 05:18:09.073398+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: location_allowed_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."location_allowed_categories" ("location_id", "category_id", "created_at", "updated_at", "created_by") VALUES
	('aa000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000011', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000011', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000012', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000012', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000013', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000013', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000021', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000004', 'cc000000-0000-0000-0000-000000000021', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000031', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000031', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000004', 'cc000000-0000-0000-0000-000000000031', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000005', 'cc000000-0000-0000-0000-000000000031', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000032', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000032', '2026-04-18 07:24:56.820039+00', NULL, NULL),
	('aa000000-0000-0000-0000-000000000005', 'cc000000-0000-0000-0000-000000000032', '2026-04-18 07:24:56.820039+00', NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: maintenance_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pos_modifier_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pos_modifier_groups" ("id", "name", "display_name", "min_selections", "max_selections", "sort_order", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('af000000-0000-0000-0000-000000000001', 'milk_type', 'Milk Type', 1, 1, 10, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('af000000-0000-0000-0000-000000000002', 'shots', 'Extra Shot', 0, 2, 20, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('af000000-0000-0000-0000-000000000003', 'size', 'Cup Size', 1, 1, 5, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: material_modifier_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."material_modifier_groups" ("material_id", "modifier_group_id", "sort_order", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('a1000000-0000-0000-0000-000000000011', 'af000000-0000-0000-0000-000000000001', 10, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000012', 'af000000-0000-0000-0000-000000000001', 10, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000013', 'af000000-0000-0000-0000-000000000001', 10, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000011', 'af000000-0000-0000-0000-000000000002', 20, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000012', 'af000000-0000-0000-0000-000000000002', 20, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000013', 'af000000-0000-0000-0000-000000000002', 20, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000011', 'af000000-0000-0000-0000-000000000003', 5, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000012', 'af000000-0000-0000-0000-000000000003', 5, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000013', 'af000000-0000-0000-0000-000000000003', 5, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: material_procurement_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."material_procurement_data" ("material_id", "supplier_id", "supplier_sku", "cost_price", "purchase_unit_id", "lead_time_days", "min_order_qty", "is_default", "created_at", "updated_at") VALUES
	('a1000000-0000-0000-0000-000000000041', 'dd000000-0000-0000-0000-000000000001', 'SEMI-ESPRESSO', 0.00, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000013', 'dd000000-0000-0000-0000-000000000001', 'DRINK-ICECHOC', 0.00, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000012', 'dd000000-0000-0000-0000-000000000001', 'DRINK-AMERICANO', 0.00, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000011', 'dd000000-0000-0000-0000-000000000001', 'DRINK-LATTE', 0.00, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000003', 'dd000000-0000-0000-0000-000000000002', 'SUGAR-1KG', 3.80, '9c0751a2-cd90-4eb5-be1a-90a37e055d61', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000002', 'dd000000-0000-0000-0000-000000000002', 'MILK-FRESH-1L', 6.50, '0daef3e9-f205-4168-8301-161656f2c831', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000001', 'dd000000-0000-0000-0000-000000000002', 'COFFEE-ARB-1KG', 45.00, '9c0751a2-cd90-4eb5-be1a-90a37e055d61', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000023', 'dd000000-0000-0000-0000-000000000003', 'MUG-AGARTHA', 12.00, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000022', 'dd000000-0000-0000-0000-000000000003', 'PLUSH-AGARTHA', 18.00, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000021', 'dd000000-0000-0000-0000-000000000003', 'TEE-AGARTHA-M', 25.00, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000034', 'dd000000-0000-0000-0000-000000000004', 'PPE-HELMET', 55.00, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000033', 'dd000000-0000-0000-0000-000000000004', 'UNI-POLO-M', 40.00, 'b72422bc-e358-4a6f-b47f-1edfcc507e78', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000032', 'dd000000-0000-0000-0000-000000000004', 'TRASH-BAG-100', 22.00, '7a856da1-1b00-4fe5-90f8-6a67a09b8aff', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL),
	('a1000000-0000-0000-0000-000000000031', 'dd000000-0000-0000-0000-000000000004', 'CLEAN-FLOOR-5L', 35.00, '0daef3e9-f205-4168-8301-161656f2c831', 3, 5, true, '2026-04-18 07:24:56.820039+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: material_requisition_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."material_requisition_items" ("id", "requisition_id", "material_id", "movement_type_code", "requested_qty", "delivered_qty", "photo_url", "created_at", "updated_at") VALUES
	('da1d9365-c141-4c5d-98fe-ed0908de465a', 'f593def2-16c0-49ac-955e-0d82f370b5b6', 'a1000000-0000-0000-0000-000000000003', '311', 2, NULL, NULL, '2026-04-27 01:42:33.594188+00', NULL),
	('58224f4f-f420-41a2-ba97-34627b796fbc', 'f593def2-16c0-49ac-955e-0d82f370b5b6', 'a1000000-0000-0000-0000-000000000032', '201', 1, NULL, NULL, '2026-04-27 01:42:33.594188+00', NULL),
	('c5599422-41f0-4119-8f84-cd96581192ad', '4cfa69e8-b7ce-4fcc-b168-eb3ae7df823f', 'a1000000-0000-0000-0000-000000000002', '311', 1, NULL, NULL, '2026-04-27 02:06:58.724641+00', NULL),
	('9456df64-85a4-4bc9-8f46-ae4a92a67eb3', '1d9243f8-c1eb-4e98-b030-582a3f11d658', 'a1000000-0000-0000-0000-000000000033', '201', 1, 1, NULL, '2026-04-27 01:43:51.950167+00', '2026-04-27 04:53:12.20019+00'),
	('c9ddecb9-ed5e-4e0d-adc8-0e64aec07021', '7a1307fe-d9dc-47ed-970a-2016bc709ddd', 'a1000000-0000-0000-0000-000000000002', '311', 2, 2, NULL, '2026-04-27 05:57:35.716354+00', '2026-04-27 05:57:46.515816+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: material_sales_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."material_sales_data" ("material_id", "pos_point_id", "display_name", "selling_price", "display_category_id", "image_url", "allergens", "sort_order", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('a1000000-0000-0000-0000-000000000011', 'ad000000-0000-0000-0000-000000000001', 'Latte', 12.00, 'ae000000-0000-0000-0000-000000000001', NULL, NULL, 10, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000012', 'ad000000-0000-0000-0000-000000000001', 'Americano', 10.00, 'ae000000-0000-0000-0000-000000000001', NULL, NULL, 20, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000013', 'ad000000-0000-0000-0000-000000000001', 'Iced Chocolate', 14.00, 'ae000000-0000-0000-0000-000000000002', NULL, NULL, 10, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000021', 'ad000000-0000-0000-0000-000000000002', 'Agartha T-Shirt', 59.00, 'ae000000-0000-0000-0000-000000000011', NULL, NULL, 10, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000022', 'ad000000-0000-0000-0000-000000000002', 'Agartha Plush', 45.00, 'ae000000-0000-0000-0000-000000000012', NULL, NULL, 10, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('a1000000-0000-0000-0000-000000000023', 'ad000000-0000-0000-0000-000000000002', 'Souvenir Mug', 29.00, 'ae000000-0000-0000-0000-000000000012', NULL, NULL, 20, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: material_valuation; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."order_items" ("id", "order_id", "material_id", "quantity", "unit_price", "created_at", "updated_at") VALUES
	('74cffa30-a67f-4dea-9078-af1e58c0d0b4', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000011', 2, 12.00, '2026-04-18 07:24:56.820039+00', NULL),
	('21cec38c-b856-4a89-9313-9e262f160e00', 'd1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000011', 2, 12.00, '2026-04-18 07:24:56.820039+00', NULL),
	('4db6198d-13fc-4942-93af-8e107daa71d8', 'd1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000011', 2, 12.00, '2026-04-18 07:24:56.820039+00', NULL),
	('506f6edf-a20f-4398-b075-87de3ec2a7f6', 'd1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000011', 2, 12.00, '2026-04-18 07:24:56.820039+00', NULL),
	('837c78e1-107c-4c5e-bfe9-73f188eea1f9', 'd1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000011', 2, 12.00, '2026-04-18 07:24:56.820039+00', NULL),
	('f2340545-9b06-434c-a1cd-ec9538e73d62', '4f819bb6-f0b5-441c-9063-d9aed5a5b53b', 'a1000000-0000-0000-0000-000000000011', 1, 22.00, '2026-04-23 08:24:39.290985+00', NULL),
	('bdd80c8e-a6d3-4c57-87bb-44c5f46a149b', '4f819bb6-f0b5-441c-9063-d9aed5a5b53b', 'a1000000-0000-0000-0000-000000000012', 1, 15.00, '2026-04-23 08:24:39.290985+00', NULL),
	('1eeedc52-10a2-4a13-bd8f-4b25851d15ee', '23414f47-d71e-4e19-8936-911a3f692c12', 'a1000000-0000-0000-0000-000000000012', 1, 15.00, '2026-04-27 02:06:05.279508+00', NULL),
	('17619be0-e811-42df-8bd4-bcff7682b501', 'b5b9a638-449a-4d49-8e37-ee69151232cf', 'a1000000-0000-0000-0000-000000000012', 1, 14.00, '2026-04-27 02:16:31.106661+00', NULL),
	('2f2caf79-0359-49d0-98a4-152a4d2889af', 'b65d360f-bcac-46f4-9f5a-9885a3d105e9', 'a1000000-0000-0000-0000-000000000011', 1, 14.00, '2026-04-27 06:51:54.604972+00', NULL),
	('8a91da88-2b7b-4d1e-b17b-6465ce0c4ae0', 'b65d360f-bcac-46f4-9f5a-9885a3d105e9', 'a1000000-0000-0000-0000-000000000013', 1, 16.00, '2026-04-27 06:51:54.604972+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: pos_modifier_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pos_modifier_options" ("id", "group_id", "name", "price_delta", "material_id", "quantity_delta", "sort_order", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('4c6b5a74-8ff4-4a94-a1e0-2e0503dc7023', 'af000000-0000-0000-0000-000000000001', 'Dairy', 0.00, NULL, 0, 10, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('170cc978-b89b-4ab7-9f00-a6c8c445b320', 'af000000-0000-0000-0000-000000000001', 'Oat', 2.00, NULL, 0, 20, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('5eb53cb8-f62a-405d-af59-215e951f2c56', 'af000000-0000-0000-0000-000000000001', 'Almond', 2.00, NULL, 0, 30, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('736d701c-763b-42c8-83c3-c847ee759c36', 'af000000-0000-0000-0000-000000000002', 'Single Shot', 3.00, NULL, 0, 10, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('d10d5313-5853-47f5-83d2-3d0b57efcd35', 'af000000-0000-0000-0000-000000000002', 'Double Shot', 5.00, NULL, 0, 20, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('c99bae94-22c8-47ff-a6d1-55d1986c49bd', 'af000000-0000-0000-0000-000000000003', 'Small', 0.00, NULL, 0, 10, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ba60f912-4c65-4da2-b7ee-495e9e51904a', 'af000000-0000-0000-0000-000000000003', 'Regular', 2.00, NULL, 0, 20, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('38db79bd-8373-4cde-9a64-9dbd94c32f68', 'af000000-0000-0000-0000-000000000003', 'Large', 4.00, NULL, 0, 30, true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: order_item_modifiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."order_item_modifiers" ("id", "order_item_id", "modifier_option_id", "option_name", "price_delta", "material_id", "quantity_delta", "created_at", "updated_at") VALUES
	('cc455fa1-e85f-4dd1-af03-0ba1caa8974c', 'f2340545-9b06-434c-a1cd-ec9538e73d62', '4c6b5a74-8ff4-4a94-a1e0-2e0503dc7023', 'Dairy', 0.00, NULL, 0, '2026-04-23 08:24:39.290985+00', NULL),
	('53e14acb-bd0b-4626-a4e7-301d7554543d', 'f2340545-9b06-434c-a1cd-ec9538e73d62', '736d701c-763b-42c8-83c3-c847ee759c36', 'Single Shot', 3.00, NULL, 0, '2026-04-23 08:24:39.290985+00', NULL),
	('1551e944-8cf0-4234-afee-4af7b76987a8', 'f2340545-9b06-434c-a1cd-ec9538e73d62', 'd10d5313-5853-47f5-83d2-3d0b57efcd35', 'Double Shot', 5.00, NULL, 0, '2026-04-23 08:24:39.290985+00', NULL),
	('9a6f3f1f-38b2-4edc-9526-205ca79d429d', 'f2340545-9b06-434c-a1cd-ec9538e73d62', 'ba60f912-4c65-4da2-b7ee-495e9e51904a', 'Regular', 2.00, NULL, 0, '2026-04-23 08:24:39.290985+00', NULL),
	('2b98699b-71e1-4d7c-9421-cd0fb9b99364', 'bdd80c8e-a6d3-4c57-87bb-44c5f46a149b', '4c6b5a74-8ff4-4a94-a1e0-2e0503dc7023', 'Dairy', 0.00, NULL, 0, '2026-04-23 08:24:39.290985+00', NULL),
	('9977fee8-9c97-442b-8d18-71e05f7d7d9e', 'bdd80c8e-a6d3-4c57-87bb-44c5f46a149b', 'd10d5313-5853-47f5-83d2-3d0b57efcd35', 'Double Shot', 5.00, NULL, 0, '2026-04-23 08:24:39.290985+00', NULL),
	('cbddb717-6898-46f3-87b0-45522f232e69', 'bdd80c8e-a6d3-4c57-87bb-44c5f46a149b', 'c99bae94-22c8-47ff-a6d1-55d1986c49bd', 'Small', 0.00, NULL, 0, '2026-04-23 08:24:39.290985+00', NULL),
	('92d606f6-dae8-4200-9006-0afd747eda56', '1eeedc52-10a2-4a13-bd8f-4b25851d15ee', '4c6b5a74-8ff4-4a94-a1e0-2e0503dc7023', 'Dairy', 0.00, NULL, 0, '2026-04-27 02:06:05.279508+00', NULL),
	('d064db1b-0dd1-4af5-a7eb-09caac9d8c7c', '1eeedc52-10a2-4a13-bd8f-4b25851d15ee', '736d701c-763b-42c8-83c3-c847ee759c36', 'Single Shot', 3.00, NULL, 0, '2026-04-27 02:06:05.279508+00', NULL),
	('6e0545d8-f22d-4f72-bb7f-205fc8fc4ca7', '1eeedc52-10a2-4a13-bd8f-4b25851d15ee', 'ba60f912-4c65-4da2-b7ee-495e9e51904a', 'Regular', 2.00, NULL, 0, '2026-04-27 02:06:05.279508+00', NULL),
	('a23fe754-89dd-47d0-b2a0-f8d5e23a90e9', '17619be0-e811-42df-8bd4-bcff7682b501', '170cc978-b89b-4ab7-9f00-a6c8c445b320', 'Oat', 2.00, NULL, 0, '2026-04-27 02:16:31.106661+00', NULL),
	('1e081581-9ba6-4239-be86-3d15bce5d061', '17619be0-e811-42df-8bd4-bcff7682b501', 'ba60f912-4c65-4da2-b7ee-495e9e51904a', 'Regular', 2.00, NULL, 0, '2026-04-27 02:16:31.106661+00', NULL),
	('3bcd7824-f7e3-4d6b-b6bc-29c6761d0718', '2f2caf79-0359-49d0-98a4-152a4d2889af', '4c6b5a74-8ff4-4a94-a1e0-2e0503dc7023', 'Dairy', 0.00, NULL, 0, '2026-04-27 06:51:54.604972+00', NULL),
	('dcfbf2cd-6183-462b-ae5d-61411ea575cb', '2f2caf79-0359-49d0-98a4-152a4d2889af', 'ba60f912-4c65-4da2-b7ee-495e9e51904a', 'Regular', 2.00, NULL, 0, '2026-04-27 06:51:54.604972+00', NULL),
	('922d528d-fb38-4d72-89be-18602aee36d9', '8a91da88-2b7b-4d1e-b17b-6465ce0c4ae0', '4c6b5a74-8ff4-4a94-a1e0-2e0503dc7023', 'Dairy', 0.00, NULL, 0, '2026-04-27 06:51:54.604972+00', NULL),
	('66a3e710-045a-4269-827e-dc75d202d1c5', '8a91da88-2b7b-4d1e-b17b-6465ce0c4ae0', 'ba60f912-4c65-4da2-b7ee-495e9e51904a', 'Regular', 2.00, NULL, 0, '2026-04-27 06:51:54.604972+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: permission_domains; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."permission_domains" ("id", "code", "name", "description", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('2be6bc0e-4525-4606-bb13-36a1d513735d', 'system', 'System', 'Roles, org units, locations, POS points, units, UOM, storage bins', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('9cf95fa4-55eb-4c77-aa95-fd7b945259df', 'hr', 'Human Resources', 'Staff records, profiles, IAM, shifts, rosters, leave, attendance', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('1a0bb16e-39c6-4d09-8607-62b151765320', 'inventory', 'Inventory', 'Materials master, stock cache, valuation, movement types', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('6335364c-238a-422f-9cfb-ae64b5bbd5eb', 'inventory_ops', 'Inventory Operations', 'Goods movements, write-offs, requisitions, reconciliations, equipment', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('d947d3c0-fd9c-4938-9b93-c50f10a1a0c3', 'pos', 'Point of Sale', 'Orders, order items, sales data, display categories, modifiers, BOM, price lists', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('9727825a-6e97-4547-ae63-e6263fae310a', 'procurement', 'Procurement', 'Purchase orders, PO items, suppliers', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('843acb57-3b46-4b90-98dc-f34df9b92894', 'booking', 'Booking', 'Experiences, tiers, scheduler, time slots, bookings, payments', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('6f2c2db4-4eda-44b6-9c4b-67822df839c8', 'ops', 'Operations', 'Incidents, zones, zone telemetry, crew zones, vehicles', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('01d48020-974c-4056-9bca-ed9c69456dbe', 'it', 'IT Infrastructure', 'Devices, device types, heartbeats, VLANs', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('a2186c82-5a55-44ff-ace8-455668e65c5b', 'maintenance', 'Maintenance', 'Maintenance vendors, maintenance orders', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('ac1f87c9-344c-4b15-9194-e960516fb056', 'marketing', 'Marketing', 'Campaigns, promo codes, promo valid tiers', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('ac376e2e-cc7b-4338-80df-653058f37f35', 'comms', 'Communications', 'Announcements, announcement targets, announcement reads', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', 'reports', 'Reports & Compliance', 'Reports, report executions, survey responses, system audit log', '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: price_lists; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."price_lists" ("id", "name", "currency", "valid_from", "valid_to", "is_default", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('b0000000-0000-0000-0000-000000000001', 'Standard 2026', 'MYR', '2026-04-18', '2027-04-18', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: price_list_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: promo_valid_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."promo_valid_tiers" ("promo_code_id", "tier_id", "created_at", "updated_at") VALUES
	('b5000000-0000-0000-0000-000000000002', 'ac000000-0000-0000-0000-000000000003', '2026-04-18 07:24:56.820039+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: public_holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."public_holidays" ("id", "holiday_date", "name", "created_at", "updated_at", "created_by") VALUES
	('283ff2e7-f3dc-4b08-b400-b59cd9959afb', '2026-04-28', 'public holiday', '2026-04-24 03:46:47.183172+00', NULL, 'c0000000-0000-0000-0000-000000000008') ON CONFLICT DO NOTHING;


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."purchase_order_items" ("id", "po_id", "material_id", "expected_qty", "received_qty", "unit_price", "photo_proof_url", "created_at", "updated_at") VALUES
	('eb9dafe8-8483-4b82-9d9b-ce9e99ab7da2', '1c447061-4e96-4072-a6fc-19c7120e69c4', 'a1000000-0000-0000-0000-000000000022', 8, 0, 18, NULL, '2026-04-26 11:43:49.777807+00', NULL),
	('3d2d60fb-48e6-4974-bb4f-48d628b4c1bf', '1c447061-4e96-4072-a6fc-19c7120e69c4', 'a1000000-0000-0000-0000-000000000021', 10, 0, 25, NULL, '2026-04-26 11:43:49.777807+00', NULL),
	('03c6760b-f929-4ce8-8895-766aa2fb888d', '1c447061-4e96-4072-a6fc-19c7120e69c4', 'a1000000-0000-0000-0000-000000000023', 15, 0, 12, NULL, '2026-04-26 11:43:49.777807+00', NULL),
	('55b71b1a-fcbb-47d9-b446-17cf7d27fef4', '0c88cdcc-1893-43e9-b281-5c533ad76276', 'a1000000-0000-0000-0000-000000000001', 20, 0, 45, NULL, '2026-04-26 11:43:49.996732+00', NULL),
	('35a19588-b3d4-4754-9f81-b126e9edcb86', '0c88cdcc-1893-43e9-b281-5c533ad76276', 'a1000000-0000-0000-0000-000000000002', 30, 0, 6.5, NULL, '2026-04-26 11:43:49.996732+00', NULL),
	('32943df7-76b2-47ea-85f2-0032314f4007', '0c88cdcc-1893-43e9-b281-5c533ad76276', 'a1000000-0000-0000-0000-000000000003', 15, 0, 3.8, NULL, '2026-04-26 11:43:49.996732+00', NULL),
	('2965208c-2275-408e-82db-e5a636e5c372', 'd09afe95-2735-4209-a31f-a7d6686cd941', 'a1000000-0000-0000-0000-000000000033', 20, 0, 40, NULL, '2026-04-26 11:43:50.188167+00', NULL),
	('3989a9d7-d0c7-4065-a523-1415cc8e91bc', 'd09afe95-2735-4209-a31f-a7d6686cd941', 'a1000000-0000-0000-0000-000000000031', 8, 0, 35, NULL, '2026-04-26 11:43:50.188167+00', NULL),
	('b514e92d-1e2f-4379-a27d-914bcb38eb83', 'd09afe95-2735-4209-a31f-a7d6686cd941', 'a1000000-0000-0000-0000-000000000034', 10, 0, 55, NULL, '2026-04-26 11:43:50.188167+00', NULL),
	('ae70bd11-9b3d-49d6-a70c-d3e37b2554b9', 'd09afe95-2735-4209-a31f-a7d6686cd941', 'a1000000-0000-0000-0000-000000000032', 10, 0, 22, NULL, '2026-04-26 11:43:50.188167+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."reports" ("id", "report_type", "parameters", "export_format", "schedule_cron", "recipients", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('0c1e9a7a-0b02-46bc-ae8e-b73596fe9860', 'daily_sales', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "today"}}', 'csv', NULL, '[]', true, '2026-04-22 06:10:08.043422+00', NULL, NULL, NULL),
	('340e00db-e529-4adb-9cb6-7ea0a27ec0f0', 'incident_summary', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:10:51.045609+00', NULL, NULL, NULL),
	('fefd5984-b116-46df-b814-1a0f398bfcdb', 'monthly_attendance_summary', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:30.274676+00', NULL, NULL, NULL),
	('44687227-f226-410e-8096-21fdace418ac', 'monthly_timesheet', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:33.063183+00', NULL, NULL, NULL),
	('58eac380-eb4f-4c20-85c3-9eddedd822a1', 'leave_balance', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:34.421704+00', NULL, NULL, NULL),
	('1a1adcbe-6009-44a3-94b4-1c8238767e01', 'leave_usage', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:35.424928+00', NULL, NULL, NULL),
	('502ece28-16a0-44db-bc6c-816278bbb979', 'staff_roster', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:36.146074+00', NULL, NULL, NULL),
	('2255394d-675a-4a29-a22d-b0df6baee7a3', 'exception_report', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:36.959463+00', NULL, NULL, NULL),
	('04edf7c7-1f3c-4fb3-8779-aa3fa3be5abf', 'sales_by_item', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:37.783883+00', NULL, NULL, NULL),
	('ab209153-6110-42c4-88aa-112e2ab56db2', 'sales_by_category', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:38.758673+00', NULL, NULL, NULL),
	('0841ae27-c591-428b-b7b2-706b92e92fbb', 'sales_by_payment_method', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:39.439713+00', NULL, NULL, NULL),
	('d9976eb0-4607-451a-8f65-43501f5a809f', 'hourly_sales', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:40.131898+00', NULL, NULL, NULL),
	('43e710f3-2182-4837-8e12-b5934ec1e5c9', 'purchase_order_summary', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:40.793258+00', NULL, NULL, NULL),
	('80e3ae39-37d8-45ff-be2b-7e5ad09d88e5', 'stock_level', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:41.511321+00', NULL, NULL, NULL),
	('f2b6d4ff-ae97-44aa-9c01-8e0d82d0db7f', 'low_stock_alert', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:42.259893+00', NULL, NULL, NULL),
	('1399889c-2083-4dff-bb09-610ea1809d11', 'waste_report', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:43.541837+00', NULL, NULL, NULL),
	('9582beec-7e6a-473d-a292-17abbe40a3c0', 'inventory_movement', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:44.375332+00', NULL, NULL, NULL),
	('e7d62489-8e01-4229-b5f2-063260ac471b', 'reconciliation_report', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:45.443834+00', NULL, NULL, NULL),
	('66ba8e51-0a35-4f66-b0eb-86af5774b781', 'booking_summary', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:46.139145+00', NULL, NULL, NULL),
	('8d22555c-5714-4045-bdcd-cfb953a5c987', 'booking_occupancy', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:46.914789+00', NULL, NULL, NULL),
	('c557f120-413f-4925-96bf-f3b586219ebd', 'revenue_by_experience', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:47.652398+00', NULL, NULL, NULL),
	('cde573cd-bad8-4aa1-8477-adf0ede0a18c', 'vehicle_status', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:48.272098+00', NULL, NULL, NULL),
	('7ca45452-3f8f-44d9-b306-e5252a33216e', 'guest_satisfaction', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:49.010456+00', NULL, NULL, NULL),
	('0f3094f4-1df1-4d60-b451-6cc3824dce8f', 'nps_summary', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:49.651937+00', NULL, NULL, NULL),
	('41626a52-d263-4488-8207-b69992759c0b', 'maintenance_summary', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 06:11:50.288758+00', NULL, NULL, NULL),
	('2271711c-ee61-46a3-9f03-f0a1c68b68b0', 'maintenance_summary', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', '0 6 * * 1', '["test@agartha.text"]', true, '2026-04-22 07:04:25.471986+00', NULL, 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005'),
	('179390e7-d2b0-49fe-ad2e-f4b5abb069b5', 'maintenance_summary', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_30_days"}}', 'csv', NULL, '[]', true, '2026-04-22 07:19:29.709674+00', NULL, 'c0000000-0000-0000-0000-000000000005', NULL),
	('5f09898d-8b0e-4bbb-84d6-f81f11eaaa80', 'exception_report', '{"extras": {}, "date_range": {"to": null, "from": null, "preset": "last_7_days"}}', 'csv', NULL, '[]', true, '2026-04-24 03:49:16.229243+00', NULL, 'c0000000-0000-0000-0000-000000000002', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: report_executions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."report_executions" ("id", "report_id", "status", "row_count", "file_url", "error_message", "started_at", "completed_at", "created_at", "updated_at", "created_by") VALUES
	('ea38badd-05a9-4ab0-8cb1-4d8839bb9c62', '0c1e9a7a-0b02-46bc-ae8e-b73596fe9860', 'completed', 1, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/daily_sales/2026-04-22T06-10-11-612Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2RhaWx5X3NhbGVzLzIwMjYtMDQtMjJUMDYtMTAtMTEtNjEyWi5jc3YiLCJpYXQiOjE3NzY4MzgyMTIsImV4cCI6MTc3NzQ0MzAxMn0.OfkdJiAwUee4z7Dmbs9mbY8rOdbLDAh_neUS0T_cUCw', NULL, '2026-04-22 06:10:09.177559+00', '2026-04-22 06:10:12.97+00', '2026-04-22 06:10:09.177559+00', NULL, NULL),
	('bc64b194-6492-4a6d-b85a-e1908a4a30f9', '340e00db-e529-4adb-9cb6-7ea0a27ec0f0', 'completed', 6, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/incident_summary/2026-04-22T06-10-52-466Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2luY2lkZW50X3N1bW1hcnkvMjAyNi0wNC0yMlQwNi0xMC01Mi00NjZaLmNzdiIsImlhdCI6MTc3NjgzODI1MywiZXhwIjoxNzc3NDQzMDUzfQ.QxpzcAq_mvFZXK-mcbVCjdHY2RQktjQs61VvCHvmJAI', NULL, '2026-04-22 06:10:51.463506+00', '2026-04-22 06:10:53.7+00', '2026-04-22 06:10:51.463506+00', NULL, NULL),
	('d10d7712-006b-4994-adb2-20118d3ff528', 'fefd5984-b116-46df-b814-1a0f398bfcdb', 'completed', 19, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/monthly_attendance_summary/2026-04-22T06-11-31-372Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL21vbnRobHlfYXR0ZW5kYW5jZV9zdW1tYXJ5LzIwMjYtMDQtMjJUMDYtMTEtMzEtMzcyWi5jc3YiLCJpYXQiOjE3NzY4MzgyOTIsImV4cCI6MTc3NzQ0MzA5Mn0.349fee13MBi6xf_FC98zoMlk9i7KrpD1AF9V5-RhwSY', NULL, '2026-04-22 06:11:30.740995+00', '2026-04-22 06:11:32.053+00', '2026-04-22 06:11:30.740995+00', NULL, NULL),
	('6ee76e12-a46a-416f-a5a2-e8fdb539880b', '44687227-f226-410e-8096-21fdace418ac', 'completed', 57, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/monthly_timesheet/2026-04-22T06-11-33-614Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL21vbnRobHlfdGltZXNoZWV0LzIwMjYtMDQtMjJUMDYtMTEtMzMtNjE0Wi5jc3YiLCJpYXQiOjE3NzY4MzgyOTMsImV4cCI6MTc3NzQ0MzA5M30.BDO5O4y2yURo6TFTwBxlSWiyJZ8PVxn_QObIoR77xQA', NULL, '2026-04-22 06:11:33.294782+00', '2026-04-22 06:11:33.815+00', '2026-04-22 06:11:33.294782+00', NULL, NULL),
	('713c01b4-554a-46ff-91b0-136b22baa23c', '58eac380-eb4f-4c20-85c3-9eddedd822a1', 'completed', 0, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/leave_balance/2026-04-22T06-11-34-593Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2xlYXZlX2JhbGFuY2UvMjAyNi0wNC0yMlQwNi0xMS0zNC01OTNaLmNzdiIsImlhdCI6MTc3NjgzODI5NCwiZXhwIjoxNzc3NDQzMDk0fQ.AdXeBC0LnZZeDX0cw-ZC1C_sLp9lTzQ21hZxdTucXUY', NULL, '2026-04-22 06:11:34.477059+00', '2026-04-22 06:11:34.938+00', '2026-04-22 06:11:34.477059+00', NULL, NULL),
	('70f84d8d-e8ef-4571-99d6-4b41d41c8f81', '1a1adcbe-6009-44a3-94b4-1c8238767e01', 'completed', 0, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/leave_usage/2026-04-22T06-11-35-575Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2xlYXZlX3VzYWdlLzIwMjYtMDQtMjJUMDYtMTEtMzUtNTc1Wi5jc3YiLCJpYXQiOjE3NzY4MzgyOTUsImV4cCI6MTc3NzQ0MzA5NX0.-BGFgDjLXkR2WNt6oM4sb8yl8Lz9SEP87BNFFGUzSHU', NULL, '2026-04-22 06:11:35.474368+00', '2026-04-22 06:11:35.74+00', '2026-04-22 06:11:35.474368+00', NULL, NULL),
	('240d3492-8e64-4cb2-b792-60112160efde', '502ece28-16a0-44db-bc6c-816278bbb979', 'completed', 19, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/staff_roster/2026-04-22T06-11-36-319Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL3N0YWZmX3Jvc3Rlci8yMDI2LTA0LTIyVDA2LTExLTM2LTMxOVouY3N2IiwiaWF0IjoxNzc2ODM4Mjk2LCJleHAiOjE3Nzc0NDMwOTZ9.m3uAoEU_Yz9I0FWiZx11btJL_LAvKwwTDgOllfoZFFU', NULL, '2026-04-22 06:11:36.200343+00', '2026-04-22 06:11:36.489+00', '2026-04-22 06:11:36.200343+00', NULL, NULL),
	('e88c0634-db5e-49a1-8e4d-ff3816898ab8', '2255394d-675a-4a29-a22d-b0df6baee7a3', 'completed', 41, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/exception_report/2026-04-22T06-11-37-119Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2V4Y2VwdGlvbl9yZXBvcnQvMjAyNi0wNC0yMlQwNi0xMS0zNy0xMTlaLmNzdiIsImlhdCI6MTc3NjgzODI5NywiZXhwIjoxNzc3NDQzMDk3fQ.bZraR98-FrzeUubSaV3kms5qJ5SJb3-LGwFgPz5Qflg', NULL, '2026-04-22 06:11:37.0143+00', '2026-04-22 06:11:37.349+00', '2026-04-22 06:11:37.0143+00', NULL, NULL),
	('066db8ad-6b4b-46bd-95a9-ef8215094544', '04edf7c7-1f3c-4fb3-8779-aa3fa3be5abf', 'completed', 1, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/sales_by_item/2026-04-22T06-11-38-051Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL3NhbGVzX2J5X2l0ZW0vMjAyNi0wNC0yMlQwNi0xMS0zOC0wNTFaLmNzdiIsImlhdCI6MTc3NjgzODI5OCwiZXhwIjoxNzc3NDQzMDk4fQ.zZIM9Jjnt9uVTqHfTt8Lrfz_BxS6LuTizNb4Kdobc-8', NULL, '2026-04-22 06:11:37.854801+00', '2026-04-22 06:11:38.293+00', '2026-04-22 06:11:37.854801+00', NULL, NULL),
	('67f8a806-a9a1-4780-9bc0-139faa955b22', 'ab209153-6110-42c4-88aa-112e2ab56db2', 'completed', 1, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/sales_by_category/2026-04-22T06-11-38-930Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL3NhbGVzX2J5X2NhdGVnb3J5LzIwMjYtMDQtMjJUMDYtMTEtMzgtOTMwWi5jc3YiLCJpYXQiOjE3NzY4MzgyOTksImV4cCI6MTc3NzQ0MzA5OX0.MUTuTL51bU8tE4pbaChESfNfoJve7PsJ009IOVRy-NQ', NULL, '2026-04-22 06:11:38.80909+00', '2026-04-22 06:11:39.1+00', '2026-04-22 06:11:38.80909+00', NULL, NULL),
	('f312fe6e-865e-4c9e-a8ed-a781937de514', '0841ae27-c591-428b-b7b2-706b92e92fbb', 'completed', 1, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/sales_by_payment_method/2026-04-22T06-11-39-582Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL3NhbGVzX2J5X3BheW1lbnRfbWV0aG9kLzIwMjYtMDQtMjJUMDYtMTEtMzktNTgyWi5jc3YiLCJpYXQiOjE3NzY4MzgyOTksImV4cCI6MTc3NzQ0MzA5OX0.zSxcA5ejUGuSc0pk2abFA9Hd0EIgZTYWNbyfoneBU1o', NULL, '2026-04-22 06:11:39.486143+00', '2026-04-22 06:11:39.72+00', '2026-04-22 06:11:39.486143+00', NULL, NULL),
	('c417697d-1ffc-469f-9605-e2c21298ee39', 'd9976eb0-4607-451a-8f65-43501f5a809f', 'completed', 1, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/hourly_sales/2026-04-22T06-11-40-275Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2hvdXJseV9zYWxlcy8yMDI2LTA0LTIyVDA2LTExLTQwLTI3NVouY3N2IiwiaWF0IjoxNzc2ODM4MzAwLCJleHAiOjE3Nzc0NDMxMDB9.xCmkIPyBScR2G7nIdIHWvkOGnLO5cWspr4Jj8hF4XNI', NULL, '2026-04-22 06:11:40.176524+00', '2026-04-22 06:11:40.41+00', '2026-04-22 06:11:40.176524+00', NULL, NULL),
	('8daff07a-f243-4dc4-b9c8-296e6237df7f', '43e710f3-2182-4837-8e12-b5934ec1e5c9', 'completed', 0, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/purchase_order_summary/2026-04-22T06-11-40-945Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL3B1cmNoYXNlX29yZGVyX3N1bW1hcnkvMjAyNi0wNC0yMlQwNi0xMS00MC05NDVaLmNzdiIsImlhdCI6MTc3NjgzODMwMSwiZXhwIjoxNzc3NDQzMTAxfQ.lwjB97VCXwYUfBp2lk1wkhKkh32LoK0TW7CoO5OurFY', NULL, '2026-04-22 06:11:40.839762+00', '2026-04-22 06:11:41.139+00', '2026-04-22 06:11:40.839762+00', NULL, NULL),
	('be3f47ad-5b78-4208-9f78-5bddebd97424', '80e3ae39-37d8-45ff-be2b-7e5ad09d88e5', 'completed', 0, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/stock_level/2026-04-22T06-11-41-655Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL3N0b2NrX2xldmVsLzIwMjYtMDQtMjJUMDYtMTEtNDEtNjU1Wi5jc3YiLCJpYXQiOjE3NzY4MzgzMDEsImV4cCI6MTc3NzQ0MzEwMX0.DR-JMfKewg3v8W-ZXmbr1kqBNujYZHpLr2OW5D7xcl0', NULL, '2026-04-22 06:11:41.555762+00', '2026-04-22 06:11:41.869+00', '2026-04-22 06:11:41.555762+00', NULL, NULL),
	('2ce67d42-2a4b-4579-b4d0-c68f20b88cc6', 'f2b6d4ff-ae97-44aa-9c01-8e0d82d0db7f', 'completed', 0, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/low_stock_alert/2026-04-22T06-11-42-440Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2xvd19zdG9ja19hbGVydC8yMDI2LTA0LTIyVDA2LTExLTQyLTQ0MFouY3N2IiwiaWF0IjoxNzc2ODM4MzAzLCJleHAiOjE3Nzc0NDMxMDN9.DKBYAQgC6uQ8JwoGfyPcchGbV9bruspMACgibXnAIZY', NULL, '2026-04-22 06:11:42.323113+00', '2026-04-22 06:11:43.146+00', '2026-04-22 06:11:42.323113+00', NULL, NULL),
	('3412cef8-14f2-49a4-aef3-7b136035ea23', '1399889c-2083-4dff-bb09-610ea1809d11', 'completed', 0, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/waste_report/2026-04-22T06-11-43-688Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL3dhc3RlX3JlcG9ydC8yMDI2LTA0LTIyVDA2LTExLTQzLTY4OFouY3N2IiwiaWF0IjoxNzc2ODM4MzA0LCJleHAiOjE3Nzc0NDMxMDR9.-XWB7t2AEVKj8qmGc51aagMFtter11RHvw9V-MDDq7A', NULL, '2026-04-22 06:11:43.582764+00', '2026-04-22 06:11:44.031+00', '2026-04-22 06:11:43.582764+00', NULL, NULL),
	('48804665-468e-4357-b0c1-c32d577f47d3', '9582beec-7e6a-473d-a292-17abbe40a3c0', 'completed', 0, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/inventory_movement/2026-04-22T06-11-44-536Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2ludmVudG9yeV9tb3ZlbWVudC8yMDI2LTA0LTIyVDA2LTExLTQ0LTUzNlouY3N2IiwiaWF0IjoxNzc2ODM4MzA0LCJleHAiOjE3Nzc0NDMxMDR9.9UkLTFG6M0LopW7-NdOVR-w6xGHL2X-o-Hk6aG7Vtlk', NULL, '2026-04-22 06:11:44.425522+00', '2026-04-22 06:11:44.91+00', '2026-04-22 06:11:44.425522+00', NULL, NULL),
	('ed3c006e-709b-4fcc-8914-3b3f419bdf9e', 'e7d62489-8e01-4229-b5f2-063260ac471b', 'completed', 0, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/reconciliation_report/2026-04-22T06-11-45-594Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL3JlY29uY2lsaWF0aW9uX3JlcG9ydC8yMDI2LTA0LTIyVDA2LTExLTQ1LTU5NFouY3N2IiwiaWF0IjoxNzc2ODM4MzA1LCJleHAiOjE3Nzc0NDMxMDV9.lAgzFO-myix0CN_xkS2w0And7ioZBXGSheC9_T0pUqE', NULL, '2026-04-22 06:11:45.488397+00', '2026-04-22 06:11:45.753+00', '2026-04-22 06:11:45.488397+00', NULL, NULL),
	('c6ca08d2-cd1b-4ab6-978a-fa705582a5a6', '66ba8e51-0a35-4f66-b0eb-86af5774b781', 'completed', 4, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/booking_summary/2026-04-22T06-11-46-332Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2Jvb2tpbmdfc3VtbWFyeS8yMDI2LTA0LTIyVDA2LTExLTQ2LTMzMlouY3N2IiwiaWF0IjoxNzc2ODM4MzA2LCJleHAiOjE3Nzc0NDMxMDZ9.eXcsmPcA9Px1ghGWOD3CfxUahamfEOcA3Ea5oNsmxpw', NULL, '2026-04-22 06:11:46.1918+00', '2026-04-22 06:11:46.486+00', '2026-04-22 06:11:46.1918+00', NULL, NULL),
	('637d2afa-feb4-4cf9-84ad-0c6daed99656', '8d22555c-5714-4045-bdcd-cfb953a5c987', 'completed', 120, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/booking_occupancy/2026-04-22T06-11-47-100Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2Jvb2tpbmdfb2NjdXBhbmN5LzIwMjYtMDQtMjJUMDYtMTEtNDctMTAwWi5jc3YiLCJpYXQiOjE3NzY4MzgzMDcsImV4cCI6MTc3NzQ0MzEwN30._CwBzXry44B6yYksak7VU_cYSaqO516vjc5FOnVuYqg', NULL, '2026-04-22 06:11:46.980373+00', '2026-04-22 06:11:47.309+00', '2026-04-22 06:11:46.980373+00', NULL, NULL),
	('21a53e64-accd-4927-86c3-a60b8aeec34b', 'c557f120-413f-4925-96bf-f3b586219ebd', 'completed', 1, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/revenue_by_experience/2026-04-22T06-11-47-787Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL3JldmVudWVfYnlfZXhwZXJpZW5jZS8yMDI2LTA0LTIyVDA2LTExLTQ3LTc4N1ouY3N2IiwiaWF0IjoxNzc2ODM4MzA3LCJleHAiOjE3Nzc0NDMxMDd9.MT7HoI86vwQ5PPh30gmyUZFCowuV_Bx8f4qsQlZznkM', NULL, '2026-04-22 06:11:47.698101+00', '2026-04-22 06:11:47.969+00', '2026-04-22 06:11:47.698101+00', NULL, NULL),
	('13bdb1da-95cc-4a5e-996f-973a120660ee', 'cde573cd-bad8-4aa1-8477-adf0ede0a18c', 'completed', 3, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/vehicle_status/2026-04-22T06-11-48-428Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL3ZlaGljbGVfc3RhdHVzLzIwMjYtMDQtMjJUMDYtMTEtNDgtNDI4Wi5jc3YiLCJpYXQiOjE3NzY4MzgzMDgsImV4cCI6MTc3NzQ0MzEwOH0.1_f-EcS9vuDaXxGtoo9jcTnm4X7EF6DiyYuy3jZ-2j0', NULL, '2026-04-22 06:11:48.31717+00', '2026-04-22 06:11:48.604+00', '2026-04-22 06:11:48.31717+00', NULL, NULL),
	('b4528e1c-01c5-4fda-917b-588b49df123b', '7ca45452-3f8f-44d9-b306-e5252a33216e', 'completed', 5, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/guest_satisfaction/2026-04-22T06-11-49-166Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2d1ZXN0X3NhdGlzZmFjdGlvbi8yMDI2LTA0LTIyVDA2LTExLTQ5LTE2NlouY3N2IiwiaWF0IjoxNzc2ODM4MzA5LCJleHAiOjE3Nzc0NDMxMDl9.XKGn7hTiAj1wFiIJKeNx5qbkREduzhhwzKUqKL6xTh8', NULL, '2026-04-22 06:11:49.06101+00', '2026-04-22 06:11:49.318+00', '2026-04-22 06:11:49.06101+00', NULL, NULL),
	('8ed98522-a250-40fb-a474-7757f54ebda0', '0f3094f4-1df1-4d60-b451-6cc3824dce8f', 'completed', 1, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/nps_summary/2026-04-22T06-11-49-790Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL25wc19zdW1tYXJ5LzIwMjYtMDQtMjJUMDYtMTEtNDktNzkwWi5jc3YiLCJpYXQiOjE3NzY4MzgzMDksImV4cCI6MTc3NzQ0MzEwOX0.q7LQOPUDuDeMcmEqXNavR7Ei4B4wGFdQlARHMxUN_kU', NULL, '2026-04-22 06:11:49.697432+00', '2026-04-22 06:11:49.927+00', '2026-04-22 06:11:49.697432+00', NULL, NULL),
	('d788e1b8-ddbe-4707-81fd-89419aea34b8', '41626a52-d263-4488-8207-b69992759c0b', 'completed', 0, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/maintenance_summary/2026-04-22T06-11-50-445Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL21haW50ZW5hbmNlX3N1bW1hcnkvMjAyNi0wNC0yMlQwNi0xMS01MC00NDVaLmNzdiIsImlhdCI6MTc3NjgzODMxMCwiZXhwIjoxNzc3NDQzMTEwfQ.q4XJ3tADNS9WWw0ajuPZ0kJ-BR7wma4mzEVZb537Itk', NULL, '2026-04-22 06:11:50.332777+00', '2026-04-22 06:11:50.561+00', '2026-04-22 06:11:50.332777+00', NULL, NULL),
	('8c0cd76d-b5c6-4820-8071-58b0eac57ad3', '179390e7-d2b0-49fe-ad2e-f4b5abb069b5', 'completed', 0, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/maintenance_summary/2026-04-22T07-19-30-573Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL21haW50ZW5hbmNlX3N1bW1hcnkvMjAyNi0wNC0yMlQwNy0xOS0zMC01NzNaLmNzdiIsImlhdCI6MTc3Njg0MjM3MSwiZXhwIjoxNzc3NDQ3MTcxfQ.neHqOwcV66fJxLe-YeKgRH50awEMNpDrZyPPYJB-D8s', NULL, '2026-04-22 07:19:30.091879+00', '2026-04-22 07:19:31.136+00', '2026-04-22 07:19:30.091879+00', NULL, 'c0000000-0000-0000-0000-000000000005'),
	('1a00e678-d196-4c38-8d29-670c192c31dd', '5f09898d-8b0e-4bbb-84d6-f81f11eaaa80', 'completed', 80, 'https://jaafuepzmbgyvevehesd.supabase.co/storage/v1/object/sign/reports/exception_report/2026-04-24T03-49-17-076Z.csv?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xYjhjN2E5My1jMmQ1LTQzMGEtOTdhNS02YmI5MmZmZDBhNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJyZXBvcnRzL2V4Y2VwdGlvbl9yZXBvcnQvMjAyNi0wNC0yNFQwMy00OS0xNy0wNzZaLmNzdiIsImlhdCI6MTc3NzAwMjU1NywiZXhwIjoxNzc3NjA3MzU3fQ.ahDNkC5huIRM_Gu776ckfD_cPhvKsdnITUeKo-smXsQ', NULL, '2026-04-24 03:49:16.652176+00', '2026-04-24 03:49:17.463+00', '2026-04-24 03:49:16.652176+00', NULL, 'c0000000-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;


--
-- Data for Name: role_domain_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."role_domain_permissions" ("id", "role_id", "domain_id", "can_create", "can_read", "can_update", "can_delete", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('fe9d515d-a313-46e3-8dd9-54a44ca8af81', 'e570c586-8d07-4df7-b1e0-57fe50856f32', '2be6bc0e-4525-4606-bb13-36a1d513735d', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('abc1d1cc-b41a-4b4d-be30-00ffb6f4fc5a', 'e570c586-8d07-4df7-b1e0-57fe50856f32', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('64b4b3fb-ae80-4c74-b9ee-b846a9936825', '2724c5b8-049e-4b6c-ae38-a4be19180201', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('78aa9a4b-4179-4493-b623-bf51fb725bce', 'e570c586-8d07-4df7-b1e0-57fe50856f32', '1a0bb16e-39c6-4d09-8607-62b151765320', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('6b5a53ba-ac0d-4945-a804-3e8dc65e012a', '2724c5b8-049e-4b6c-ae38-a4be19180201', '1a0bb16e-39c6-4d09-8607-62b151765320', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('98f96146-48dd-4701-a909-7ccb720a4aca', 'e570c586-8d07-4df7-b1e0-57fe50856f32', '6335364c-238a-422f-9cfb-ae64b5bbd5eb', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('d0133bb3-c48e-4122-83c6-003358777d9a', '2724c5b8-049e-4b6c-ae38-a4be19180201', '6335364c-238a-422f-9cfb-ae64b5bbd5eb', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('30aafccc-53e7-43e9-a824-da5cca358cb4', 'e570c586-8d07-4df7-b1e0-57fe50856f32', 'd947d3c0-fd9c-4938-9b93-c50f10a1a0c3', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('4c8d0fa5-d603-4373-854a-1374487c694d', '2724c5b8-049e-4b6c-ae38-a4be19180201', 'd947d3c0-fd9c-4938-9b93-c50f10a1a0c3', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('e519d7b8-6318-4fe3-82ed-8a55513fa3f3', 'e570c586-8d07-4df7-b1e0-57fe50856f32', '9727825a-6e97-4547-ae63-e6263fae310a', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('9ccfe9f4-d37c-4f22-8818-8fb25041ca4e', '2724c5b8-049e-4b6c-ae38-a4be19180201', '9727825a-6e97-4547-ae63-e6263fae310a', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('ef98a858-c44b-4dc4-858e-5fc9e10b21e1', 'e570c586-8d07-4df7-b1e0-57fe50856f32', '843acb57-3b46-4b90-98dc-f34df9b92894', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('27ee1a04-c809-4b00-ab02-5ba8f274d498', '2724c5b8-049e-4b6c-ae38-a4be19180201', '843acb57-3b46-4b90-98dc-f34df9b92894', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('d6c9b6aa-b40a-42e7-a321-fe2d6fe79935', 'e570c586-8d07-4df7-b1e0-57fe50856f32', '6f2c2db4-4eda-44b6-9c4b-67822df839c8', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('ffd6844c-53ad-4f52-95d2-ca050fd6553d', '2724c5b8-049e-4b6c-ae38-a4be19180201', '6f2c2db4-4eda-44b6-9c4b-67822df839c8', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('7806a3c3-a026-4175-91b7-fc2df361c3c0', 'e570c586-8d07-4df7-b1e0-57fe50856f32', 'a2186c82-5a55-44ff-ace8-455668e65c5b', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('42873a3f-070e-4db8-aa70-8f104aa73e42', '2724c5b8-049e-4b6c-ae38-a4be19180201', 'a2186c82-5a55-44ff-ace8-455668e65c5b', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('e0612e30-d800-40aa-9cfa-8498691acf8a', 'e570c586-8d07-4df7-b1e0-57fe50856f32', 'ac1f87c9-344c-4b15-9194-e960516fb056', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('dc63d84a-d33b-4f4d-b175-5c34e33bba92', '2724c5b8-049e-4b6c-ae38-a4be19180201', 'ac1f87c9-344c-4b15-9194-e960516fb056', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('ddda94f7-c2f8-4afd-95bd-c1bc3b68f6d4', 'e570c586-8d07-4df7-b1e0-57fe50856f32', 'ac376e2e-cc7b-4338-80df-653058f37f35', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('ca95c79e-eed5-4d13-9fbf-e782f2a45cd1', '2724c5b8-049e-4b6c-ae38-a4be19180201', 'ac376e2e-cc7b-4338-80df-653058f37f35', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('ba1f39e4-8470-4689-a055-6ae0d7f12868', 'e570c586-8d07-4df7-b1e0-57fe50856f32', 'af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('0bb3139c-ec82-4659-bfd1-a439e1c752af', '2724c5b8-049e-4b6c-ae38-a4be19180201', 'af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('37d9381e-0f29-4444-b211-14755ee729b5', '10d543a2-9e56-4213-8c81-27a9952f08f5', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('f59204c7-3944-4297-87e3-e05dce3cd6b0', '10d543a2-9e56-4213-8c81-27a9952f08f5', 'ac376e2e-cc7b-4338-80df-653058f37f35', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('7cf9132a-eb45-46c0-bf5b-a57a123ce057', '10d543a2-9e56-4213-8c81-27a9952f08f5', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('82018741-ac0a-41dd-9fa6-3ef8cfd062b0', '10d543a2-9e56-4213-8c81-27a9952f08f5', 'af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('86a6c58a-6eee-4087-8d8a-71dbfd293589', 'bcae65fa-377e-494a-bdec-eacc6dfaa7a8', '1a0bb16e-39c6-4d09-8607-62b151765320', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('1f616630-f988-48bf-8512-e89f458e7e62', 'bcae65fa-377e-494a-bdec-eacc6dfaa7a8', '6335364c-238a-422f-9cfb-ae64b5bbd5eb', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('c62468b0-8dd0-40ae-b592-e3c76b0145ea', 'bcae65fa-377e-494a-bdec-eacc6dfaa7a8', '9727825a-6e97-4547-ae63-e6263fae310a', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('4b1f790d-e632-4036-a13c-21bb8f5d8348', 'bcae65fa-377e-494a-bdec-eacc6dfaa7a8', 'ac376e2e-cc7b-4338-80df-653058f37f35', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('2ebf2144-4632-42b2-9382-b2d174ecec78', 'bcae65fa-377e-494a-bdec-eacc6dfaa7a8', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('f537df7d-7385-4661-8a50-2c705ed33f69', 'bcae65fa-377e-494a-bdec-eacc6dfaa7a8', 'af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('e0a2998b-82f7-4289-9398-84b8301d4c35', 'c41ce4f2-54c5-44a0-8585-30aecb2c24d9', 'd947d3c0-fd9c-4938-9b93-c50f10a1a0c3', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('8107b512-5036-494e-843c-745a8204417b', 'c41ce4f2-54c5-44a0-8585-30aecb2c24d9', '1a0bb16e-39c6-4d09-8607-62b151765320', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('70a96f42-d92f-4232-9766-90551e7322f3', 'c41ce4f2-54c5-44a0-8585-30aecb2c24d9', 'ac376e2e-cc7b-4338-80df-653058f37f35', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('fb5e7efc-2c7a-404c-8918-cf2d322ce06d', 'c41ce4f2-54c5-44a0-8585-30aecb2c24d9', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('a8e97b47-33c0-4b93-84a7-3f4493c83f8a', 'c41ce4f2-54c5-44a0-8585-30aecb2c24d9', 'af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('9c1e6c10-e63f-45a4-b063-15abd6df1344', 'c7a731b1-311b-49fe-9456-30058f850886', '9727825a-6e97-4547-ae63-e6263fae310a', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('6ee32260-c856-48c6-9934-4877c1c90af6', 'c7a731b1-311b-49fe-9456-30058f850886', '1a0bb16e-39c6-4d09-8607-62b151765320', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('7fe89387-4bc3-440c-b8ca-a3cf0bd5de8b', 'c7a731b1-311b-49fe-9456-30058f850886', 'ac376e2e-cc7b-4338-80df-653058f37f35', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('c7b8719f-dba3-44a0-950a-1168db228f5e', 'c7a731b1-311b-49fe-9456-30058f850886', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('736430a2-d104-42a6-9310-8d2ba8ce74cb', 'c7a731b1-311b-49fe-9456-30058f850886', 'af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('3e0db45c-45ac-4fc3-9753-0c44cde87f33', 'f357066a-a2be-44d0-af4b-23e8d8920f7a', '6f2c2db4-4eda-44b6-9c4b-67822df839c8', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('2979108f-b0b1-4f84-9c70-fb8e5cc56b2d', 'f357066a-a2be-44d0-af4b-23e8d8920f7a', '843acb57-3b46-4b90-98dc-f34df9b92894', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('c06c97f9-f229-4700-b163-deac9316d2bb', 'f357066a-a2be-44d0-af4b-23e8d8920f7a', 'a2186c82-5a55-44ff-ace8-455668e65c5b', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('40d2965a-1b6d-4049-9531-7d5ec895e5b0', 'f357066a-a2be-44d0-af4b-23e8d8920f7a', 'ac376e2e-cc7b-4338-80df-653058f37f35', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('254b7d18-b0e6-44dc-8b03-e6605ff90920', 'f357066a-a2be-44d0-af4b-23e8d8920f7a', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('0acc4340-ed6b-47b2-840f-6e192e297252', 'f357066a-a2be-44d0-af4b-23e8d8920f7a', 'af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('1ad5386d-c73b-453b-870f-4480ed86e4d6', '682d91d4-8e39-40bc-b82d-825b356859aa', 'a2186c82-5a55-44ff-ace8-455668e65c5b', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('917be394-a948-4df0-9e50-781cba017ef6', '682d91d4-8e39-40bc-b82d-825b356859aa', '01d48020-974c-4056-9bca-ed9c69456dbe', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('c10dedbd-2327-4ca2-8829-4f5f1e4f5c14', '682d91d4-8e39-40bc-b82d-825b356859aa', '6f2c2db4-4eda-44b6-9c4b-67822df839c8', false, false, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('cd057ebb-6ba3-4256-956c-6440f3da85d8', '682d91d4-8e39-40bc-b82d-825b356859aa', 'ac376e2e-cc7b-4338-80df-653058f37f35', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('41edf4e5-8eb1-4e1e-aae5-4508cb12b0ca', '682d91d4-8e39-40bc-b82d-825b356859aa', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('d6b6a57e-0851-41b2-8ff6-12871fa3de76', '682d91d4-8e39-40bc-b82d-825b356859aa', 'af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('e50b26ac-244a-4b1d-87db-8330537d7d48', '2806ad34-3073-419f-bdd6-3ff5e420f5fe', 'ac1f87c9-344c-4b15-9194-e960516fb056', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('abcb79e5-03d1-4f56-87c5-10d43458ead5', '2806ad34-3073-419f-bdd6-3ff5e420f5fe', 'ac376e2e-cc7b-4338-80df-653058f37f35', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('5aecb74d-a765-4678-9d54-077a685766fe', '2806ad34-3073-419f-bdd6-3ff5e420f5fe', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('5acbfeea-c3e3-4c8d-b0e3-531ec41dfe3e', '2806ad34-3073-419f-bdd6-3ff5e420f5fe', 'af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('9a9b189a-50bc-4a2b-b820-8852a1b3aed3', '742c1a39-a5be-4f1e-bcb5-6d34078ac93b', 'af7e6fd6-26f8-4f14-ac4e-96e622a7cdc9', true, true, true, true, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('a7d98a84-2100-43b2-b89b-34d242574700', '742c1a39-a5be-4f1e-bcb5-6d34078ac93b', 'ac376e2e-cc7b-4338-80df-653058f37f35', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('685d4d9b-33fe-4591-b358-396a16a3c3e4', '742c1a39-a5be-4f1e-bcb5-6d34078ac93b', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('359c9d10-dbdf-4430-bba9-481ab2b0ee84', 'a9412172-3d4d-4b46-be3c-21467b625ea2', 'd947d3c0-fd9c-4938-9b93-c50f10a1a0c3', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('e737822a-2d82-4076-a992-4f44e1b2c45a', 'a9412172-3d4d-4b46-be3c-21467b625ea2', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('1386df4c-033c-4221-8ed7-625f09e3129c', 'a9412172-3d4d-4b46-be3c-21467b625ea2', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('070473ef-e9f8-4c85-8599-1a9813553ffa', 'af202033-6758-47c6-bd5d-c6878947e936', 'd947d3c0-fd9c-4938-9b93-c50f10a1a0c3', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('d8e1af3e-f092-4866-8fbd-3608fee9f44d', 'af202033-6758-47c6-bd5d-c6878947e936', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('f9963bad-443b-4a29-b02e-62f1ecd3be9a', 'af202033-6758-47c6-bd5d-c6878947e936', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('f5ddaae3-9321-4e4b-9c49-3323cab19ecd', '19516dc6-2100-4e50-9a16-952ed86ac80e', '6335364c-238a-422f-9cfb-ae64b5bbd5eb', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('3b30dd1f-0711-47ee-a8dd-96e345094d9b', '19516dc6-2100-4e50-9a16-952ed86ac80e', '9727825a-6e97-4547-ae63-e6263fae310a', false, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('09603bc4-f101-432e-b1e4-b3226fe6f199', '19516dc6-2100-4e50-9a16-952ed86ac80e', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('57803c79-f355-4589-933b-432bcd1c8df8', '19516dc6-2100-4e50-9a16-952ed86ac80e', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('c27246d7-714d-4345-8e27-1964e9884052', 'aa5f3066-de37-4a6a-b534-ee38d160d085', '843acb57-3b46-4b90-98dc-f34df9b92894', false, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('e5c382ee-0698-4394-aaf7-d1d0d417b1ac', 'aa5f3066-de37-4a6a-b534-ee38d160d085', '6f2c2db4-4eda-44b6-9c4b-67822df839c8', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('80c5f6d7-4f1f-4f72-8e93-085e116b61bd', 'aa5f3066-de37-4a6a-b534-ee38d160d085', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('22465647-9e59-4930-97b1-f923134d1e50', 'aa5f3066-de37-4a6a-b534-ee38d160d085', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('0cb5c62f-85f6-49f4-b815-24c131efcf21', '2724c5b8-049e-4b6c-ae38-a4be19180201', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, true, true, '2026-04-17 08:02:49.848099+00', '2026-04-26 08:18:20.159872+00', NULL, 'c0000000-0000-0000-0000-000000000001'),
	('51bf9ffd-3b92-4935-8f11-77f5b83036fb', 'a9412172-3d4d-4b46-be3c-21467b625ea2', '6335364c-238a-422f-9cfb-ae64b5bbd5eb', true, true, false, false, '2026-04-17 08:02:49.848099+00', '2026-04-27 01:54:41.905871+00', NULL, 'c0000000-0000-0000-0000-000000000001'),
	('861b72c1-1a60-4b9d-a012-813caa30a9c9', 'af202033-6758-47c6-bd5d-c6878947e936', '6335364c-238a-422f-9cfb-ae64b5bbd5eb', true, true, false, false, '2026-04-17 08:02:49.848099+00', '2026-04-27 03:00:08.296443+00', NULL, 'c0000000-0000-0000-0000-000000000001'),
	('17b08287-e9f1-4363-bd31-020a819d4685', 'f88f1c24-d765-43af-a09b-0127f7c1a912', '6f2c2db4-4eda-44b6-9c4b-67822df839c8', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('161b5f90-dbaf-47cc-9944-ab984aaad6cd', 'f88f1c24-d765-43af-a09b-0127f7c1a912', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('c6ec5e4e-ba39-4836-b4e4-43c12522dcda', 'f88f1c24-d765-43af-a09b-0127f7c1a912', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('3136c419-08e6-4557-9104-7a147905f2b0', '7dfd9826-5ccd-4294-900e-26796449956e', '6f2c2db4-4eda-44b6-9c4b-67822df839c8', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('f8bd7305-43a7-4574-a961-1d1edee2f665', '7dfd9826-5ccd-4294-900e-26796449956e', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('b6fa65b2-dce1-437d-ae8b-a29c70a31b5a', '7dfd9826-5ccd-4294-900e-26796449956e', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('ba6a0b89-cd6b-45c3-af32-6480abd164de', 'cbde3de5-c09e-4507-b573-26e1583b93e3', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('88e739a2-f71a-4922-9173-0a587eb05c70', 'cbde3de5-c09e-4507-b573-26e1583b93e3', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('8b87dacd-dcb3-450d-82cf-d36c83c880d1', '74cb42cc-e68f-4435-ac3d-e76e326d13b5', '843acb57-3b46-4b90-98dc-f34df9b92894', false, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('563637f5-f7d1-4bd3-b4dd-05303c19563a', '74cb42cc-e68f-4435-ac3d-e76e326d13b5', '6f2c2db4-4eda-44b6-9c4b-67822df839c8', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('458d9491-2487-464e-9bc7-284c79a0173c', '74cb42cc-e68f-4435-ac3d-e76e326d13b5', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('8061bd49-21eb-4446-b019-ef6c50fb0a9d', '74cb42cc-e68f-4435-ac3d-e76e326d13b5', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('4d6c87e7-b83c-4e05-b167-f4e78d765994', 'a6a0c809-2065-4e4e-8a43-84a1e8098520', 'a2186c82-5a55-44ff-ace8-455668e65c5b', true, true, true, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('6aa93564-cbcb-4a52-a4ff-cea1220e9d48', 'a6a0c809-2065-4e4e-8a43-84a1e8098520', '01d48020-974c-4056-9bca-ed9c69456dbe', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('d28982e1-8fd6-4b9b-a10f-a4eb78867eb2', 'a6a0c809-2065-4e4e-8a43-84a1e8098520', '9cf95fa4-55eb-4c77-aa95-fd7b945259df', true, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('ecc631c5-1512-4a17-9dc8-4408ba4fe6ba', 'a6a0c809-2065-4e4e-8a43-84a1e8098520', '2be6bc0e-4525-4606-bb13-36a1d513735d', false, true, false, false, '2026-04-17 08:02:49.848099+00', NULL, NULL, NULL),
	('873cbd5e-fae2-44db-b902-3d87cbe2fa9f', 'e570c586-8d07-4df7-b1e0-57fe50856f32', '01d48020-974c-4056-9bca-ed9c69456dbe', true, true, true, true, '2026-04-17 08:02:49.848099+00', '2026-04-24 02:50:58.806394+00', NULL, 'c0000000-0000-0000-0000-000000000002'),
	('2e421b0a-85a3-408b-988d-79b593513a6f', '2724c5b8-049e-4b6c-ae38-a4be19180201', '01d48020-974c-4056-9bca-ed9c69456dbe', false, true, true, true, '2026-04-17 08:02:49.848099+00', '2026-04-26 08:18:33.681796+00', NULL, 'c0000000-0000-0000-0000-000000000001'),
	('e396276d-f8a2-493b-8bf7-91939e036ae4', 'a9412172-3d4d-4b46-be3c-21467b625ea2', '843acb57-3b46-4b90-98dc-f34df9b92894', false, false, false, false, '2026-04-27 01:29:01.025031+00', '2026-04-27 01:29:21.063428+00', NULL, 'c0000000-0000-0000-0000-000000000001'),
	('3c7f2ce0-d29a-428a-b795-f9c444dd9ae4', '7dfd9826-5ccd-4294-900e-26796449956e', '6335364c-238a-422f-9cfb-ae64b5bbd5eb', true, true, false, false, '2026-04-17 08:02:49.848099+00', '2026-04-27 03:00:14.386864+00', NULL, 'c0000000-0000-0000-0000-000000000001'),
	('bacdebff-3c5e-4a9b-86cd-d0196817fa3a', 'cbde3de5-c09e-4507-b573-26e1583b93e3', '6335364c-238a-422f-9cfb-ae64b5bbd5eb', true, true, false, false, '2026-04-17 08:02:49.848099+00', '2026-04-27 03:00:34.36216+00', NULL, 'c0000000-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;


--
-- Data for Name: roster_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."roster_templates" ("id", "name", "cycle_length_days", "anchor_date", "is_active", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('b2000000-0000-0000-0000-000000000002', 'Afternoon 5-on-2-off', 7, '2026-01-05', true, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b2000000-0000-0000-0000-000000000001', 'Standard 5-on-2-off', 9, '2026-01-05', true, '2026-04-18 07:24:56.820039+00', '2026-04-24 03:42:16.312257+00', NULL, 'c0000000-0000-0000-0000-000000000008') ON CONFLICT DO NOTHING;


--
-- Data for Name: roster_template_shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."roster_template_shifts" ("id", "template_id", "day_index", "shift_type_id", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('44e52537-73d7-4202-9ac8-a2d05cd5448a', 'b2000000-0000-0000-0000-000000000001', 1, 'b1000000-0000-0000-0000-000000000001', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('5972e03b-ee13-4660-a7a8-2aba4cb0d8d2', 'b2000000-0000-0000-0000-000000000001', 2, 'b1000000-0000-0000-0000-000000000001', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b00c8b9c-2ef1-41f8-b21b-f870b1a57d6a', 'b2000000-0000-0000-0000-000000000001', 3, 'b1000000-0000-0000-0000-000000000001', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('d15e241d-b73c-4a8f-9efd-e45d92dae5d6', 'b2000000-0000-0000-0000-000000000001', 4, 'b1000000-0000-0000-0000-000000000001', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('8d96ff3e-a94e-4d74-b04a-8ae6888e35d0', 'b2000000-0000-0000-0000-000000000001', 5, 'b1000000-0000-0000-0000-000000000001', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('899df04a-ae69-4432-b62b-ba14ad9f9032', 'b2000000-0000-0000-0000-000000000002', 1, 'b1000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('607afe3a-31e1-4b03-9cf9-5e5a77063fc3', 'b2000000-0000-0000-0000-000000000002', 2, 'b1000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('c5ab53e7-9cee-4abe-92c2-bb05782c75b0', 'b2000000-0000-0000-0000-000000000002', 3, 'b1000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b0ab9ca0-0853-4875-a4a9-bf3f5bbcb5b1', 'b2000000-0000-0000-0000-000000000002', 4, 'b1000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('dd17712e-6be0-48f2-9eb7-3f3da20f5897', 'b2000000-0000-0000-0000-000000000002', 6, 'b1000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('26dea476-4586-4ba2-8445-ba2643a30f79', 'b2000000-0000-0000-0000-000000000001', 9, 'b1000000-0000-0000-0000-000000000002', '2026-04-24 03:44:39.182462+00', NULL, 'c0000000-0000-0000-0000-000000000008', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: scheduler_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."scheduler_config" ("experience_id", "days_ahead", "day_start_hour", "day_end_hour", "start_date", "end_date", "created_at", "updated_at", "updated_by") VALUES
	('ab000000-0000-0000-0000-000000000001', 14, 10, 22, '2026-04-18', '2027-04-18', '2026-04-18 07:24:56.820039+00', NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: staff_roster_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."staff_roster_assignments" ("id", "staff_record_id", "roster_template_id", "effective_start_date", "effective_end_date", "org_unit_path", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('51fffdb7-d0e6-4422-97c7-036bb0f89092', 'c1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '2026-03-19', NULL, 'agartha.corp.it', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('1be7961f-b67d-4033-9f95-7eea6fdc0bed', 'c1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', '2026-03-19', NULL, 'agartha.corp', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('9690b3e5-f510-460c-b05e-882be85b1a20', 'c1000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', '2026-03-19', NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('59e5ef01-91f2-4b57-af07-b5bcfb2c094a', 'c1000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000002', '2026-03-19', NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('0881d367-f3b7-4f30-8070-12d768b124e6', 'c1000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000001', '2026-03-19', NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('cd47459d-899c-4dcd-abfb-daad0dc58954', 'c1000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000002', '2026-03-19', NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('e32867bd-8185-4c4c-999d-95117092339c', 'c1000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000001', '2026-03-19', NULL, 'agartha.corp.marketing', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('f3aa1745-efe9-49a4-bc80-f3a10c36216a', 'c1000000-0000-0000-0000-000000000008', 'b2000000-0000-0000-0000-000000000002', '2026-03-19', NULL, 'agartha.corp.hr', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('7376e89a-2202-4c8b-8824-a6bf3f295cdd', 'c1000000-0000-0000-0000-000000000009', 'b2000000-0000-0000-0000-000000000001', '2026-03-19', NULL, 'agartha.corp.compliance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('09574f6d-b92b-4ed9-8474-ef398dd244ce', 'c1000000-0000-0000-0000-000000000010', 'b2000000-0000-0000-0000-000000000002', '2026-03-19', NULL, 'agartha.ops', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('8871661e-008b-4c5c-a568-6857daf8ba4f', 'c1000000-0000-0000-0000-000000000011', 'b2000000-0000-0000-0000-000000000001', '2026-03-19', NULL, 'agartha.ops.fnb', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('ad857415-ea99-485b-85d7-620a2e3fbf02', 'c1000000-0000-0000-0000-000000000012', 'b2000000-0000-0000-0000-000000000002', '2026-03-19', NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b83ffdd8-9675-4c04-9023-d946bdf3e3fc', 'c1000000-0000-0000-0000-000000000013', 'b2000000-0000-0000-0000-000000000001', '2026-03-19', NULL, 'agartha.ops.giftshop', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('01447e57-5fed-4e69-b8c1-9e9608f9e0a2', 'c1000000-0000-0000-0000-000000000014', 'b2000000-0000-0000-0000-000000000002', '2026-03-19', NULL, 'agartha.logistics', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('8e3545a8-2845-4ff5-8df1-a7278080dd8c', 'c1000000-0000-0000-0000-000000000015', 'b2000000-0000-0000-0000-000000000001', '2026-03-19', NULL, 'agartha.ops.security', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b73259b2-962e-4100-ad43-7e1adb8f5d48', 'c1000000-0000-0000-0000-000000000016', 'b2000000-0000-0000-0000-000000000002', '2026-03-19', NULL, 'agartha.support.health', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('51b6490e-13c3-4c91-b9eb-206090e28b4c', 'c1000000-0000-0000-0000-000000000017', 'b2000000-0000-0000-0000-000000000001', '2026-03-19', NULL, 'agartha.support.cleaning', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('8005e385-9e6b-4ea6-b5c3-455cbc02eecf', 'c1000000-0000-0000-0000-000000000018', 'b2000000-0000-0000-0000-000000000002', '2026-03-19', NULL, 'agartha.ops.experiences', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('bafc71f4-8ec8-4c17-88f3-e96d77b901ec', 'c1000000-0000-0000-0000-000000000019', 'b2000000-0000-0000-0000-000000000001', '2026-03-19', NULL, 'agartha.support.maintenance', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: stock_balance_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."stock_balance_cache" ("material_id", "location_id", "current_qty", "stock_value", "last_synced_at", "created_at", "updated_at") VALUES
	('a1000000-0000-0000-0000-000000000012', 'aa000000-0000-0000-0000-000000000003', -3, 0, '2026-04-27 02:16:34.667063+00', '2026-04-27 02:06:15.615592+00', '2026-04-27 02:16:34.667063+00'),
	('a1000000-0000-0000-0000-000000000033', 'aa000000-0000-0000-0000-000000000002', -1, 0, '2026-04-27 04:53:12.20019+00', '2026-04-27 04:53:12.20019+00', NULL),
	('a1000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000002', -2, 0, '2026-04-27 05:57:46.515816+00', '2026-04-27 05:57:46.515816+00', NULL),
	('a1000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000003', 2, 0, '2026-04-27 05:57:46.515816+00', '2026-04-27 05:57:46.515816+00', NULL),
	('a1000000-0000-0000-0000-000000000011', 'aa000000-0000-0000-0000-000000000003', -6, 0, '2026-04-27 06:52:03.816774+00', '2026-04-23 08:41:07.999175+00', '2026-04-27 06:52:03.816774+00'),
	('a1000000-0000-0000-0000-000000000013', 'aa000000-0000-0000-0000-000000000003', -1, 0, '2026-04-27 06:52:03.816774+00', '2026-04-27 06:52:03.816774+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: storage_bins; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: survey_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."survey_responses" ("id", "booking_id", "survey_type", "overall_score", "nps_score", "sentiment", "keywords", "feedback_text", "source", "staff_submitted", "submitted_by", "created_at", "updated_at") VALUES
	('f198f66d-aa1e-4023-b56c-9193ed27b4a8', 'd0000000-0000-0000-0000-000000000006', 'post_visit', 9, 9, 'positive', '["staff", "clean", "fast"]', 'Excellent service!', 'in_app', false, NULL, '2026-04-17 07:24:56.820039+00', NULL),
	('23e88420-00d6-47d7-b8fe-f5c1361feec3', 'd0000000-0000-0000-0000-000000000007', 'post_visit', 7, 7, 'neutral', '["wait time"]', 'Wait time was a bit long', 'email', false, NULL, '2026-04-16 07:24:56.820039+00', NULL),
	('ba7aa564-8761-4490-9ad2-3f3d79fef63d', 'd0000000-0000-0000-0000-000000000008', 'post_visit', 10, 10, 'positive', '["amazing", "kids loved it"]', 'Kids loved it — will come again', 'in_app', false, NULL, '2026-04-16 07:24:56.820039+00', NULL),
	('50b21c4e-cada-4c4f-b10c-59ca5af42cbb', NULL, 'nps', 5, 5, 'negative', '["food quality"]', 'Food was mediocre', 'qr_code', false, NULL, '2026-04-15 07:24:56.820039+00', NULL),
	('443c0945-784e-4460-8db4-9380c9bea427', NULL, 'staff_captured', 8, 8, 'positive', '["staff friendly"]', 'Guest complimented crew (overheard)', 'in_app', true, 'c0000000-0000-0000-0000-000000000012', '2026-04-18 01:24:56.820039+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: tier_perks; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tier_perks" ("tier_id", "perk", "created_at", "updated_at") VALUES
	('ac000000-0000-0000-0000-000000000001', 'Standard entry', '2026-04-18 07:24:56.820039+00', NULL),
	('ac000000-0000-0000-0000-000000000001', 'Digital photo memory', '2026-04-18 07:24:56.820039+00', NULL),
	('ac000000-0000-0000-0000-000000000002', 'Priority entry', '2026-04-18 07:24:56.820039+00', NULL),
	('ac000000-0000-0000-0000-000000000002', 'Reserved seating', '2026-04-18 07:24:56.820039+00', NULL),
	('ac000000-0000-0000-0000-000000000002', 'Complimentary beverage', '2026-04-18 07:24:56.820039+00', NULL),
	('ac000000-0000-0000-0000-000000000002', 'Meet-and-greet', '2026-04-18 07:24:56.820039+00', NULL),
	('ac000000-0000-0000-0000-000000000003', '2 adults + up to 3 children', '2026-04-18 07:24:56.820039+00', NULL),
	('ac000000-0000-0000-0000-000000000003', 'Family photo session', '2026-04-18 07:24:56.820039+00', NULL),
	('ac000000-0000-0000-0000-000000000003', 'Souvenir goodie bag', '2026-04-18 07:24:56.820039+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: timecard_punches; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."timecard_punches" ("id", "staff_record_id", "shift_schedule_id", "punch_time", "punch_type", "source", "remark", "gps_coordinates", "selfie_url", "voided_at", "voided_by", "org_unit_path", "created_at", "updated_at") VALUES
	('21b83898-d073-40aa-bfc3-0fb10e6b4e81', 'c1000000-0000-0000-0000-000000000011', '73362858-1a99-4a49-a477-bd15c7d6c756', '2026-04-20 07:11:33.012726+00', 'clock_in', 'mobile', 'ci', '{"lat": 3.149728590419515, "lng": 101.71153061512634, "accuracy": 177}', 'c0000000-0000-0000-0000-000000000011/2026-04-20/clock-in-5813c313-8121-4850-a8d1-18f3b26aa1cf.webp', '2026-04-20 07:11:58.886128+00', 'c0000000-0000-0000-0000-000000000011', 'agartha.ops.fnb', '2026-04-20 07:11:33.012726+00', '2026-04-20 07:11:58.886128+00'),
	('2b671846-267b-4e2f-9d93-cbb4beed2aeb', 'c1000000-0000-0000-0000-000000000011', '73362858-1a99-4a49-a477-bd15c7d6c756', '2026-04-20 07:12:14.739697+00', 'clock_in', 'mobile', NULL, '{"lat": 3.149728590419515, "lng": 101.71153061512634, "accuracy": 177}', 'c0000000-0000-0000-0000-000000000011/2026-04-20/clock-in-3e5a1531-ad52-42e8-bdd4-fc60f64e4984.webp', NULL, NULL, 'agartha.ops.fnb', '2026-04-20 07:12:14.739697+00', NULL),
	('aca3a741-d22c-4984-a766-62a0efab43a0', 'c1000000-0000-0000-0000-000000000011', '73362858-1a99-4a49-a477-bd15c7d6c756', '2026-04-20 07:59:20.509606+00', 'clock_out', 'mobile', NULL, '{"lat": 3.1499399783137423, "lng": 101.71157610478865, "accuracy": 85}', 'c0000000-0000-0000-0000-000000000011/2026-04-20/clock-out-18bba3d5-1f4d-4881-8b9e-219dc2671709.webp', '2026-04-20 07:59:39.010995+00', 'c0000000-0000-0000-0000-000000000011', 'agartha.ops.fnb', '2026-04-20 07:59:20.509606+00', '2026-04-20 07:59:39.010995+00'),
	('b6325431-8e61-4702-a572-ef5592e94d15', 'c1000000-0000-0000-0000-000000000011', '73362858-1a99-4a49-a477-bd15c7d6c756', '2026-04-20 08:16:05.057559+00', 'clock_out', 'mobile', NULL, '{"lat": 3.14989741286274, "lng": 101.71155835232764, "accuracy": 90}', 'c0000000-0000-0000-0000-000000000011/2026-04-20/clock-out-30f7d1b0-73cd-46e6-adee-f8372e457a2d.webp', '2026-04-20 08:22:42.537383+00', 'c0000000-0000-0000-0000-000000000011', 'agartha.ops.fnb', '2026-04-20 08:16:05.057559+00', '2026-04-20 08:22:42.537383+00'),
	('bb9db753-ee24-4a3f-9694-ba049d381c8d', 'c1000000-0000-0000-0000-000000000011', '73362858-1a99-4a49-a477-bd15c7d6c756', '2026-04-20 08:22:49.489681+00', 'clock_out', 'mobile', NULL, '{"lat": 3.149903208087127, "lng": 101.71154223235855, "accuracy": 88}', 'c0000000-0000-0000-0000-000000000011/2026-04-20/clock-out-22f4cf6c-cec4-405e-bb12-46f692d67186.webp', '2026-04-20 08:22:58.810663+00', 'c0000000-0000-0000-0000-000000000011', 'agartha.ops.fnb', '2026-04-20 08:22:49.489681+00', '2026-04-20 08:22:58.810663+00'),
	('06971d2f-ec78-4075-9db5-5836881ea955', 'c1000000-0000-0000-0000-000000000011', '73362858-1a99-4a49-a477-bd15c7d6c756', '2026-04-20 08:23:06.307733+00', 'clock_out', 'mobile', NULL, NULL, 'c0000000-0000-0000-0000-000000000011/2026-04-20/clock-out-2abe5fdd-ae04-4451-aecd-c3c42d34abd2.webp', '2026-04-20 08:23:12.542022+00', 'c0000000-0000-0000-0000-000000000011', 'agartha.ops.fnb', '2026-04-20 08:23:06.307733+00', '2026-04-20 08:23:12.542022+00'),
	('eb8621da-016e-4b68-8972-683f0385f3de', 'c1000000-0000-0000-0000-000000000011', '73362858-1a99-4a49-a477-bd15c7d6c756', '2026-04-20 08:25:24.388875+00', 'clock_out', 'mobile', NULL, '{"lat": 3.1499755801173186, "lng": 101.71148481190735, "accuracy": 119}', 'c0000000-0000-0000-0000-000000000011/2026-04-20/clock-out-f58da0c6-799d-4929-8e77-5ac848ef0948.webp', '2026-04-20 08:25:30.612058+00', 'c0000000-0000-0000-0000-000000000011', 'agartha.ops.fnb', '2026-04-20 08:25:24.388875+00', '2026-04-20 08:25:30.612058+00'),
	('03b7e3c9-ff06-4cb6-b02b-7b18ba7d7e37', 'c1000000-0000-0000-0000-000000000011', '40e741af-a75f-4e07-b2a0-a9bf2ee8acf4', '2026-04-21 01:21:43.395167+00', 'clock_in', 'mobile', 'cc', '{"lat": 3.1499933436134446, "lng": 101.71153318618316, "accuracy": 95}', 'c0000000-0000-0000-0000-000000000011/2026-04-21/clock-in-cae809be-5d50-42f5-8dff-a5e20576dedd.webp', '2026-04-21 01:22:05.242544+00', 'c0000000-0000-0000-0000-000000000011', 'agartha.ops.fnb', '2026-04-21 01:21:43.395167+00', '2026-04-21 01:22:05.242544+00'),
	('cafd7950-0638-491e-a0dc-4b9033773d5b', 'c1000000-0000-0000-0000-000000000011', '40e741af-a75f-4e07-b2a0-a9bf2ee8acf4', '2026-04-21 01:22:19.306241+00', 'clock_in', 'mobile', 'xx', '{"lat": 3.1499933436134446, "lng": 101.71153318618316, "accuracy": 95}', 'c0000000-0000-0000-0000-000000000011/2026-04-21/clock-in-09dd55a4-4074-4a1b-b275-d2abf5bef805.webp', NULL, NULL, 'agartha.ops.fnb', '2026-04-21 01:22:19.306241+00', NULL),
	('3a75c34e-9f04-4840-9104-3bbb5fe6ca3e', 'c1000000-0000-0000-0000-000000000011', '40e741af-a75f-4e07-b2a0-a9bf2ee8acf4', '2026-04-21 06:20:36.551163+00', 'clock_out', 'mobile', 'ewrwer', '{"lat": 3.149993673415234, "lng": 101.7115491638494, "accuracy": 99}', 'c0000000-0000-0000-0000-000000000011/2026-04-21/clock-out-064a709f-5962-41cd-b62e-df721f069865.webp', '2026-04-21 06:20:50.289452+00', 'c0000000-0000-0000-0000-000000000011', 'agartha.ops.fnb', '2026-04-21 06:20:36.551163+00', '2026-04-21 06:20:50.289452+00'),
	('051120fa-e34e-4941-9957-8cc4fee5a839', 'c1000000-0000-0000-0000-000000000011', '4ac37f15-5945-4632-8fe5-1d8efa86c1cf', '2026-04-22 03:28:06.470154+00', 'clock_in', 'mobile', 'x', '{"lat": 3.149915168952493, "lng": 101.71161781686187, "accuracy": 109}', 'c0000000-0000-0000-0000-000000000011/2026-04-22/clock-in-e492fa4a-9a20-4e82-8b1c-b6969d89c3ce.webp', NULL, NULL, 'agartha.ops.fnb', '2026-04-22 03:28:06.470154+00', NULL),
	('fa3b5340-57ec-4710-acaf-e67d064ca4c1', 'c1000000-0000-0000-0000-000000000011', 'e2e66012-8524-49ba-8270-ce47a4e0f78b', '2026-04-23 03:27:11.454972+00', 'clock_in', 'mobile', 'xx', '{"lat": 3.14997243739294, "lng": 101.71152482075718, "accuracy": 93}', 'c0000000-0000-0000-0000-000000000011/2026-04-23/clock-in-9533d566-3f60-4dc2-9431-3a79999abf9d.webp', NULL, NULL, 'agartha.ops.fnb', '2026-04-23 03:27:11.454972+00', NULL),
	('9fe38cde-0b4c-4d70-a91d-159aef58d68d', 'c1000000-0000-0000-0000-000000000012', '38f204e5-c97a-414e-b99d-c98b8a9dd798', '2026-04-29 04:32:25.79488+00', 'clock_in', 'mobile', NULL, '{"lat": 3.1499376794004412, "lng": 101.71156612015993, "accuracy": 74}', 'c0000000-0000-0000-0000-000000000012/2026-04-29/clock-in-f4841882-92fd-46ec-8116-90335254b4f1.webp', NULL, NULL, 'agartha.ops.experiences', '2026-04-29 04:32:25.79488+00', NULL),
	('8aa720ce-82d7-4c08-adbd-36052b610c46', 'c1000000-0000-0000-0000-000000000012', '38f204e5-c97a-414e-b99d-c98b8a9dd798', '2026-04-29 04:34:40.309711+00', 'clock_out', 'mobile', NULL, NULL, 'c0000000-0000-0000-0000-000000000012/2026-04-29/clock-out-29ddcdd5-2422-4469-8629-7b08e83ea980.webp', NULL, NULL, 'agartha.ops.experiences', '2026-04-29 04:34:40.309711+00', NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: uom_conversions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."uom_conversions" ("id", "material_id", "from_unit_id", "to_unit_id", "factor", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('67b3bd8c-bca7-4f0f-8569-bfa4b2b801af', NULL, '9c0751a2-cd90-4eb5-be1a-90a37e055d61', '5f7bcfae-8567-4d52-8c4a-9935def8f548', 1000, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('8912c3c5-9529-4b1c-a1f6-6b00bca1688f', NULL, '0daef3e9-f205-4168-8301-161656f2c831', '3716f20e-7487-40ad-8464-d89bdb830c69', 1000, '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."vehicles" ("id", "name", "plate", "vehicle_type", "status", "zone_id", "created_at", "updated_at", "created_by", "updated_by") VALUES
	('b6000000-0000-0000-0000-000000000001', 'Van-01', 'VAN1234', 'van', 'active', 'bb000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b6000000-0000-0000-0000-000000000002', 'Buggy-01', 'BGY0001', 'buggy', 'active', 'bb00000a-0000-0000-0000-000000000011', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL),
	('b6000000-0000-0000-0000-000000000003', 'Van-02', 'VAN5678', 'van', 'maintenance', 'bb000000-0000-0000-0000-000000000002', '2026-04-18 07:24:56.820039+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: zone_telemetry; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: vlans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."vlans_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--


RESET ALL;
