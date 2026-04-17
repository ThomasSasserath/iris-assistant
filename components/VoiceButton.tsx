"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Web Speech API types (not in standard TS lib)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = new () => any;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export default function VoiceButton({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => { setMounted(true); }, []);

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const recognition = new SR();
    recognition.lang = "de-DE";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  // Don't render until mounted (avoids SSR/hydration mismatch)
  if (!mounted) return null;

  if (supported === false) {
    return (
      <span className="text-xs text-iris-muted px-2" title="Diktat nicht verfügbar (bitte Chrome oder Edge verwenden)">
        Kein Diktat
      </span>
    );
  }

  return (
    <button
      type="button"
      onMouseDown={startListening}
      onMouseUp={stopListening}
      onTouchStart={startListening}
      onTouchEnd={stopListening}
      onClick={!listening ? startListening : stopListening}
      disabled={disabled}
      title={listening ? "Aufnahme läuft – loslassen zum Beenden" : "Halten zum Diktieren (Deutsch)"}
      className={`
        flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all
        ${listening
          ? "bg-red-500/20 text-red-400 mic-active ring-1 ring-red-500/50"
          : "bg-iris-surface text-iris-muted hover:text-iris-accent hover:bg-iris-accent/10"
        }
        disabled:opacity-40 disabled:cursor-not-allowed
      `}
    >
      {listening ? (
        // Waveform icon
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" d="M12 1v22M8 5v14M16 5v14M4 9v6M20 9v6" />
        </svg>
      ) : (
        // Mic icon
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  );
}
