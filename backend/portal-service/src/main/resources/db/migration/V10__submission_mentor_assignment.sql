ALTER TABLE submission
    ADD COLUMN mentor_assignment JSONB NOT NULL DEFAULT '{}'::jsonb;
