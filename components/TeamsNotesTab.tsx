"use client";

import { useEffect, useState } from "react";
import type { User, Note } from "@/lib/types";

export default function TeamsNotesTab() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initTeams();
  }, []);

  async function initTeams() {
    try {
      const { app } = await import("@microsoft/teams-js");
      await app.initialize();
      const context = await app.getContext();
      const aadId = context.user?.id;

      let user: User | null = null;
      // Env-Var Fallback
      if (aadId === process.env.NEXT_PUBLIC_TEAMS_AAD_ID_THOMAS) user = "thomas";
      else if (aadId === process.env.NEXT_PUBLIC_TEAMS_AAD_ID_BEATE) user = "beate";

      // API-Fallback
      if (!user && aadId) {
        const res = await fetch(`/api/teams/user?aadId=${aadId}`);
        if (res.ok) {
          const data = await res.json();
          user = data.user;
        }
      }

      if (!user) {
        setError(`Unbekannter Teams-User.\nAAD ID: ${aadId}`);
        setLoading(false);
        return;
      }

      await loadNotes(user);
    } catch {
      // Außerhalb Teams – localStorage Fallback
      const stored = localStorage.getItem("iris_current_user") as User | null;
      if (stored === "thomas" || stored === "beate") {
        await loadNotes(stored);
      } else {
        setError("Nicht in Teams geöffnet.");
        setLoading(false);
      }
    }
  }

  async function loadNotes(user: User) {
    try {
      const res = await fetch(`/api/data?user=${user}`);
      const data = await res.json();
      const sorted = (data.notes ?? []).sort(
        (a: Note, b: Note) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotes(sorted);
    } catch {
      setError("Notizen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-iris-bg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-iris-bg p-8 text-center">
        <p className="whitespace-pre-line text-sm text-iris-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-iris-bg text-iris-text">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-iris-border px-4 py-3 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-iris-accent/15 text-iris-accent text-xs font-semibold">I</div>
        <span className="text-sm font-semibold">Notizen</span>
        {notes.length > 0 && (
          <span className="ml-1 rounded-full bg-iris-border px-2 py-0.5 text-xs text-iris-subtext">{notes.length}</span>
        )}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-iris-muted">Noch keine Notizen.</p>
            <p className="mt-1 text-xs text-iris-muted/60">Sag Iris im Chat „Notiz: ..."</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="rounded-xl border border-iris-border bg-iris-surface px-4 py-3">
              <p className="text-sm text-iris-text leading-relaxed whitespace-pre-wrap">{note.content}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-iris-muted">
                  {new Date(note.createdAt).toLocaleDateString("de-DE", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                {note.projectContext && (
                  <span className="text-[10px] text-iris-accent/70">· {note.projectContext}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
