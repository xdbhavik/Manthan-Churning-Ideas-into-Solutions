ALTER TABLE submission
    ADD COLUMN project_details JSONB NOT NULL DEFAULT '{}'::jsonb;
