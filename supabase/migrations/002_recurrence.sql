-- IRIS Neumann · Migration 002: Wiederkehrende Aufgaben
-- Im Supabase SQL Editor ausführen

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence TEXT
    CHECK (recurrence IN ('weekly', 'monthly', 'quarterly'));
