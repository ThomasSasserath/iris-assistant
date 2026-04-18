"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";

interface Props {
  tasks: Task[];
  onCompleteTask: (id: string) => Promise<void>;
}

function formatDue(due: string | null): { text: string; color: string } | null {
  if (!due) return null;
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  if (due < today) return { text: "Überfällig", color: "text-iris-high" };
  if (due === today) return { text: "Heute", color: "text-amber-400" };
  if (due === tomorrow) return { text: "Morgen", color: "text-iris-accent" };
  return {
    text: new Date(due + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
    color: "text-iris-muted",
  };
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-iris-high",
  medium: "bg-iris-medium",
  low: "bg-iris-low",
};

const RECURRENCE_LABEL: Record<string, string> = {
  weekly: "wöchentl.",
  monthly: "monatl.",
  quarterly: "quartalsw.",
  daily: "täglich",
};

export default function PlannerView({ tasks, onCompleteTask }: Props) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const openTasks = tasks
    .filter((t) => t.status === "open")
    .sort((a, b) => {
      const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  const doneTasks = tasks.filter((t) => t.status === "done").slice(0, 20);

  async function handleComplete(id: string) {
    setCompleting(id);
    try {
      await onCompleteTask(id);
    } finally {
      setCompleting(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-5 space-y-2">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-iris-text uppercase tracking-widest">
            Aufgaben
          </h2>
          {openTasks.length > 0 && (
            <span className="rounded-full bg-iris-accent/15 px-2 py-0.5 text-xs font-semibold text-iris-accent">
              {openTasks.length} offen
            </span>
          )}
        </div>

        {/* Open tasks */}
        {openTasks.length === 0 ? (
          <div className="rounded-xl border border-iris-border bg-iris-surface/40 py-12 text-center">
            <p className="text-sm text-iris-muted">Keine offenen Aufgaben.</p>
            <p className="mt-1 text-xs text-iris-muted/60">Sag Iris was zu tun ist.</p>
          </div>
        ) : (
          openTasks.map((task) => {
            const due = formatDue(task.dueDate ?? null);
            const isCompleting = completing === task.id;
            return (
              <div
                key={task.id}
                className="group flex items-start gap-3 rounded-xl border border-iris-border bg-iris-surface px-4 py-3 transition-colors hover:border-iris-accent/30"
              >
                {/* Complete button */}
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={isCompleting}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-iris-border text-transparent transition-colors hover:border-iris-done hover:text-iris-done disabled:opacity-40"
                  title="Als erledigt markieren"
                >
                  {isCompleting ? (
                    <span className="h-2.5 w-2.5 rounded-full border border-iris-muted border-t-transparent animate-spin" />
                  ) : (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority] ?? "bg-iris-muted"}`} />
                    <span className="text-sm text-iris-text leading-snug">{task.title}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {due && (
                      <span className={`text-xs font-medium ${due.color}`}>{due.text}</span>
                    )}
                    {task.recurrence && RECURRENCE_LABEL[task.recurrence] && (
                      <span className="rounded bg-iris-border px-1.5 py-0.5 text-[10px] text-iris-subtext">
                        ↻ {RECURRENCE_LABEL[task.recurrence]}
                      </span>
                    )}
                    {task.projectContext && (
                      <span className="text-[10px] text-iris-accent/70">· {task.projectContext}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Done tasks (collapsible) */}
        {doneTasks.length > 0 && (
          <div className="pt-4">
            <button
              onClick={() => setShowDone((v) => !v)}
              className="flex w-full items-center gap-2 text-xs text-iris-muted hover:text-iris-subtext transition-colors"
            >
              <svg
                className={`h-3 w-3 transition-transform ${showDone ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Erledigt ({doneTasks.length})
            </button>
            {showDone && (
              <div className="mt-2 space-y-1.5">
                {doneTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg px-4 py-2.5 opacity-50"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-iris-done/20 text-iris-done">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-iris-muted line-through">{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
