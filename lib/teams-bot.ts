// Teams Bot Handler – verarbeitet eingehende Teams-Nachrichten mit Iris-Logik
// Läuft server-side, nutzt dieselbe Claude-API wie der Web-Chat

import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ActivityTypes,
  TurnContext,
  ConversationReference,
} from "botbuilder";
import { supabase } from "./supabase-server";
import { fetchAllData, buildContextSummary } from "./storage";
import type { User } from "./types";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./iris-prompt";
import { processIrisActions } from "./iris-actions";

// Singleton Adapter – wird einmal initialisiert
let _adapter: CloudAdapter | null = null;

export function getTeamsAdapter(): CloudAdapter {
  if (_adapter) return _adapter;

  const auth = new ConfigurationBotFrameworkAuthentication({
    MicrosoftAppId: process.env.MICROSOFT_APP_ID ?? "",
    MicrosoftAppPassword: process.env.MICROSOFT_APP_PASSWORD ?? "",
    MicrosoftAppType: "SingleTenant",
    MicrosoftAppTenantId: process.env.MICROSOFT_TENANT_ID ?? "",
  });

  _adapter = new CloudAdapter(auth);

  _adapter.onTurnError = async (context, error) => {
    console.error("Teams Bot Fehler:", error);
    await context.sendActivity("Iris ist gerade nicht erreichbar. Bitte versuche es später.");
  };

  return _adapter;
}

// Teams AAD Object ID → Iris User (thomas/beate)
// Primär: Lookup in DB. Fallback: Env-Vars TEAMS_AAD_ID_THOMAS / TEAMS_AAD_ID_BEATE
async function resolveUser(aadObjectId: string | undefined, teamsUserId: string): Promise<User | null> {
  if (!aadObjectId && !teamsUserId) return null;

  // Zuerst DB-Lookup (für bereits registrierte User)
  const key = aadObjectId ?? teamsUserId;
  const { data } = await supabase
    .from("teams_users")
    .select("user_id")
    .eq("teams_aad_id", key)
    .single();

  if (data?.user_id === "thomas" || data?.user_id === "beate") {
    return data.user_id;
  }

  // Fallback: Env-Vars
  const thomasId = process.env.TEAMS_AAD_ID_THOMAS;
  const beateId = process.env.TEAMS_AAD_ID_BEATE;

  if (thomasId && (aadObjectId === thomasId || teamsUserId === thomasId)) return "thomas";
  if (beateId && (aadObjectId === beateId || teamsUserId === beateId)) return "beate";

  return null;
}

// Speichert/aktualisiert ConversationReference für proaktive Nachrichten
async function upsertConversationRef(
  user: User,
  aadObjectId: string | undefined,
  teamsUserId: string,
  serviceUrl: string,
  convRef: Partial<ConversationReference>
) {
  const key = aadObjectId ?? teamsUserId;
  await supabase.from("teams_users").upsert(
    {
      user_id: user,
      teams_aad_id: key,
      teams_user_id: teamsUserId,
      service_url: serviceUrl,
      conversation_reference: convRef,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "teams_aad_id" }
  );
}

// Hauptlogik: Iris-Antwort für Teams-Nachricht
export async function handleTeamsTurn(context: TurnContext) {
  if (context.activity.type !== ActivityTypes.Message) return;

  const text = context.activity.text?.trim().replace(/<[^>]*>/g, "").trim();
  if (!text) return;

  const aadObjectId = context.activity.from.aadObjectId;
  const teamsUserId = context.activity.from.id;
  const serviceUrl = context.activity.serviceUrl ?? "";

  // User auflösen
  const user = await resolveUser(aadObjectId, teamsUserId);

  if (!user) {
    // Unbekannter User – Registration-Flow
    await context.sendActivity(
      "Ich kenne dich noch nicht. Bitte trage deine Teams-ID in der Iris-Konfiguration ein.\n\n" +
        `Deine AAD Object ID: \`${aadObjectId ?? "nicht verfügbar"}\`\n` +
        `Deine Teams User ID: \`${teamsUserId}\``
    );
    return;
  }

  // ConversationReference speichern (für spätere proaktive Nachrichten)
  const convRef = TurnContext.getConversationReference(context.activity);
  await upsertConversationRef(user, aadObjectId, teamsUserId, serviceUrl, convRef);

  // Daten laden + Iris-Antwort holen
  await context.sendActivity({ type: "typing" });

  try {
    const data = await fetchAllData(user);
    const contextSummary = buildContextSummary(user, data);
    const systemPrompt = buildSystemPrompt(user, contextSummary);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // JSON parsen (gleiche Logik wie /api/chat)
    let iris = { message: rawText, actions: [] as unknown[] };
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
    if (iris.actions && (iris.actions as unknown[]).length > 0) {
      await processIrisActions(user, iris.actions as Parameters<typeof processIrisActions>[1], data.tasks);
    }

    // Antwort in Teams senden
    await context.sendActivity(iris.message || "Erledigt.");
  } catch (err) {
    console.error("Iris Teams-Fehler:", err);
    await context.sendActivity("Verbindungsfehler. Bitte versuche es erneut.");
  }
}
