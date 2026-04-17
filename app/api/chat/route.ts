import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/iris-prompt";
import type { User, ChatMessage, IrisResponse } from "@/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, messages, contextSummary } = body as {
      user: User;
      messages: ChatMessage[];
      contextSummary: string;
    };

    if (!user || !messages) {
      return NextResponse.json({ error: "Missing user or messages" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(user, contextSummary || "Keine Daten vorhanden.");

    // Build Anthropic message history (exclude system, last N messages for context)
    const history = messages.slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: history,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON response from Iris — robust gegen Text vor/nach dem Code-Block
    let parsed: IrisResponse;
    try {
      // 1. Versuche JSON direkt aus einem ```json ... ``` Block zu extrahieren
      const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const candidate = fenceMatch ? fenceMatch[1].trim() : rawText.trim();
      parsed = JSON.parse(candidate);
    } catch {
      // 2. Fallback: Suche nach dem ersten { ... } Block im Text
      try {
        const braceMatch = rawText.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          parsed = JSON.parse(braceMatch[0]);
        } else {
          parsed = { message: rawText, actions: [] };
        }
      } catch {
        parsed = { message: rawText, actions: [] };
      }
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
