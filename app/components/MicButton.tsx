"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Minimal Web Speech API typings (not part of TypeScript's DOM lib).
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};
// null = not yet known (server render), true/false after hydration.
function useSupported() {
  return useSyncExternalStore(noop, () => getCtor() !== null, () => null);
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Mikrofon-Zugriff wurde nicht erlaubt. Bitte in den Browser-Einstellungen freigeben.",
  "service-not-allowed": "Spracherkennung ist in diesem Browser nicht erlaubt.",
  "no-speech": "Keine Sprache erkannt. Bitte erneut versuchen.",
  network: "Spracherkennung braucht eine Internetverbindung.",
  "audio-capture": "Kein Mikrofon gefunden.",
};

export default function MicButton({ onText }: { onText: (text: string) => void }) {
  const supported = useSupported();
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => () => rec.current?.abort(), []);

  if (supported === null) return null;
  if (!supported) {
    return null;
  }

  function start() {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError("");
    const r = new Ctor();
    r.lang = "de-DE";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0].transcript.trim();
        if (res.isFinal) {
          if (text) onTextRef.current(text);
        } else {
          live += `${text} `;
        }
      }
      setInterim(live.trim());
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? "Spracherkennung fehlgeschlagen. Bitte tippen oder Tastatur-Diktat nutzen.");
    };
    r.onend = () => {
      setRecording(false);
      setInterim("");
      rec.current = null;
    };
    rec.current = r;
    try {
      r.start();
      setRecording(true);
    } catch {
      setError("Spracherkennung konnte nicht gestartet werden.");
    }
  }

  function stop() {
    rec.current?.stop();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-pressed={recording}
        className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold sm:w-auto ${
          recording
            ? "bg-[var(--error-text)] text-white"
            : "border border-[var(--navy)] bg-white text-[var(--navy)] hover:bg-[var(--surface)]"
        }`}
      >
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {recording ? <rect x="6" y="6" width="12" height="12" rx="2" /> : <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>}
        </svg>
        {recording ? "Aufnahme beenden" : "Diktieren"}
      </button>
      {recording && (
        <p className="rounded-lg bg-[var(--error-bg)] p-2 text-sm text-[var(--error-text)]" aria-live="polite">
          {interim || "Ich höre zu … bitte sprechen."}
        </p>
      )}
      {error && <p role="alert" className="text-sm text-[var(--error-text)]">{error}</p>}
    </div>
  );
}
