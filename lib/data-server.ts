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
