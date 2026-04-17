-- IRIS Neumann · Datenbankschema Phase 1
-- Ausführen in Supabase SQL Editor oder via Supabase CLI: supabase db push

-- -------------------------------------------------------------------------
-- Aufgaben (privat pro Nutzer)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL CHECK (user_id IN ('thomas', 'beate')),
  title        TEXT NOT NULL,
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  due_date     DATE,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  project_context TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_status ON tasks (user_id, status);

-- -------------------------------------------------------------------------
-- Notizen (privat pro Nutzer)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL CHECK (user_id IN ('thomas', 'beate')),
  content         TEXT NOT NULL,
  project_context TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_user ON notes (user_id, created_at DESC);

-- -------------------------------------------------------------------------
-- Projektkontexte (privat pro Nutzer)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL CHECK (user_id IN ('thomas', 'beate')),
  name       TEXT NOT NULL,
  summary    TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- -------------------------------------------------------------------------
-- Delegierte Aufgaben (geteilt zwischen Thomas und Beate)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delegated_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user    TEXT NOT NULL CHECK (from_user IN ('thomas', 'beate')),
  to_user      TEXT NOT NULL CHECK (to_user IN ('thomas', 'beate')),
  title        TEXT NOT NULL,
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  due_date     DATE,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_delegated_to ON delegated_tasks (to_user, status);
CREATE INDEX idx_delegated_from ON delegated_tasks (from_user);

-- -------------------------------------------------------------------------
-- updated_at automatisch setzen
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER delegated_tasks_updated_at
  BEFORE UPDATE ON delegated_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
