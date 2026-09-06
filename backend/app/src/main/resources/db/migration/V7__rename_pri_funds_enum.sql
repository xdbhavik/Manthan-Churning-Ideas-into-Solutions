-- V7: PRI funds-source enum value rename.
-- '15TH_FC' (per docs 06) cannot be a Java enum constant (leading digit), and
-- PRISource.funds_source is bound via native enum name. Rename keeps the same
-- domain value with a Java-legal spelling; done as a separate migration because
-- V2 (which created the type) is already applied.
-- Re-application is made idempotent: only rename when the old label still exists.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'pri_funds_source' AND e.enumlabel = '15TH_FC'
    ) THEN
        ALTER TYPE pri_funds_source RENAME VALUE '15TH_FC' TO 'FIFTEEN_FC';
    END IF;
END $$;