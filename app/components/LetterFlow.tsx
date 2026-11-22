"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { formatDate, today } from "@/lib/dates";
import { mengenBlocker, mengenCalc } from "@/lib/mengen";
import { LETTER_LABELS, LETTER_TYPES, UNKNOWN, type GapQuestion, type GapsResult, type Letter, type LetterType } from "@/lib/types";
import { errorText, isBeispiel, postJson } from "../lib/api";
import { btnPrimary, greyLink, h1, kicker, kickerUrgent, linkBtn, shortType } from "../lib/ui";
import CraneLoader, { atLeast } from "./CraneLoader";
import type { Tab } from "./Header";
import DraftEditor, { NEW_APPROVAL, type Approval, type FlowInfo } from "./DraftEditor";
import HeuteView from "./HeuteView";
import MengenBox from "./MengenBox";
import { useFocus } from "./Focus";
import { ErrorBox } from "./Status";
import VoiceField from "./VoiceField";

/** Where a draft came from: an entry on „Heute“ or a deviation found in a Tagesbericht. */
export type DraftSource = { facts?: Record<string, unknown>; eventDate?: string; report?: string; reason?: string; attachment?: string; language?: string };

/** Adds „Anlage: Foto vom …“ (the photo itself never goes to the AI). */
function withAttachment(body: string, attachment?: string) {
  if (!attachment) return body;
  const parts = body.trimEnd().split(/\n\s*\n/);
  const last = parts[parts.length - 1];
  if (/^Anlagen?:/.test(last)) {
    parts[parts.length - 1] = `Anlagen: ${last.replace(/^Anlagen?:\s*/, "")}, ${attachment}`;
    return parts.join("\n\n");
  }
  return `${body.trimEnd()}\n\nAnlage: ${attachment}`;
}

/** Lets other screens jump into the letter flow („Schreiben entwerfen“, „Anzeige entwerfen“). */
export type LetterFlowHandle = { start: (text: string, letterType: LetterType, source: DraftSource) => void };

type Props = {
  ref?: Ref<LetterFlowHandle>;
  onTab: (tab: Tab) => void;
  onSettings: () => void;
  /** Tells the page whether the start screen (big nameplate) is showing. */
  onStartScreen?: (start: boolean) => void;
};

type Step = "input" | "questions" | "draft";
type Busy = "" | "prepare" | "gaps" | "letter";

const LOADER: Record<Exclude<Busy, "">, { label: string; steps?: string[] }> = {
  prepare: { label: "Anzeige wird entworfen", steps: ["Sammle die Fakten", "Prüfe fehlende Angaben"] },
  gaps: { label: "Angaben werden geprüft" },
  letter: { label: "Anzeige wird entworfen", steps: ["Sammle die Fakten", "Formuliere das Schreiben", "Prüfe auf Vollständigkeit"] },
};

