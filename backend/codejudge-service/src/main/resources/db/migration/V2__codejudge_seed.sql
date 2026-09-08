-- V2: codejudge-service seed data (sih_codejudge database).
--
-- The eight evaluation categories (weight = max_score, summing to 100) and the
-- default scoring policy. All weight/rule changes are data changes — insert a
-- new scoring version / edit rows, never redeploy-with-new-logic.

INSERT INTO evaluation_category (category_key, name, description, max_score, weight, sort_order, active) VALUES
    ('PROBLEM_ALIGNMENT', 'Problem Statement Alignment',
     'Requirement matching + evidence that the submitted project satisfies the stated problem.', 25, 25, 1, TRUE),
    ('FUNCTIONAL', 'Functional Implementation',
     'Build/run evidence + functional/API tests of the working system.', 25, 25, 2, TRUE),
    ('ENGINEERING', 'Engineering / Code Quality',
     'agentic-legibility engineering evidence: bootstrap, entry points, code quality.', 15, 15, 3, TRUE),
    ('ARCHITECTURE', 'Architecture',
     'Modularity, layering, structure and separation of concerns.', 10, 10, 4, TRUE),
    ('TESTING', 'Testing',
     'Test-suite presence/configuration and validation signals.', 10, 10, 5, TRUE),
    ('INNOVATION', 'Innovation',
     'Idea/approach quality (advisory — human-curable).', 5, 5, 6, TRUE),
    ('SECURITY', 'Security',
     'Secrets/SAST findings, .gitignore, dependency-update hygiene.', 5, 5, 7, TRUE),
    ('DOCUMENTATION', 'Documentation',
     'README, setup instructions, API docs, contributing guides.', 5, 5, 8, TRUE);

INSERT INTO evaluation_policy (rule_key, description, severity, action, amount, active) VALUES
    ('CRITICAL_SECURITY_BLOCK',
     'A CRITICAL security finding (e.g. a committed private key) blocks the evaluation into a BLOCKED verdict.',
     'CRITICAL', 'BLOCK', 1, TRUE),
    ('HIGH_SECURITY_PENALTY',
     'Each HIGH security finding subtracts this many points from the Security category (never below 0).',
     'HIGH', 'PENALTY', 3, TRUE),
    ('PASSING_SCORE',
     'Report-only passing bar (the human evaluator owns accept/return).',
     NULL, 'NONE', 40, TRUE);
