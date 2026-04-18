// GET /api/teams/user?aadId=...
// Löst Teams AAD Object ID → Iris User (thomas/beate) auf

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const aadId = req.nextUrl.searchParams.get("aadId");
  if (!aadId) return NextResponse.json({ error: "aadId fehlt" }, { status: 400 });

  const { data } = await supabase
    .from("teams_users")
    .select("user_id")
    .eq("teams_aad_id", aadId)
    .single();

  if (data?.user_id) {
    return NextResponse.json({ user: data.user_id });
  }

  return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
}
