-- Wodify <-> GoHighLevel sync tables
-- Maps contacts between Wodify (gym management) and GHL (CRM)
-- Used by api/sync-leads.js and api/sync-members.js

-- Contact mapping table
CREATE TABLE sync_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    phone TEXT,
    wodify_lead_id TEXT,
    wodify_client_id TEXT,
    ghl_contact_id TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('wodify', 'ghl', 'website')),
    data_hash TEXT,
    first_synced_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (ghl_contact_id)
);

CREATE UNIQUE INDEX idx_sync_email ON sync_contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_sync_wodify_lead ON sync_contacts(wodify_lead_id);
CREATE INDEX idx_sync_wodify_client ON sync_contacts(wodify_client_id);

-- Sync run audit log
CREATE TABLE sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running',
    records_processed INT DEFAULT 0,
    records_created INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    error_message TEXT
);

-- RLS policies (service role only - these are called from serverless functions)
ALTER TABLE sync_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on sync_contacts"
    ON sync_contacts FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on sync_log"
    ON sync_log FOR ALL
    USING (auth.role() = 'service_role');
