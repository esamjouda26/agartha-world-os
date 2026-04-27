-- =============================================================================
-- AgarthaOS — Tenant config + Dev fixtures (TEMPORARY — delete before prod)
-- =============================================================================
-- Covers Categories 2 & 3: tenant config + dev fixtures in a single file.
-- All staff share the password 'Password1!' for local testing.
-- Fixed UUIDs are used for predictability and cross-environment referencing.
-- Idempotent: safe to re-run; all inserts use ON CONFLICT DO NOTHING.
-- =============================================================================

BEGIN;

-- Suppress the "create IAM request on staff_records insert" trigger during
-- bulk staff load (we pre-create profiles directly). Re-enabled at the end.
ALTER TABLE public.staff_records DISABLE TRIGGER trg_auto_create_iam_request;


-- =============================================================================
-- 1. APP CONFIG (ensure facility_timezone is set for cron jobs)
-- =============================================================================
INSERT INTO public.app_config (key, value) VALUES
    ('facility_timezone', 'Asia/Kuala_Lumpur'),
    ('supabase_url',      'http://localhost:54321'),
    ('cron_secret',       'dev-cron-secret-rotate-before-prod')
ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- 2. LOCATIONS (5 — one per operational area)
-- =============================================================================
INSERT INTO public.locations (id, name, org_unit_id, is_active) VALUES
    ('aa000000-0000-0000-0000-000000000001', 'Entrance',            (SELECT id FROM public.org_units WHERE code = 'ops'),       TRUE),
    ('aa000000-0000-0000-0000-000000000002', 'Central Warehouse',   (SELECT id FROM public.org_units WHERE code = 'logistics'), TRUE),
    ('aa000000-0000-0000-0000-000000000003', 'Cafe',                (SELECT id FROM public.org_units WHERE code = 'fnb'),       TRUE),
    ('aa000000-0000-0000-0000-000000000004', 'Gift Shop',           (SELECT id FROM public.org_units WHERE code = 'giftshop'),  TRUE),
    ('aa000000-0000-0000-0000-000000000005', 'Agartha World',       (SELECT id FROM public.org_units WHERE code = 'experiences'), TRUE)
ON CONFLICT (name) DO NOTHING;


