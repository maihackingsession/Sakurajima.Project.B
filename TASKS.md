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

## Today (Sat 21 Nov) — plan, before 18:00 freeze
| Task | Owner | Status |
|---|---|---|
| 1 Voice dictation into situation box: already built (MicButton in LetterFlow). Only open: test real mic on iPad Safari / Android Chrome (Known issue 3); optional mic on the „Tagesbericht“ box too | Builder + Prompt + test | todo (device test) |
| 2 Daily report check → deviation cards → „Schreiben entwerfen“: built (button says „Anzeige entwerfen: …“, runs analyse → Rückfragen → Entwurf). Open: rename button to „Schreiben entwerfen“, check it lands on the matching letter type, verify live with API key | Builder | todo |
| 3 Draft status Entwurf → Geprüft → Freigegeben + Copy button (Word + PDF already exist). Export marking follows status (Entwurf banner until Freigegeben). Nothing is sent automatically | Builder | done (status in memory only, lost on reload; headless-tested at 375 px, test Kopieren on iPad) |
| 4 Legal checklist under each letter: Schriftform, unverzüglich, Ursache, Auswirkung, Vorbehalt, Mehrkostenanzeige vor Ausführungsbeginn (items per letter type, manager ticks them) | Builder + Domain + pitch | todo |

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

## FINAL v2 (Sat 21 Nov) — demo dates are relative to today ({T} tokens, lib/dates.ts): plans due today, Tagesbericht from today, letter dated today

### Phase 1 — Real-AI health check (live URL, 14:20, Sonnet for all steps)
Result: **15/15 Typ korrekt**, 0 errors, 0 JSON parse errors. Averages on live: Router 2.5 s · Rückfragen 2.9 s · Schreiben 9.0 s (max 11.5 s) · total ≈ 14.4 s. Raw results: tests/results/phase1/.

| ID | erwartet → erkannt | Rückfragen | Router / Gaps / Brief (s) | Bewertung (KI-Vorbewertung) | erfundene Fakten |
|---|---|---|---|---|---|
| s01 Bagger | behinderung → behinderung | 4 | 2.2 / 3.1 / 7.5 | Nacharbeit – Bagger = wahrscheinlich eigener Bereich, trotzdem AG-Anzeige; kein Hinweis | 0 |
| s02 Zufahrt | behinderung → behinderung | 0 | 3.0 / 1.2 / 9.6 | brauchbar | 0 |
| s03 Pläne (messy) | behinderung → behinderung | 3 | 2.2 / 3.4 / 9.4 | brauchbar – gute Struktur, Aufforderung ohne Frist | 0 |
| s04 Kampfmittel | behinderung → behinderung | 3 | 2.8 / 3.7 / 8.2 | brauchbar | 0 |
| s05 Frost | behinderung → behinderung | 4 | 2.5 / 3.7 / 8.2 | Nacharbeit – Frost = Witterung, Mehrkosten nach § 6 Abs. 6 fraglich; fragt Temperaturen ab | 0 |
| s06 Pumpensumpf | mehrkosten → mehrkosten | 4 | 2.3 / 4.4 / 7.8 | brauchbar – „24.11.[Jahr bestätigen]“ unnötig | 0 |
| s07 Fenster (messy) | mehrkosten → mehrkosten | 4 | 2.6 / 4.0 / 10.4 | Nacharbeit – viele Platzhalter, Satz „führen erst aus, wenn…“ zu forsch | 0 |
| s08 tiefer Aushub | mehrkosten → mehrkosten | 0 | 2.7 / 1.2 / 6.2 | brauchbar | 0 |
| s09 Leerrohre (messy) | mehrkosten → mehrkosten | 4 | 2.2 / 4.3 / 8.9 | brauchbar – „gestern“ korrekt in Datum umgerechnet + als prüfen markiert | 0 |
| s10 Schichtenwasser | bedenken → bedenken | 0 | 2.8 / 1.5 / 10.8 | brauchbar | 0 |
| s11 Beton C25/30 | bedenken → bedenken | 4 | 2.5 / 4.3 / 10.8 | Nacharbeit – Begründung nur als Platzhalter | 0 |
| s12 Betondeckung | bedenken → bedenken | 0 | 2.9 / 1.5 / 10.1 | brauchbar | 0 |
| s13 Verbau Huber | maengel → maengel | 0 | 3.1 / 1.3 / 6.8 | brauchbar | 0 |
| s14 Leerrohre Wagner | maengel → maengel | 4 | 2.0 / 3.1 / 8.3 | brauchbar | 0 |
| s15 Planum | maengel → maengel | 4 | 1.6 / 3.5 / 11.5 | Nacharbeit – zitiert § 4 Abs. 7 VOB/B im NU-Verhältnis ohne Prüfhinweis | 0 |

