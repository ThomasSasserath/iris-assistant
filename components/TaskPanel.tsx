"use client";

import { useState } from "react";
import { type Task, type DelegatedTask, type Note, type User, type Priority } from "@/lib/types";

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "text-iris-high",
  medium: "text-iris-medium",
  low: "text-iris-low",
};

const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-iris-high",
  medium: "bg-iris-medium",
  low: "bg-iris-low",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

interface Props {
  user: User;
  tasks: Task[];
  notes: Note[];
  delegatedIncoming: DelegatedTask[];
  delegatedOutgoing: DelegatedTask[];
  onCompleteTask: (id: string) => void;
  onCompleteDelegated: (id: string) => void;
  onLogout: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "heute";
  if (diff === 1) return "morgen";
  if (diff === -1) return "gestern";
  if (diff < 0) return `${Math.abs(diff)}d überfällig`;
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return iso < new Date().toISOString().split("T")[0];
}

type Tab = "tasks" | "notes";

export default function TaskPanel({
  user,
  tasks,
  notes,
  delegatedIncoming,
  delegatedOutgoing,
  onCompleteTask,
  onCompleteDelegated,
  onLogout,
}: Props) {
  const [tab, setTab] = useState<Tab>("tasks");
  const openTasks = tasks.filter((t) => t.status === "open");
  const userName = user === "thomas" ? "Thomas" : "Beate";
  const otherName = user === "thomas" ? "Beate" : "Thomas";

  const recentDone = delegatedOutgoing
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    .slice(0, 3);

  return (
    <div className="flex h-full w-72 flex-col border-l border-iris-border bg-iris-surface">
      {/* Header */}
      <div className="border-b border-iris-border px-4 pt-3 pb-0">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-iris-muted">{userName}</div>
          <button onClick={onLogout} className="text-xs text-iris-muted hover:text-iris-text transition-colors">
            Wechseln
          </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-3">
          <button
            onClick={() => setTab("tasks")}
            className={`pb-2 text-xs font-medium border-b-2 transition-colors ${tab === "tasks" ? "border-iris-accent text-iris-accent" : "border-transparent text-iris-muted hover:text-iris-text"}`}
          >
            Aufgaben {openTasks.length > 0 && <span className="ml-1 rounded-full bg-iris-border px-1.5 py-0.5 text-iris-subtext">{openTasks.length}</span>}
          </button>
          <button
            onClick={() => setTab("notes")}
            className={`pb-2 text-xs font-medium border-b-2 transition-colors ${tab === "notes" ? "border-iris-accent text-iris-accent" : "border-transparent text-iris-muted hover:text-iris-text"}`}
          >
            Notizen {notes.length > 0 && <span className="ml-1 rounded-full bg-iris-border px-1.5 py-0.5 text-iris-subtext">{notes.length}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">

        {/* ── Notizen-Tab ── */}
        {tab === "notes" && (
          <section>
            {notes.length === 0 ? (
              <p className="text-xs text-iris-muted py-1">Noch keine Notizen.</p>
            ) : (
              <ul className="space-y-2">
                {notes.slice(0, 30).map((note) => (
                  <li key={note.id} className="rounded-lg bg-iris-bg/60 px-3 py-2">
                    <p className="text-xs text-iris-text leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-iris-muted">
                        {new Date(note.createdAt).toLocaleDateString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {note.projectContext && (
                        <span className="text-[10px] text-iris-accent/70">· {note.projectContext}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── Aufgaben-Tab ── */}
        {tab === "tasks" && <>
        {/* Open Tasks */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-iris-muted">
              Offen
            </span>
            {openTasks.length > 0 && (
              <span className="rounded-full bg-iris-border px-1.5 py-0.5 text-xs text-iris-subtext">
                {openTasks.length}
              </span>
            )}
          </div>

          {openTasks.length === 0 ? (
            <p className="text-xs text-iris-muted py-1">Keine offenen Aufgaben.</p>
          ) : (
            <ul className="space-y-1.5">
              {openTasks.map((task) => (
                <li
                  key={task.id}
                  className="group flex items-start gap-2 rounded-lg p-2 hover:bg-iris-bg/60 transition-colors"
                >
                  <button
                    onClick={() => onCompleteTask(task.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border border-iris-border hover:border-iris-accent hover:bg-iris-accent/10 transition-colors"
                    title="Als erledigt markieren"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                      <span className="text-xs text-iris-text leading-relaxed">{task.title}</span>
                    </div>
                    {task.dueDate && (
                      <span className={`text-xs ${isOverdue(task.dueDate) ? "text-iris-high font-medium" : "text-iris-muted"}`}>
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                    {task.recurrence && (
                      <span className="text-xs text-iris-muted"> · {task.recurrence === "weekly" ? "wöchentl." : task.recurrence === "monthly" ? "monatl." : "quartalsw."}</span>
                    )}
                    {task.projectContext && (
                      <span className="text-xs text-iris-accent/70"> · {task.projectContext}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Delegated Tasks incoming */}
        {delegatedIncoming.length > 0 && (
          <section>
            <div className="mb-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-iris-muted">
                Von {otherName}
              </span>
            </div>
            <ul className="space-y-1.5">
              {delegatedIncoming.map((task) => (
                <li
                  key={task.id}
                  className="group flex items-start gap-2 rounded-lg border border-iris-accent/20 bg-iris-accent/5 p-2"
                >
                  <button
                    onClick={() => onCompleteDelegated(task.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border border-iris-accent/40 hover:border-iris-accent hover:bg-iris-accent/10 transition-colors"
                    title="Als erledigt markieren"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                      <span className="text-xs text-iris-text">{task.title}</span>
                    </div>
                    {task.dueDate && (
                      <span className={`text-xs ${isOverdue(task.dueDate) ? "text-iris-high font-medium" : "text-iris-muted"}`}>
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Recently completed delegated tasks */}
        {recentDone.length > 0 && (
          <section>
            <div className="mb-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-iris-muted">
                Erledigt von {otherName}
              </span>
            </div>
            <ul className="space-y-1">
              {recentDone.map((task) => (
                <li key={task.id} className="flex items-center gap-2 px-1 py-0.5">
                  <svg className="h-3.5 w-3.5 shrink-0 text-iris-done" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-xs text-iris-muted line-through">{task.title}</span>
                  {task.completedAt && (
                    <span className="ml-auto text-xs text-iris-muted shrink-0">
                      {new Date(task.completedAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        </>}
      </div>

      {/* Stats footer */}
      <div className="border-t border-iris-border px-4 py-2.5">
        <div className="flex items-center gap-3 text-xs text-iris-muted">
          <span>{openTasks.length} offen</span>
          {openTasks.filter((t) => isOverdue(t.dueDate)).length > 0 && (
            <>
              <span>·</span>
              <span className="text-iris-high font-medium">
                {openTasks.filter((t) => isOverdue(t.dueDate)).length} überfällig
              </span>
            </>
          )}
          {delegatedIncoming.length > 0 && (
            <>
              <span>·</span>
              <span className="text-iris-accent">{delegatedIncoming.length} delegiert</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
