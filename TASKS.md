# TASKS

Status: todo / doing / done / blocked

## Build phases (BUILD_PROMPT.md)
| Phase | Owner | Status |
|---|---|---|
| 1 Core plumbing: data/project.json, lib/claude.ts (mock mode), API routes, Demo-Modus badge | Builder | done |
| 2 Prompts v1 (router, gaps, letter, deviation, summary), data/required_fields.json, data/mocks/ | Builder | done |
| 3 Sample data: data/plan.json, data/samples/ (3 Tagesberichte, 1 Protokoll, 3 E-Mails), tests/situations.json (15) | Builder | done |
| 4 Main flow UI: Analysieren → router + gaps → Rückfragen → editierbarer Entwurf → Word / PDF (Druckansicht) | Builder | done |
| 5 Voice input: Web Speech API de-DE, Aufnahme-Status, Hinweis auf Tastatur-Diktat wenn nicht unterstützt | Builder | done |
| 6 Deviation checker: Tab „Tagesbericht prüfen“, Karten nach Schwere, „Anzeige entwerfen“ springt in den Schreiben-Ablauf | Builder | done |
| 7 Summariser: Tab „Zusammenfassen“, Fristen hervorgehoben, offene Punkte als Tabelle, Risiken | Builder | done |
| 8 Test runner: `npm run test:letters [-- <URL>]` → tests/results/*.json + report.md (verweigert Demo-Modus) | Builder | done |
| 9 Polish + Klick-Test aller Abläufe im Demo-Modus bei 375 px (kein Überlauf, keine Konsolenfehler, .docx geprüft) | Builder | done |

## Setup
| Task | Owner | Status |
|---|---|---|
| Next.js skeleton, folders, CLAUDE.md, TASKS.md | Builder | done |
| /api/health route | Builder | done |
| Push to GitHub | Builder | done |
| Connect Vercel, test live URL on iPad | Builder | todo |
| Add ANTHROPIC_API_KEY to .env.local and Vercel (when credits arrive) | Builder | todo |
| Tune prompts/*.xml v1 drafts (add real mentor examples in <example>) | Prompt + test | todo |
| Ask challenge setters the open questions (HANDOVER §12) | Domain + pitch | todo |

## Friday — MVP (must work end to end)
| Task | Owner | Status |
|---|---|---|
| Text input page (German) + letter-type select + "Schreiben erstellen" button | Builder | done |
| Letter writer: API route calls Claude with prompts/letter.xml, returns JSON | Builder | done (mock mode; live untested until API key) |
| Edit screen: editable draft, clearly marked "Entwurf" | Builder | done |
| Export to Word (.docx) | Builder | done |
| Export to PDF | Builder | done |
| Deploy + test MVP on iPad via live link | Prompt + test | todo |

## Saturday — until 18:00 feature freeze
| Task | Owner | Status |
|---|---|---|
| Gap checker: follow-up questions for missing facts (date, cause, affected work, delay) | Builder | done (mock mode; live untested) |
| Voice input (Web Speech API, German) + keyboard dictation fallback | Builder | done (test on iPad Safari + Android Chrome) |
| Router: one input box → letter / daily report / summary | Builder | done (mock mode; live untested) |
| Deviation checker vs sample plan in /data → offer matching notice | Builder | done (mock mode; live untested) |
| Summariser: diary / minutes / emails → summary with open items + deadlines | Builder | done (mock mode; live untested) |
| Mobile layout polish: big buttons, simple screens | Builder | done (checked at 375 px; test on real iPad/phone) |
| Sample plan + sample emails/reports in /data | Prompt + test | done (v1 by Builder, please review) |
| 10–20 test situations in /tests (incl. messy/incomplete) | Prompt + test | done (15, v1 by Builder, please review) |

## After freeze (bug fixes + pitch only)
| Task | Owner | Status |
|---|---|---|
| Run full test set, save outputs (`npm run test:letters`, needs API key) | Prompt + test | todo |
| Rate letters: usable / needs edits / wrong | Domain + pitch | todo |
| Pitch deck | Domain + pitch | todo |
| Backup demo video (Sat night) | Domain + pitch | todo |

## Bugs
| Bug | Found by | Status |
|---|---|---|
| Known issue 1: Live Claude calls never tested (no key yet). JSON format, answer quality and speed of all 5 prompts unknown. Letter call runs at effort "medium" and may take 15–30 s; Vercel limit is 60 s. | Builder | todo (first thing with key) |
| Known issue 2: Demo-Modus returns fixed example answers (only the letter type is guessed from keywords). The same letter/deviation/summary appears regardless of input, so don't demo live with the badge showing. | Builder | by design |
| Known issue 3: Voice input only tested in headless Edge (button shows). Real mic on iPad Safari / Android Chrome untested; Firefox has no Web Speech API (shows keyboard-dictation hint instead). | Builder | todo (test on devices) |
| Known issue 4: PDF = browser print dialog (window.print). On iPad the "Teilen → Drucken → aufziehen → PDF" step is clunky. The jspdf dependency is now unused (HANDOVER §5 still mentions jsPDF). | Builder | todo (decide) |
| Known issue 5: Letter date line hardcodes "München, <heute>". Sender, Bauleiter and project come from data/project.json (fake data). Change them there for the real demo project. | Builder | todo |
