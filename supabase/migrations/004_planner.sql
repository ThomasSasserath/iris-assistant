-- Planner Task ID pro Iris-Aufgabe (für Sync)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planner_id TEXT;
