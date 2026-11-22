# HANDOVER — TUM.ai Construction Hackathon, Challenge B

> Read this file fully before doing anything. It is the source of truth for scope, rules and workflow.
> Keep it up to date: when a decision changes, edit this file.

---

## 1. Situation

- **Event:** TUM.ai Construction Hackathon with the Bayerischer Bauindustrieverband (BBIV), SCCM Garching, 20–22 Nov 2026.
- **Team:** 3 people (possibly a 4th joins). Nobody on the team writes code by hand. **Claude Code writes all code.** Our strengths: domain research, languages (German + others), pitching.
- **Hardware:** 1 laptop (runs Claude Code, connected to GitHub), 2 iPads, phones.
- **Claude:** 2 Claude Pro accounts. Plus hackathon API credits (arrive via Discord/email) for the app's own Claude calls.
- **Key times:**
  - Fri 20:00 challenge selection, hacking starts
  - Sat 18:00 **feature freeze** (only bug fixes + polish after this)
  - Sun **11:30 our internal submission deadline** (official: 12:00)
  - Sun 13:00 pitches to BBIV member companies

## 2. The challenge (B): AI Site Manager Assistant

Site managers lose hours on documentation and formal notices. The brief asks for an assistant that:

1. Captures site situations by voice or text (mobile dictation)
2. Analyzes daily site reports and detects deviations from the plan
3. Suggests letters from a few keywords: delay/obstruction notice (Behinderungsanzeige), additional cost notice (Mehrkostenanzeige), notice of concern / defect (Bedenkenanzeige / Mängelanzeige)
4. Creates structured summaries of site diary entries, meeting minutes and emails
5. Auto-drafts correspondence when a deviation is detected
6. **Human-in-the-loop:** the site manager always reviews and controls the content

**Our pitch line:** "An assistant for the site manager, not a replacement."

## 3. Scope — what we build, in this order

### Built (in the app, checked in Beispielmodus and with real AI)
Product name **Baufrist – Bauleiter-Assistent**. Demo dates are relative to today (`{T}` tokens in /data).

1. **Neuer Eintrag:** type or dictate a situation (browser dictation, Web Speech API; not tested on real iPad/Android devices), in any language (tested: Polish, Turkish); the letter is always formal German.
2. **Router with verdict:** letter type (Behinderung, Mehrkosten, Bedenken, Mängel an NU) + „Keine Anzeige nötig“ / „Ursache möglicherweise im eigenen Bereich – bitte prüfen“ with „Trotzdem Entwurf erstellen“.
3. **Rückfragen:** max. 3 questions, only missing required facts, in the input's language.
4. **Tagesbericht prüfen:** report vs. Bauzeitenplan → deviation („Unverzüglich anzeigen – heute“, urgency computed in code) → „Anzeige entwerfen“ with the report's facts (usually 1 Rückfrage left).
5. **Schreiben:** DIN-5008-like letter, editable, [Platzhalter] highlighted, signature block exactly once (added by the template; any closing the AI writes is stripped in code). Status Entwurf → Freigegeben (approver name + time, only by the user; editing → back to Entwurf); ENTWURF strip + watermark in Word/PDF.
6. **Prüfliste per letter type** (code, no AI): Behinderung 8 points, Bedenken 6, Mehrkosten 5, Mängel 4.
7. **„Was kostet der Stillstand?“** (Behinderung only): workers × hours × rate × days, editable, internal only, never in the letter.
8. **Export:** Word (.docx), PDF (print view), Kopieren; „Anlage – Dokumentation“ (input, answers, time, Tagesbericht excerpt).
9. **Zusammenfassen:** minutes / diary / e-mails → deadlines, decisions, open items, risks.
10. **Fristen & Verlauf:** approved letters with deadline countdowns, stored only in this browser (localStorage), read-only view with Word/PDF, „Verlauf löschen“.
11. **Beispielmodus `?beispiel=1`:** prepared answers, no AI call, visible label – presenter fallback.
12. **Test set:** 21 situations, `npm run test:letters`, report in tests/results/report.md (20/21 correct, 0 invented facts).
13. Models: router + Rückfragen on claude-haiku-5-5 (ANTHROPIC_FAST_MODEL); letters, report check and summary on claude-sonnet-5-5.

