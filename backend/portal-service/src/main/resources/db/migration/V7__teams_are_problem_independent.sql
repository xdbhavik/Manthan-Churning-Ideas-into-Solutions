-- Teams are reusable groups. A team is linked to a problem only through a submission.
ALTER TABLE team ALTER COLUMN problem_id DROP NOT NULL;
