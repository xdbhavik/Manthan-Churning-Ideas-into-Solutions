ALTER TABLE submission
    ADD COLUMN review_scorecard JSONB NOT NULL DEFAULT '{}'::jsonb;
