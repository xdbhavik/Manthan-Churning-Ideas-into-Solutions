-- V2: Domain taxonomy seed (3-level hierarchy).
-- Ported verbatim from the monolith's V6__domain_seed.sql so both the old
-- sih26043 DB and the new sih_problem DB share identical domain UUIDs.
-- Refs: 05-data-dictionary-common.md (sec 5, 12 domain hierarchy example).
-- Deterministic UUIDs keep parent references stable. Idempotent (ON CONFLICT
-- DO NOTHING) so re-application is safe.

INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  -- Level 1 roots
  ('00000000-0000-4000-8000-000000000001', 'Healthcare', 'Medical services, public health, and wellness.', NULL, 1),
  ('00000000-0000-4000-8000-000000000002', 'Agriculture & Food', 'Farming, food security, agri supply chains.', NULL, 1),
  ('00000000-0000-4000-8000-000000000003', 'Water & Sanitation', 'Drinking water, irrigation, waste management.', NULL, 1),
  ('00000000-0000-4000-8000-000000000004', 'Education & Skills', 'Schooling, vocational training, ed-tech.', NULL, 1),
  ('00000000-0000-4000-8000-000000000005', 'Transportation & Mobility', 'Roads, public transit, last-mile connectivity.', NULL, 1),
  ('00000000-0000-4000-8000-000000000006', 'Public Safety & Justice', 'Policing, disaster response, legal aid.', NULL, 1),
  ('00000000-0000-4000-8000-000000000007', 'Environment & Climate', 'Pollution, biodiversity, climate resilience.', NULL, 1),
  ('00000000-0000-4000-8000-000000000008', 'Energy & Utilities', 'Power, renewables, grid reliability.', NULL, 1),
  ('00000000-0000-4000-8000-000000000009', 'Digital & e-Governance', 'Government services, data, interoperability.', NULL, 1),
  ('00000000-0000-4000-8000-00000000000A', 'Rural & Urban Development', 'Panchayats, municipalities, housing, planning.', NULL, 1),
  ('00000000-0000-4000-8000-00000000000B', 'Employment & Livelihoods', 'Jobs, skilling, MSME support.', NULL, 1),
  ('00000000-0000-4000-8000-00000000000C', 'Tourism & Culture', 'Heritage preservation, promotion, amenities.', NULL, 1)
