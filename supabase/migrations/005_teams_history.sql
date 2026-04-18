-- Gesprächshistorie für Teams Bot (pro Konversation)
CREATE TABLE IF NOT EXISTS teams_conversations (
  id          BIGSERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_conv_id_time
  ON teams_conversations(conversation_id, created_at DESC);
