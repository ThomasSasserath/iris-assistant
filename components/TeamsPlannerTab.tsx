"use client";

import { useEffect, useState } from "react";
import type { User, Task } from "@/lib/types";

function formatDue(due: string | null | undefined): { text: string; color: string } | null {
  if (!due) return null;
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  if (due < today) return { text: "Überfällig", color: "#ef4444" };
  if (due === today) return { text: "Heute", color: "#f59e0b" };
  if (due === tomorrow) return { text: "Morgen", color: "#4a9eff" };
  return {
    text: new Date(due + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
    color: "#6b7280",
  };
}

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6b7280",
};

export default function TeamsPlannerTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => { initTeams(); }, []);

  async function initTeams() {
    try {
      const { app } = await import("@microsoft/teams-js");
      await app.initialize();
      const context = await app.getContext();
      const aadId = context.user?.id;

      let user: User | null = null;
      if (aadId === process.env.NEXT_PUBLIC_TEAMS_AAD_ID_THOMAS) user = "thomas";
      else if (aadId === process.env.NEXT_PUBLIC_TEAMS_AAD_ID_BEATE) user = "beate";

      if (!user && aadId) {
        const res = await fetch(`/api/teams/user?aadId=${aadId}`);
        if (res.ok) user = (await res.json()).user;
      }

      if (!user) { setError(`Unbekannter User. AAD ID: ${aadId}`); setLoading(false); return; }
      await loadTasks(user);
    } catch {
      const stored = localStorage.getItem("iris_current_user") as User | null;
      if (stored === "thomas" || stored === "beate") await loadTasks(stored);
      else { setError("Nicht in Teams geöffnet."); setLoading(false); }
    }
  }

  async function loadTasks(user: User) {
    try {
      const res = await fetch(`/api/data?user=${user}`);
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = (data.tasks ?? []).map((t: any) => ({
        ...t,
        dueDate: t.dueDate ?? t.due_date,
        projectContext: t.projectContext ?? t.project_context,
        createdAt: t.createdAt ?? t.created_at,
      }));
      setTasks(mapped);
    } catch { setError("Aufgaben konnten nicht geladen werden."); }
    finally { setLoading(false); }
  }

  async function completeTask(taskId: string) {
    setCompleting(taskId);
    try {
      const user = tasks.find(t => t.id === taskId) ? "thomas" : null;
      await fetch("/api/data/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: "thomas", taskId, action: "complete" }),
      });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } finally { setCompleting(null); }
  }

  const openTasks = tasks
    .filter(t => t.status === "open")
    .sort((a, b) => {
      const p: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
    });

  if (loading) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #6366f1", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#ffffff", color: "#9ca3af", padding: 24, textAlign: "center" }}>
      <p>{error}</p>
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#ffffff", color: "#1a1a1a", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,0.12)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>I</div>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Aufgaben</span>
        {openTasks.length > 0 && (
          <span style={{ marginLeft: 4, background: "#f3f4f6", color: "#6b7280", borderRadius: 99, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>{openTasks.length}</span>
        )}
        <button onClick={() => { setLoading(true); initTeams(); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16 }}>↻</button>
      </div>

      {/* Tasks */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {openTasks.length === 0 ? (
          <div style={{ textAlign: "center", color: "#9ca3af", paddingTop: 48, fontSize: 14 }}>
            <p>Keine offenen Aufgaben.</p>
          </div>
        ) : openTasks.map(task => {
          const due = formatDue(task.dueDate);
          const isCompleting = completing === task.id;
          return (
            <div key={task.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <button
                onClick={() => completeTask(task.id)}
                disabled={isCompleting}
                style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #d1d5db", background: "none", cursor: "pointer", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {isCompleting && <span style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid #9ca3af", borderTopColor: "transparent", display: "block" }} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[task.priority] ?? "#9ca3af", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "#1a1a1a" }}>{task.title}</span>
                </div>
                {(due || task.projectContext) && (
                  <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {due && <span style={{ fontSize: 11, color: due.color, fontWeight: 500 }}>{due.text}</span>}
                    {task.projectContext && <span style={{ fontSize: 11, color: "rgba(99,102,241,0.7)" }}>· {task.projectContext}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
