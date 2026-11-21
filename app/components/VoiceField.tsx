"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import { kickerUrgent, recBtn } from "../lib/ui";
import { RecDot } from "./Status";

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

export type Dictation = ReturnType<typeof useDictation>;

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Accessible name when there is no visible <label htmlFor={id}>. */
  label?: string;
  multiline?: boolean;
  placeholder?: string;
  /** Classes of the field itself (default: the borderless .line-field). */
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  rows?: number;
  onEnter?: () => void;
  fieldRef?: Ref<HTMLTextAreaElement & HTMLInputElement>;
  /** Shared dictation (when the parent also starts it, e.g. from a closed state). */
  dictation?: Dictation;
  /** Extra actions shown in the row with „● Sprechen“ (multiline only). */
  children?: ReactNode;
};

/**
 * Text field with „● Sprechen“ / „● Stopp“, „● HÖRT ZU“ and the live transcript.
 * Without speech recognition in the browser the button is hidden; typing always works.
 */
export default function VoiceField(props: Props) {
  const { id, value, onChange, label, multiline = false, placeholder, className = "line-field", disabled, autoFocus, rows, onEnter, fieldRef, children } = props;
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const own = useDictation((t) => {
    const v = valueRef.current;
    onChange(v.trim() ? `${v.trimEnd()} ${t}` : t);
  });
  const d = props.dictation ?? own;

  const mic = d.supported && !disabled && (
    <button type="button" className={recBtn} onClick={d.toggle} aria-pressed={d.recording} aria-controls={id}>
      <RecDot /> {d.recording ? "Stopp" : "Sprechen"}
    </button>
  );

  const common = {
    id,
    "aria-label": label,
    value,
    placeholder,
    disabled,
    autoFocus,
  };

  return (
    <div>
      {d.recording && (
        <p className={`${kickerUrgent} mb-[6px] flex flex-wrap items-center gap-x-2`} aria-live="polite">
          <RecDot blink size={8} /> Hört zu
          {d.interim && <span className="font-serif text-[16px] font-normal tracking-normal text-[var(--grey)] normal-case italic">{d.interim}</span>}
        </p>
      )}
      {multiline ? (
        <>
          <textarea
            {...common}
            ref={fieldRef}
            rows={rows}
            className={className}
            onChange={(e) => onChange(e.target.value)}
          />
          {(mic || children) && <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">{children}{mic}</div>}
        </>
      ) : (
        <div className="flex items-end gap-x-4">
          <input
            {...common}
            ref={fieldRef}
            className={`${className} min-w-0 flex-1`}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onEnter) {
                e.preventDefault();
                onEnter();
              }
            }}
          />
          {mic}
        </div>
      )}
      {d.error && <p role="alert" className="mt-2 font-sans text-[14px] font-semibold text-[var(--urgent)]">{d.error}</p>}
    </div>
  );
}
