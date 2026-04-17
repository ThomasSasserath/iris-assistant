// POST /api/data/notes → Notiz ablegen

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import type { User } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user, content, projectContext } = body as {
    user: User;
    content: string;
    projectContext?: string;
  };

  if ((user !== "thomas" && user !== "beate") || !content) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: user, content, project_context: projectContext ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