ON CONFLICT (domain_id) DO NOTHING;
-- Level 2 (Healthcare)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-000000000101', 'Mental Health', 'Psychological well-being and care.', '00000000-0000-4000-8000-000000000001', 2),
  ('00000000-0000-4000-8000-000000000102', 'Public Health', 'Population-level prevention and epidemiology.', '00000000-0000-4000-8000-000000000001', 2),
  ('00000000-0000-4000-8000-000000000103', 'Maternal & Child Health', 'Care for mothers, infants, and children.', '00000000-0000-4000-8000-000000000001', 2),
  ('00000000-0000-4000-8000-000000000104', 'Rural Healthcare Access', 'Availability and reach of medical services in rural areas.', '00000000-0000-4000-8000-000000000001', 2)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 3 (Healthcare)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-000000000201', 'Child Psychology', 'Psychological care for children.', '00000000-0000-4000-8000-000000000101', 3),
  ('00000000-0000-4000-8000-000000000202', 'Adult Counseling', 'Counseling services for adults.', '00000000-0000-4000-8000-000000000101', 3),
  ('00000000-0000-4000-8000-000000000203', 'Epidemiology', 'Disease patterns and outbreak tracking.', '00000000-0000-4000-8000-000000000102', 3),
  ('00000000-0000-4000-8000-000000000204', 'Telemedicine', 'Remote diagnosis and consultation.', '00000000-0000-4000-8000-000000000104', 3)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 2 (Agriculture & Food)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-000000000105', 'Crop Productivity', 'Yield, soil health, farm inputs.', '00000000-0000-4000-8000-000000000002', 2),
  ('00000000-0000-4000-8000-000000000106', 'Agri Supply Chain', 'Post-harvest, storage, mandi linkage.', '00000000-0000-4000-8000-000000000002', 2),
  ('00000000-0000-4000-8000-000000000107', 'Farmer Welfare', 'Credit, insurance, subsidies.', '00000000-0000-4000-8000-000000000002', 2)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 3 (Agriculture & Food)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-000000000205', 'Precision Farming', 'IoT and data-driven crop management.', '00000000-0000-4000-8000-000000000105', 3),
  ('00000000-0000-4000-8000-000000000206', 'Cold Chain', 'Perishable goods storage and transport.', '00000000-0000-4000-8000-000000000106', 3)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 2 (Water & Sanitation)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-000000000108', 'Drinking Water', 'Safe water access and quality.', '00000000-0000-4000-8000-000000000003', 2),
  ('00000000-0000-4000-8000-000000000109', 'Irrigation', 'Surface and groundwater management for farming.', '00000000-0000-4000-8000-000000000003', 2),
  ('00000000-0000-4000-8000-00000000010A', 'Waste Management', 'Solid and liquid waste handling.', '00000000-0000-4000-8000-000000000003', 2)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 2 (Education & Skills)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-00000000010B', 'School Education', 'K-12 learning outcomes and infrastructure.', '00000000-0000-4000-8000-000000000004', 2),
  ('00000000-0000-4000-8000-00000000010C', 'Vocational Training', 'Skill development and job readiness.', '00000000-0000-4000-8000-000000000004', 2)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 2 (Transportation & Mobility)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-00000000010D', 'Road Infrastructure', 'Road quality, lighting, traffic management.', '00000000-0000-4000-8000-000000000005', 2),
  ('00000000-0000-4000-8000-00000000010E', 'Public Transit', 'Buses, metro, last-mile connectivity.', '00000000-0000-4000-8000-000000000005', 2)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 2 (Public Safety & Justice)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-00000000010F', 'Disaster Management', 'Early warning, response, and recovery.', '00000000-0000-4000-8000-000000000006', 2),
  ('00000000-0000-4000-8000-000000000110', 'Legal Aid & Access', 'Affordable justice and awareness.', '00000000-0000-4000-8000-000000000006', 2)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 2 (Environment & Climate)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-000000000111', 'Air & Water Quality', 'Pollution monitoring and control.', '00000000-0000-4000-8000-000000000007', 2),
  ('00000000-0000-4000-8000-000000000112', 'Climate Resilience', 'Adaptation and mitigation planning.', '00000000-0000-4000-8000-000000000007', 2)
ON CONFLICT (domain_id) DO NOTHING;
-- Level 2 (Energy & Utilities)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-000000000113', 'Renewable Energy', 'Solar, wind, and clean alternatives.', '00000000-0000-4000-8000-000000000008', 2),
  ('00000000-0000-4000-8000-000000000114', 'Grid Reliability', 'Supply stability and outage response.', '00000000-0000-4000-8000-000000000008', 2)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 2 (Digital & e-Governance)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-000000000115', 'Service Delivery', 'Citizen-facing government services.', '00000000-0000-4000-8000-000000000009', 2),
  ('00000000-0000-4000-8000-000000000116', 'Data & Interoperability', 'Open data, APIs, and system integration.', '00000000-0000-4000-8000-000000000009', 2)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 2 (Rural & Urban Development)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-000000000117', 'Panchayati Raj & Rural', 'Gram Panchayat schemes and infrastructure.', '00000000-0000-4000-8000-00000000000A', 2),
  ('00000000-0000-4000-8000-000000000118', 'Urban Services', 'Municipal services: water, roads, waste, housing.', '00000000-0000-4000-8000-00000000000A', 2)
ON CONFLICT (domain_id) DO NOTHING;

-- Level 2 (Employment & Livelihoods)
INSERT INTO domain (domain_id, domain_name, description, parent_domain_id, level) VALUES
  ('00000000-0000-4000-8000-000000000119', 'MSME & Entrepreneurship', 'Enterprise growth and easing of doing business.', '00000000-0000-4000-8000-00000000000B', 2),
  ('00000000-0000-4000-8000-00000000011A', 'Job Matching', 'Skill-to-job alignment and placement.', '00000000-0000-4000-8000-00000000000B', 2)
ON CONFLICT (domain_id) DO NOTHING;
