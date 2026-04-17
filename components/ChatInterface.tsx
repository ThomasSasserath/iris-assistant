"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { User, ChatMessage, IrisAction, IrisResponse } from "@/lib/types";
import {
  fetchAllData,
  buildContextSummary,
  completeTask,
  completeDelegatedTask,
  type AllData,
} from "@/lib/storage";
import { processIrisActions } from "@/lib/iris-actions";
import TaskPanel from "./TaskPanel";
import VoiceButton from "./VoiceButton";

interface Props {
  user: User;
  onLogout: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

const EMPTY_DATA: AllData = {
  tasks: [],
  notes: [],
  projects: [],
  delegatedIncoming: [],
  delegatedOutgoing: [],
};

export default function ChatInterface({ user, onLogout }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AllData>(EMPTY_DATA);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Alle Daten neu laden und State setzen
  const refreshData = useCallback(async () => {
    try {
      const fresh = await fetchAllData(user);
      setData(fresh);
      return fresh;
    } catch (err) {
      console.error("Datenladen fehlgeschlagen:", err);
      return null;
    }
  }, [user]);

  // Initialer Datenload + Begrüßung
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    refreshData().then((fresh) => {
      sendMessage("hallo", true, fresh ?? EMPTY_DATA);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string, silent = false, overrideData?: AllData) {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const currentData = overrideData ?? data;
    const historyBeforeSend = silent ? messages : [...messages, userMsg];

    if (!silent) {
      setMessages(historyBeforeSend);
      setInput("");
    }
    setLoading(true);

    try {
      const contextSummary = buildContextSummary(user, currentData);
      const messagesForApi = [...historyBeforeSend, ...(silent ? [userMsg] : [])];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, messages: messagesForApi, contextSummary }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);

      const iris: IrisResponse = await res.json();

      // Aktionen verarbeiten (alle async)
      if (iris.actions && iris.actions.length > 0) {
        await processActions(iris.actions);
        await refreshData();
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: iris.message || "Erledigt.",
        timestamp: new Date().toISOString(),
      };

      if (silent) {
        setMessages([assistantMsg]);
      } else {
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Verbindungsfehler. Bitte API-Key und Supabase-Config prüfen.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function processActions(actions: IrisAction[]) {
    await processIrisActions(user, actions, data.tasks);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  async function handleCompleteTask(id: string) {
    const task = data.tasks.find((t) => t.id === id);
    await completeTask(user, id, task);
    await refreshData();
  }

  async function handleCompleteDelegated(id: string) {
    await completeDelegatedTask(id, user);
    await refreshData();
  }

  const userName = user === "thomas" ? "Thomas" : "Beate";
  const openCount = data.tasks.filter((t) => t.status === "open").length;

  return (
    <div className="flex h-full bg-iris-bg">
      {/* Chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-iris-border px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-iris-accent/15 text-iris-accent text-sm font-semibold">
            I
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-iris-text">Iris Neumann</div>
            <div className="text-xs text-iris-muted truncate">sasserath + bitter · {userName}</div>
          </div>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="relative ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-iris-muted hover:text-iris-text hover:bg-iris-surface transition-colors"
            title="Aufgaben ein-/ausblenden"
          >
            {openCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-iris-accent text-[10px] font-bold text-white">
                {openCount > 9 ? "9+" : openCount}
              </span>
            )}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-iris-muted">Verbinde mit Iris…</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message-enter flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-iris-accent/15 text-iris-accent text-xs font-bold">
                  I
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-iris-accent text-white rounded-tr-sm"
                    : "bg-iris-surface text-iris-text border border-iris-border rounded-tl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <div className={`mt-1 text-right text-[10px] ${msg.role === "user" ? "text-white/60" : "text-iris-muted"}`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-enter flex justify-start">
              <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-iris-accent/15 text-iris-accent text-xs font-bold">
                I
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-iris-border bg-iris-surface px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-iris-muted"
                      style={{ animation: `pulse-mic 1s ease-in-out ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-iris-border p-3">
          <div className="flex items-end gap-2 rounded-xl border border-iris-border bg-iris-surface px-3 py-2 focus-within:border-iris-accent/50 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht an Iris…"
              disabled={loading}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-iris-text placeholder:text-iris-muted outline-none min-h-[24px] max-h-32"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 128) + "px";
              }}
            />
            <div className="flex items-center gap-1 pb-0.5">
              <VoiceButton onTranscript={(t) => sendMessage((input + " " + t).trim())} disabled={loading} />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-iris-accent text-white transition-all hover:bg-iris-accent/90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-iris-muted">
            Enter zum Senden · Shift+Enter für Zeilenumbruch · Mic-Button zum Diktieren
          </p>
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <TaskPanel
          user={user}
          tasks={data.tasks}
          notes={data.notes}
          delegatedIncoming={data.delegatedIncoming}
          delegatedOutgoing={data.delegatedOutgoing}
          onCompleteTask={handleCompleteTask}
          onCompleteDelegated={handleCompleteDelegated}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}