### Pitch only / next steps
- Gegenseiten-Check „Aus Sicht des Auftraggebers prüfen“
- „Dokumente prüfen“ (PDF upload)
- „Ende der Behinderung anzeigen“ (follow-up letter)
- Morning briefing
- Photos as evidence
- Claim file (Nachtragsakte) across all notices
- Vier-Augen-Freigabe Bauleiter → Oberbauleiter
- Protected interface (login / key) per company, firm letterhead template
- E-mail forwarding (send a Tagesbericht to Baufrist), Outlook / calendar connector
- GAEB import for Mehrkosten, connectors to Bautagebuch tools
- Vector search for large document sets
- Offline mode, full GDPR setup

**Rule:** a smaller thing that works every time beats a bigger thing that sometimes breaks.

## 4. Architecture

One main assistant + specialist prompts. Each specialist = one function that calls Claude with its own XML prompt.

```
user input ──► Router ──► Gap checker ──(missing info?)──► ask user
                  │
                  ├──► Letter writer ──► edit screen ──► export (docx/pdf)
                  ├──► Deviation checker ──► (deviation?) ──► Letter writer
                  └──► Summariser
```

- Max 2–3 Claude calls per user action (speed for the live demo).
- No agent frameworks (no LangChain, CrewAI etc.). Plain functions.
- Model for the app: whatever the hackathon credits allow (default: a Sonnet model).

## 5. Tech stack

- **Next.js** (frontend + API routes in one project)
- **Claude API** via the official Anthropic SDK; key in `.env.local` only
- **Vercel** for hosting (connect GitHub repo → auto-deploy)
- **docx** library for Word export, **jsPDF** for PDF (both run in the browser)
- Browser speech recognition (Web Speech API) for voice; fallback = phone keyboard dictation
- **No database** unless clearly needed. Supabase only if there is time left.

## 6. Folder structure

```
/app            pages and UI
/app/api        API routes (one per specialist)
/prompts        all prompts as XML files (letter.xml, gaps.xml, router.xml, deviation.xml, summary.xml)
/data           sample data: test situations, sample plan/schedule, sample emails, example letters
/tests          test set + results (for the pitch "proof")
HANDOVER.md     this file
TASKS.md        task board
```

## 7. Prompt rules (XML)

Every prompt in `/prompts` uses this structure:

```xml
<role>…</role>
<task>…</task>
<context>…site/project facts…</context>
<required_fields>…</required_fields>
<rules>
  Never invent facts. If something required is missing, list it under "missing" instead of guessing.
  Formal German business letter style. Mark the draft as a draft for review.
</rules>
<example>…a real example from the mentors…</example>
<input>{user_input}</input>
<output_format>JSON with fixed keys</output_format>
```

- Prompts are edited by the prompt person and pasted in here; Claude Code only wires them up.
- Ask for JSON output so the UI can show fields reliably.

## 8. Team workflow

### Roles
| Role | Device | Does |
|---|---|---|
| **Builder** | Laptop, Claude Code | Only person who changes code. Wires prompts in, fixes bugs, deploys. |
| **Prompt + test** | iPad 1, Claude app | Writes/tunes XML prompts, writes test situations + sample data, tests the live link, logs bugs. |
| **Domain + pitch** | iPad 2 / phone | Talks to challenge setters, gets letter templates and requirements, scores test letters, builds deck + backup video. |

Rotate the builder every 3–4 hours.

