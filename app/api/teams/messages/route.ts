// POST /api/teams/messages
// Empfängt Bot Framework Activities von Microsoft Teams.
// Azure Bot Service leitet alle Team-Nachrichten hierher.

import { NextRequest, NextResponse } from "next/server";
import { getTeamsAdapter, handleTeamsTurn } from "@/lib/teams-bot";

export const runtime = "nodejs"; // botbuilder benötigt Node.js Runtime (nicht Edge)

export async function POST(req: NextRequest) {
  // MICROSOFT_APP_ID muss gesetzt sein, sonst verweigern
  if (!process.env.MICROSOFT_APP_ID || !process.env.MICROSOFT_APP_PASSWORD) {
    return NextResponse.json(
      { error: "Teams Bot nicht konfiguriert (fehlende Env-Vars)" },
      { status: 503 }
    );
  }

  const adapter = getTeamsAdapter();

  // botbuilder 4.22+ akzeptiert direkt fetch Request / Response
  // Wir wandeln NextRequest in ein kompatibles Format um
  const nodeReq = await convertToNodeCompatible(req);

  return new Promise<NextResponse>((resolve) => {
    const fakeRes = {
      statusCode: 200,
      setHeader: () => {},
      end: (body?: string) => {
        resolve(
          new NextResponse(body || null, { status: fakeRes.statusCode })
        );
      },
    };

    adapter
      .process(nodeReq as never, fakeRes as never, handleTeamsTurn)
      .catch((err) => {
        console.error("Teams adapter process error:", err);
        resolve(NextResponse.json({ error: String(err) }, { status: 500 }));
      });
  });
}

// Next.js App Router nutzt Web Fetch API, botbuilder erwartet Node-style Objekte.
// Diese Funktion konvertiert den Request für Kompatibilität.
async function convertToNodeCompatible(req: NextRequest) {
  const body = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    method: req.method,
    headers,
    body,
    // Node-style readable stream interface
    on: (event: string, cb: (data?: unknown) => void) => {
      if (event === "data") cb(Buffer.from(body));
      if (event === "end") cb();
    },
  };
}
