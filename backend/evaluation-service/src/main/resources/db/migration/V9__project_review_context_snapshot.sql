ALTER TABLE project_review
    ADD COLUMN context JSONB NOT NULL DEFAULT '{}'::jsonb;
