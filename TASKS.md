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
