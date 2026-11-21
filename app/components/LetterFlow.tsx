"use client";

import { useImperativeHandle, useRef, useState, useSyncExternalStore, type Ref } from "react";
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
import { countdown } from "../lib/verlauf";
import { useVerlaufEntries, withDeadlines } from "../lib/useVerlauf";
import { btnPrimary, greyLink, h1, issueTitle, itemHead, kicker, linkBtn, shortType, TYPE_COLOR } from "../lib/ui";
import CraneLoader, { atLeast } from "./CraneLoader";
import type { Tab } from "./Header";
import DraftEditor, { NEW_APPROVAL, type Approval, type FlowInfo } from "./DraftEditor";
import { useDictation } from "./MicButton";
import { ErrorBox, TypeSquare } from "./Status";

/** Where a draft came from: typed situation or a deviation found in a Tagesbericht. */
export type DraftSource = { facts?: Record<string, unknown>; eventDate?: string; report?: string };

/** Lets the deviation checker jump into the letter flow ("Anzeige entwerfen"). */
export type LetterFlowHandle = { start: (text: string, letterType: LetterType, source: DraftSource) => void };

type Props = {
  ref?: Ref<LetterFlowHandle>;
  onRedirect: (tab: "bericht" | "zusammenfassen", text: string) => void;
  onTab: (tab: Tab) => void;
};

type Step = "input" | "outcome" | "questions" | "draft";
type Busy = "" | "analyse" | "prepare" | "gaps" | "letter";

/** Crane loader per waiting step; the steps describe what the request really does. */
const LOADER: Record<Exclude<Busy, "">, { label: string; steps?: string[] }> = {
  analyse: { label: "Lage wird analysiert", steps: ["Lese die Eingabe", "Bestimme die Schreibenart", "Prüfe fehlende Angaben"] },
  prepare: { label: "Anzeige wird entworfen", steps: ["Sammle die Fakten", "Prüfe fehlende Angaben"] },
  gaps: { label: "Angaben werden geprüft" },
  letter: { label: "Anzeige wird entworfen", steps: ["Sammle die Fakten", "Formuliere das Schreiben", "Setze Platzhalter für Fehlendes"] },
};

const noop = () => () => {};
const longDate = () => new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();

