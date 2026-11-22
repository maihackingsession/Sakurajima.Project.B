# Baufrist

*Ein Assistent für den Bauleiter – kein Ersatz.*

**Live:** https://baufrist.vercel.app · **Beispielmodus (no AI calls):** https://baufrist.vercel.app/?beispiel=1

## Challenge B

TUM.ai × BBIV, Challenge B: site managers lose money because formal notices under VOB/B (Behinderung, Mehrkosten, Bedenken …) are written too late or not at all. Baufrist reads what happened on site, says whether a notice is needed, and drafts the letter so the site manager only has to check and approve it.

## Main flow

**Eintrag → Empfehlung → Rückfragen → Schreiben → Freigeben → PDF / Word / Text kopieren (für die E-Mail)**

1. **Eintrag:** type or dictate what happened, or paste a Tagesbericht.
2. **Empfehlung:** Baufrist says which notice is needed, or that none is needed, or that the cause lies in the company's own area.
3. **Rückfragen:** at most three short questions, only for facts that are missing.
4. **Schreiben:** a formal German letter (content based on VOB/B, layout based on DIN 5008) with the project and recipient data filled in.
5. **Freigeben:** the letter stays an editable draft until the site manager approves it by name. Baufrist never sends anything.
6. **Export:** PDF (print view), Word (.docx) or plain text to paste into an e-mail.

## Features

- Input by text, dictation (Web Speech API) or a pasted Tagesbericht.
- Tagesbericht check against the Bauzeitenplan: what is late, and what follows from it.
- Follow-up questions in the language of the input (tested with Polish and Turkish); the letter is always German.
- Prüfliste per letter type, standstill cost estimate (workers × hours × rate), deadlines.
- **Fristen & Verlauf:** approved letters with their deadlines ("heute fällig", "seit X Tagen").
- **Zusammenfassen:** minutes, site diaries and e-mails summarised into decisions and to-dos.
- Approval stamp with name and time; exports of unapproved drafts carry an "ENTWURF" watermark.

## Letter types

| Letter | Legal basis (as cited in the letter) | Recipient |
|---|---|---|
| Behinderungsanzeige | § 6 Abs. 1 VOB/B; reservation of time (§ 6 Abs. 2) and costs (§ 6 Abs. 6) | Bauherr |
| Mehrkostenanzeige | § 2 Abs. 5 / Abs. 6 VOB/B | Bauherr |
| Bedenkenanzeige | § 4 Abs. 3 VOB/B, note on § 13 Abs. 3 VOB/B | Bauherr |
| Mängelanzeige | subcontract (NU-Vertrag): defect, deadline to fix, reservation of Ersatzvornahme | Nachunternehmer |

Two more outcomes need no letter: **"Keine Anzeige nötig"** and **"Ursache im eigenen Bereich – bitte prüfen"**. In every letter the legal basis is marked "bitte prüfen".

## Architecture

```
Eintrag / Tagesbericht / dictation
  → Router       which letter? notice needed? own fault?
  → Rückfragen   only missing required facts, max. 3
  → Schreiben    formal German letter as JSON
  → Prüfliste, Kosten, Fristen, Freigabe   plain code, no AI
  → Export       PDF, Word, text
```

Each step is one function and one Claude call (`lib/claude.ts` → `runPrompt`). There are no agent frameworks and no database. Models per step, taken from the code:

| Step | API route (file) | Prompt | Model |
|---|---|---|---|
| Empfehlung (router) | `app/api/route/route.ts` | `prompts/router.xml` | `claude-haiku-5-5` (fast) |
| Rückfragen | `app/api/gaps/route.ts` | `prompts/gaps.xml` | `claude-haiku-5-5` (fast) |
| Schreiben | `app/api/letter/route.ts` | `prompts/letter.xml` | `claude-sonnet-5-5` |
| Tagesbericht vs. Bauzeitenplan | `app/api/deviation/route.ts` | `prompts/deviation.xml` | `claude-sonnet-5-5` |
| Zusammenfassen | `app/api/summary/route.ts` | `prompts/summary.xml` | `claude-sonnet-5-5` |

