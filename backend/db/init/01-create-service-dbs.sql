-- Create the per-service databases on a FRESH postgres data volume.
-- (Existing dev volumes are unaffected — docker-entrypoint-initdb.d only runs on
-- first init; create the DBs manually there, or recreate the volume.)
CREATE DATABASE sih_eval;
CREATE DATABASE sih_problem;
CREATE DATABASE sih_source;
CREATE DATABASE sih_portal;
CREATE DATABASE sih_codejudge;
