"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { btnBase, btnPrimary, btnSecondary, wide } from "../lib/ui";

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
export function useSpeechSupported() {
  return useSyncExternalStore(noop, () => getCtor() !== null, () => null);
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Mikrofon-Zugriff wurde nicht erlaubt. Bitte in den Browser-Einstellungen freigeben.",
  "service-not-allowed": "Spracherkennung ist in diesem Browser nicht erlaubt.",
  "no-speech": "Keine Sprache erkannt. Bitte erneut versuchen.",
  network: "Spracherkennung braucht eine Internetverbindung.",
  "audio-capture": "Kein Mikrofon gefunden.",
};

/** Full-width "● Aufnahme" (browser dictation). Amber only while it is the primary action (empty text box). */
export default function MicButton({ onText, primary = false }: { onText: (text: string) => void; primary?: boolean }) {
  const supported = useSpeechSupported();
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
        className={recording ? `${wide(btnBase)} border-2 border-[var(--error-text)] bg-[var(--error-bg)] text-base text-[var(--error-text)]` : wide(primary ? btnPrimary : btnSecondary)}
      >
        {recording ? (
          <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-sm bg-[var(--error-text)]" />
        ) : (
          <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full bg-[#c0261f] ring-2 ring-white" />
        )}
        {recording ? "Aufnahme beenden" : "Aufnahme"}
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
