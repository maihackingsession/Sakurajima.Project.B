# Baufrist – Bauleiter-Assistent

*Ein Assistent für den Bauleiter – kein Ersatz.* Hackathon project (TUM.ai × BBIV, Challenge B).

Live: https://sakurajima-project-b.vercel.app · Offline demo: https://sakurajima-project-b.vercel.app/?beispiel=1

## What it does

Baufrist checks a site manager’s Tagesbericht (daily site report) or a typed or dictated situation against the Bauzeitenplan and spots what needs a formal notice: Behinderung, Mehrkosten, Bedenken or Mängel. It asks at most three short follow-up questions and writes an editable German letter (content based on VOB/B, layout based on DIN 5008). Every letter stays a draft until the site manager approves it by name, and Baufrist never sends anything itself.

**Flow:** Tagesbericht / Eingabe → Erkennen → Rückfragen → Schreiben → Prüfliste + Kosten → Freigabe → Word / PDF / Kopieren.

## Architecture

```
Tagesbericht / text / voice
  → Router        (which letter? notice needed? own fault?)
  → Rückfragen    (only missing required facts, max. 3)
  → Schreiben     (formal German letter, JSON)
  → Prüfliste + Kosten + Freigabe   (plain code, no AI)
  → Export        (Word, PDF, plain text)
```

Mermaid diagram: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).

- **Two models.** Router and Rückfragen run on `claude-haiku-5-5` (fast). The letter, the Tagesbericht check and the summariser run on `claude-sonnet-5-5`. You can change both in `.env.local`.
- **Prompts are XML files** in `/prompts` (`router`, `gaps`, `letter`, `deviation`, `summary`). Every prompt returns JSON, and each API route checks and normalises that JSON before it reaches the UI.
- **There are no agent frameworks.** Each step is one function and one Claude call.
- **There is no database.** Project data and the schedule are JSON files in `/data`. Approvals and „Fristen & Verlauf“ (approved letters with deadlines) are stored only in the user's browser (localStorage).
- **Plain code, no AI:** urgency ("heute" / "seit X Tagen"), the Prüfliste per letter type (Behinderung 8 points, Bedenken 6, Mehrkosten 5, Mängel 4), the standstill cost estimate, draft/approval status, the signature block and export.
- **Beispielmodus (sample mode).** `?beispiel=1` answers every step from `data/mocks/` with no AI call and shows a visible label "Beispielmodus (offline)". It is the presenter's fallback. Without `ANTHROPIC_API_KEY`, the whole app runs this way.
- **Demo dates are relative to today.** Files in `/data` use `{T}`, `{T+5}` and similar tokens, so the demo story always happens "today".

## Tech stack

- Next.js 16 (App Router, frontend and API routes in one project), React 19, TypeScript
- Tailwind CSS v4
- Anthropic SDK (`@anthropic-ai/sdk`)
- `docx` for the Word export; the PDF comes from the browser print view
- Web Speech API for dictation
- Hosted on Vercel

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Without a key, the app runs in Beispielmodus. To use real Claude calls, create `.env.local` in the project root. The file is gitignored; never commit it.

```
ANTHROPIC_API_KEY=<your key>
# optional
ANTHROPIC_MODEL=claude-sonnet-5-5
ANTHROPIC_FAST_MODEL=claude-haiku-5-5
```

Restart `npm run dev` after adding the key. On Vercel, set the same variables under Project → Settings → Environment Variables and redeploy.

Useful scripts:

| Command | What |
|---|---|
| `npm run test:letters -- <url>` | Runs the 21 test situations and writes `tests/results/report.md` |
| `node scripts/screenshots.mjs <url> <dir> [--scale=2] [--live]` | Clicks through all screens in headless Edge and saves screenshots |

## Test results

From [tests/results/report.md](tests/results/report.md): 21 situations against the live URL.

- **Letter type correct: 20/21.** This includes 2 "Keine Anzeige nötig" cases and 2 "Ursache im eigenen Bereich" cases. The one miss, "Bagger ausgefallen", was flagged "eigener Bereich – bitte prüfen". That is defensible, because the input doesn't say whose excavator it is.
- **Invented facts: 0.** No dates, names, numbers or addresses appeared that weren't in the input, the answers or the project data.
- **Average time to draft: 11.4 s** (router, follow-up questions and letter).
- **Input in Polish and Turkish was understood.** The follow-up question came back in the input language, and the letter was in German.
- **Prompt v1 → v2 on the same 15 situations:**
  - letters pre-rated "brauchbar" (usable): 10 → 13;
  - average follow-up questions per situation: 2.5 → 0.9;
  - stray "ENTWURF" lines inside the letter: 15 → 0.

The "brauchbar" ratings are a first pass by the AI. The column for the rating by a site manager or mentor is still empty.

## Limitations

- This is a prototype. Project data and the schedule are fixed sample files, and there is no connection to real systems.
- There is no login or authentication, and no database.
- The legal wording is help with drafting, not legal advice. Every letter must be checked; the legal basis is always marked "bitte prüfen".
- The cost estimate counts only labour (workers × hours × rate). Equipment and site overheads are not included.
- One AI step takes a few seconds. The Tagesbericht check takes about 9 s.
- Voice input uses browser dictation and has not been tested on real iPad or Android devices.
- Without internet, only the Beispielmodus works.

## Docs

- [docs/SO_FUNKTIONIERT_ES.md](docs/SO_FUNKTIONIERT_ES.md) – how it works, for site managers (German)
- [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) – flow diagram
- [docs/INTEGRATION.md](docs/INTEGRATION.md) – data in and out, internal JSON routes with examples, next steps (German)
- [data/DEMO_SCRIPT.md](data/DEMO_SCRIPT.md) – the 8-step live demo
- [HANDOVER.md](HANDOVER.md) – scope and rules · [TASKS.md](TASKS.md) – task log

## Files the prompt and domain people edit

| File | What |
|---|---|
| `prompts/router.xml` | Letter type, and whether a notice is needed at all |
| `prompts/gaps.xml` | Follow-up questions for missing facts |
| `prompts/letter.xml` | Letter writer (all 4 letter types, legal rules) |
| `prompts/deviation.xml` | Compares a Tagesbericht with `data/plan.json` |
| `prompts/summary.xml` | Summarises minutes, diaries and e-mails |
| `data/required_fields.json` | Required facts per letter type |
| `data/project.json` | Project, client, our company, Bauleiter, subcontractors, cost rates |
| `data/plan.json`, `data/samples/*.txt` | Sample schedule and documents |
| `tests/situations.json` | Test set |

The code fills placeholders such as `{user_input}`. Keep them, and keep the JSON keys in `<output_format>` unchanged. The dev server reads prompts on every request, so a prompt change needs no restart.
