// Server-seitige Datenfunktionen für Teams Bot und andere Server-Kontexte.
// Ruft Supabase direkt ab (kein HTTP-Umweg über API-Routen).

import { supabase } from "./supabase-server";
import type { User, Task, Note, ProjectContext, DelegatedTask } from "./types";

export interface AllDataServer {
  tasks: Task[];
  notes: Note[];
  projects: ProjectContext[];
  delegatedIncoming: DelegatedTask[];
  delegatedOutgoing: DelegatedTask[];
}

function mapTask(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    title: r.title as string,
    priority: r.priority as Task["priority"],
    status: r.status as Task["status"],
    dueDate: r.due_date as string | null,
    recurrence: (r.recurrence ?? null) as Task["recurrence"],
    projectContext: r.project_context as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapNote(r: Record<string, unknown>): Note {
  return {
    id: r.id as string,
    content: r.content as string,
    projectContext: r.project_context as string | undefined,
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
    title: r.title as string,
    priority: r.priority as DelegatedTask["priority"],
    status: r.status as DelegatedTask["status"],
    from: r.from_user as User,
    to: r.to_user as User,
    dueDate: r.due_date as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

// Pure Funktion – kein API-Call, server-kompatibel
export function buildContextSummaryServer(user: User, data: AllDataServer): string {
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
      const status = t.status === "done" ? `✓ erledigt` : "offen";
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

export async function fetchAllDataServer(user: User): Promise<AllDataServer> {
  const [tasks, notes, projects, delegatedIn, delegatedOut] = await Promise.all([
    supabase.from("tasks").select("*").eq("user_id", user).order("created_at", { ascending: false }),
    supabase.from("notes").select("*").eq("user_id", user).order("created_at", { ascending: false }).limit(50),
    supabase.from("projects").select("*").eq("user_id", user).order("updated_at", { ascending: false }),
    supabase.from("delegated_tasks").select("*").eq("to_user", user).eq("status", "open").order("created_at", { ascending: false }),
    supabase.from("delegated_tasks").select("*").eq("from_user", user).order("created_at", { ascending: false }).limit(20),
  ]);

  return {
    tasks: (tasks.data ?? []).map(mapTask),
    notes: (notes.data ?? []).map(mapNote),
    projects: (projects.data ?? []).map(mapProject),
    delegatedIncoming: (delegatedIn.data ?? []).map(mapDelegated),
    delegatedOutgoing: (delegatedOut.data ?? []).map(mapDelegated),
  };
}