KI-Vorbewertung: 10 brauchbar · 5 Nacharbeit · 0 falsch. Erfundene Fakten: 0 (Telefon/Adressen kommen aus project.json).

**5 häufigste Probleme (Input für Phase 4):**
1. „ENTWURF“-Zeilen im Brieftext und im Betreff (15/15) → jetzt im Code entfernt (lib/text.ts); der Status steht im Banner/Wasserzeichen.
2. Zu viele Rückfragen: 4 von 4 möglichen bei allen unklaren Eingaben, auch nach Nebensächlichem (Frosttemperatur, Fabrikat, Messwerte).
3. Keine Einschätzung des Verantwortungsbereichs: Bagger-Ausfall (s01) und Frost (s05) werden ungeprüft als AG-Behinderung mit Mehrkostenvorbehalt formuliert.
4. Behinderungsanzeigen ohne konkrete Abhilfe-Frist und ohne Maßnahmen zur Schadensminderung (s01, s03, s04, s05).
5. Lange „missing“-Listen mit optionalen Punkten und unnötige Platzhalter („24.11.[Jahr bestätigen]“, Rückfrage-Floskel mit Telefonnummer).

Code check: all AI routes already have `maxDuration = 60`; no timeouts, slowest step 11.5 s.

### Phase 2 — Speed + demo safety: done
- ANTHROPIC_FAST_MODEL (default claude-haiku-5-5) for router + gaps; letters/deviation/summary stay on ANTHROPIC_MODEL. Fast-model quick check: see below (run on the live URL, the local key in .env.local is invalid → 401).
- Temperature 0: **not possible** – Sonnet 5.5 and Haiku 5.5 reject non-default sampling values (HTTP 400). Router/gaps use effort "low" instead; the hero flow from the Tagesbericht skips the router (type comes from the deviation card), so it is stable anyway.
- Loading states with step text + small crane animation (static with reduced motion); buttons/fields disabled while loading.
- Every failed call: German message + „Erneut versuchen“ (Status.tsx).
- `?beispiel=1` → header `x-beispiel: 1` → server answers from data/mocks/ (even with key). Label „Beispielmodus (offline)“ in the header.

### Phase 3 — Demo story v2: done (dates relative to today)
- data/project.json: Ort „Garching“, Tragwerksplaner AG (Ingenieurbüro Kraus), Polier, kosten (58 €/h, 8 h/Tag).
- data/plan.json: all dates as {T±n}; „Bodenplatte bewehren“ starts today, „Bodenplatte betonieren“ after it, Plananlieferung „Bewehrungspläne Bodenplatte (Tragwerksplanung AG)“ due today.
- data/samples/tagesbericht-1-bewehrungsplaene.txt (today, hero) + tagesbericht-2-vortag.txt (yesterday, no deviation). Old dated reports moved to data/samples/archiv/ (not loaded). Protokoll/E-Mails/summary mock converted to relative dates and aligned with the story.
- Deviation card: „Behinderungsanzeige empfohlen“, reason line, urgency computed in code from the event date („Unverzüglich anzeigen – heute“ / „Seit X Tagen – sofort anzeigen“), orange „Anzeige entwerfen“. Facts from the report go into the draft flow (router skipped) → hero has exactly 1 Rückfrage (Frist).
- Letter date line: „Garching, <Datum des Tagesberichts>“, otherwise today.
- Numbers everywhere: 6 geplant, 2 umgesetzt, 4 ohne produktive Arbeit, 1 Tag. Mocks follow the story; the typed deadline answer is inserted into the mock letter.
- data/DEMO_SCRIPT.md.

