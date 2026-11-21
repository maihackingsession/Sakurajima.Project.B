"use client";

import { useImperativeHandle, useRef, useState, type Ref } from "react";
import situations from "@/tests/situations.json";
import { formatDate, today } from "@/lib/dates";
import {
  LETTER_LABELS,
  LETTER_TYPES,
  isLetterType,
  type GapQuestion,
  type GapsResult,
  type Letter,
  type LetterType,
  type Outcome,
  type RouterResult,
} from "@/lib/types";
import { errorText, isBeispiel, postJson } from "../lib/api";
import { btnPrimary, btnSecondary, card, field, h1, h2, hint, label, linkBtn, wide } from "../lib/ui";
import Chip from "./Chip";
import DraftEditor, { NEW_APPROVAL, type Approval, type FlowInfo } from "./DraftEditor";
import MicButton, { useSpeechSupported } from "./MicButton";
import { ErrorBox, Loading } from "./Status";

/** Where a draft came from: typed situation or a deviation found in a Tagesbericht. */
export type DraftSource = { facts?: Record<string, unknown>; eventDate?: string; report?: string };

/** Lets the deviation checker jump into the letter flow ("Anzeige entwerfen"). */
export type LetterFlowHandle = { start: (text: string, letterType: LetterType, source: DraftSource) => void };

type Props = {
  ref?: Ref<LetterFlowHandle>;
  onRedirect: (tab: "bericht" | "zusammenfassen", text: string) => void;
};

type Step = "input" | "outcome" | "questions" | "draft";
type Busy = "" | "analyse" | "gaps" | "letter";

const BUSY_TEXT: Record<Exclude<Busy, "">, string> = {
  analyse: "Situation wird analysiert …",
  gaps: "Pflichtangaben werden geprüft …",
  letter: "Schreiben wird erstellt …",
};

