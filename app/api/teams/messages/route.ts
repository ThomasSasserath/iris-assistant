// POST /api/teams/messages
// Empfängt Bot Framework Activities von Microsoft Teams.
// Implementierung ohne botbuilder CloudAdapter (Next.js App Router kompatibel).

import { NextRequest, NextResponse } from "next/server";
import { fetchAllDataServer, buildContextSummaryServer } from "@/lib/data-server";
import { buildSystemPrompt } from "@/lib/iris-prompt";
import { processIrisActionsServer } from "@/lib/iris-actions-server";
import { supabase } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";
import type { User, IrisAction } from "@/lib/types";

export const runtime = "nodejs";

// Bot Connector Token holen (für Antworten an Teams)
let cachedToken: { value: string; expires: number } | null = null;

async function getBotToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires - 60000) {
    return cachedToken.value;
  }
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? "botframework.com";
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.MICROSOFT_APP_ID!,
        client_secret: process.env.MICROSOFT_APP_PASSWORD!,
        scope: "https://api.botframework.com/.default",
      }),
    }
  );
  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

// Antwort an Teams senden
async function sendTeamsReply(
  serviceUrl: string,
  conversationId: string,
  replyToId: string,
  text: string
) {
  const token = await getBotToken();
  // serviceUrl endet manchmal ohne /
  const base = serviceUrl.endsWith("/") ? serviceUrl : serviceUrl + "/";
  const url = `${base}v3/conversations/${conversationId}/activities/${replyToId}`;
  console.log("Teams: Reply URL:", url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "message",
      text,
    }),
  });
  const body = await res.text();
  console.log("Teams: Reply Status:", res.status, body.substring(0, 200));
}

// Teams AAD Object ID → Iris User auflösen
async function resolveUser(aadObjectId?: string, teamsUserId?: string): Promise<User | null> {
  const key = aadObjectId ?? teamsUserId;
  if (!key) return null;

  // DB-Lookup
  const { data } = await supabase
    .from("teams_users")
    .select("user_id")
    .eq("teams_aad_id", key)
    .single();
  if (data?.user_id === "thomas" || data?.user_id === "beate") return data.user_id;

  // Env-Var Fallback
  if (process.env.TEAMS_AAD_ID_THOMAS && key === process.env.TEAMS_AAD_ID_THOMAS) return "thomas";
  if (process.env.TEAMS_AAD_ID_BEATE && key === process.env.TEAMS_AAD_ID_BEATE) return "beate";

  return null;
}

export async function POST(req: NextRequest) {
  if (!process.env.MICROSOFT_APP_ID || !process.env.MICROSOFT_APP_PASSWORD) {
    return NextResponse.json({ error: "Teams Bot nicht konfiguriert" }, { status: 503 });
  }

  console.log("Teams POST empfangen:", req.method, req.url);

  let activity: Record<string, unknown>;
  try {
    activity = await req.json();
    console.log("Teams Activity type:", activity.type, "from:", JSON.stringify(activity.from));
  } catch (e) {
    console.error("Teams JSON parse error:", e);
    return new NextResponse(null, { status: 400 });
  }

  // Nur Nachrichten verarbeiten
  if (activity.type !== "message") {
    console.log("Teams Activity ignoriert (kein message):", activity.type);
    return new NextResponse(null, { status: 200 });
  }

  const text = (activity.text as string | undefined)?.replace(/<[^>]*>/g, "").trim();
  if (!text) return new NextResponse(null, { status: 200 });

  const from = activity.from as Record<string, string> | undefined;
  const aadObjectId = from?.aadObjectId;
  const teamsUserId = from?.id;
  const serviceUrl = (activity.serviceUrl as string) ?? "";
  const conversation = activity.conversation as Record<string, string> | undefined;
  const conversationId = conversation?.id ?? "";
  const activityId = activity.id as string ?? "";

  // Sofort 200 zurückgeben (Teams erwartet schnelle Antwort)
  // Verarbeitung läuft async weiter
  const responsePromise = (async () => {
    try {
      console.log("Teams: Starte Verarbeitung, aadObjectId:", aadObjectId);
      const user = await resolveUser(aadObjectId, teamsUserId);
      console.log("Teams: User aufgelöst:", user);

      if (!user) {
        await sendTeamsReply(serviceUrl, conversationId, activityId,
          `Ich kenne dich noch nicht. Bitte trage deine Teams-ID in der Konfiguration ein.\n\nDeine AAD Object ID: \`${aadObjectId ?? "nicht verfügbar"}\`\nDeine Teams User ID: \`${teamsUserId}\``
        );
        // User in DB speichern damit Admins sehen wer sich meldet
        await supabase.from("teams_users").upsert({
          user_id: "thomas", // Default bis manuell zugeordnet
          teams_aad_id: aadObjectId ?? teamsUserId ?? "unknown",
          teams_user_id: teamsUserId,
          service_url: serviceUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: "teams_aad_id" });
        return;
      }

      // ConversationReference speichern
      await supabase.from("teams_users").upsert({
        user_id: user,
        teams_aad_id: aadObjectId ?? teamsUserId!,
        teams_user_id: teamsUserId,
        service_url: serviceUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: "teams_aad_id" });

      // Iris-Antwort holen
      const data = await fetchAllDataServer(user);
      const contextSummary = buildContextSummaryServer(user, data);
      const systemPrompt = buildSystemPrompt(user, contextSummary);

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: text }],
      });

      const rawText = response.content[0].type === "text" ? response.content[0].text : "";

      // JSON parsen
      let iris = { message: rawText, actions: [] as IrisAction[] };
      try {
        const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
        const candidate = fenceMatch ? fenceMatch[1].trim() : rawText.trim();
        const parsed = JSON.parse(candidate);
        if (parsed.message !== undefined) iris = parsed;
      } catch {
        const braceMatch = rawText.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          try {
            const parsed = JSON.parse(braceMatch[0]);
            if (parsed.message !== undefined) iris = parsed;
          } catch {}
        }
      }

      // Aktionen ausführen
      if (iris.actions?.length > 0) {
        await processIrisActionsServer(user, iris.actions, data.tasks);
      }

      // Antwort senden
      console.log("Teams: Sende Antwort:", iris.message?.substring(0, 50));
      await sendTeamsReply(serviceUrl, conversationId, activityId, iris.message || "Erledigt.");
      console.log("Teams: Antwort gesendet.");
    } catch (err) {
      console.error("Teams Verarbeitungsfehler:", err);
      try {
        await sendTeamsReply(serviceUrl, conversationId, activityId, "Verbindungsfehler. Bitte versuche es erneut.");
      } catch {}
    }
  })();

  // Warten auf Verarbeitung (Teams gibt 5 Sekunden)
  await responsePromise;

  return new NextResponse(null, { status: 200 });
}
