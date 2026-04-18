"use client";

import type { Note } from "@/lib/types";

interface Props {
  notes: Note[];
}

export default function NotesView({ notes }: Props) {
  const sorted = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-iris-text uppercase tracking-widest">
            Notizen
          </h2>
          {notes.length > 0 && (
            <span className="rounded-full bg-iris-surface px-2 py-0.5 text-xs text-iris-subtext border border-iris-border">
              {notes.length}
            </span>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-xl border border-iris-border bg-iris-surface/40 py-12 text-center">
            <p className="text-sm text-iris-muted">Noch keine Notizen.</p>
            <p className="mt-1 text-xs text-iris-muted/60">Sag Iris „Notiz: ..." um etwas festzuhalten.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((note) => (
              <div
                key={note.id}
                className="rounded-xl border border-iris-border bg-iris-surface px-4 py-3 transition-colors hover:border-iris-accent/20"
              >
                <p className="text-sm text-iris-text leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-iris-muted">
                    {new Date(note.createdAt).toLocaleDateString("de-DE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {note.projectContext && (
                    <span className="text-[10px] text-iris-accent/70">· {note.projectContext}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
