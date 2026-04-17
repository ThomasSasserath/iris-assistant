"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // If already logged in, go directly to chat
    const stored = localStorage.getItem("iris_current_user");
    if (stored === "thomas" || stored === "beate") {
      router.replace("/chat");
    }
  }, [router]);

  function select(user: User) {
    localStorage.setItem("iris_current_user", user);
    router.push("/chat");
  }

  return (
    <div className="flex h-full items-center justify-center bg-iris-bg">
      <div className="w-full max-w-sm px-6">
        {/* Logo / Name */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-iris-accent/10 text-iris-accent text-2xl font-semibold">
            I
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-iris-text">Iris Neumann</h1>
          <p className="mt-1 text-sm text-iris-muted">Persönliche KI-Assistenz · sasserath + bitter</p>
        </div>

        {/* User selection */}
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-iris-muted">
          Wer bist du?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => select("thomas")}
            className="group flex items-center gap-4 rounded-xl border border-iris-border bg-iris-surface px-5 py-4 text-left transition-all hover:border-iris-accent/50 hover:bg-iris-accent/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-iris-accent/15 text-iris-accent font-semibold">
              T
            </div>
            <div>
              <div className="font-medium text-iris-text">Thomas</div>
              <div className="text-xs text-iris-muted">sasserath + bitter</div>
            </div>
            <svg className="ml-auto h-4 w-4 text-iris-border group-hover:text-iris-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => select("beate")}
            className="group flex items-center gap-4 rounded-xl border border-iris-border bg-iris-surface px-5 py-4 text-left transition-all hover:border-iris-accent/50 hover:bg-iris-accent/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-purple-400 font-semibold">
              B
            </div>
            <div>
              <div className="font-medium text-iris-text">Beate</div>
              <div className="text-xs text-iris-muted">sasserath + bitter</div>
            </div>
            <svg className="ml-auto h-4 w-4 text-iris-border group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-iris-muted">
          Jede Instanz hat ihren eigenen, privaten Bereich.
        </p>
      </div>
    </div>
  );
}
