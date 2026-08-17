CREATE TABLE IF NOT EXISTS custom_tables (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    scope TEXT NOT NULL DEFAULT 'app' CHECK (scope IN ('app', 'guild')),
    schema JSONB NOT NULL DEFAULT '{"columns": []}'::jsonb,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE (app_id, name)
);

CREATE INDEX IF NOT EXISTS custom_tables_app_id
    ON custom_tables (app_id);

CREATE TABLE IF NOT EXISTS custom_table_rows (
    id UUID PRIMARY KEY,
    table_id TEXT NOT NULL REFERENCES custom_tables(id) ON DELETE CASCADE,
    scope_id TEXT NOT NULL DEFAULT '',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS custom_table_rows_table_scope_created
    ON custom_table_rows (table_id, scope_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS custom_table_rows_data_gin
    ON custom_table_rows USING GIN (data jsonb_path_ops);

-- JSONB cannot express dynamic per-column UNIQUE constraints without creating
-- DDL for every user table. This projection gives each schema-level unique
-- column a real PostgreSQL uniqueness guarantee.
CREATE TABLE IF NOT EXISTS custom_table_unique_values (
    table_id TEXT NOT NULL REFERENCES custom_tables(id) ON DELETE CASCADE,
    scope_id TEXT NOT NULL DEFAULT '',
    column_id TEXT NOT NULL,
    value_hash TEXT NOT NULL,
    row_id UUID NOT NULL REFERENCES custom_table_rows(id) ON DELETE CASCADE,
    PRIMARY KEY (table_id, scope_id, column_id, value_hash),
    UNIQUE (row_id, column_id)
);

CREATE INDEX IF NOT EXISTS custom_table_unique_values_row
    ON custom_table_unique_values (row_id);