export default function LetterFlow({ ref, onRedirect, onTab }: Props) {
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
  const [writing, setWriting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dictation = useDictation((t) => setInput((v) => (v.trim() ? `${v.trimEnd()} ${t}` : t)));
  const todayLong = useSyncExternalStore(noop, longDate, () => "");
  const { entries } = useVerlaufEntries();
  const openLetters = withDeadlines(entries);
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
      await atLeast(900, action());
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
    void run(forced ? "prepare" : "analyse", async () => {
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
    setWriting(false);
    scrollTop();
  }

  function openInput() {
    setWriting(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function discard() {
    dictation.stop();
    setInput("");
    setRedirect(null);
    setWriting(false);
  }

  function example() {
    const s = situations[Math.floor(Math.random() * situations.length)];
    setInput(s.text);
    setRedirect(null);
    setWriting(true);
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

  const errorView = error && <div className="mt-8"><ErrorBox message={error} onRetry={() => retry.current?.()} /></div>;
  const flow: FlowInfo = {
    input,
    answers,
    report: source.report,
    createdAt: createdAt || new Date(0).toISOString(),
    aiSeconds: isBeispiel() ? null : Math.round(aiMs / 1000),
  };
  const typeLabel = LETTER_LABELS[letterType];
  const color = TYPE_COLOR[letterType];
  const isOpen = writing || !!input.trim() || dictation.recording;

  if (busy) return <CraneLoader {...LOADER[busy]} />;

  return (
    <div ref={topRef} className="scroll-mt-24">
      {step === "input" && (
        <div className="fade-in">
          <section className="wrap pt-16 pb-[72px]">
            <p className={`${kicker} min-h-[18px] text-[var(--navy)]`}>{todayLong}</p>
            <h1 className={`${h1} mt-3 mb-8`}>Was ist auf der Baustelle passiert?</h1>
            <div className="max-w-[760px]">
              {!isOpen ? (
                <>
                  <div className="flex items-center gap-4 border-b-2 border-[var(--ink)]">
                    <button
                      className="min-h-[60px] flex-1 cursor-text text-left font-serif text-[23px] text-[#6B6B6B] italic"
                      onClick={() => openInput()}
                    >
                      Hier schreiben …
                    </button>
                    {dictation.supported && (
                      <button className="inline-flex min-h-11 shrink-0 items-center gap-2 bg-[var(--red)] px-4 font-sans text-[14px] font-bold text-white" onClick={() => { openInput(); dictation.start(); }}>
                        <span aria-hidden className="dot inline-block h-[9px] w-[9px] bg-white" /> Sprechen
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-6">
                    <button className={greyLink} onClick={example}>Beispiel einfügen</button>
                    <button className={greyLink} onClick={() => setChooseType((v) => !v)} aria-expanded={chooseType}>Schreibenart selbst wählen</button>
                  </div>
                </>
              ) : (
                <div className="open-in">
                  {dictation.recording && (
                    <p className={`${kicker} mb-2 flex items-center gap-2 text-[var(--red)]`} aria-live="polite">
                      <span aria-hidden className="dot blink inline-block h-[9px] w-[9px] bg-[var(--red)]" /> Hört zu
                      {dictation.interim && <span className="font-serif text-[16px] font-normal tracking-normal normal-case italic text-[var(--grey)]">{dictation.interim}</span>}
                    </p>
                  )}
                  <textarea
                    ref={inputRef}
                    id="situation"
                    aria-label="Was ist auf der Baustelle passiert?"
                    className="line-field min-h-[120px] font-serif text-[23px] leading-[1.5]"
                    placeholder="Hier schreiben … in jeder Sprache"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                    {input.trim() && (
                      <button className={btnPrimary} onClick={() => analyse(input, override)}>Analysieren</button>
                    )}
                    {dictation.supported && (
                      <button className={`${linkBtn} gap-2`} onClick={dictation.toggle} aria-pressed={dictation.recording}>
                        <span aria-hidden className="dot inline-block h-[9px] w-[9px] bg-[var(--red)]" />
                        {dictation.recording ? "Stopp" : "Sprechen"}
                      </button>
                    )}
                    <button className={greyLink} onClick={discard}>Verwerfen</button>
                    <button className={greyLink} onClick={example}>Beispiel einfügen</button>
                    <button className={greyLink} onClick={() => setChooseType((v) => !v)} aria-expanded={chooseType}>Schreibenart selbst wählen</button>
                  </div>
                </div>
              )}
              {dictation.error && <p role="alert" className="mt-3 font-sans text-[14px] font-semibold text-[var(--red)]">{dictation.error}</p>}
              {chooseType && (
                <div className="open-in mt-4">
                  <select
                    id="override"
                    aria-label="Schreibenart"
                    className="min-h-11 border-0 border-b-2 border-[var(--ink)] bg-transparent pr-2 font-sans text-[16px] font-semibold"
                    value={override}
                    onChange={(e) => setOverride(e.target.value as LetterType | "")}
                  >
                    <option value="">Schreibenart automatisch erkennen</option>
                    {LETTER_TYPES.map((t) => <option key={t} value={t}>{LETTER_LABELS[t]}</option>)}
                  </select>
                </div>
              )}
              {errorView}

              {redirect && (
                <div className="open-in mt-10 border-t-2 border-[var(--ink)] pt-3">
                  <p className={`${kicker} text-[var(--navy)]`}>Hinweis</p>
                  <p className={`${itemHead} mt-1`}>
                    {redirect === "deviation" ? "Das sieht aus wie ein Tagesbericht." : "Das sieht aus wie Protokoll, Tagebuch oder E-Mails."}
                  </p>
                  {reason && <p className="mt-1 italic text-[var(--grey)]">{reason}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-x-6">
                    <button className={btnPrimary} onClick={() => onRedirect(redirect === "deviation" ? "bericht" : "zusammenfassen", input)}>
                      {redirect === "deviation" ? "Tagesbericht prüfen" : "Zusammenfassen"}
                    </button>
                    <span className="font-sans text-[14px] text-[var(--grey)]">oder „Schreibenart selbst wählen“ und erneut „Analysieren“</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {openLetters.length > 0 && (
            <section className="wrap pt-12 pb-6">
              <p className={`${kicker} border-t-2 border-[var(--ink)] pt-3`}>Offene Schreiben</p>
              <ul>
                {openLetters.map((e) => {
                  const c = countdown(e.deadline);
                  return (
                    <li key={e.id}>
                      <button onClick={() => onTab("verlauf")} className="flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--rule)] py-4 text-left hover:bg-[#FAFAFA]">
                        <span className="min-w-0">
                          <span className={`${kicker} flex items-center gap-2`}>
                            <TypeSquare color={TYPE_COLOR[e.type]} size={10} /> {shortType(LETTER_LABELS[e.type])}{e.example ? " · Beispiel" : ""}
                          </span>
                          <span className={`${itemHead} mt-1 block`}>{issueTitle(e.subject, shortType(LETTER_LABELS[e.type]))}</span>
                        </span>
                        {c && <span className={`font-sans text-[13px] font-bold uppercase ${c.tone === "ok" ? "text-[var(--grey)]" : "text-[var(--red)]"}`}>{c.text}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      {step === "outcome" && (
        <section className="wrap fade-in pt-16 pb-10">
          <p className={`${kicker} flex items-center gap-2 ${outcome === "keine_anzeige" ? "text-[var(--navy)]" : "text-[var(--red)]"}`}>
            <TypeSquare color={outcome === "keine_anzeige" ? "var(--navy)" : "var(--red)"} />
            {outcome === "keine_anzeige" ? "Im Blick" : "Prüfung erforderlich"}
          </p>
          <h1 className={`${h1} mt-3`}>
            {outcome === "keine_anzeige" ? "Keine Anzeige nötig" : "Ursache möglicherweise im eigenen Bereich – bitte prüfen"}
          </h1>
          <div className="mt-6 max-w-[760px]">
            {reason && <p className="text-[21px] leading-snug">{reason}</p>}
            <p className="mt-2 italic text-[var(--grey)]">Sie entscheiden. Wenn Sie trotzdem ein Schreiben brauchen, erstellen wir einen Entwurf.</p>
            <div className="mt-4 flex flex-wrap gap-x-6">
              <button className={linkBtn} onClick={() => void run("gaps", () => checkGaps(letterType, input, facts))}>Trotzdem Entwurf erstellen</button>
              <button className={linkBtn} onClick={() => setStep("input")}>Eingabe ändern</button>
            </div>
            <div className="mt-10 border-t-2 border-[var(--ink)] pt-3">
              <p className={kicker}>Ihre Beschreibung</p>
              <p className="mt-1 whitespace-pre-line">{input}</p>
            </div>
            {errorView}
          </div>
        </section>
      )}

      {step === "questions" && (
        <section className="wrap fade-in pt-16 pb-10">
          <p className={`${kicker} flex items-center gap-2`}>
            <TypeSquare color={color} /> Rückfragen
          </p>
          <h1 className={`${h1} mt-3`}>{typeLabel}</h1>
          <div className="mt-6 max-w-[760px]">
            {reason && <p className="italic text-[var(--grey)]">{reason}</p>}
            {questions.length > 0 ? (
              <div className="mt-8 flex flex-col gap-8">
                <p className={`${kicker} text-[var(--red)]`}>
                  {questions.length === 1 ? "Eine Angabe fehlt noch" : `${questions.length} Angaben fehlen noch`}
                </p>
                {questions.map((q, i) => (
                  <div key={`${q.field}-${i}`} className="-mt-4">
                    <label htmlFor={`q${i}`} className="block font-serif text-[20px] leading-snug font-semibold">{q.question}</label>
                    <input
                      id={`q${i}`}
                      className="line-field mt-2 min-h-12 font-serif text-[20px]"
                      placeholder={q.example ? `z. B. ${q.example}` : ""}
                      value={answers[q.field] ?? ""}
                      autoFocus={i === 0}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.field]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && createLetter(true)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className={`${kicker} mt-8 text-[var(--green)]`}>✓ Angaben vollständig</p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              <button className={btnPrimary} onClick={() => createLetter(true)}>Schreiben erstellen</button>
              {questions.length > 0 && (
                <button className={linkBtn} onClick={() => createLetter(false)}>Ohne Antworten erstellen</button>
              )}
            </div>
            {errorView}

            <details className="mt-12 border-t-2 border-[var(--ink)] pt-3">
              <summary className={`${kicker} min-h-11 cursor-pointer`}>Beschreibung und Schreibenart</summary>
              <p className="mt-2 whitespace-pre-line">{input}</p>
              <select
                id="type"
                aria-label="Schreibenart"
                className="mt-4 min-h-11 border-0 border-b-2 border-[var(--ink)] bg-transparent pr-2 font-sans text-[16px] font-semibold"
                value={letterType}
                onChange={(e) => changeType(e.target.value as LetterType)}
              >
                {LETTER_TYPES.map((t) => <option key={t} value={t}>{LETTER_LABELS[t]}</option>)}
              </select>
            </details>
            <div className="mt-4">
              <button className={linkBtn} onClick={() => setStep("input")}>Zurück zur Eingabe</button>
            </div>
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
