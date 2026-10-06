CREATE TABLE project_review_scorecard (
    project_review_id UUID PRIMARY KEY REFERENCES project_review (project_review_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED')),
    criteria_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    overall_remarks TEXT,
    total_score INT NOT NULL DEFAULT 0,
    max_score INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ
);
