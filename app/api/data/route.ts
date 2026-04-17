// GET /api/data?user=thomas
// Lädt alle privaten Daten + delegierte Aufgaben in einem Request.
// Wird beim App-Start und nach jeder Aktion aufgerufen.

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import type { User } from "@/lib/types";

function validateUser(req: NextRequest): User | null {
  const user = req.nextUrl.searchParams.get("user");
  if (user === "thomas" || user === "beate") return user;
  return null;
}

export async function GET(req: NextRequest) {
  const user = validateUser(req);
  if (!user) return NextResponse.json({ error: "Ungültiger Nutzer" }, { status: 400 });

  try {
  const [tasks, notes, projects, delegatedIn, delegatedOut] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user)
      .order("created_at", { ascending: false }),

    supabase
      .from("notes")
      .select("*")
      .eq("user_id", user)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("projects")
      .select("*")
      .eq("user_id", user)
      .order("updated_at", { ascending: false }),

    supabase
      .from("delegated_tasks")
      .select("*")
      .eq("to_user", user)
      .eq("status", "open")
      .order("created_at", { ascending: false }),

    supabase
      .from("delegated_tasks")
      .select("*")
      .eq("from_user", user)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const errors = [tasks, notes, projects, delegatedIn, delegatedOut]
    .map((r) => r.error?.message)
    .filter(Boolean);

  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0] }, { status: 500 });
  }

  return NextResponse.json({
    tasks: tasks.data ?? [],
    notes: notes.data ?? [],
    projects: projects.data ?? [],
    delegatedIncoming: delegatedIn.data ?? [],
    delegatedOutgoing: delegatedOut.data ?? [],
  });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
