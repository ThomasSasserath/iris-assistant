"use client";

import { useEffect, useState } from "react";
import type { User, Task, Note } from "@/lib/types";
import { fetchAllData } from "@/lib/storage";

type Tab = "tasks" | "notes";

export default function TeamsTabClient() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tab, setTab] = useState<Tab>("tasks");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initTeams();
  }, []);

  async function initTeams() {
    try {
      // Teams JS SDK laden
      const { app } = await import("@microsoft/teams-js");
      await app.initialize();
      const context = await app.getContext();

      const aadId = context.user?.id;
      const thomasId = process.env.NEXT_PUBLIC_TEAMS_AAD_ID_THOMAS;
      const beateId = process.env.NEXT_PUBLIC_TEAMS_AAD_ID_BEATE;

      let resolvedUser: User | null = null;
      if (aadId && thomasId && aadId === thomasId) resolvedUser = "thomas";
      else if (aadId && beateId && aadId === beateId) resolvedUser = "beate";

      if (!resolvedUser) {
        // Fallback: User aus DB über API abfragen
        const res = await fetch(`/api/teams/user?aadId=${aadId}`);
        if (res.ok) {
          const data = await res.json();
          resolvedUser = data.user;
        }
      }

      if (!resolvedUser) {
        setError(`Unbekannter Teams-User.\nAAD ID: ${aadId}`);
        setLoading(false);
        return;
      }

      setUser(resolvedUser);
      await loadData(resolvedUser);
    } catch {
      // Außerhalb Teams (z.B. normaler Browser) – Fallback auf localStorage
      const stored = localStorage.getItem("iris_user") as User | null;
      if (stored === "thomas" || stored === "beate") {
        setUser(stored);
        await loadData(stored);
      } else {
        setError("Nicht in Teams geöffnet und kein User gespeichert.");
        setLoading(false);
      }
    }
  }

  async function loadData(u: User) {
    try {
      const data = await fetchAllData(u);
      setTasks(data.tasks.filter((t) => t.status === "open"));
      setNotes(data.notes);
    } catch (e) {
      setError("Daten konnten nicht geladen werden.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  function priorityDot(p: Task["priority"]) {
    return p === "high" ? "🔴" : p === "medium" ? "🟡" : "🟢";
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-iris-bg text-iris-muted">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
          <p>Iris lädt…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-iris-bg p-8 text-center text-iris-muted">
        <p className="whitespace-pre-line">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-iris-bg text-iris-text">
      {/* Header */}
      <div className="border-b border-iris-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-iris-accent text-xs font-bold text-white">
            I
          </div>
          <span className="font-semibold text-iris-text">Iris</span>
          <span className="ml-auto text-xs text-iris-muted capitalize">{user}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-iris-border">
        <button
          onClick={() => setTab("tasks")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === "tasks"
              ? "border-b-2 border-iris-accent text-iris-accent"
              : "text-iris-muted hover:text-iris-text"
          }`}
        >
          Aufgaben ({tasks.length})
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === "notes"
              ? "border-b-2 border-iris-accent text-iris-accent"
              : "text-iris-muted hover:text-iris-text"
          }`}
        >
          Notizen ({notes.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "tasks" && (
          <div className="space-y-2">
            {tasks.length === 0 && (
              <p className="text-center text-iris-muted py-8">Keine offenen Aufgaben</p>
            )}
            {tasks.map((t) => {
              const overdue = t.dueDate && t.dueDate < today;
              return (
                <div
                  key={t.id}
                  className={`rounded-lg border p-3 ${
                    overdue
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-iris-border bg-iris-surface"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-xs">{priorityDot(t.priority)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-iris-text">{t.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-iris-muted">
                        {t.dueDate && (
                          <span className={overdue ? "text-red-400 font-medium" : ""}>
                            {overdue ? "⚠ " : ""}fällig: {t.dueDate}
                          </span>
                        )}
                        {t.projectContext && (
                          <span className="text-iris-accent/70">{t.projectContext}</span>
                        )}
                        {t.recurrence && (
                          <span className="rounded bg-iris-accent/10 px-1.5 py-0.5 text-iris-accent">
                            {t.recurrence}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-2">
            {notes.length === 0 && (
              <p className="text-center text-iris-muted py-8">Keine Notizen</p>
            )}
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-iris-border bg-iris-surface p-3">
                <p className="text-sm text-iris-text">{n.content}</p>
                <div className="mt-1.5 flex gap-2 text-xs text-iris-muted">
                  <span>{new Date(n.createdAt).toLocaleDateString("de-DE")}</span>
                  {n.projectContext && (
                    <span className="text-iris-accent/70">{n.projectContext}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="border-t border-iris-border p-3">
        <button
          onClick={() => user && loadData(user)}
          className="w-full rounded-lg bg-iris-surface py-2 text-sm text-iris-muted hover:text-iris-text transition-colors"
        >
          ↻ Aktualisieren
        </button>
      </div>
    </div>
  );
}
