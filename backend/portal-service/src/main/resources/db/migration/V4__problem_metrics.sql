ALTER TABLE published_problem
ADD COLUMN velocity_index INTEGER,
ADD COLUMN velocity_history JSONB,
ADD COLUMN prize_pool INTEGER,
ADD COLUMN teams_active INTEGER;
