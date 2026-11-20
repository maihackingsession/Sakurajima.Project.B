"use client";

import { useImperativeHandle, useRef, useState, type Ref } from "react";
import situations from "@/tests/situations.json";
import {
  LETTER_LABELS,
  LETTER_TYPES,
  isLetterType,
  type GapQuestion,
  type GapsResult,
  type Letter,
  type LetterType,
  type RouterResult,
} from "@/lib/types";
import { errorText, postJson } from "../lib/api";
import { btnPrimary, btnSecondary, card, field, label, linkBtn } from "../lib/ui";
import DraftEditor from "./DraftEditor";
import MicButton from "./MicButton";

/** Lets the deviation checker jump into the letter flow ("Anzeige entwerfen"). */
export type LetterFlowHandle = { start: (text: string, letterType: LetterType | null) => void };

type Props = {
  ref?: Ref<LetterFlowHandle>;
  onRedirect: (tab: "bericht" | "zusammenfassen", text: string) => void;
};

type Step = "input" | "questions" | "draft";

export default function LetterFlow({ ref, onRedirect }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [input, setInput] = useState("");
  const [override, setOverride] = useState<LetterType | "">("");
  const [letterType, setLetterType] = useState<LetterType>("behinderung");
  const [facts, setFacts] = useState<Record<string, unknown>>({});
  const [reason, setReason] = useState("");
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Letter | null>(null);
  const [redirect, setRedirect] = useState<RouterResult["intent"] | null>(null);
  const [busy, setBusy] = useState<"" | "analyse" | "letter">("");
  const [error, setError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function checkGaps(type: LetterType, text: string, knownFacts: Record<string, unknown>) {
    const gaps = await postJson<GapsResult>("/api/gaps", { letter_type: type, input: text, facts: knownFacts });
    setQuestions(gaps.questions);
    setAnswers({});
    setStep("questions");
    scrollTop();
  }

  async function analyse(text = input, forced: LetterType | "" = override) {
    if (!text.trim()) return;
    setBusy("analyse");
    setError("");
    setRedirect(null);
    try {
      let type: LetterType;
      let knownFacts: Record<string, unknown> = {};
      if (forced) {
        type = forced;
        setReason("Schreibenart manuell gewählt.");
      } else {
        const r = await postJson<RouterResult>("/api/route", { input: text });
        if (r.intent !== "letter") {
          setRedirect(r.intent);
          setReason(r.reason);
          return;
        }
        type = isLetterType(r.letter_type) ? r.letter_type : "behinderung";
        knownFacts = r.facts;
        setReason(r.reason);
      }
      setLetterType(type);
      setFacts(knownFacts);
      await checkGaps(type, text, knownFacts);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }

  async function changeType(type: LetterType) {
    setLetterType(type);
    setReason("Schreibenart manuell geändert.");
    setBusy("analyse");
    setError("");
    try {
      await checkGaps(type, input, facts);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }

  async function createLetter(useAnswers: boolean) {
    setBusy("letter");
    setError("");
    try {
      const given: Record<string, string> = {};
      if (useAnswers) {
        for (const q of questions) {
          const a = answers[q.field]?.trim();
          if (a) given[q.field] = a;
        }
      }
      const letter = await postJson<Letter>("/api/letter", {
        letter_type: letterType,
        input,
        facts,
        answers: given,
      });
      setDraft(letter);
      setStep("draft");
      scrollTop();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }

  function restart() {
    setStep("input");
    setInput("");
    setDraft(null);
    setQuestions([]);
    setAnswers({});
    setRedirect(null);
    setError("");
    scrollTop();
  }

  function example() {
    const s = situations[Math.floor(Math.random() * situations.length)];
    setInput(s.text);
    setRedirect(null);
  }

  useImperativeHandle(ref, () => ({
    start(text, type) {
      setStep("input");
      setDraft(null);
      setInput(text);
      setOverride(type ?? "");
      void analyse(text, type ?? "");
    },
  }));

  return (
    <div ref={topRef} className="flex scroll-mt-4 flex-col gap-4">
      {step === "input" && (
        <section className="flex flex-col gap-3">
          <label htmlFor="situation" className="text-lg font-bold">Was ist auf der Baustelle passiert?</label>
          <textarea
            id="situation"
            className={`${field} min-h-44`}
            placeholder="z. B. Bagger ausgefallen, Baustelle steht seit Dienstag …"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <MicButton onText={(t) => setInput((v) => (v.trim() ? `${v.trimEnd()} ${t}` : t))} />
          <button className={btnPrimary} onClick={() => analyse()} disabled={!!busy || !input.trim()}>
            {busy === "analyse" ? "Wird analysiert …" : "Analysieren"}
          </button>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button className={linkBtn} onClick={example}>Beispiel einfügen</button>
          </div>
          <div>
            <label htmlFor="override" className="mb-1 block text-sm text-neutral-700">
              Schreibenart (optional, sonst automatisch erkannt)
            </label>
            <select
              id="override"
              className={`${field} py-2`}
              value={override}
              onChange={(e) => setOverride(e.target.value as LetterType | "")}
            >
              <option value="">Automatisch erkennen</option>
              {LETTER_TYPES.map((t) => <option key={t} value={t}>{LETTER_LABELS[t]}</option>)}
            </select>
          </div>

          {redirect && (
            <div className={`${card} border-blue-300 bg-blue-50`}>
              <p className="font-semibold">
                {redirect === "deviation"
                  ? "Das sieht aus wie ein Tagesbericht."
                  : "Das sieht aus wie Protokoll, Tagebuch oder E-Mails."}
              </p>
              {reason && <p className="mt-1 text-sm text-neutral-700">{reason}</p>}
              <div className="mt-3 flex flex-col gap-2">
                <button
                  className={btnPrimary}
                  onClick={() => onRedirect(redirect === "deviation" ? "bericht" : "zusammenfassen", input)}
                >
                  {redirect === "deviation" ? "Mit Bauzeitenplan abgleichen" : "Zusammenfassen"}
                </button>
                <p className="text-sm text-neutral-700">
                  Oder oben eine Schreibenart wählen und erneut „Analysieren“ tippen.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {step === "questions" && (
        <section className="flex flex-col gap-4">
          <div className={card}>
            <label htmlFor="type" className={label}>Erkannte Schreibenart</label>
            <select
              id="type"
              className={field}
              value={letterType}
              disabled={!!busy}
              onChange={(e) => changeType(e.target.value as LetterType)}
            >
              {LETTER_TYPES.map((t) => <option key={t} value={t}>{LETTER_LABELS[t]}</option>)}
            </select>
            {reason && <p className="mt-2 text-sm text-neutral-600">{reason}</p>}
          </div>

          <div className={card}>
            <p className="text-sm font-semibold text-neutral-600">Ihre Beschreibung</p>
            <p className="mt-1 whitespace-pre-line">{input}</p>
          </div>

          {questions.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold">Es fehlen noch Angaben:</h2>
              {questions.map((q, i) => (
                <div key={`${q.field}-${i}`}>
                  <label htmlFor={`q${i}`} className={label}>{q.question}</label>
                  <input
                    id={`q${i}`}
                    className={field}
                    placeholder={q.example ? `z. B. ${q.example}` : ""}
                    value={answers[q.field] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-green-300 bg-green-50 p-4 font-semibold text-green-900">
              Alle Pflichtangaben sind vorhanden.
            </p>
          )}

          <button className={btnPrimary} onClick={() => createLetter(true)} disabled={!!busy}>
            {busy === "letter" ? "Wird erstellt …" : "Schreiben erstellen"}
          </button>
          {questions.length > 0 && (
            <button className={btnSecondary} onClick={() => createLetter(false)} disabled={!!busy}>
              Trotzdem erstellen (ohne Antworten)
            </button>
          )}
          <button className={btnSecondary} onClick={() => setStep("input")} disabled={!!busy}>
            Zurück
          </button>
        </section>
      )}

      {step === "draft" && draft && (
        <DraftEditor
          title={LETTER_LABELS[letterType]}
          draft={draft}
          onChange={setDraft}
          onBack={() => setStep("questions")}
          onRestart={restart}
        />
      )}

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    </div>
  );
}