export default function LetterFlow({ ref, onRedirect }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [input, setInput] = useState("");
  const [chooseType, setChooseType] = useState(false);
  const [override, setOverride] = useState<LetterType | "">("");
  const [letterType, setLetterType] = useState<LetterType>("behinderung");
  const [facts, setFacts] = useState<Record<string, unknown>>({});
  const [source, setSource] = useState<DraftSource>({});
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("anzeige");
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Letter | null>(null);
  const [approval, setApproval] = useState<Approval>(NEW_APPROVAL);
  const [redirect, setRedirect] = useState<RouterResult["intent"] | null>(null);
  const [busy, setBusy] = useState<Busy>("");
  const [error, setError] = useState("");
  const [aiMs, setAiMs] = useState(0);
  const [createdAt, setCreatedAt] = useState("");
  const retry = useRef<(() => void) | null>(null);
  const mic = useSpeechSupported();
  const topRef = useRef<HTMLDivElement>(null);

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Runs one step with loading text; on failure shows the error with "Erneut versuchen". */
  async function run(kind: Exclude<Busy, "">, action: () => Promise<void>) {
    retry.current = () => void run(kind, action);
    setBusy(kind);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }

  /** POST with timing, so the draft screen can show "Entwurf in X s erstellt". */
  async function timed<T>(url: string, body: unknown) {
    const t = performance.now();
    const data = await postJson<T>(url, body);
    setAiMs((ms) => ms + (performance.now() - t));
    return data;
  }

  async function checkGaps(type: LetterType, text: string, knownFacts: Record<string, unknown>) {
    const gaps = await timed<GapsResult>("/api/gaps", { letter_type: type, input: text, facts: knownFacts });
    setQuestions(gaps.questions);
    setAnswers({});
    setStep("questions");
    scrollTop();
  }

  function analyse(text: string, forced: LetterType | "", from: DraftSource = {}) {
    if (!text.trim()) return;
    setRedirect(null);
    setSource(from);
    setAiMs(0);
    void run("analyse", async () => {
      let type: LetterType;
      let knownFacts: Record<string, unknown> = from.facts ?? {};
      if (forced) {
        type = forced;
        setReason(from.facts ? "Aus dem Tagesbericht übernommen." : "Schreibenart selbst gewählt.");
        setOutcome("anzeige");
      } else {
        const r = await timed<RouterResult>("/api/route", { input: text });
        if (r.intent !== "letter") {
          setRedirect(r.intent);
          setReason(r.reason);
          return;
        }
        type = isLetterType(r.letter_type) ? r.letter_type : "behinderung";
        knownFacts = r.facts;
        setReason(r.reason);
        setOutcome(r.outcome);
        if (r.outcome !== "anzeige") {
          setLetterType(type);
          setFacts(knownFacts);
          setStep("outcome");
          scrollTop();
          return;
        }
      }
      setLetterType(type);
      setFacts(knownFacts);
      await checkGaps(type, text, knownFacts);
    });
  }

  function changeType(type: LetterType) {
    setLetterType(type);
    setReason("Schreibenart selbst geändert.");
    void run("gaps", () => checkGaps(type, input, facts));
  }

  function createLetter(useAnswers: boolean) {
    void run("letter", async () => {
      const given: Record<string, string> = {};
      if (useAnswers) {
        for (const q of questions) {
          const a = answers[q.field]?.trim();
          if (a) given[q.field] = a;
        }
      }
      const letter = await timed<Letter>("/api/letter", { letter_type: letterType, input, facts, answers: given });
      setAnswers(given);
      setCreatedAt(new Date().toISOString());
      setDraft(letter);
      setApproval(NEW_APPROVAL);
      setStep("draft");
      scrollTop();
    });
  }

  function restart() {
    setStep("input");
    setInput("");
    setDraft(null);
    setQuestions([]);
    setAnswers({});
    setRedirect(null);
    setSource({});
    setError("");
    scrollTop();
  }

  function example() {
    const s = situations[Math.floor(Math.random() * situations.length)];
    setInput(s.text);
    setRedirect(null);
  }

  useImperativeHandle(ref, () => ({
    start(text, type, from) {
      setStep("input");
      setDraft(null);
      setInput(text);
      setOverride("");
      analyse(text, type, from);
    },
  }));

  const busyView = busy && <Loading text={BUSY_TEXT[busy]} />;
  const errorView = error && <ErrorBox message={error} onRetry={() => retry.current?.()} />;
  const flow: FlowInfo = {
    input,
    answers,
    report: source.report,
    createdAt: createdAt || new Date(0).toISOString(),
    aiSeconds: isBeispiel() ? null : Math.round(aiMs / 1000),
  };

  return (
    <div ref={topRef} className="flex scroll-mt-24 flex-col gap-6">
      {step === "input" && (
        <section className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
          <label htmlFor="situation" className={h1}>Was ist auf der Baustelle passiert?</label>
          <textarea
            id="situation"
            className={`${field} min-h-48 text-lg`}
            placeholder="z. B. Bewehrungspläne für die Bodenplatte fehlen, Kolonne kann nicht anfangen …"
            value={input}
            disabled={!!busy}
            onChange={(e) => setInput(e.target.value)}
          />
          <p className={hint}>Eingabe in jeder Sprache möglich – das Schreiben wird auf Deutsch erstellt.</p>
          {/* Exactly one amber button: "Aufnahme" while the box is empty, "Analysieren" once there is text. */}
          <div className="flex flex-col gap-3">
            <MicButton primary={!input.trim()} onText={(t) => setInput((v) => (v.trim() ? `${v.trimEnd()} ${t}` : t))} />
            <button
              className={wide(mic && !input.trim() ? btnSecondary : btnPrimary)}
              onClick={() => analyse(input, override)}
              disabled={!!busy || !input.trim()}
            >
              Analysieren
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-6">
            <button className={linkBtn} onClick={example} disabled={!!busy}>Beispiel einfügen</button>
            <button className={linkBtn} onClick={() => setChooseType((v) => !v)} aria-expanded={chooseType}>
              Schreibenart selbst wählen
            </button>
          </div>
          {chooseType && (
            <div>
              <label htmlFor="override" className={label}>Schreibenart</label>
              <select
                id="override"
                className={field}
                value={override}
                onChange={(e) => setOverride(e.target.value as LetterType | "")}
              >
                <option value="">Automatisch erkennen</option>
                {LETTER_TYPES.map((t) => <option key={t} value={t}>{LETTER_LABELS[t]}</option>)}
              </select>
            </div>
          )}

          {busyView}
          {errorView}

          {redirect && (
            <div className={card}>
              <p className={h2}>
                {redirect === "deviation"
                  ? "Das sieht aus wie ein Tagesbericht."
                  : "Das sieht aus wie Protokoll, Tagebuch oder E-Mails."}
              </p>
              {reason && <p className="mt-1 text-[var(--muted)]">{reason}</p>}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  className={btnSecondary}
                  onClick={() => onRedirect(redirect === "deviation" ? "bericht" : "zusammenfassen", input)}
                >
                  {redirect === "deviation" ? "Tagesbericht prüfen" : "Zusammenfassen"}
                </button>
              </div>
              <p className={`${hint} mt-2`}>Oder „Schreibenart selbst wählen“ und erneut „Analysieren“.</p>
            </div>
          )}
        </section>
      )}

      {step === "outcome" && (
        <section className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
          <div className={`${card} bg-[var(--surface)]`}>
            {outcome !== "keine_anzeige" && <Chip kind="pruefung" />}
            <h2 className={`${h1} ${outcome !== "keine_anzeige" ? "mt-3" : ""}`}>
              {outcome === "keine_anzeige"
                ? "Keine Anzeige nötig"
                : "Ursache möglicherweise im eigenen Bereich – bitte prüfen"}
            </h2>
            {reason && <p className="mt-2 text-lg text-[var(--ink)]">{reason}</p>}
            <p className={`${hint} mt-3`}>Sie entscheiden. Wenn Sie trotzdem ein Schreiben brauchen, erstellen wir einen Entwurf.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button className={btnSecondary} onClick={() => void run("gaps", () => checkGaps(letterType, input, facts))} disabled={!!busy}>
                Trotzdem Entwurf erstellen
              </button>
              <button className={btnSecondary} onClick={() => setStep("input")} disabled={!!busy}>Eingabe ändern</button>
            </div>
          </div>
          <div className={card}>
            <p className="text-sm font-semibold text-[var(--muted)]">Ihre Beschreibung</p>
            <p className="mt-1 whitespace-pre-line">{input}</p>
          </div>
          {busyView}
          {errorView}
        </section>
      )}

      {step === "questions" && (
        <section className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={h1}>{LETTER_LABELS[letterType]}</h2>
            <Chip kind={questions.length ? "angaben" : "freigegeben"}>
              {questions.length ? "Angaben fehlen" : "Angaben vollständig"}
            </Chip>
          </div>
          {reason && <p className="-mt-3 text-[var(--muted)]">{reason}</p>}

          {questions.length > 0 ? (
            <div className={`${card} flex flex-col gap-4`}>
              <p className={h2}>
                {questions.length === 1 ? "Eine Angabe fehlt noch:" : `${questions.length} Angaben fehlen noch:`}
              </p>
              {questions.map((q, i) => (
                <div key={`${q.field}-${i}`}>
                  <label htmlFor={`q${i}`} className="mb-2 block text-lg font-semibold text-[var(--ink)]">{q.question}</label>
                  <input
                    id={`q${i}`}
                    className={`${field} text-lg`}
                    placeholder={q.example ? `z. B. ${q.example}` : ""}
                    value={answers[q.field] ?? ""}
                    disabled={!!busy}
                    autoFocus={i === 0}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.field]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && !busy && createLetter(true)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] p-4 font-semibold text-[var(--success-text)]">
              Alle Pflichtangaben sind vorhanden.
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button className={btnPrimary} onClick={() => createLetter(true)} disabled={!!busy}>
              Schreiben erstellen
            </button>
            {questions.length > 0 && (
              <button className={btnSecondary} onClick={() => createLetter(false)} disabled={!!busy}>
                Ohne Antworten erstellen
              </button>
            )}
          </div>
          {busyView}
          {errorView}

          <details className={card}>
            <summary className="cursor-pointer font-semibold text-[var(--ink)]">Beschreibung und Schreibenart</summary>
            <p className="mt-3 whitespace-pre-line">{input}</p>
            <label htmlFor="type" className={`${label} mt-4`}>Schreibenart</label>
            <select
              id="type"
              className={field}
              value={letterType}
              disabled={!!busy}
              onChange={(e) => changeType(e.target.value as LetterType)}
            >
              {LETTER_TYPES.map((t) => <option key={t} value={t}>{LETTER_LABELS[t]}</option>)}
            </select>
          </details>
          <div>
            <button className={linkBtn} onClick={() => setStep("input")} disabled={!!busy}>Zurück zur Eingabe</button>
          </div>
        </section>
      )}

      {step === "draft" && draft && (
        <DraftEditor
          letterType={letterType}
          draft={draft}
          onChange={setDraft}
          approval={approval}
          onApprovalChange={setApproval}
          onBack={() => setStep("questions")}
          onRestart={restart}
          facts={facts}
          eventDate={source.eventDate ?? ""}
          letterDate={source.eventDate || formatDate(today())}
          flow={flow}
        />
      )}
    </div>
  );
}
