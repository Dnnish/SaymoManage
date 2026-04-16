CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX actuaciones_name_trgm_idx ON actuaciones USING gin (name gin_trgm_ops);
