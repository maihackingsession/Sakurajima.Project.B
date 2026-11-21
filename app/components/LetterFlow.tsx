"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import situations from "@/tests/situations.json";
import { formatDate, parseGermanDate, today } from "@/lib/dates";
import {
  LETTER_LABELS,
  LETTER_TYPES,
  isLetterType,
  UNKNOWN,
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
import { btnPrimary, greyLink, h1, issueTitle, kicker, kickerUrgent, linkBtn, listHead, listHeadFirst, recBtn, shortType } from "../lib/ui";
import CraneLoader, { atLeast } from "./CraneLoader";
import type { Tab } from "./Header";
import DraftEditor, { NEW_APPROVAL, type Approval, type FlowInfo } from "./DraftEditor";
import VoiceField, { useDictation } from "./VoiceField";
import { ErrorBox, RecDot } from "./Status";

/** Where a draft came from: typed situation or a deviation found in a Tagesbericht. */
export type DraftSource = { facts?: Record<string, unknown>; eventDate?: string; report?: string };

/** Lets the deviation checker jump into the letter flow ("Anzeige entwerfen"). */
export type LetterFlowHandle = { start: (text: string, letterType: LetterType, source: DraftSource) => void };

type Props = {
  ref?: Ref<LetterFlowHandle>;
  onRedirect: (tab: "bericht" | "zusammenfassen", text: string) => void;
  onTab: (tab: Tab) => void;
  /** Tells the page whether the start screen (big nameplate) is showing. */
  onStartScreen?: (start: boolean) => void;
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


export default function LetterFlow({ ref, onRedirect, onTab, onStartScreen }: Props) {
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
  const [unknown, setUnknown] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Letter | null>(null);
  const [approval, setApproval] = useState<Approval>(NEW_APPROVAL);
  const [redirect, setRedirect] = useState<RouterResult["intent"] | null>(null);
  const [busy, setBusy] = useState<Busy>("");
  const [error, setError] = useState("");
  const [aiMs, setAiMs] = useState(0);
  const [createdAt, setCreatedAt] = useState("");
  const retry = useRef<(() => void) | null>(null);
  const [writing, setWriting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const dictation = useDictation((t) => setInput((v) => (v.trim() ? `${v.trimEnd()} ${t}` : t)));
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    onStartScreen?.(step === "input" && !busy);
  }, [step, busy, onStartScreen]);
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
    setUnknown({});
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

  // Every question needs an answer or „Weiß ich nicht“ before the letter is written.
  const answered = (field: string) => unknown[field] || !!answers[field]?.trim();
  const allAnswered = questions.every((q) => answered(q.field));

  function createLetter() {
    if (!allAnswered) return;
    void run("letter", async () => {
      const given: Record<string, string> = {};
      for (const q of questions) {
        given[q.field] = unknown[q.field] ? UNKNOWN : answers[q.field].trim();
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
  const isOpen = writing || !!input.trim() || dictation.recording;
  const select = "min-h-11 border-0 border-b border-[var(--ink)] bg-transparent pr-2 font-sans text-[15px] font-semibold";

  if (busy) return <CraneLoader {...LOADER[busy]} />;

  return (
    <div ref={topRef} className="scroll-mt-24">
      {step === "input" && (
        <div>
          <section className="fade-in" aria-labelledby="h-eintrag">
            <p className={kicker}>Neuer Eintrag</p>
            <h1 id="h-eintrag" className={h1}>Was ist auf der Baustelle passiert?</h1>
            {!isOpen ? (
              <>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--line)]">
                  <button
                    className="min-h-14 flex-auto cursor-text text-left font-serif text-[21px] text-[var(--muted)] italic hover:text-[var(--ink)]"
                    onClick={() => openInput()}
                  >
                    Hier schreiben …
                  </button>
                  {dictation.supported && (
                    <button className={recBtn} onClick={() => { openInput(); dictation.start(); }}>
                      <RecDot /> Sprechen
                    </button>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-6">
                  <button className={`${greyLink} text-[13px]`} onClick={example}>Beispiel einfügen</button>
                  <button className={`${greyLink} text-[13px]`} onClick={() => setChooseType((v) => !v)} aria-expanded={chooseType}>Schreibenart selbst wählen</button>
                </div>
              </>
            ) : (
              <div className="open-in">
                <VoiceField
                  id="situation"
                  label="Was ist auf der Baustelle passiert?"
                  multiline
                  fieldRef={inputRef}
                  dictation={dictation}
                  className="line-field max-h-[50vh] min-h-[96px] overflow-y-auto"
                  placeholder="Hier schreiben … in jeder Sprache"
                  value={input}
                  onChange={setInput}
                >
                  {input.trim() && (
                    <button className={`${btnPrimary} open-in`} onClick={() => analyse(input, override)}>Analysieren</button>
                  )}
                </VoiceField>
                <div className="mt-1 flex flex-wrap gap-x-6">
                  <button className={greyLink} onClick={discard}>Verwerfen</button>
                  <button className={greyLink} onClick={() => setChooseType((v) => !v)} aria-expanded={chooseType}>Schreibenart selbst wählen</button>
                </div>
              </div>
            )}
            {chooseType && (
              <div className="open-in mt-4">
                <select id="override" aria-label="Schreibenart" className={select} value={override} onChange={(e) => setOverride(e.target.value as LetterType | "")}>
                  <option value="">Schreibenart automatisch erkennen</option>
                  {LETTER_TYPES.map((t) => <option key={t} value={t}>{LETTER_LABELS[t]}</option>)}
                </select>
              </div>
            )}
            {errorView}

            {redirect && (
              <div className="open-in mt-10 border-t-2 border-[var(--ink)] pt-3">
                <p className={kicker}>Hinweis</p>
                <p className={`${listHead} mt-1`}>
                  {redirect === "deviation" ? "Das sieht aus wie ein Tagesbericht." : "Das sieht aus wie Protokoll, Tagebuch oder E-Mails."}
                </p>
                {reason && <p className="mt-1 text-[var(--grey)] italic">{reason}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <button className={btnPrimary} onClick={() => onRedirect(redirect === "deviation" ? "bericht" : "zusammenfassen", input)}>
                    {redirect === "deviation" ? "Tagesbericht prüfen" : "Zusammenfassen"}
                  </button>
                  <button className={greyLink} onClick={() => setChooseType(true)}>Schreibenart selbst wählen</button>
                </div>
              </div>
            )}
          </section>

          {openLetters.length > 0 && (
            <section className="fade-in mt-14 border-t-2 border-[var(--ink)] pt-[10px]" style={{ animationDelay: "120ms" }} aria-labelledby="h-faellig">
              <h2 id="h-faellig" className="mb-1 font-sans text-[13px] font-extrabold tracking-[.04em] uppercase">Heute fällig</h2>
              <ul>
                {openLetters.map((e, i) => {
                  const c = countdown(e.deadline);
                  const urgent = c && c.tone === "late" || c?.text === "heute fällig";
                  return (
                    <li key={e.id}>
                      <button onClick={() => onTab("verlauf")} className="block w-full border-b border-[var(--rule)] py-4 text-left hover:text-[var(--accent)]">
                        <span className={`block ${i === 0 ? listHeadFirst : listHead}`}>
                          {shortType(LETTER_LABELS[e.type])}: {issueTitle(e.subject, e.deadline)}{e.example ? " (Beispiel)" : ""}
                        </span>
                        <span className={`mt-2 block font-sans text-[12px] tracking-[.04em] uppercase ${urgent ? "font-bold text-[var(--urgent)]" : "font-semibold text-[var(--grey)]"}`}>
                          {deadlineStatus(e.deadline)}
                        </span>
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
        <section className="fade-in">
          <p className={outcome === "keine_anzeige" ? kicker : kickerUrgent}>{outcome === "keine_anzeige" ? "Im Blick" : "Prüfung erforderlich"}</p>
          <h1 className={h1}>{outcome === "keine_anzeige" ? "Keine Anzeige nötig" : "Ursache möglicherweise im eigenen Bereich – bitte prüfen"}</h1>
          {reason && <p className="text-[19px] leading-snug">{reason}</p>}
          <div className="mt-4 flex flex-wrap gap-x-6">
            <button className={linkBtn} onClick={() => void run("gaps", () => checkGaps(letterType, input, facts))}>Trotzdem Entwurf erstellen</button>
            <button className={linkBtn} onClick={() => setStep("input")}>Eingabe ändern</button>
          </div>
          <div className="mt-10 border-t-2 border-[var(--ink)] pt-[10px]">
            <p className="font-sans text-[13px] font-extrabold tracking-[.04em] uppercase">Ihre Beschreibung</p>
            <p className="mt-2 whitespace-pre-line">{input}</p>
          </div>
          {errorView}
        </section>
      )}

      {step === "questions" && (
        <section className="fade-in">
          <p className={kicker}>{shortType(typeLabel)}</p>
          <h1 className={h1}>{shortType(typeLabel)}</h1>
          {reason && <p className="-mt-2 line-clamp-2 text-[18px] text-[var(--grey)] italic">{reason}</p>}
          {questions.length > 0 ? (
            <div className="mt-8">
              <p className={kickerUrgent}>{questions.length === 1 ? "Eine Angabe fehlt noch" : `${questions.length} Angaben fehlen noch`}</p>
              {questions.map((q, i) => {
                const off = !!unknown[q.field];
                return (
                  <div key={`${q.field}-${i}`} className="mt-5">
                    <label htmlFor={`q${i}`} className="block font-serif text-[20px] leading-snug font-semibold">{q.question}</label>
                    <VoiceField
                      id={`q${i}`}
                      className={`line-field ${off ? "text-[var(--muted)]" : ""}`}
                      placeholder={off ? "Weiß ich nicht" : q.example ? `z. B. ${q.example}` : ""}
                      value={off ? "" : answers[q.field] ?? ""}
                      disabled={off}
                      autoFocus={i === 0}
                      onChange={(v) => setAnswers((a) => ({ ...a, [q.field]: v }))}
                      onEnter={createLetter}
                    />
                    <button
                      type="button"
                      aria-pressed={off}
                      onClick={() => setUnknown((u) => ({ ...u, [q.field]: !u[q.field] }))}
                      className={`${greyLink} gap-2 text-[13px] no-underline`}
                    >
                      <span aria-hidden className={`inline-block h-[14px] w-[14px] border ${off ? "border-[var(--ink)] bg-[var(--ink)]" : "border-[var(--grey)]"}`} />
                      Weiß ich nicht
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={`${kicker} mt-8`}>✓ Angaben vollständig</p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button className={`${btnPrimary} w-full min-[600px]:w-auto`} onClick={createLetter} disabled={!allAnswered}>Schreiben erstellen</button>
          </div>
          {errorView}

          <div className="mt-12 border-t-2 border-[var(--ink)]">
            <button
              onClick={() => setShowDetails((v) => !v)}
              aria-expanded={showDetails}
              className="flex min-h-[52px] w-full items-center justify-between gap-4 text-left font-sans text-[13px] font-extrabold tracking-[.04em] uppercase"
            >
              <span>Beschreibung und Schreibenart</span>
              <span aria-hidden className="text-[var(--accent)]">{showDetails ? "▾" : "▸"}</span>
            </button>
            {showDetails && (
              <div className="open-in pb-2">
                <p className="whitespace-pre-line">{input}</p>
                <select id="type" aria-label="Schreibenart" className={`${select} mt-4`} value={letterType} onChange={(e) => changeType(e.target.value as LetterType)}>
                  {LETTER_TYPES.map((t) => <option key={t} value={t}>{LETTER_LABELS[t]}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="mt-2 border-t border-[var(--rule)]">
            <button className={linkBtn} onClick={() => setStep("input")}>Zurück zur Eingabe</button>
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

/** Status line of a deadline: „Heute fällig“, „Überfällig seit …“ or „Mo 23.11. · noch 2 Tage“. */
function deadlineStatus(deadline: string) {
  const c = countdown(deadline);
  const d = parseGermanDate(deadline);
  if (!c || !d) return deadline;
  if (c.tone === "late" || c.text === "heute fällig") return c.text;
  const wd = d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
  return `${wd} ${formatDate(d, true)} · ${c.text}`;
}
