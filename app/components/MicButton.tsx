"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Browser dictation (Web Speech API). Minimal typings (not part of TypeScript's DOM lib).
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

/** Dictation state: final text goes to onText, the live (interim) text is shown while listening. */
export function useDictation(onText: (text: string) => void) {
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

  return { supported: !!supported, recording, interim, error, start, stop, toggle: () => (recording ? stop() : start()) };
}