-- =============================================================================
-- 3. ZONES (3-4 per location)
-- =============================================================================
INSERT INTO public.zones (id, name, description, capacity, location_id, is_active) VALUES
    ('bb000000-0000-0000-0000-000000000001', 'Lobby',          'Main entrance lobby',     200, 'aa000000-0000-0000-0000-000000000001', TRUE),
    ('bb000000-0000-0000-0000-000000000002', 'Reception',      'Check-in desk',            50, 'aa000000-0000-0000-0000-000000000001', TRUE),
    ('bb000000-0000-0000-0000-000000000003', 'Lounge',         'Waiting lounge',          100, 'aa000000-0000-0000-0000-000000000001', TRUE),
    ('bb000000-0000-0000-0000-000000000004', 'Bay A',          'Receiving bay A',          30, 'aa000000-0000-0000-0000-000000000002', TRUE),
    ('bb000000-0000-0000-0000-000000000005', 'Bay B',          'Dispatch bay B',           30, 'aa000000-0000-0000-0000-000000000002', TRUE),
    ('bb000000-0000-0000-0000-000000000006', 'Cold Storage',   'Refrigerated zone',        15, 'aa000000-0000-0000-0000-000000000002', TRUE),
    ('bb000000-0000-0000-0000-000000000007', 'Prep Station',   'Kitchen prep area',        20, 'aa000000-0000-0000-0000-000000000003', TRUE),
    ('bb000000-0000-0000-0000-000000000008', 'Hot Line',       'Kitchen cook line',        15, 'aa000000-0000-0000-0000-000000000003', TRUE),
    ('bb000000-0000-0000-0000-000000000009', 'Retail Floor',   'Gift shop retail floor',  100, 'aa000000-0000-0000-0000-000000000004', TRUE),
    ('bb00000a-0000-0000-0000-000000000010', 'Shop Storage',   'Gift shop stock room',     25, 'aa000000-0000-0000-0000-000000000004', TRUE),
    ('bb00000a-0000-0000-0000-000000000011', 'Stage',          'Experience main stage',   300, 'aa000000-0000-0000-0000-000000000005', TRUE),
    ('bb00000a-0000-0000-0000-000000000012', 'Backstage',      'Crew prep area',           40, 'aa000000-0000-0000-0000-000000000005', TRUE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 4. MATERIAL CATEGORIES (ltree hierarchy)
-- =============================================================================
INSERT INTO public.material_categories (id, parent_id, code, name, path, is_bom_eligible, is_consumable, sort_order, is_active) VALUES
    ('cc000000-0000-0000-0000-000000000001', NULL, 'food',       'Food & Beverage',      'food',                    TRUE,  FALSE, 10, TRUE),
    ('cc000000-0000-0000-0000-000000000002', NULL, 'retail',     'Retail Merchandise',   'retail',                  FALSE, FALSE, 20, TRUE),
    ('cc000000-0000-0000-0000-000000000003', NULL, 'consumables','Consumables',          'consumables',             FALSE, TRUE,  30, TRUE),
    ('cc000000-0000-0000-0000-000000000004', NULL, 'capital',    'Capital Equipment',    'capital',                 FALSE, FALSE, 40, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.material_categories (id, parent_id, code, name, path, is_bom_eligible, is_consumable, sort_order, is_active) VALUES
    ('cc000000-0000-0000-0000-000000000011', 'cc000000-0000-0000-0000-000000000001', 'beverages',      'Beverages',       'food.beverages',      TRUE,  FALSE, 11, TRUE),
    ('cc000000-0000-0000-0000-000000000012', 'cc000000-0000-0000-0000-000000000001', 'prepared_meals', 'Prepared Meals',  'food.prepared_meals', TRUE,  FALSE, 12, TRUE),
    ('cc000000-0000-0000-0000-000000000013', 'cc000000-0000-0000-0000-000000000001', 'raw_ingredients','Raw Ingredients', 'food.raw_ingredients',FALSE, FALSE, 13, TRUE),
    ('cc000000-0000-0000-0000-000000000021', 'cc000000-0000-0000-0000-000000000002', 'merchandise',    'Merchandise',     'retail.merchandise',  FALSE, FALSE, 21, TRUE),
    ('cc000000-0000-0000-0000-000000000031', 'cc000000-0000-0000-0000-000000000003', 'cleaning',       'Cleaning Supplies','consumables.cleaning', FALSE, TRUE, 31, TRUE),
    ('cc000000-0000-0000-0000-000000000032', 'cc000000-0000-0000-0000-000000000003', 'uniforms',       'Uniforms & PPE',  'consumables.uniforms',FALSE, TRUE,  32, TRUE)
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- 5. LOCATION ↔ ALLOWED CATEGORIES
-- =============================================================================
INSERT INTO public.location_allowed_categories (location_id, category_id)
SELECT l.id, c.id
FROM public.locations l CROSS JOIN public.material_categories c
WHERE (l.name = 'Cafe'                 AND c.code IN ('beverages','prepared_meals','raw_ingredients','cleaning'))
   OR (l.name = 'Gift Shop'            AND c.code IN ('merchandise','cleaning'))
   OR (l.name = 'Central Warehouse'    AND c.code IN ('beverages','prepared_meals','raw_ingredients','merchandise','cleaning','uniforms'))
   OR (l.name = 'Agartha World'        AND c.code IN ('cleaning','uniforms'))
   OR (l.name = 'Entrance'             AND c.code IN ('cleaning','uniforms'))
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 6. UNITS (additional beyond init seed)
-- =============================================================================
INSERT INTO public.units (name, abbreviation) VALUES
    ('piece',     'pc'),
    ('bottle',    'btl'),
    ('carton',    'ctn'),
    ('kilogram',  'kg'),
    ('gram',      'g'),
    ('liter',     'L'),
    ('milliliter','mL'),
    ('pack',      'pk')
ON CONFLICT (name) DO NOTHING;


-- =============================================================================
-- 7. UOM CONVERSIONS (global)
-- =============================================================================
INSERT INTO public.uom_conversions (material_id, from_unit_id, to_unit_id, factor)
SELECT NULL, f.id, t.id, 1000
FROM public.units f, public.units t
WHERE (f.name, t.name) IN (('kilogram','gram'), ('liter','milliliter'))
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 8. SUPPLIERS (5)
-- =============================================================================
INSERT INTO public.suppliers (id, name, contact_email, contact_phone, address, description, is_active) VALUES
    ('dd000000-0000-0000-0000-000000000001', 'Pacific Beverages Sdn Bhd', 'sales@pacificbev.my',   '+60-3-1234-0001', 'Lot 12, Klang Industrial Park', 'Primary beverage supplier', TRUE),
    ('dd000000-0000-0000-0000-000000000002', 'Fresh Produce Trading',     'orders@freshproduce.my','+60-3-1234-0002', 'Batu Caves Wholesale Market',   'Fruits, vegetables, dairy', TRUE),
    ('dd000000-0000-0000-0000-000000000003', 'SouvenirMart Supplies',     'b2b@souvenirmart.my',   '+60-3-1234-0003', 'Petaling Jaya, Section 14',     'Gift shop merchandise',     TRUE),
    ('dd000000-0000-0000-0000-000000000004', 'CleanCo Industrial',        'service@cleanco.my',    '+60-3-1234-0004', 'Shah Alam, Section 23',         'Cleaning chemicals + PPE',  TRUE),
    ('dd000000-0000-0000-0000-000000000005', 'TechStack Malaysia',        'quote@techstack.my',    '+60-3-1234-0005', 'Cyberjaya',                     'IT + POS hardware',         TRUE)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 9. MAINTENANCE VENDORS
-- =============================================================================
INSERT INTO public.maintenance_vendors (id, name, contact_email, contact_phone, specialization, description, is_active) VALUES
    ('ee000000-0000-0000-0000-000000000001', 'FixIt Facilities',     'ops@fixit.my',      '+60-12-555-0001', 'HVAC, electrical',         'General facilities vendor', TRUE),
    ('ee000000-0000-0000-0000-000000000002', 'NetPro Technicians',   'noc@netpro.my',     '+60-12-555-0002', 'Network, POS, devices',    'IT / network vendor',       TRUE),
    ('ee000000-0000-0000-0000-000000000003', 'RideSafe Engineering', 'service@ridesafe.my','+60-12-555-0003', 'Ride mechanical safety',   'Experience ride specialist',TRUE)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 10. DEVICE TYPES + DEVICES
-- =============================================================================
INSERT INTO public.device_types (id, name, display_name) VALUES
    ('f1000000-0000-0000-0000-000000000001', 'pos_terminal',    'POS Terminal'),
    ('f1000000-0000-0000-0000-000000000002', 'kiosk',           'Self-Service Kiosk'),
    ('f1000000-0000-0000-0000-000000000003', 'network_switch',  'Network Switch'),
    ('f1000000-0000-0000-0000-000000000004', 'camera',          'Surveillance Camera'),
    ('f1000000-0000-0000-0000-000000000005', 'access_point',    'Wi-Fi Access Point')
ON CONFLICT (name) DO NOTHING;

-- device_type_id resolved by name lookup: init_schema.sql:1211 already seeds
-- device_types without explicit UUIDs (random via gen_random_uuid), so the
-- seed's f1...01/02/03 for pos_terminal/kiosk/network_switch would never land
-- due to ON CONFLICT (name) DO NOTHING above. Name lookup is drift-proof.
INSERT INTO public.devices (id, name, device_type_id, serial_number, asset_tag, zone_id, ip_address, mac_address, manufacturer, model, firmware_version, commission_date, warranty_expiry, status, maintenance_vendor_id) VALUES
    ('f2000000-0000-0000-0000-000000000001', 'POS-KITCHEN-01', (SELECT id FROM public.device_types WHERE name = 'pos_terminal'),   'SN-POS-0001', 'AT-001', 'bb000000-0000-0000-0000-000000000008', '10.10.1.11'::INET, '00:1A:2B:3C:4D:01', 'Epson', 'TM-T88VI', '2.4.1', '2025-01-15', '2028-01-15', 'online',  'ee000000-0000-0000-0000-000000000002'),
    ('f2000000-0000-0000-0000-000000000002', 'POS-SHOP-01',    (SELECT id FROM public.device_types WHERE name = 'pos_terminal'),   'SN-POS-0002', 'AT-002', 'bb000000-0000-0000-0000-000000000009', '10.10.1.12'::INET, '00:1A:2B:3C:4D:02', 'Epson', 'TM-T88VI', '2.4.1', '2025-01-15', '2028-01-15', 'online',  'ee000000-0000-0000-0000-000000000002'),
    ('f2000000-0000-0000-0000-000000000003', 'SW-CORE-01',     (SELECT id FROM public.device_types WHERE name = 'network_switch'), 'SN-SW-0001',  'AT-010', 'bb000000-0000-0000-0000-000000000002', '10.10.0.1'::INET,  '00:1A:2B:3C:4D:10', 'Cisco', 'Catalyst 9300', '17.9.1', '2024-06-01', '2029-06-01', 'online',  'ee000000-0000-0000-0000-000000000002'),
    ('f2000000-0000-0000-0000-000000000004', 'CAM-LOBBY-01',   (SELECT id FROM public.device_types WHERE name = 'camera'),         'SN-CAM-0001', 'AT-020', 'bb000000-0000-0000-0000-000000000001', '10.10.2.21'::INET, '00:1A:2B:3C:4D:20', 'Hikvision', 'DS-2CD', '5.7.3', '2025-03-01', '2028-03-01', 'online', 'ee000000-0000-0000-0000-000000000001'),
    ('f2000000-0000-0000-0000-000000000005', 'AP-STAGE-01',    (SELECT id FROM public.device_types WHERE name = 'access_point'),   'SN-AP-0001',  'AT-030', 'bb00000a-0000-0000-0000-000000000011', '10.10.3.31'::INET, '00:1A:2B:3C:4D:30', 'Ubiquiti','U6-Pro', '6.5.28', '2025-02-01', '2028-02-01', 'offline', 'ee000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 11. MATERIALS (15 across categories)
-- =============================================================================
INSERT INTO public.materials (id, name, sku, material_type, category_id, base_unit_id, reorder_point, safety_stock, standard_cost, valuation_method, is_returnable, is_active) VALUES
    -- Raw / beverages
    ('a1000000-0000-0000-0000-000000000001', 'Arabica Coffee Beans 1kg',  'COFFEE-ARB-1KG',  'raw',   'cc000000-0000-0000-0000-000000000013', (SELECT id FROM public.units WHERE name='kilogram'), 20, 5,  45.00, 'moving_avg', FALSE, TRUE),
    ('a1000000-0000-0000-0000-000000000002', 'Fresh Milk 1L',             'MILK-FRESH-1L',   'raw',   'cc000000-0000-0000-0000-000000000013', (SELECT id FROM public.units WHERE name='liter'),    30, 10, 6.50,  'moving_avg', FALSE, TRUE),
    ('a1000000-0000-0000-0000-000000000003', 'Sugar 1kg',                 'SUGAR-1KG',       'raw',   'cc000000-0000-0000-0000-000000000013', (SELECT id FROM public.units WHERE name='kilogram'), 15, 5,  3.80,  'standard',       FALSE, TRUE),
    -- Finished beverages (sold items)
    ('a1000000-0000-0000-0000-000000000011', 'Latte',                     'DRINK-LATTE',     'finished',       'cc000000-0000-0000-0000-000000000011', (SELECT id FROM public.units WHERE name='piece'),    0,  0,  0.00,  'standard',       FALSE, TRUE),
    ('a1000000-0000-0000-0000-000000000012', 'Americano',                 'DRINK-AMERICANO', 'finished',       'cc000000-0000-0000-0000-000000000011', (SELECT id FROM public.units WHERE name='piece'),    0,  0,  0.00,  'standard',       FALSE, TRUE),
    ('a1000000-0000-0000-0000-000000000013', 'Iced Chocolate',            'DRINK-ICECHOC',   'finished',       'cc000000-0000-0000-0000-000000000011', (SELECT id FROM public.units WHERE name='piece'),    0,  0,  0.00,  'standard',       FALSE, TRUE),
    -- Merchandise (traded)
    ('a1000000-0000-0000-0000-000000000021', 'Agartha T-Shirt — M',       'TEE-AGARTHA-M',   'trading',        'cc000000-0000-0000-0000-000000000021', (SELECT id FROM public.units WHERE name='piece'),    10, 3,  25.00, 'moving_avg', FALSE, TRUE),
    ('a1000000-0000-0000-0000-000000000022', 'Agartha Plush Toy',         'PLUSH-AGARTHA',   'trading',        'cc000000-0000-0000-0000-000000000021', (SELECT id FROM public.units WHERE name='piece'),    8,  2,  18.00, 'moving_avg', FALSE, TRUE),
    ('a1000000-0000-0000-0000-000000000023', 'Souvenir Mug',              'MUG-AGARTHA',     'trading',        'cc000000-0000-0000-0000-000000000021', (SELECT id FROM public.units WHERE name='piece'),    15, 5,  12.00, 'moving_avg', FALSE, TRUE),
    -- Consumables
    ('a1000000-0000-0000-0000-000000000031', 'Floor Cleaner 5L',          'CLEAN-FLOOR-5L',  'consumable',     'cc000000-0000-0000-0000-000000000031', (SELECT id FROM public.units WHERE name='liter'),    8,  2,  35.00, 'standard',       FALSE, TRUE),
    ('a1000000-0000-0000-0000-000000000032', 'Trash Bags 100pk',          'TRASH-BAG-100',   'consumable',     'cc000000-0000-0000-0000-000000000031', (SELECT id FROM public.units WHERE name='pack'),     10, 3,  22.00, 'standard',       FALSE, TRUE),
    ('a1000000-0000-0000-0000-000000000033', 'Crew Polo Shirt — M',       'UNI-POLO-M',      'consumable',     'cc000000-0000-0000-0000-000000000032', (SELECT id FROM public.units WHERE name='piece'),    20, 5,  40.00, 'standard',       TRUE,  TRUE),
    ('a1000000-0000-0000-0000-000000000034', 'Safety Helmet',             'PPE-HELMET',      'consumable',     'cc000000-0000-0000-0000-000000000032', (SELECT id FROM public.units WHERE name='piece'),    10, 3,  55.00, 'standard',       TRUE,  TRUE),
    -- Semi-finished (for BOM)
    ('a1000000-0000-0000-0000-000000000041', 'Espresso Shot',             'SEMI-ESPRESSO',   'semi_finished',  'cc000000-0000-0000-0000-000000000012', (SELECT id FROM public.units WHERE name='piece'),    0,  0,  0.00,  'standard',       FALSE, TRUE),
    -- Service
    ('a1000000-0000-0000-0000-000000000051', 'VIP Tour Guide Service',    'SVC-VIPTOUR',     'service',        'cc000000-0000-0000-0000-000000000001', (SELECT id FROM public.units WHERE name='piece'),    0,  0,  0.00,  'standard',       FALSE, TRUE)
ON CONFLICT (sku) DO NOTHING;


-- =============================================================================
-- 12. MATERIAL PROCUREMENT DATA (supplier assignments)
-- =============================================================================
INSERT INTO public.material_procurement_data (material_id, supplier_id, supplier_sku, cost_price, purchase_unit_id, lead_time_days, min_order_qty, is_default)
SELECT m.id, s.id, m.sku, m.standard_cost, m.base_unit_id, 3, 5, TRUE
FROM public.materials m
JOIN public.suppliers s ON s.name = CASE
    WHEN m.sku LIKE 'COFFEE%' OR m.sku LIKE 'MILK%' OR m.sku LIKE 'SUGAR%' THEN 'Fresh Produce Trading'
    WHEN m.sku LIKE 'DRINK%' THEN 'Pacific Beverages Sdn Bhd'
    WHEN m.sku LIKE 'TEE%' OR m.sku LIKE 'PLUSH%' OR m.sku LIKE 'MUG%' THEN 'SouvenirMart Supplies'
    WHEN m.sku LIKE 'CLEAN%' OR m.sku LIKE 'TRASH%' OR m.sku LIKE 'UNI%' OR m.sku LIKE 'PPE%' THEN 'CleanCo Industrial'
    ELSE 'Pacific Beverages Sdn Bhd'
END
WHERE m.material_type <> 'service'
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 13. EXPERIENCES + TIERS + TIER_PERKS + EXPERIENCE_TIERS + SCHEDULER_CONFIG
-- =============================================================================
INSERT INTO public.experiences (id, name, capacity_per_slot, max_facility_capacity, arrival_window_minutes, is_active) VALUES
    ('ab000000-0000-0000-0000-000000000001', 'Agartha Encounter', 50, 300, 30, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.tiers (id, name, adult_price, child_price, duration_minutes, sort_order) VALUES
    ('ac000000-0000-0000-0000-000000000001', 'Standard', 89.00,  49.00,  60, 10),
    ('ac000000-0000-0000-0000-000000000002', 'VIP',      149.00, 99.00,  90, 20),
    ('ac000000-0000-0000-0000-000000000003', 'Family',   249.00, 0.00,   90, 30)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tier_perks (tier_id, perk) VALUES
    ('ac000000-0000-0000-0000-000000000001', 'Standard entry'),
    ('ac000000-0000-0000-0000-000000000001', 'Digital photo memory'),
    ('ac000000-0000-0000-0000-000000000002', 'Priority entry'),
    ('ac000000-0000-0000-0000-000000000002', 'Reserved seating'),
    ('ac000000-0000-0000-0000-000000000002', 'Complimentary beverage'),
    ('ac000000-0000-0000-0000-000000000002', 'Meet-and-greet'),
    ('ac000000-0000-0000-0000-000000000003', '2 adults + up to 3 children'),
    ('ac000000-0000-0000-0000-000000000003', 'Family photo session'),
    ('ac000000-0000-0000-0000-000000000003', 'Souvenir goodie bag')
ON CONFLICT DO NOTHING;

INSERT INTO public.experience_tiers (experience_id, tier_id) VALUES
    ('ab000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000001'),
    ('ab000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000002'),
    ('ab000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

INSERT INTO public.scheduler_config (experience_id, days_ahead, day_start_hour, day_end_hour, start_date, end_date) VALUES
    ('ab000000-0000-0000-0000-000000000001', 14, 10, 22, CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 14. TIME SLOTS (next 14 days, 10:00-22:00 hourly)
-- =============================================================================
INSERT INTO public.time_slots (experience_id, slot_date, start_time, end_time, booked_count)
SELECT 'ab000000-0000-0000-0000-000000000001',
       d::DATE,
       (h || ':00')::TIME,
       ((h+1) || ':00')::TIME,
       0
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '13 days', INTERVAL '1 day') AS d
CROSS JOIN generate_series(10, 21) AS h
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 15. POS POINTS + DISPLAY CATEGORIES
-- =============================================================================
INSERT INTO public.pos_points (id, name, display_name, location_id, is_active) VALUES
    ('ad000000-0000-0000-0000-000000000001', 'fnb_main',    'F&B Kitchen — Main Counter', 'aa000000-0000-0000-0000-000000000003', TRUE),
    ('ad000000-0000-0000-0000-000000000002', 'giftshop_01', 'Gift Shop Register',         'aa000000-0000-0000-0000-000000000004', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.display_categories (id, pos_point_id, name, sort_order) VALUES
    ('ae000000-0000-0000-0000-000000000001', 'ad000000-0000-0000-0000-000000000001', 'Hot Drinks',   10),
    ('ae000000-0000-0000-0000-000000000002', 'ad000000-0000-0000-0000-000000000001', 'Cold Drinks',  20),
    ('ae000000-0000-0000-0000-000000000011', 'ad000000-0000-0000-0000-000000000002', 'Apparel',      10),
    ('ae000000-0000-0000-0000-000000000012', 'ad000000-0000-0000-0000-000000000002', 'Souvenirs',    20)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 16. MATERIAL SALES DATA (sellable catalog per POS point)
-- =============================================================================
INSERT INTO public.material_sales_data (material_id, pos_point_id, display_name, selling_price, display_category_id, sort_order, is_active) VALUES
    ('a1000000-0000-0000-0000-000000000011', 'ad000000-0000-0000-0000-000000000001', 'Latte',           12.00, 'ae000000-0000-0000-0000-000000000001', 10, TRUE),
    ('a1000000-0000-0000-0000-000000000012', 'ad000000-0000-0000-0000-000000000001', 'Americano',       10.00, 'ae000000-0000-0000-0000-000000000001', 20, TRUE),
    ('a1000000-0000-0000-0000-000000000013', 'ad000000-0000-0000-0000-000000000001', 'Iced Chocolate',  14.00, 'ae000000-0000-0000-0000-000000000002', 10, TRUE),
    ('a1000000-0000-0000-0000-000000000021', 'ad000000-0000-0000-0000-000000000002', 'Agartha T-Shirt', 59.00, 'ae000000-0000-0000-0000-000000000011', 10, TRUE),
    ('a1000000-0000-0000-0000-000000000022', 'ad000000-0000-0000-0000-000000000002', 'Agartha Plush',   45.00, 'ae000000-0000-0000-0000-000000000012', 10, TRUE),
    ('a1000000-0000-0000-0000-000000000023', 'ad000000-0000-0000-0000-000000000002', 'Souvenir Mug',    29.00, 'ae000000-0000-0000-0000-000000000012', 20, TRUE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 17. POS MODIFIERS
-- =============================================================================
INSERT INTO public.pos_modifier_groups (id, name, display_name, min_selections, max_selections, sort_order, is_active) VALUES
    ('af000000-0000-0000-0000-000000000001', 'milk_type', 'Milk Type',      1, 1, 10, TRUE),
    ('af000000-0000-0000-0000-000000000002', 'shots',     'Extra Shot',     0, 2, 20, TRUE),
    ('af000000-0000-0000-0000-000000000003', 'size',      'Cup Size',       1, 1, 5,  TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.pos_modifier_options (group_id, name, price_delta, sort_order, is_active) VALUES
    ('af000000-0000-0000-0000-000000000001', 'Dairy',       0.00, 10, TRUE),
    ('af000000-0000-0000-0000-000000000001', 'Oat',         2.00, 20, TRUE),
    ('af000000-0000-0000-0000-000000000001', 'Almond',      2.00, 30, TRUE),
    ('af000000-0000-0000-0000-000000000002', 'Single Shot', 3.00, 10, TRUE),
    ('af000000-0000-0000-0000-000000000002', 'Double Shot', 5.00, 20, TRUE),
    ('af000000-0000-0000-0000-000000000003', 'Small',       0.00, 10, TRUE),
    ('af000000-0000-0000-0000-000000000003', 'Regular',     2.00, 20, TRUE),
    ('af000000-0000-0000-0000-000000000003', 'Large',       4.00, 30, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.material_modifier_groups (material_id, modifier_group_id, sort_order)
SELECT m.id, mg.id, mg.sort_order
FROM public.materials m CROSS JOIN public.pos_modifier_groups mg
WHERE m.sku IN ('DRINK-LATTE','DRINK-AMERICANO','DRINK-ICECHOC')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 18. PRICE LISTS (one default, valid 1 year)
-- =============================================================================
INSERT INTO public.price_lists (id, name, currency, valid_from, valid_to, is_default) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Standard 2026', 'MYR', CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', TRUE)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 19. SHIFT TYPES (4 core)
-- =============================================================================
INSERT INTO public.shift_types (id, code, name, start_time, end_time, break_duration_minutes, color, grace_late_arrival_minutes, grace_early_departure_minutes, max_late_clock_in_minutes, max_early_clock_in_minutes, max_late_clock_out_minutes, is_active) VALUES
    ('b1000000-0000-0000-0000-000000000001', 'MORN',   'Morning (09:00–17:00)',   '09:00', '17:00', 60, '#4ADE80', 10, 5,  60, 30, 180, TRUE),
    ('b1000000-0000-0000-0000-000000000002', 'AFT',    'Afternoon (13:00–21:00)', '13:00', '21:00', 60, '#60A5FA', 10, 5,  60, 30, 180, TRUE),
    ('b1000000-0000-0000-0000-000000000003', 'NIGHT',  'Night (21:00–05:00)',     '21:00', '05:00', 60, '#A78BFA', 10, 5,  60, 30, 180, TRUE),
    ('b1000000-0000-0000-0000-000000000004', 'SPLIT',  'Split (10:00–14:00 + 18:00–22:00)', '10:00', '22:00', 240, '#F59E0B', 10, 5, 60, 30, 180, TRUE)
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- 20. ROSTER TEMPLATES (weekly: 5 days + 2 off)
-- =============================================================================
INSERT INTO public.roster_templates (id, name, cycle_length_days, anchor_date, is_active) VALUES
    ('b2000000-0000-0000-0000-000000000001', 'Standard 5-on-2-off', 7, '2026-01-05', TRUE),
    ('b2000000-0000-0000-0000-000000000002', 'Afternoon 5-on-2-off', 7, '2026-01-05', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.roster_template_shifts (template_id, day_index, shift_type_id) VALUES
    ('b2000000-0000-0000-0000-000000000001', 1, 'b1000000-0000-0000-0000-000000000001'),
    ('b2000000-0000-0000-0000-000000000001', 2, 'b1000000-0000-0000-0000-000000000001'),
    ('b2000000-0000-0000-0000-000000000001', 3, 'b1000000-0000-0000-0000-000000000001'),
    ('b2000000-0000-0000-0000-000000000001', 4, 'b1000000-0000-0000-0000-000000000001'),
    ('b2000000-0000-0000-0000-000000000001', 5, 'b1000000-0000-0000-0000-000000000001'),
    ('b2000000-0000-0000-0000-000000000002', 1, 'b1000000-0000-0000-0000-000000000002'),
    ('b2000000-0000-0000-0000-000000000002', 2, 'b1000000-0000-0000-0000-000000000002'),
    ('b2000000-0000-0000-0000-000000000002', 3, 'b1000000-0000-0000-0000-000000000002'),
    ('b2000000-0000-0000-0000-000000000002', 4, 'b1000000-0000-0000-0000-000000000002'),
    ('b2000000-0000-0000-0000-000000000002', 6, 'b1000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 21. LEAVE TYPES + POLICIES + ENTITLEMENTS
-- =============================================================================
-- leave_types are NOT seeded in init_schema.sql, but both leave_policy_entitlements
-- and leave_requests below depend on them. Seed the three codes used downstream.
INSERT INTO public.leave_types (code, name, is_paid, is_active) VALUES
    ('annual', 'Annual Leave', TRUE,  TRUE),
    ('sick',   'Sick Leave',   TRUE,  TRUE),
    ('unpaid', 'Unpaid Leave', FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.leave_policies (id, name, description, is_active) VALUES
    ('b3000000-0000-0000-0000-000000000001', 'Default Full-Time', '14 annual + 14 sick, annual upfront', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.leave_policy_entitlements (policy_id, leave_type_id, days_per_year, frequency)
SELECT 'b3000000-0000-0000-0000-000000000001', lt.id, 14, 'annual_upfront'::accrual_frequency
FROM public.leave_types lt
WHERE lt.code IN ('annual', 'sick', 'unpaid')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 22. CAMPAIGNS + PROMO CODES
-- =============================================================================
INSERT INTO public.campaigns (id, name, description, status, budget, start_date, end_date) VALUES
    ('b4000000-0000-0000-0000-000000000001', 'Launch 2026', 'Opening-season promotions', 'active', 50000.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.promo_codes (id, code, description, discount_type, discount_value, max_uses, current_uses, campaign_id, status, valid_from, valid_to, valid_days_mask, min_group_size) VALUES
    ('b5000000-0000-0000-0000-000000000001', 'LAUNCH20',  'Launch season 20% off',    'percentage', 20.00, 500,  0, 'b4000000-0000-0000-0000-000000000001', 'active', NOW(), NOW() + INTERVAL '90 days', NULL, 1),
    ('b5000000-0000-0000-0000-000000000002', 'FAMILY50',  'Family tier RM 50 off',    'fixed',      50.00, 200,  0, 'b4000000-0000-0000-0000-000000000001', 'active', NOW(), NOW() + INTERVAL '60 days', NULL, 3),
    ('b5000000-0000-0000-0000-000000000003', 'WEEKDAY10', 'Weekday 10% off',          'percentage', 10.00, 1000, 0, 'b4000000-0000-0000-0000-000000000001', 'active', NOW(), NOW() + INTERVAL '60 days', 31,   1)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.promo_valid_tiers (promo_code_id, tier_id) VALUES
    ('b5000000-0000-0000-0000-000000000002', 'ac000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 23. VEHICLES
-- =============================================================================
INSERT INTO public.vehicles (id, name, plate, vehicle_type, status, zone_id) VALUES
    ('b6000000-0000-0000-0000-000000000001', 'Van-01',   'VAN1234', 'van',    'active',      'bb000000-0000-0000-0000-000000000002'),
    ('b6000000-0000-0000-0000-000000000002', 'Buggy-01', 'BGY0001', 'buggy',  'active',      'bb00000a-0000-0000-0000-000000000011'),
    ('b6000000-0000-0000-0000-000000000003', 'Van-02',   'VAN5678', 'van',    'maintenance', 'bb000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 24. STAFF — 19 users, one per role
-- =============================================================================
-- All passwords: 'Password1!' (bcrypted). Emails: {role}@agartha.test
-- Each staff is linked to a plausible org_unit + has profile.employment_status='active'.
-- Trigger handle_new_user auto-creates the profile row; we UPDATE it to wire role + staff.

DO $$
DECLARE
    r RECORD;
    v_user_id UUID;
    v_staff_id UUID;
    v_emp_num INTEGER := 1;
    v_instance UUID := '00000000-0000-0000-0000-000000000000';
    v_hashed  TEXT  := crypt('Password1!', gen_salt('bf'));
    v_roles TEXT[][] := ARRAY[
        -- [role_name, org_unit_code, legal_name]
        ['it_admin',                  'it',                  'Iman Admin'],
        ['business_admin',            'corp',                'Bella Business'],
        ['pos_manager',               'fnb',                 'Pavan POSman'],
        ['procurement_manager',       'logistics',           'Priya Procure'],
        ['maintenance_manager',       'maintenance_dept',    'Marcus Maintain'],
        ['inventory_manager',         'logistics',           'Ivan Inventory'],
        ['marketing_manager',         'marketing',           'Maya Marketing'],
        ['human_resources_manager',   'hr',                  'Hana HR'],
        ['compliance_manager',        'compliance',          'Chen Compliance'],
        ['operations_manager',        'ops',                 'Olivia Ops'],
        ['fnb_crew',                  'fnb',                 'Faiz F&B'],
        ['service_crew',              'experiences',         'Sara Service'],
        ['giftshop_crew',             'giftshop',            'Gina Giftshop'],
        ['runner_crew',               'logistics',           'Rahim Runner'],
        ['security_crew',             'security',            'Siti Security'],
        ['health_crew',               'health',              'Hakim Health'],
        ['cleaning_crew',             'cleaning',            'Cindy Cleaning'],
        ['experience_crew',           'experiences',         'Ethan Experience'],
        ['internal_maintenance_crew', 'maintenance_dept',    'Imran Internal']
    ];
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(v_roles, 1) LOOP
        v_user_id  := ('c0000000-0000-0000-0000-' || LPAD(i::TEXT, 12, '0'))::UUID;
        v_staff_id := ('c1000000-0000-0000-0000-' || LPAD(i::TEXT, 12, '0'))::UUID;

        -- Insert into auth.users (trigger creates public.profiles row automatically)
        INSERT INTO auth.users (
            instance_id, id, aud, role, email,
            encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            confirmation_token, email_change, email_change_token_new, recovery_token
        ) VALUES (
            v_instance, v_user_id, 'authenticated', 'authenticated',
            v_roles[i][1] || '@agartha.test',
            v_hashed, NOW(),
            '{"provider":"email","providers":["email"]}'::JSONB,
            jsonb_build_object('display_name', v_roles[i][3]),
            NOW() - INTERVAL '180 days', NOW(),
            '', '', '', ''
        )
        ON CONFLICT (id) DO NOTHING;

        -- Matching auth.identities row (required by Supabase Auth for email provider)
        INSERT INTO auth.identities (
            provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_user_id::TEXT, v_user_id,
            jsonb_build_object('sub', v_user_id::TEXT, 'email', v_roles[i][1] || '@agartha.test', 'email_verified', true),
            'email', NOW(), NOW(), NOW()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;

        -- Staff record
        INSERT INTO public.staff_records (
            id, legal_name, personal_email, phone, org_unit_id,
            contract_start, kin_name, kin_relationship, kin_phone
        ) VALUES (
            v_staff_id,
            v_roles[i][3],
            v_roles[i][1] || '.personal@example.com',
            '+60-12-000-' || LPAD(i::TEXT, 4, '0'),
            (SELECT id FROM public.org_units WHERE code = v_roles[i][2]),
            CURRENT_DATE - INTERVAL '180 days',
            'Emergency Contact ' || i,
            'Spouse',
            '+60-19-000-' || LPAD(i::TEXT, 4, '0')
        )
        ON CONFLICT (id) DO NOTHING;

        -- Wire profile to role + staff_record + mark active + password set
        -- (handle_profile_role_change trigger fires, populating auth.users.raw_app_meta_data with domains JSONB)
        UPDATE public.profiles
           SET role_id            = (SELECT id FROM public.roles WHERE name = v_roles[i][1]),
               staff_record_id    = v_staff_id,
               employment_status  = 'active',
               password_set       = TRUE,
               employee_id        = 'EMP' || LPAD((100 + i)::TEXT, 4, '0'),
               display_name       = v_roles[i][3]
         WHERE id = v_user_id;
    END LOOP;
END $$;


-- =============================================================================
-- 25. STAFF ROSTER ASSIGNMENTS (half on morning template, half on afternoon)
-- =============================================================================
-- staff_roster_assignments has EXCLUDE USING gist on overlapping date ranges per
-- staff_record (init_schema.sql:1515). ON CONFLICT cannot catch exclusion
-- violations, so we guard idempotency with NOT EXISTS instead.
INSERT INTO public.staff_roster_assignments (staff_record_id, roster_template_id, effective_start_date, effective_end_date)
SELECT sr.id,
       (CASE WHEN (row_number() OVER (ORDER BY sr.created_at)) % 2 = 0
             THEN 'b2000000-0000-0000-0000-000000000002'
             ELSE 'b2000000-0000-0000-0000-000000000001'
        END)::UUID,
       CURRENT_DATE - INTERVAL '30 days',
       NULL
FROM public.staff_records sr
WHERE sr.personal_email LIKE '%.personal@example.com'
  AND NOT EXISTS (
      SELECT 1 FROM public.staff_roster_assignments sra
      WHERE sra.staff_record_id = sr.id
  );


-- =============================================================================
-- 26. SHIFT SCHEDULES for the next 14 days (morning template only, for demo)
-- =============================================================================
INSERT INTO public.shift_schedules (staff_record_id, shift_date, shift_type_id, expected_start_time, expected_end_time, is_override)
SELECT sr.id, d::DATE, 'b1000000-0000-0000-0000-000000000001', '09:00', '17:00', FALSE
FROM public.staff_records sr
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '13 days', INTERVAL '1 day') AS d
WHERE sr.personal_email LIKE '%.personal@example.com'
  AND EXTRACT(DOW FROM d) BETWEEN 1 AND 5
ON CONFLICT (staff_record_id, shift_date) DO NOTHING;


-- =============================================================================
-- 27. DEMO BOOKINGS (10: mix of pending_payment, confirmed, checked_in, completed)
-- =============================================================================
DO $$
DECLARE
    v_slot RECORD;
    i INTEGER := 0;
    v_booking_id UUID;
    v_status public.booking_status;
    v_statuses public.booking_status[] := ARRAY['confirmed', 'confirmed', 'confirmed', 'checked_in', 'checked_in', 'completed', 'completed', 'completed', 'pending_payment', 'cancelled']::public.booking_status[];
BEGIN
    FOR v_slot IN
        SELECT id, slot_date FROM public.time_slots
        WHERE experience_id = 'ab000000-0000-0000-0000-000000000001'
          AND slot_date BETWEEN CURRENT_DATE - INTERVAL '3 days' AND CURRENT_DATE + INTERVAL '7 days'
        ORDER BY slot_date, start_time
        LIMIT 10
    LOOP
        i := i + 1;
        v_status := v_statuses[i];
        v_booking_id := ('d0000000-0000-0000-0000-' || LPAD(i::TEXT, 12, '0'))::UUID;

        INSERT INTO public.bookings (
            id, experience_id, time_slot_id, tier_id, status, total_price,
            booking_ref, qr_code_ref, booker_name, booker_email, booker_phone,
            adult_count, child_count, checked_in_at, cancelled_at, created_at
        ) VALUES (
            v_booking_id,
            'ab000000-0000-0000-0000-000000000001',
            v_slot.id,
            'ac000000-0000-0000-0000-000000000001',
            v_status,
            178.00,
            'AG-' || SUBSTRING(MD5(i::TEXT) FROM 1 FOR 6) || '-' || LPAD(i::TEXT, 4, '0'),
            'AGARTHA:Standard:2:' || EXTRACT(EPOCH FROM NOW())::INTEGER + i,
            'Guest ' || i,
            'guest' || i || '@example.com',
            '+60-11-111-' || LPAD(i::TEXT, 4, '0'),
            2, 0,
            CASE WHEN v_status IN ('checked_in','completed') THEN NOW() - INTERVAL '1 hour' ELSE NULL END,
            CASE WHEN v_status = 'cancelled' THEN NOW() - INTERVAL '2 hours' ELSE NULL END,
            NOW() - (i || ' hours')::INTERVAL
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.booking_attendees (booking_id, attendee_type, attendee_index, nickname, face_pay_enabled, auto_capture_enabled)
        VALUES
            (v_booking_id, 'adult', 1, 'Adult 1', FALSE, FALSE),
            (v_booking_id, 'adult', 2, 'Adult 2', FALSE, FALSE)
        ON CONFLICT DO NOTHING;

        INSERT INTO public.booking_payments (booking_id, method, amount, currency, payment_intent_id, status, paid_at)
        VALUES (
            v_booking_id,
            'card',
            178.00,
            'MYR',
            'pi_seed_' || i,
            CASE WHEN v_status IN ('confirmed','checked_in','completed') THEN 'success'::public.payment_status
                 WHEN v_status = 'cancelled' THEN 'failed'::public.payment_status
                 ELSE 'pending'::public.payment_status END,
            CASE WHEN v_status IN ('confirmed','checked_in','completed') THEN NOW() - INTERVAL '1 day' ELSE NULL END
        )
        ON CONFLICT (payment_intent_id) DO NOTHING;

        -- increment booked_count for non-cancelled
        IF v_status <> 'cancelled' THEN
            UPDATE public.time_slots SET booked_count = booked_count + 2 WHERE id = v_slot.id;
        END IF;
    END LOOP;
END $$;


-- =============================================================================
-- 28. DEMO POS ORDERS (5: 2 preparing, 3 completed)
-- =============================================================================
DO $$
DECLARE
    v_order_id UUID;
    v_pos_id UUID := 'ad000000-0000-0000-0000-000000000001';
    i INTEGER;
    v_statuses public.order_status[] := ARRAY['preparing','preparing','completed','completed','completed']::public.order_status[];
BEGIN
    FOR i IN 1..5 LOOP
        v_order_id := ('d1000000-0000-0000-0000-' || LPAD(i::TEXT, 12, '0'))::UUID;
        INSERT INTO public.orders (id, pos_point_id, status, total_amount, payment_method, created_at, completed_at)
        VALUES (
            v_order_id, v_pos_id, v_statuses[i], 24.00, 'cash',
            NOW() - (i || ' minutes')::INTERVAL,
            CASE WHEN v_statuses[i] = 'completed' THEN NOW() - ((i-1) || ' minutes')::INTERVAL ELSE NULL END
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.order_items (order_id, material_id, quantity, unit_price)
        VALUES (v_order_id, 'a1000000-0000-0000-0000-000000000011', 2, 12.00)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;


-- =============================================================================
-- 29. DEMO INCIDENTS (5: mix of open and resolved)
-- =============================================================================
INSERT INTO public.incidents (id, category, zone_id, description, status, created_by, resolved_by, resolved_at, created_at) VALUES
    ('d2000000-0000-0000-0000-000000000001', 'spill',              'bb000000-0000-0000-0000-000000000001', 'Water spill near lobby entrance',  'open',     (SELECT id FROM auth.users WHERE email = 'cleaning_crew@agartha.test'), NULL, NULL, NOW() - INTERVAL '30 minutes'),
    ('d2000000-0000-0000-0000-000000000002', 'guest_complaint',    'bb00000a-0000-0000-0000-000000000011', 'Guest complained about long queue', 'open',     (SELECT id FROM auth.users WHERE email = 'service_crew@agartha.test'),  NULL, NULL, NOW() - INTERVAL '2 hours'),
    ('d2000000-0000-0000-0000-000000000003', 'equipment_failure',  'bb000000-0000-0000-0000-000000000008', 'Hot line burner #2 not igniting',   'resolved', (SELECT id FROM auth.users WHERE email = 'fnb_crew@agartha.test'),       (SELECT id FROM auth.users WHERE email = 'internal_maintenance_crew@agartha.test'), NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days'),
    ('d2000000-0000-0000-0000-000000000004', 'lost_property',      'bb000000-0000-0000-0000-000000000003', 'Guest lost phone in lounge',       'resolved', (SELECT id FROM auth.users WHERE email = 'service_crew@agartha.test'),  (SELECT id FROM auth.users WHERE email = 'security_crew@agartha.test'),              NOW() - INTERVAL '3 hours', NOW() - INTERVAL '5 hours'),
    ('d2000000-0000-0000-0000-000000000005', 'medical_emergency',  'bb000000-0000-0000-0000-000000000001', 'Guest feeling faint in lobby',     'resolved', (SELECT id FROM auth.users WHERE email = 'security_crew@agartha.test'),  (SELECT id FROM auth.users WHERE email = 'health_crew@agartha.test'),                NOW() - INTERVAL '6 hours', NOW() - INTERVAL '7 hours')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 30. DEMO LEAVE REQUESTS (a few pending + approved)
-- =============================================================================
INSERT INTO public.leave_requests (staff_record_id, leave_type_id, start_date, end_date, requested_days, reason, status, reviewed_at, reviewed_by)
SELECT sr.id,
       (SELECT id FROM public.leave_types WHERE code='annual'),
       CURRENT_DATE + INTERVAL '7 days',
       CURRENT_DATE + INTERVAL '9 days',
       3,
       'Family trip',
       'pending'::public.leave_request_status,
       NULL, NULL
FROM public.staff_records sr
WHERE sr.personal_email IN ('fnb_crew.personal@example.com','giftshop_crew.personal@example.com')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 31. DEMO ANNOUNCEMENTS (3)
-- =============================================================================
INSERT INTO public.announcements (id, title, content, is_published, expires_at, created_by)
VALUES
    ('d3000000-0000-0000-0000-000000000001', 'Welcome to AgarthaOS',         'Soft launch — report any issues to IT immediately.',    TRUE, NOW() + INTERVAL '30 days', (SELECT id FROM auth.users WHERE email = 'it_admin@agartha.test')),
    ('d3000000-0000-0000-0000-000000000002', 'POS Terminal maintenance',     'F&B main counter POS will be offline Wed 10-11 PM.',    TRUE, NOW() + INTERVAL '7 days',  (SELECT id FROM auth.users WHERE email = 'pos_manager@agartha.test')),
    ('d3000000-0000-0000-0000-000000000003', 'New leave policy in effect',   'Updated annual leave policy — see HR portal.',           TRUE, NOW() + INTERVAL '60 days', (SELECT id FROM auth.users WHERE email = 'human_resources_manager@agartha.test'))
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.announcement_targets (announcement_id, target_type, role_id, org_unit_id, user_id) VALUES
    ('d3000000-0000-0000-0000-000000000001', 'global', NULL, NULL, NULL),
    ('d3000000-0000-0000-0000-000000000002', 'role',   (SELECT id FROM public.roles WHERE name='fnb_crew'), NULL, NULL),
    ('d3000000-0000-0000-0000-000000000003', 'global', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 32. DEMO SURVEY RESPONSES (5)
-- =============================================================================
INSERT INTO public.survey_responses (survey_type, overall_score, nps_score, sentiment, keywords, feedback_text, source, booking_id, staff_submitted, submitted_by, created_at) VALUES
    ('post_visit', 9, 9,  'positive', '["staff","clean","fast"]'::JSONB,      'Excellent service!',                 'in_app',  'd0000000-0000-0000-0000-000000000006', FALSE, NULL, NOW() - INTERVAL '1 day'),
    ('post_visit', 7, 7,  'neutral',  '["wait time"]'::JSONB,                 'Wait time was a bit long',           'email',   'd0000000-0000-0000-0000-000000000007', FALSE, NULL, NOW() - INTERVAL '2 days'),
    ('post_visit', 10, 10,'positive', '["amazing","kids loved it"]'::JSONB,   'Kids loved it — will come again',    'in_app',  'd0000000-0000-0000-0000-000000000008', FALSE, NULL, NOW() - INTERVAL '2 days'),
    ('nps',        5, 5,  'negative', '["food quality"]'::JSONB,              'Food was mediocre',                  'qr_code', NULL,                                  FALSE, NULL, NOW() - INTERVAL '3 days'),
    ('staff_captured', 8, 8, 'positive', '["staff friendly"]'::JSONB,         'Guest complimented crew (overheard)','in_app',  NULL,                                  TRUE,  (SELECT id FROM auth.users WHERE email = 'service_crew@agartha.test'), NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 33. BOOTSTRAP STOCK (goods_movements type 501 — initial count)
-- =============================================================================
-- Creates initial positive stock balances via goods_movements + goods_movement_items.
-- Triggers (trg_gmi_a_cache_sync) populate stock_balance_cache automatically.
DO $$
DECLARE
    v_movement_id UUID;
    v_mt_501 UUID;
    m RECORD;
BEGIN
    SELECT id INTO v_mt_501 FROM public.movement_types WHERE code = '501';
    IF v_mt_501 IS NULL THEN RETURN; END IF;

    INSERT INTO public.goods_movements (id, movement_type_id, document_date, notes, created_by)
    VALUES (
        'd4000000-0000-0000-0000-000000000001',
        v_mt_501,
        CURRENT_DATE,
        'BOOTSTRAP-INITIAL-COUNT',
        (SELECT id FROM auth.users WHERE email = 'inventory_manager@agartha.test')
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_movement_id;

    IF v_movement_id IS NOT NULL THEN
        -- total_cost is GENERATED ALWAYS AS (ABS(quantity) * unit_cost) STORED — do not supply it.
        -- unit_id is NOT NULL — pulled from materials.base_unit_id.
        FOR m IN SELECT id, standard_cost, base_unit_id FROM public.materials WHERE material_type IN ('raw','trading','consumable') LOOP
            INSERT INTO public.goods_movement_items (goods_movement_id, material_id, location_id, quantity, unit_id, unit_cost)
            VALUES (v_movement_id, m.id, 'aa000000-0000-0000-0000-000000000002', 100, m.base_unit_id, m.standard_cost)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;


-- =============================================================================
-- 34. EQUIPMENT CUSTODY (issue helmets + uniforms to a few crew)
-- =============================================================================
-- equipment_assignments has no UNIQUE on (material_id, assigned_to), so ON CONFLICT
-- DO NOTHING matches nothing and re-runs would duplicate. Guard with NOT EXISTS.
INSERT INTO public.equipment_assignments (material_id, assigned_to, assigned_at, notes)
SELECT 'a1000000-0000-0000-0000-000000000034', u.id, NOW() - INTERVAL '30 days', 'Issued at onboarding'
FROM auth.users u
WHERE u.email IN ('security_crew@agartha.test', 'internal_maintenance_crew@agartha.test', 'runner_crew@agartha.test')
  AND NOT EXISTS (
      SELECT 1 FROM public.equipment_assignments ea
      WHERE ea.material_id = 'a1000000-0000-0000-0000-000000000034'
        AND ea.assigned_to = u.id
        AND ea.returned_at IS NULL
  );


-- =============================================================================
-- Re-enable the trigger we disabled at the top
-- =============================================================================
ALTER TABLE public.staff_records ENABLE TRIGGER trg_auto_create_iam_request;

-- Any iam_requests auto-created during seeding — none expected because trigger was off,
-- but double-check with: SELECT COUNT(*) FROM public.iam_requests;


COMMIT;


-- =============================================================================
-- DELETE EVERYTHING BELOW IN ONE SHOT (to clean the seed before production):
--
--   DELETE FROM public.survey_responses   WHERE submitted_by IN (SELECT id FROM auth.users WHERE email LIKE '%@agartha.test') OR booking_id IN (SELECT id FROM public.bookings WHERE booker_email LIKE 'guest%@example.com');
--   DELETE FROM public.announcements      WHERE id::TEXT LIKE 'd3000000%';
--   DELETE FROM public.leave_requests     WHERE staff_record_id IN (SELECT id FROM public.staff_records WHERE personal_email LIKE '%.personal@example.com');
--   DELETE FROM public.incidents          WHERE id::TEXT LIKE 'd2000000%';
--   DELETE FROM public.order_items        WHERE order_id IN (SELECT id FROM public.orders WHERE id::TEXT LIKE 'd1000000%');
--   DELETE FROM public.orders             WHERE id::TEXT LIKE 'd1000000%';
--   DELETE FROM public.booking_payments   WHERE booking_id IN (SELECT id FROM public.bookings WHERE id::TEXT LIKE 'd0000000%');
--   DELETE FROM public.booking_attendees  WHERE booking_id IN (SELECT id FROM public.bookings WHERE id::TEXT LIKE 'd0000000%');
--   DELETE FROM public.bookings           WHERE id::TEXT LIKE 'd0000000%';
--   DELETE FROM public.equipment_assignments WHERE assigned_to IN (SELECT id FROM auth.users WHERE email LIKE '%@agartha.test');
--   DELETE FROM public.goods_movement_items WHERE goods_movement_id::TEXT LIKE 'd4000000%';
--   DELETE FROM public.goods_movements    WHERE id::TEXT LIKE 'd4000000%';
--   DELETE FROM public.shift_schedules    WHERE staff_record_id IN (SELECT id FROM public.staff_records WHERE personal_email LIKE '%.personal@example.com');
--   DELETE FROM public.staff_roster_assignments WHERE staff_record_id IN (SELECT id FROM public.staff_records WHERE personal_email LIKE '%.personal@example.com');
--   DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@agartha.test');
--   DELETE FROM public.staff_records WHERE personal_email LIKE '%.personal@example.com';
--   DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@agartha.test');
--   DELETE FROM auth.users WHERE email LIKE '%@agartha.test';
--   -- (Category 2 tenant config — keep or delete selectively depending on prod rollout.)
-- =============================================================================
