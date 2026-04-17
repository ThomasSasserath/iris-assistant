// POST /api/data/projects → Projektkontext anlegen oder aktualisieren (upsert)

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import type { User } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user, name, summary } = body as { user: User; name: string; summary: string };

  if ((user !== "thomas" && user !== "beate") || !name || !summary) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("projects")
    .upsert(
      { user_id: user, name, summary, updated_at: new Date().toISOString() },
      { onConflict: "user_id,name" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 200 });
}
