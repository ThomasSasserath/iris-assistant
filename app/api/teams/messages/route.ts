// POST /api/teams/messages
// Empfängt Bot Framework Activities von Microsoft Teams.

import { NextRequest, NextResponse } from "next/server";
import { getTeamsAdapter, handleTeamsTurn } from "@/lib/teams-bot";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.MICROSOFT_APP_ID || !process.env.MICROSOFT_APP_PASSWORD) {
    return NextResponse.json(
      { error: "Teams Bot nicht konfiguriert" },
      { status: 503 }
    );
  }

  try {
    const adapter = getTeamsAdapter();
    const authHeader = req.headers.get("authorization") ?? "";

    // botbuilder 4.22+ unterstützt fetch Request direkt
    const res = await adapter.process(
      req as unknown as Request,
      authHeader,
      handleTeamsTurn
    );

    return res ?? new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error("Teams route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