export default function LetterFlow({ ref, onTab, onSettings, onStartScreen }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [input, setInput] = useState("");
  const [letterType, setLetterType] = useState<LetterType>("behinderung");
  const [facts, setFacts] = useState<Record<string, unknown>>({});
  const [source, setSource] = useState<DraftSource>({});
  const [reason, setReason] = useState("");
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  /** Rückfragen page texts in the language of the input (from the gaps prompt; German by default). */
  const [lang, setLang] = useState({ code: "de", intro: "", unknownLabel: UNKNOWN });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [unknown, setUnknown] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Letter | null>(null);
  const [approval, setApproval] = useState<Approval>(NEW_APPROVAL);
  const [busy, setBusy] = useState<Busy>("");
  const [error, setError] = useState("");
  const [aiMs, setAiMs] = useState(0);
  const [createdAt, setCreatedAt] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const retry = useRef<(() => void) | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onStartScreen?.(step === "input" && !busy);
  }, [step, busy, onStartScreen]);

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Runs one step with the crane loader; on failure shows the error with „Erneut versuchen“. */
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

  /** POST with timing, so the draft screen can show „in X s entworfen“. */
  async function timed<T>(url: string, body: unknown) {
    const t = performance.now();
    const data = await postJson<T>(url, body);
    setAiMs((ms) => ms + (performance.now() - t));
    return data;
  }

  async function checkGaps(type: LetterType, text: string, knownFacts: Record<string, unknown>, language = source.language) {
    // The router already detected the input language; the gaps prompt writes its questions in it.
    const gaps = await timed<GapsResult>("/api/gaps", { letter_type: type, input: text, facts: knownFacts, language });
    setQuestions(gaps.questions);
    setLang({ code: gaps.language || "de", intro: gaps.intro || "", unknownLabel: gaps.unknown_label || UNKNOWN });
    setAnswers({});
    setUnknown({});
    setStep("questions");
    scrollTop();
  }

  /** Rückfragen for a known letter type (the check already ran on „Heute“ or in the Tagesbericht). */
  function prepare(text: string, type: LetterType, from: DraftSource) {
    setSource(from);
    setInput(text);
    setAiMs(0);
    setLetterType(type);
    setFacts(from.facts ?? {});
    setReason(from.reason ?? (from.report ? "Aus dem Tagesbericht übernommen." : ""));
    // A new entry starts clean: nothing from the previous entry's Rückfragen or draft is reused.
    setDraft(null);
    setQuestions([]);
    setAnswers({});
    setUnknown({});
    setApproval(NEW_APPROVAL);
    setCreatedAt("");
    setStep("input");
    void run("prepare", () => checkGaps(type, text, from.facts ?? {}, from.language));
  }

  function changeType(type: LetterType) {
    setLetterType(type);
    setReason("Schreibenart selbst geändert.");
    void run("gaps", () => checkGaps(type, input, facts));
  }

  // Every question needs an answer or „Weiß ich nicht“ before the letter is written.
  const answered = (field: string) => unknown[field] || !!answers[field]?.trim();
  const allAnswered = questions.every((q) => answered(q.field));
  // Mengenänderung: code calculation from input, facts and the answers so far (unknown answers left out).
  const known: Record<string, string> = {};
  for (const q of questions) if (!unknown[q.field] && answers[q.field]?.trim()) known[q.field] = answers[q.field].trim();
  const mengen = letterType === "mengenaenderung" ? mengenCalc(input, facts, known) : null;
  const mengenStop = !!mengen && (!!mengenBlocker(mengen) || mengen.ordered === true);

  function createLetter() {
    if (!allAnswered || mengenStop) return;
    void run("letter", async () => {
      const given: Record<string, string> = {};
      for (const q of questions) {
        given[q.field] = unknown[q.field] ? UNKNOWN : answers[q.field].trim();
      }
      const letter = await timed<Letter>("/api/letter", { letter_type: letterType, input, facts, answers: given });
      setAnswers(given);
      setCreatedAt(new Date().toISOString());
      setDraft({ ...letter, body: withAttachment(letter.body, source.attachment) });
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
    setSource({});
    setError("");
    scrollTop();
  }

  // Focus mode: Rückfragen and Schreiben replace the masthead with the slim bar; „← Zurück“ = Heute.
  const short = shortType(LETTER_LABELS[letterType]);
  useFocus(
    "heute",
    step !== "input" || busy === "prepare"
      ? {
          title: step === "draft" ? `${short} · Schreiben` : `${short} · Rückfragen`,
          status: step === "draft" ? (approval.status === "freigegeben" ? "Freigegeben" : "Entwurf") : "",
          onBack: restart,
        }
      : null,
  );

  useImperativeHandle(ref, () => ({ start: (text, type, from) => prepare(text, type, from) }));

  const errorView = error && <div className="mt-8"><ErrorBox message={error} onRetry={() => retry.current?.()} /></div>;
  const flow: FlowInfo = {
    input,
    answers,
    report: source.report,
    createdAt: createdAt || new Date(0).toISOString(),
    aiSeconds: isBeispiel() ? null : Math.round(aiMs / 1000),
  };
  const typeLabel = LETTER_LABELS[letterType];
  const select = "min-h-11 border-0 border-b border-[var(--ink)] bg-transparent pr-2 font-sans text-[15px] font-semibold";

  if (busy) return <CraneLoader {...LOADER[busy]} />;

  return (
    <div ref={topRef} className="scroll-mt-24">
      {step === "input" && (
        <>
          <HeuteView onSettings={onSettings} onDraft={(d) => prepare(d.text, d.letterType, { facts: d.facts, eventDate: d.eventDate, reason: d.reason, attachment: d.attachment, language: d.language })} onTab={onTab} />
          {errorView}
        </>
      )}

      {step === "questions" && (
        <section className="fade-in">
          <p className={kicker}>{shortType(typeLabel)}</p>
          <h1 className={h1}>{shortType(typeLabel)}</h1>
          {reason && <p className="-mt-2 line-clamp-2 text-[18px] text-[var(--grey)] italic">{reason}</p>}
          {questions.length > 0 ? (
            <div className="mt-8">
              <p className={kickerUrgent}>{lang.code !== "de" && lang.intro ? lang.intro : questions.length === 1 ? "Eine Angabe fehlt noch" : `${questions.length} Angaben fehlen noch`}</p>
              {questions.map((q, i) => {
                const off = !!unknown[q.field];
                return (
                  <div key={`${q.field}-${i}`} className="mt-5">
                    <label htmlFor={`q${i}`} className="block font-serif text-[20px] leading-snug font-semibold">{q.question}</label>
                    <VoiceField
                      id={`q${i}`}
                      className={`line-field ${off ? "text-[var(--muted)]" : ""}`}
                      placeholder={off ? lang.unknownLabel : q.example ? `z. B. ${q.example}` : ""}
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
                      className={`${greyLink} gap-2 text-[13px]`}
                    >
                      <span aria-hidden className={`inline-block h-[14px] w-[14px] border ${off ? "border-[var(--ink)] bg-[var(--ink)]" : "border-[var(--grey)]"}`} />
                      {lang.unknownLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={`${kicker} mt-8`}>✓ Angaben vollständig</p>
          )}

          {mengen && <MengenBox calc={mengen} />}

          <div className="mt-8">
            {mengenStop ? (
              mengen?.ordered && <button className={`${linkBtn} font-bold`} onClick={() => changeType("mehrkosten")}>Als Mehrkostenanzeige weiter →</button>
            ) : (
              <button className={`${btnPrimary} w-full min-[600px]:w-auto`} onClick={createLetter} disabled={!allAnswered}>Schreiben erstellen</button>
            )}
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
            <button className={linkBtn} onClick={restart}>Zurück zu Heute</button>
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
          letterDate={formatDate(today())}
          flow={flow}
        />
      )}
    </div>
  );
}
