"use client";

import { useEffect } from "react";

const ONENOTE_URL =
  "https://sasserathbitter.sharepoint.com/:o:/s/saerathbitterGbR/IgCsQmsQZPUfQ6KwMcqnNRjHAR4oUYSzm38nKcdzKWLqtcs";

export default function NotesRedirect() {
  useEffect(() => {
    window.location.href = ONENOTE_URL;
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-iris-bg">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
        <p className="text-sm text-iris-muted">OneNote wird geöffnet…</p>
      </div>
    </div>
  );
}
