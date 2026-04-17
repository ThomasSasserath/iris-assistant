// POST  /api/data/tasks        → Aufgabe anlegen
// PATCH /api/data/tasks        → Aufgabe aktualisieren (Datum, Priorität, Titel) ODER abschließen

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import type { User, Priority } from "@/lib/types";

function isValidUser(u: unknown): u is User {
  return u === "thomas" || u === "beate";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user, title, priority, dueDate, projectContext } = body as {
    user: User;
    title: string;
    priority: Priority;
    dueDate: string | null;
    projectContext?: string;
  };

  if (!isValidUser(user) || !title) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { recurrence } = body as { recurrence?: string | null };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user,
      title,
      priority: priority ?? "medium",
      due_date: dueDate ?? null,
      recurrence: recurrence ?? null,
      project_context: projectContext ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { user, taskId, action, title, priority, dueDate, recurrence, projectContext } = body as {
    user: User;
    taskId: string;
    action?: "complete" | "update";
    title?: string;
    priority?: Priority;
    dueDate?: string | null;
    recurrence?: string | null;
    projectContext?: string;
  };

  if (!isValidUser(user) || !taskId) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  // Aufgabe abschließen
  if (action === "complete" || !action) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "done" })
      .eq("id", taskId)
      .eq("user_id", user);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Aufgabe aktualisieren — nur gesetzte Felder werden überschrieben
  if (action === "update") {
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.due_date = dueDate;
    if (recurrence !== undefined) updates.recurrence = recurrence;
    if (projectContext !== undefined) updates.project_context = projectContext;

    if (Object.keys(updates).length === 0) {
      // Nichts zu tun — kein Fehler, einfach ok zurückgeben
      return NextResponse.json({ ok: true, note: "Keine Änderungen" });
    }

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("user_id", user);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
