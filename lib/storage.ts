"use client";

// Storage-Layer: dünner Client, der Next.js API-Routen aufruft.
// Kein Supabase-Client hier, kein Service-Key im Browser.

import type { User, Task, Note, DelegatedTask, ProjectContext, Priority, Recurrence } from "./types";

// ---------------------------------------------------------------------------
// Typen für den vollen Daten-Load
// ---------------------------------------------------------------------------
export interface AllData {
  tasks: Task[];
  notes: Note[];
  projects: ProjectContext[];
  delegatedIncoming: DelegatedTask[];
  delegatedOutgoing: DelegatedTask[];
}

// ---------------------------------------------------------------------------
// Alle Daten laden (beim App-Start und nach Aktionen)
// ---------------------------------------------------------------------------
export async function fetchAllData(user: User): Promise<AllData> {
  const res = await fetch(`/api/data?user=${user}`);
  if (!res.ok) throw new Error(`Datenladen fehlgeschlagen: ${res.status}`);
  const raw = await res.json();

  // Supabase gibt snake_case zurück → auf camelCase mappen
  return {
    tasks: (raw.tasks ?? []).map(mapTask),
    notes: (raw.notes ?? []).map(mapNote),
    projects: (raw.projects ?? []).map(mapProject),
    delegatedIncoming: (raw.delegatedIncoming ?? []).map(mapDelegated),
    delegatedOutgoing: (raw.delegatedOutgoing ?? []).map(mapDelegated),
  };
}

// ---------------------------------------------------------------------------
// Aufgaben
// ---------------------------------------------------------------------------
export async function addTask(
  user: User,
  task: { title: string; priority: Priority; dueDate: string | null; recurrence?: Recurrence; projectContext?: string }
): Promise<Task> {
  const res = await fetch("/api/data/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, ...task }),
  });
  if (!res.ok) throw new Error(`Aufgabe anlegen fehlgeschlagen: ${res.status}`);
  return mapTask(await res.json());
}

export async function completeTask(user: User, taskId: string, task?: Task): Promise<void> {
  const res = await fetch("/api/data/tasks", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, taskId, action: "complete" }),
  });
  if (!res.ok) throw new Error(`Aufgabe abschließen fehlgeschlagen: ${res.status}`);

  // Wiederkehrende Aufgabe: nächste Instanz automatisch anlegen
  if (task?.recurrence && task.dueDate) {
    const nextDate = calcNextDueDate(task.dueDate, task.recurrence);
    if (nextDate) {
      await addTask(user, {
        title: task.title,
        priority: task.priority,
        dueDate: nextDate,
        recurrence: task.recurrence,
        projectContext: task.projectContext,
      });
    }
  }
}

function calcNextDueDate(currentDue: string, recurrence: NonNullable<Recurrence>): string {
  const d = new Date(currentDue + "T00:00:00");
  switch (recurrence) {
    case "weekly":    d.setDate(d.getDate() + 7); break;
    case "monthly":   d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
  }
  return d.toISOString().split("T")[0];
}

export async function updateTask(
  user: User,
  taskId: string,
  fields: { title?: string; priority?: Priority; dueDate?: string | null; recurrence?: Recurrence; projectContext?: string }
): Promise<void> {
  const res = await fetch("/api/data/tasks", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, taskId, action: "update", ...fields }),
  });
  if (!res.ok) throw new Error(`Aufgabe aktualisieren fehlgeschlagen: ${res.status}`);
}

// ---------------------------------------------------------------------------
// Notizen
// ---------------------------------------------------------------------------
export async function addNote(user: User, content: string, projectContext?: string): Promise<Note> {
  const res = await fetch("/api/data/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, content, projectContext }),
  });
  if (!res.ok) throw new Error(`Notiz ablegen fehlgeschlagen: ${res.status}`);
  return mapNote(await res.json());
}

// ---------------------------------------------------------------------------
// Projektkontexte
// ---------------------------------------------------------------------------
export async function upsertProject(user: User, name: string, summary: string): Promise<ProjectContext> {
  const res = await fetch("/api/data/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, name, summary }),
  });
  if (!res.ok) throw new Error(`Projektkontext speichern fehlgeschlagen: ${res.status}`);
  return mapProject(await res.json());
}

