-- V4: the 4th ProblemAccessRule value, AUTO_SELECTED_UNIVERSITIES.
--
-- Deliberately ALONE in its own migration. PostgreSQL 12+ allows
-- ALTER TYPE ... ADD VALUE inside a transaction block (so Flyway accepts it),
-- but the new value cannot be USED in that same transaction -- any reference
-- raises "unsafe use of new value ... of enum type". Flyway commits between
-- versioned migrations, so from V5 onward the value is usable normally.
--
-- The candidate universities this rule routes to are seeded by V5.
ALTER TYPE problem_access_rule ADD VALUE IF NOT EXISTS 'AUTO_SELECTED_UNIVERSITIES';
