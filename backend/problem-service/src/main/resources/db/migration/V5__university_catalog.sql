-- V5: candidate-university catalog backing AUTO_SELECTED_UNIVERSITIES.
--
-- This supersedes the note in V3__problem_access_rule.sql that problem-service
-- "does not own a university registry": source-service's hei_source is the real
-- registry, but it is empty in practice, so the automatic router needs a
-- self-contained set of candidates to match a problem's domains against.
--
-- Tags are LEVEL-1 ROOT domains only (the 12 roots from V2__domain_seed.sql).
-- The AI resolver is constrained to that same root set, so the match below is a
-- flat set intersection -- no hierarchy walk, and no silent miss from mixing
-- root ids with level-2/3 ids.
--
-- `name` is snapshotted into problem.access_universities and later matched
-- against participant.institution_name (normalized: trim + lowercase + collapse
-- whitespace), so it must read like an institution's registered name.

CREATE TABLE university (
    university_id UUID         PRIMARY KEY,
    name          VARCHAR(255) NOT NULL UNIQUE,
    short_name    VARCHAR(50),
    state         VARCHAR(100),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE university_domain (
    university_id UUID NOT NULL REFERENCES university (university_id) ON DELETE CASCADE,
    domain_id     UUID NOT NULL REFERENCES domain (domain_id),
    PRIMARY KEY (university_id, domain_id)
);

CREATE INDEX idx_university_domain_domain ON university_domain (domain_id);

INSERT INTO university (university_id, name, short_name, state) VALUES
  ('30000000-0000-4000-8000-000000000001', 'Indian Institute of Technology Madras', 'IIT Madras', 'Tamil Nadu'),
  ('30000000-0000-4000-8000-000000000002', 'Indian Institute of Technology Delhi', 'IIT Delhi', 'Delhi'),
  ('30000000-0000-4000-8000-000000000003', 'Indian Institute of Technology Bombay', 'IIT Bombay', 'Maharashtra'),
  ('30000000-0000-4000-8000-000000000004', 'Indian Institute of Technology Kanpur', 'IIT Kanpur', 'Uttar Pradesh'),
  ('30000000-0000-4000-8000-000000000005', 'Indian Institute of Technology Kharagpur', 'IIT Kharagpur', 'West Bengal'),
  ('30000000-0000-4000-8000-000000000006', 'Indian Institute of Science', 'IISc', 'Karnataka'),
  ('30000000-0000-4000-8000-000000000007', 'Indian Institute of Technology Roorkee', 'IIT Roorkee', 'Uttarakhand'),
  ('30000000-0000-4000-8000-000000000008', 'Indian Institute of Technology Guwahati', 'IIT Guwahati', 'Assam'),
  ('30000000-0000-4000-8000-000000000009', 'National Institute of Technology Tiruchirappalli', 'NIT Trichy', 'Tamil Nadu'),
  ('30000000-0000-4000-8000-00000000000A', 'Indian Institute of Technology (BHU) Varanasi', 'IIT BHU', 'Uttar Pradesh'),
  ('30000000-0000-4000-8000-00000000000B', 'Anna University', 'Anna University', 'Tamil Nadu'),
  ('30000000-0000-4000-8000-00000000000C', 'Delhi Technological University', 'DTU', 'Delhi'),
  ('30000000-0000-4000-8000-00000000000D', 'Punjab Agricultural University', 'PAU', 'Punjab'),
  ('30000000-0000-4000-8000-00000000000E', 'Indian Institute of Tourism and Travel Management', 'IITTM', 'Madhya Pradesh'),
  ('30000000-0000-4000-8000-00000000000F', 'Tata Institute of Social Sciences', 'TISS', 'Maharashtra'),
  ('30000000-0000-4000-8000-000000000010', 'Gujarat Technological University', 'GTU', 'Gujarat')
ON CONFLICT (university_id) DO NOTHING;

-- Every one of the 12 level-1 roots has at least one active university, so a
-- problem in any domain can be routed. domain_id values are the roots from
-- V2__domain_seed.sql (0001 Healthcare ... 000C Tourism & Culture).
INSERT INTO university_domain (university_id, domain_id) VALUES
  -- IIT Madras: Energy, Water, Digital
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000008'),
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000009'),
  -- IIT Delhi: Digital, Healthcare, Transportation
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000009'),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005'),
  -- IIT Bombay: Transportation, Digital, Environment
  ('30000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000005'),
  ('30000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000009'),
  ('30000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000007'),
  -- IIT Kanpur: Public Safety, Digital
  ('30000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000006'),
  ('30000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000009'),
  -- IIT Kharagpur: Rural & Urban, Water
  ('30000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-00000000000A'),
  ('30000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003'),
  -- IISc: Healthcare, Environment
  ('30000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000007'),
  -- IIT Roorkee: Water, Rural & Urban, Environment
  ('30000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-00000000000A'),
  ('30000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000007'),
  -- IIT Guwahati: Environment, Energy
  ('30000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000007'),
  ('30000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000008'),
  -- NIT Trichy: Transportation, Employment
  ('30000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000005'),
  ('30000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-00000000000B'),
  -- IIT (BHU) Varanasi: Healthcare, Tourism
  ('30000000-0000-4000-8000-00000000000A', '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-00000000000A', '00000000-0000-4000-8000-00000000000C'),
  -- Anna University: Education, Employment
  ('30000000-0000-4000-8000-00000000000B', '00000000-0000-4000-8000-000000000004'),
  ('30000000-0000-4000-8000-00000000000B', '00000000-0000-4000-8000-00000000000B'),
  -- DTU: Digital, Public Safety
  ('30000000-0000-4000-8000-00000000000C', '00000000-0000-4000-8000-000000000009'),
  ('30000000-0000-4000-8000-00000000000C', '00000000-0000-4000-8000-000000000006'),
  -- Punjab Agricultural University: Agriculture & Food
  ('30000000-0000-4000-8000-00000000000D', '00000000-0000-4000-8000-000000000002'),
  -- IITTM: Tourism & Culture
  ('30000000-0000-4000-8000-00000000000E', '00000000-0000-4000-8000-00000000000C'),
  -- TISS: Employment, Education
  ('30000000-0000-4000-8000-00000000000F', '00000000-0000-4000-8000-00000000000B'),
  ('30000000-0000-4000-8000-00000000000F', '00000000-0000-4000-8000-000000000004'),
  -- GTU: Employment, Rural & Urban
  ('30000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-00000000000B'),
  ('30000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-00000000000A')
ON CONFLICT DO NOTHING;