// ---------------------------------------------------------------------------
// Delegation
// ---------------------------------------------------------------------------
export async function delegateTask(
  from: User,
  to: User,
  title: string,
  priority: Priority,
  dueDate: string | null
): Promise<DelegatedTask> {
  const res = await fetch("/api/data/delegation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, title, priority, dueDate }),
  });
  if (!res.ok) throw new Error(`Delegation fehlgeschlagen: ${res.status}`);
  return mapDelegated(await res.json());
}

export async function completeDelegatedTask(taskId: string, user: User): Promise<void> {
  const res = await fetch("/api/data/delegation", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, user }),
  });
  if (!res.ok) throw new Error(`Delegierte Aufgabe abschließen fehlgeschlagen: ${res.status}`);
}

// ---------------------------------------------------------------------------
// Kontext-Zusammenfassung für den Iris-Prompt (pure Funktion, kein API-Call)
// ---------------------------------------------------------------------------
export function buildContextSummary(user: User, data: AllData): string {
  const { tasks, notes, projects, delegatedIncoming, delegatedOutgoing } = data;
  const open = tasks.filter((t) => t.status === "open");
  const today = new Date().toISOString().split("T")[0];
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);

  const lines: string[] = [];
  lines.push(`=== AKTUELLER STATUS FÜR ${user.toUpperCase()} ===`);
  lines.push(`Offene Aufgaben: ${open.length}, davon überfällig: ${overdue.length}`);

  if (open.length > 0) {
    lines.push("\nAufgaben (offen):");
    open.slice(0, 20).forEach((t) => {
      const due = t.dueDate ? ` [fällig: ${t.dueDate}]` : "";
      const mark = t.dueDate && t.dueDate < today ? " ⚠ ÜBERFÄLLIG" : "";
      lines.push(`  - [${t.id}] [${t.priority}] ${t.title}${due}${mark}`);
    });
  }

  if (delegatedIncoming.length > 0) {
    lines.push("\nDelegierte Aufgaben (an dich):");
    delegatedIncoming.forEach((t) => {
      const due = t.dueDate ? ` [fällig: ${t.dueDate}]` : "";
      lines.push(`  - [${t.id}] von ${t.from}: ${t.title}${due}`);
    });
  }

  if (delegatedOutgoing.length > 0) {
    lines.push("\nAufgaben delegiert (von dir):");
    delegatedOutgoing.forEach((t) => {
      const status =
        t.status === "done"
          ? `✓ erledigt (${t.completedAt?.split("T")[0]})`
          : "offen";
      lines.push(`  - [${t.id}] an ${t.to}: ${t.title} — ${status}`);
    });
  }

  if (projects.length > 0) {
    lines.push("\nProjektkontexte:");
    projects.slice(0, 10).forEach((p) => {
      lines.push(`  - ${p.name}: ${p.summary}`);
    });
  }

  if (notes.length > 0) {
    lines.push("\nLetzte Notizen:");
    notes.slice(0, 5).forEach((n) => {
      const preview = n.content.substring(0, 80) + (n.content.length > 80 ? "…" : "");
      lines.push(`  - [${n.id}] ${preview}`);
    });
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Mapper: Supabase snake_case → TypeScript camelCase
// ---------------------------------------------------------------------------
function mapTask(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    title: r.title as string,
    priority: r.priority as Priority,
    dueDate: (r.due_date as string | null) ?? null,
    status: r.status as "open" | "done",
    recurrence: (r.recurrence as Recurrence) ?? null,
    projectContext: (r.project_context as string | undefined) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapNote(r: Record<string, unknown>): Note {
  return {
    id: r.id as string,
    content: r.content as string,
    projectContext: (r.project_context as string | undefined) ?? undefined,
    createdAt: r.created_at as string,
  };
}

function mapProject(r: Record<string, unknown>): ProjectContext {
  return {
    id: r.id as string,
    name: r.name as string,
    summary: r.summary as string,
    updatedAt: r.updated_at as string,
  };
}

function mapDelegated(r: Record<string, unknown>): DelegatedTask {
  return {
    id: r.id as string,
    from: r.from_user as User,
    to: r.to_user as User,
    title: r.title as string,
    priority: r.priority as Priority,
    dueDate: (r.due_date as string | null) ?? null,
    status: r.status as "open" | "done",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    completedAt: (r.completed_at as string | undefined) ?? undefined,
  };
}