### Phase 4 — Prompts v2 (router, gaps, letter): done (full run results below in tests/results/report.md)
- v1 archived in prompts/archive/*.v1.xml.
- Router: outcomes „anzeige“ / „keine_anzeige“ / „eigener_bereich“ with one-sentence reason; UI shows a calm card with „Trotzdem Entwurf erstellen“ (never a dead end). Any input language; facts include Arbeitskräfte/Tage for the cost card.
- Gaps: max 3 questions (code also caps at 3), only missing required fields, example answer, asked in the input's language; „Frist zur Abhilfe“ added to required_fields.behinderung; no Abhilfe/Verantwortung questions for weather or own equipment.
- Letter: DIN-5008 style, Betreff in 2 lines, Behinderungsanzeige in the required 8-part order, „gem. § … VOB/B“, legal_basis ends with „– bitte prüfen“, concrete deadline_hint, placeholders only for real gaps, no ENTWURF lines, no meta sentences, special case weather (no remedy request, no § 6 Abs. 6). One short example per type.
- Any language: hint under the textarea; Polish (s20) and Turkish (s21) tested: questions in the input language, letter in German.
- tests/situations.json: +2 keine Anzeige (s16, s17), +2 eigener Bereich (s18, s19), +1 Polish (s20), +1 Turkish (s21).
- Quick test (9 situations, live, router+gaps on Haiku): 8/9; s01 „Bagger ausgefallen“ now → „eigener Bereich – bitte prüfen“ (defensible, owner of the excavator unknown). Hero story: 1 question, 0 invented facts, 17.6 s total.
- Fast model decision: Haiku stays on router + gaps (no type regressions vs. Sonnet in Phase 1).

### Phase 5 — Design system + restyle: done
- Tokens in globals.css (white/surface/border/navy/muted, one orange accent, muted success/warning/error), system font stack, sizes 24/18/16/14, one card style, buttons primary/secondary/link (min 48 px, full width on mobile), one Chip component (Angaben fehlen / Entwurf / Freigegeben / Prüfung erforderlich / Keine Anzeige nötig), inline SVG icons only.
- Header bar: navy crane logo + „Baufrist“ + „Bauleiter-Assistent“ + project, desktop tabs inside the bar, mobile bottom tab bar with icons. Tab title „Baufrist – Bauleiter-Assistent“, SVG favicon (app/icon.svg), Next default favicon + Geist fonts removed, visible focus ring.
- Main screen: one question, big textarea, one orange „Analysieren“, secondary links. Tagesbericht: report collapses after the check, notice card is the most prominent element. Draft: two columns at ≥1024 px (paper sheet left with ENTWURF strip; status, Prüfliste, Stillstand-Kosten, export right) – everything key visible at 1280×720.
- Loading: small navy crane lifting an orange block + step text; static with prefers-reduced-motion. Empty states with „Beispiel laden“, errors with „Erneut versuchen“.

### Phase 6 — Human in control: done (incl. both IF-TIME items)
- Status Entwurf → Freigegeben only by the user; yellow ENTWURF strip + watermark in Word/PDF while Entwurf; inline approver field (name remembered in the browser), approval (name + time) saved in localStorage; ENTWURF lines removed on approval; editing after approval → back to Entwurf; „Offen: X Punkte der Prüfliste“ next to the button (approval still allowed); „Kopieren“ copies Empfänger, Betreff, Anrede, Text, Gruß.
- Prüfliste vor Versand (code only): Datum, Ursache, betroffene Leistung, Auswirkung, Frist zur Abhilfe, Vorbehalt, Nachweise, Unverzüglich (0–1 Tage ✓, sonst orange „seit X Tagen – sofort versenden“).
- Word/PDF get „Anlage – Dokumentation“ (Eingabe, Antworten, Erstellt am, Tagesbericht-Auszug). „Entwurf in X s erstellt“ (hidden in Beispielmodus).

### Phase 7 — Was kostet der Stillstand?: done
- Card for Behinderungsanzeigen only: result first („1.856 € bisher 1 Tag“, formula line „4 Arbeitskräfte × 8 h × 58 €/h = 1.856 € pro Tag“), four editable inputs (workers/days from facts, hours/rate from project.json, empty if unknown), updates instantly (5 Tage → 9.280 €, checked by scripts/screenshots.mjs). „Schätzung – zur internen Information“ + „Nur Personal. Geräte (z. B. Kran) und Baustellengemeinkosten kommen hinzu.“ Never in the letter.

**Phase 4 full run (live, 21 situations):** METRICS READY: Typ korrekt 20/21 · erfundene Fakten 0 · Ø Zeit bis Entwurf 11.4 s · Phase 1→4 (gleiche 15): Typ 15/15→14/15, brauchbar 10→13, ENTWURF-Zeilen 15→0, Ø Rückfragen 2.5→0.9. Details + empty mentor column: tests/results/report.md (rebuild with `node scripts/write-report.mjs`).

### Phase 8 — Screenshot review loop: done (docs/screenshots/review-1, review-2; `node scripts/screenshots.mjs <url> <dir>`)
Top 10 visual problems found in review-1 (all fixed unless noted):
1. Draft screen at 1280×720: cost figure below the fold → ENTWURF strip moved onto the paper sheet, status chip + Freigeben in one row, Prüfliste in 2 columns, cost result shown first. ✓
2. Tagesbericht result: „Anzeige entwerfen“ below the fold → report collapses after the check („Bericht anzeigen“). ✓
3. Desktop header: tab labels wrapped to 2 lines → tabs moved into the header bar, nowrap, wider container (max-w-7xl). ✓
4. Loading crane and logo looked like a gallows → redrawn as a tower crane (lattice mast, jib, counterweight, trolley). ✓
5. „Keine Anzeige nötig“ card said the same thing twice (chip + heading) → chip only for „Prüfung erforderlich“. ✓
6. Mobile draft: Freigeben/Prüfliste only after scrolling past the whole letter → „Zur Freigabe ↓“ link under the title. ✓
7. Mobile Tagesbericht card: orange button below the fold → button directly under the reason on mobile. ✓
8. Mobile header: logo shrank and „Bauleiter-Assistent“ wrapped → logo fixed size, subtitle hidden on small screens. ✓
9. Prüfliste labels wrapped in two columns → shorter labels („Auswirkung Termine/Kosten“, „Frist zur Abhilfe“). ✓ (one label still wraps at 1280 – acceptable)
10. Zusammenfassen: second orange button after the result → secondary after the result. ✓ (open: project name in the header is truncated at 1280 px – acceptable)
Checked: no English/technical words in the UI (except the label „Beispielmodus (offline)“), no undefined/NaN, no console errors in the click-through, 5 Tage → 9.280 € verified automatically.

### Phase 9 — Docs + final check + freeze-candidate: done
- docs/SO_FUNKTIONIERT_ES.md; HANDOVER.md §3 (Built Saturday / Pitch only) + §13 (status, live URL).
- Click-through of all flows with `?beispiel=1` at 1280×720 and 375×812: no console errors (`node scripts/screenshots.mjs`).
- lint + build clean. Final pitch screenshots (2× scale) in docs/screenshots/final/ – they show the „Beispielmodus (offline)“ label.
- **One real hero run on the live URL** (deployed a422568, real AI, driven through the UI: `node scripts/screenshots.mjs <url> <dir> --live`):
  | Step | Wait on stage |
  |---|---|
  | „Bericht prüfen“ → Abweichungskarte | 9.2 s |
  | „Anzeige entwerfen“ → 1 Rückfrage | 1.9 s |
  | „Schreiben erstellen“ → Entwurf | 6.9 s |
  Total ≈ 18 s of waiting. Rückfrage this time: „Bis wann sollen die Bewehrungspläne spätestens beim Auftraggeber vorliegen?“ (wording varies slightly; answer with the date as in DEMO_SCRIPT). Draft: Prüfliste all ✓, 1.856 €.

## Bugs / risks (after freeze-candidate)
| Bug | Found by | Status |
|---|---|---|
| Local .env.local API key returns 401 (Vercel key works). Local real-AI tests impossible until replaced. | Builder | todo (team) |
| Rückfrage wording from Haiku varies run to run (e.g. „beim Auftraggeber vorliegen“). Content is right, wording sometimes clumsy. | Builder | known |
| „Tagesbericht prüfen“ is the slowest step (~9 s, Sonnet). | Builder | known – crane + step text cover it |

## FINAL v3 (Sat 21 Nov, from 17:21)
### Phase 0 — State check
- Local commits not on origin/main: `4f6812c` Design v2 (yellow), `a6be546` Fristen & Verlauf. Tag `pre-v3`.
- a) Signature once (prompt + code strip): OPEN → done in Phase 1
- b) Prüfliste per type + Bedenkenanzeige prompt + Beispielmodus examples for all four types: OPEN → done in Phase 1
- c) Names: „Musterbau GmbH“ = auftragnehmer, „Rohbau Schneider GmbH“ = Nachunternehmer Rohbau – both from data/project.json, used deliberately (plan.json, Tagesberichte). DONE (checked again in Phase 1)
- d) README.md, docs/ARCHITEKTUR.md, docs/INTEGRATION.md: DONE (81f0a68) – refreshed in Phase 2
- e) git-history check for API keys: OPEN → Phase 2
- f) HANDOVER §3 cleanup: DONE (81f0a68) – rechecked in Phase 2

### Phase 1 — Content fixes: done
- Signature once: prompts/letter.xml rule (body ends before the closing, never greeting/closing/signature); `stripSignoff()` (lib/text.ts) in /api/letter and in the Verlauf example. The Beispielmodus Mängelanzeige body ends with „Mit freundlichen Grüßen / Musterbau GmbH / Yuzhi Shao / Bauleiter“ – stripped, signature block shown once.
- Prüfliste per type (app/lib/checks.ts, code only): Behinderung 8 points, Bedenken 6, Mehrkosten 5, Mängel 4. All four Beispielmodus letters: all ✓ (checked by script).
- Bedenkenanzeige prompt: facts with evidence, risk, suggested alternative to check (drückendes Wasser / WU-Beton), deadline, no start before decision → Behinderung + cost reservation, last line „Anlagen: …“.
- Names: added `architekt_ag` (Herr Vogel, already in the Protokoll sample, mock letters and the letter example) to data/project.json so every person in the demo data is in project.json. No other changes needed: client, Bauleiter, place (Garching, from project.json in the date line) and contract number BV-2026-0417 are identical everywhere.
- DEMO_SCRIPT: plan deadline answer = „heute + 3 Tage, 12:00 Uhr“ (Sa → 24.11.2026, So → 25.11.2026).

### Phase 2 — Repo hygiene, docs, push: done
- Git history (all commits, all branches): no Anthropic/OpenAI keys, only `.env.example` with placeholders ever committed. `.env*` is gitignored. Safe to make public.
- README: 3-sentence intro + flow line, Prüfliste per type, Verlauf only in the browser. docs/ARCHITEKTUR.md: Mermaid updated (Prüfliste je Schreibenart, Fristen & Verlauf). docs/INTEGRATION.md: Heute (rein/raus) · Technik (internal JSON routes, prototype without login, not a public interface) · Nächste Schritte; VOB/B / DIN 5008 „orientiert sich“, no certification claims.
- HANDOVER §3: one „Built“ list (13 items, incl. Fristen & Verlauf) + „Pitch only / next steps“; §13 status.
- docs/deck-assets/architektur.svg + architektur.png (1920×1080).
- REAL AI on live (e7c9357): hero run Tagesbericht prüfen 8.1 s · Anzeige entwerfen → Rückfrage 2.3 s · Schreiben erstellen → Entwurf 6.4 s, no console errors. Bedenkenanzeige (s10) real: type bedenken ✓, valid JSON, signature not in the body ✓, 0 invented facts (deadline + evidence stay [Platzhalter]), alternative (drückendes Wasser / WU-Beton), „vor Entscheidung nicht ausführen → Behinderung, Mehrkosten vorbehalten“, „Anlagen:“ line. New prompt kept. Fix: Prüfliste „Vor Ausführung“ now checked per sentence (was ✗ because the deadline placeholder sat in the same paragraph).
- Open (prompt, not changed): for s10 the Rückfragen step asked 0 questions although the Bedenken deadline is missing → letter has [Frist für Ihre Entscheidung einsetzen]; Prüfliste shows it as ✗.

### Phase 3 — Redesign „Zeitung, mutiger“ (branch `design-mutig`): done (17:30–18:00)
- Tokens + Newsreader / Libre Franklin via next/font (self-hosted), global no-radius/no-shadow, visible focus (white on navy), reduced motion turns every animation off.
- Navy masthead with I-beam logo (also app/icon.svg), text tabs, yellow badge = deadlines ≤ 2 days / overdue. Yellow deadline band = most urgent open deadline (hidden if none; demo entries only with `?beispiel=1`).
- Crane loader band (min. 900 ms) for Analysieren, Anzeige entwerfen, Schreiben erstellen, Bericht prüfen, Zusammenfassen; „Angaben werden geprüft“ (label only) for Trotzdem Entwurf / type change; errors as red kicker + sentence + „Erneut versuchen“.
- Tagesbericht: red band per notice, crew blocks, Ursache · Gefährdet · Pro Tag (only with real data), „Im Blick“ items. Schreiben: intro, status band (navy → green), letter with type rule, stamp, Randnotizen (per-type Prüfliste + placeholders + legal basis + Versand), yellow cost band with count-up. Neuer Eintrag: closed/open input, Sprechen/Stopp with existing dictation, Offene Schreiben. Rückfragen, Zusammenfassen, Fristen & Verlauf in the same system.
- Hidden because the data does not exist: report number in the red band kicker (uses the report date), crew blocks / „Pro Tag“ when the report has no counts, Zeitstempel „in X s entworfen“ in Beispielmodus.

### Phase 4 — Review loop: done
Screenshots `?beispiel=1` at 1280×720, 768×1024, 375×812: docs/screenshots/zeitung-1 → fixes → docs/screenshots/zeitung-2. The screenshot script now also fails on horizontal scroll, text < 13 px, rounded corners or shadows: zeitung-2 = 0 findings, 0 console errors, 9.280 € check ok.
Top 10 problems in zeitung-1 (all fixed):
1. Schreiben at 1280×720: 3-line headline pushed letter + notes below the fold → smaller headline (34–56 px), tighter intro.
2. Freigegeben: stamp landed outside the viewport → stamp scrolls into view on approval.
3. Zusammenfassen: pasted Protokoll grew the field to full length, result far below → field max 45 vh with scrolling, 160 px after the result.
4. Tagesbericht: same for the pasted report → max 45 vh.
5. Mobile: grey scrollbar line under the tab row → scrollbar hidden.
6. Mobile deadline band took 3 lines → one line (type name hidden < 600 px, truncated, link inline).
7. Mobile Tagesbericht result: „Anzeige entwerfen“ below the fold → button directly under the red band on phones.
8. Mobile Schreiben kicker broke inside „§ 6 Abs. 1 VOB/B“ → legal basis kept on one line.
9. Kicker had a double space before „· § 6 …“ → fixed.
10. Saved letter (Verlauf) headline as large as the page title → same size as the Schreiben screen.
Checked: no horizontal scroll, key content + main button above the fold at 1280×720 (Tagesbericht result, Schreiben), focus outline on every control, no text < 13 px, reduced motion, no radius/shadow/gradient, signature exactly once, no English/technical words (only „Word“, „PDF“).

### Phase 5 — Merge: done (18:11)
- design-mutig merged into main (fast-forward), live ade7c7f. Live click-through `?beispiel=1` at 1280×720 + 375×812: all flows ok, 0 design-check findings, 0 console errors, 9.280 € ok. Tag `freeze-final`.

### Design Zeitung (Richtung 2) — merged (18:54)
- design-zeitung reviewed by the team and merged into main (fast-forward, 0bd692a). Checked locally in Demo-Modus without API key at 375/768/1280: no horizontal scroll, no radius/shadow, no text < 12 px, 0 console errors. Previous design: tag `freeze-final` (54f39a6).

## Version 2 (branch features-v2) — HANDOVER §3 items 14–24
- [x] 1. Names: Herr Prof. Jagtap (AG), Yuzhi Shao (Bauleiter) everywhere
- [ ] 2. Rückfragen complete, „Weiß ich nicht“, no [Klammern]; „Angabe fehlt“ safety net
- [ ] 3. VoiceField in every text input
- [ ] 4. „Heute“ start screen (save first, check in background)
- [ ] 5. Tagesberichte (list, day view, /api/daily-report, plan check, PDF, Abzeichnen)
- [ ] 6. Wetter via Open-Meteo (/api/weather), cached, manual fallback
- [ ] 7. Fristen & Verlauf: „Neues Ereignis“, timeline by day, shared store
- [ ] 8. Zusammenfassen → „Als Tagesbericht speichern“
- [ ] 9. Demo data without API
- [ ] 10. (optional) Photo per entry
