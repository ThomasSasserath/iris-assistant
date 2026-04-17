-- Teams Bot: Mapping von Teams-User (AAD Object ID) zu Iris-User (thomas/beate)
-- + ConversationReference für proaktive Nachrichten (Erinnerungen)

CREATE TABLE IF NOT EXISTS teams_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL CHECK (user_id IN ('thomas', 'beate')),
  teams_aad_id TEXT UNIQUE NOT NULL,        -- aadObjectId aus Teams Activity
  teams_user_id TEXT,                        -- Teams interne User-ID (zum Matching)
  service_url TEXT,                          -- z.B. https://smba.trafficmanager.net/...
  conversation_reference JSONB,              -- für proaktive Nachrichten
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_users_aad_id ON teams_users(teams_aad_id);
CREATE INDEX IF NOT EXISTS idx_teams_users_user_id ON teams_users(user_id);

-- Trigger für updated_at
CREATE TRIGGER set_teams_users_updated_at
  BEFORE UPDATE ON teams_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