The defaults are set in `lib/claude.ts` and can be overridden with `ANTHROPIC_MODEL` (letters, check, summary) and `ANTHROPIC_FAST_MODEL` (router, follow-up questions). Every prompt returns JSON, and each route checks and normalises it before it reaches the UI. Project data and the schedule are JSON files in `/data`. Diagram: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).

## Tech stack

- Next.js 16 (App Router; frontend and API routes in one project), React 19, TypeScript
- Tailwind CSS 4
- Anthropic SDK (`@anthropic-ai/sdk`)
- `docx` for the Word export; PDF from the browser print view
- Web Speech API for dictation
- Hosted on Vercel

## Run locally

```bash
npm install
cp .env.example .env.local   # then put your key into .env.local
npm run dev                  # http://localhost:3000
```

`.env.local` is gitignored; never commit it. On Vercel, set the same variables under Project → Settings → Environment Variables.

### Environment variables

| Name | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | no (without it the app runs in Beispielmodus) | Claude API key |
| `ANTHROPIC_MODEL` | no | Model for letter, Tagesbericht check, summary |
| `ANTHROPIC_FAST_MODEL` | no | Model for router and follow-up questions |

`/api/health` shows `mock: true` when no key is set. It never shows the key.

## Beispielmodus

Open https://baufrist.vercel.app/?beispiel=1. Every step is answered from `data/mocks/` with no AI call, and the header shows "Beispielmodus". Without `ANTHROPIC_API_KEY` the whole app runs this way. Demo dates are relative to today (`{T}`, `{T+5}` in `/data`), so the sample story always happens "today". The 8-step demo is in [data/DEMO_SCRIPT.md](data/DEMO_SCRIPT.md).

## Tests and results

`npm run test:letters -- <url>` sends 21 test situations (`tests/situations.json`) to a running app with a real key and writes `tests/results/report.md`. Measured on 21.11.2026 (Router and Rückfragen on Haiku, letter on Sonnet):

- **Letter type correct: 20/21**, including 2× "Keine Anzeige nötig" and 2× "eigener Bereich". The one miss ("Bagger ausgefallen") was flagged "eigener Bereich – bitte prüfen"; the input doesn't say whose excavator it is.
- **Invented facts: 0** (no dates, names, numbers or addresses that weren't in the input, answers or project data).
- **Average time to draft: 11.4 s** (router + follow-up questions + letter).
- Polish and Turkish input understood; follow-up question in the input language, letter in German.
- Prompt v1 → v2 on the same 15 situations: follow-up questions per situation 2.5 → 0.9; stray "ENTWURF" lines in the letter 15 → 0.

`node scripts/screenshots.mjs <url> <dir>` clicks through all screens in Beispielmodus with headless Edge at 1280 and 375 px and reports console errors (last run: none).

## Known limitations

- No login, no user accounts, no database.
- Approvals and "Fristen & Verlauf" are stored only in the browser (localStorage); clearing the browser data deletes them.
- Project data, schedule and recipients are fixed sample files in `/data`; there is no connection to real systems.
- The text you enter is sent to the Claude API (Anthropic) to be analysed. Don't enter data you aren't allowed to share.
- Dictation uses the browser's speech recognition, set to German; it works reliably only in Chrome/Edge and was not tested on real iPad or Android devices.
- Not legal advice. Every letter is a draft and must be checked before it is sent.
- The cost estimate counts only labour; equipment and site overheads are not included.
- One AI step takes a few seconds; the Tagesbericht check about 9 s. Without internet only the Beispielmodus works.
- `npm run test:letters` refuses to run without a key (it would only test the sample answers).

## Repository

| Path | What |
|---|---|
| `app/` | UI and API routes |
| `lib/` | Claude helper, types, text helpers |
| `prompts/` | XML prompts (`archive/` = older versions) |
| `data/` | sample project, schedule, required fields, sample documents, mocks |
| `tests/` | test situations and results |
| `docs/` | how it works, architecture, integration, screenshots; `docs/process/` = working notes from the hackathon |

## Team

**Emancipated** – TUM.ai × BBIV Hackathon 2026.