### The loop
1. Prompt person drafts/improves a prompt → shared note
2. Builder: "Replace /prompts/X.xml with this and redeploy"
3. Tester runs 5 test situations on the live link (iPad)
4. Bugs → `TASKS.md` (one line each)
5. Builder fixes the top bug → repeat

### Claude accounts
- Claude Code runs on **account A**. When it hits the limit: `/login` with **account B** and continue.
- The iPad chat on account B shares that budget → keep iPad chats short and focused.
- Keep Claude Code requests small and specific. One task per request.

## 9. Rules for Claude Code (every session)

1. Read `HANDOVER.md` and `TASKS.md` first.
2. Do one task at a time; update `TASKS.md` when done.
3. Never put API keys in code or commits. `.env.local` only, and it is in `.gitignore`.
4. Commit small and often with clear messages; push after every working step.
5. Don't add frameworks or features that aren't in section 3.
6. Every generated letter is shown as an editable draft before export. Never auto-send anything.
7. If something breaks badly: revert to the last working commit instead of patching for an hour.
8. UI language: German.

## 10. Proof for the pitch (judges asked for metrics)

- Test set: 10–20 realistic German site situations in `/tests` (including messy, incomplete ones).
- Run all of them, save outputs, have a mentor / domain person rate each letter: usable / needs edits / wrong.
- Pitch numbers like: "X of Y letters judged usable", "missing info caught in Z cases", "time per notice: ~30 min → ~3 min".

## 11. Pitch structure (from the organizers' slide)

1. **Solution:** what makes it different → follow-up questions, deviation → automatic draft, manager stays in control
2. **Demo:** live, a site manager dictates "Bagger ausgefallen, Baustelle steht seit Dienstag…" → notice appears → edit → export
3. **Proof:** the test-set numbers above
- Backup demo video recorded Saturday night. Typed-input fallback if mic fails.

## 12. Open questions (ask the challenge setters)

- [ ] What must a Behinderungsanzeige / Mehrkostenanzeige / Bedenkenanzeige contain? Real examples?
- [ ] Is there sample data (daily reports, schedules, emails, minutes)?
- [ ] Devices on site, languages used by crews?
- [ ] Pitch language (German/English)? Prize split per challenge? Special prizes?
- [ ] How are API credits redeemed? (Gmail is full — check Discord / alternative email)
- [ ] Who owns the project IP?

## 13. Current status

Live: **https://sakurajima-project-b.vercel.app** (fallback: same URL with `?beispiel=1`)

- [x] Registered and accepted, Challenge B chosen
- [x] Claude Code on laptop connected to GitHub
- [x] Repo created with Next.js skeleton
- [x] `TASKS.md` created
- [x] `.env.local` with API key (note: the key in the laptop's .env.local currently returns 401 – Vercel's key works)
- [x] Vercel connected, auto-deploy from main
- [x] MVP flow working (text → letter → edit → export)
- [x] Saturday scope built (see section 3), tagged `freeze-candidate`
- [x] FINAL v3 Phase 1–2: signature once, Prüfliste per letter type, Bedenkenanzeige prompt, docs; yellow v2 design + Fristen & Verlauf live as fallback (tag `fallback-live`)
- [x] Design „Zeitung, mutiger“ merged and live (ade7c7f, tag `freeze-final`)
- [ ] Mentor/Bauleiter rating column in tests/results/report.md
- [ ] Backup video + pitch deck (from `freeze-candidate`)

## 14. First steps for Claude Code

1. Create a Next.js app in this repo (TypeScript, App Router), German UI, mobile-first.
2. Create the folders from section 6 and an empty `TASKS.md` with columns Task / Owner / Status.
3. Add `.env.local` to `.gitignore`; create `.env.example` with `ANTHROPIC_API_KEY=`.
4. Build the MVP page: textarea + "Schreiben erstellen" button + letter-type select → API route calls Claude with `/prompts/letter.xml` → editable draft → export to .docx and PDF.
5. Commit, push, then connect to Vercel.
