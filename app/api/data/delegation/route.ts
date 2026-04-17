// POST  /api/data/delegation → Aufgabe delegieren
// PATCH /api/data/delegation → Delegierte Aufgabe abschließen

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import type { User, Priority } from "@/lib/types";

function isValidUser(u: unknown): u is User {
  return u === "thomas" || u === "beate";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { from, to, title, priority, dueDate } = body as {
    from: User;
    to: User;
    title: string;
    priority: Priority;
    dueDate: string | null;
  };

  if (!isValidUser(from) || !isValidUser(to) || from === to || !title) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("delegated_tasks")
    .insert({
      from_user: from,
      to_user: to,
      title,
      priority: priority ?? "medium",
      due_date: dueDate ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { taskId, user } = body as { taskId: string; user: User };

  if (!isValidUser(user) || !taskId) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  // Nur der Empfänger darf die Aufgabe abschließen
  const { error } = await supabase
    .from("delegated_tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("to_user", user);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
