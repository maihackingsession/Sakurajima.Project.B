Read HANDOVER.md, TASKS.md and CLAUDE.md first. This file (FINAL_PROMPT v2, Saturday 14:30) replaces BUILD_PROMPT.md, NIGHT_PROMPT.md, SATURDAY_PROMPT.md and the previous FINAL_PROMPT.md.

# CHANGES IN v2 — READ FIRST
- If you already started the previous version: finish the step you are in, commit, then continue with the first phase of the NEW order below that is not done yet. Phase 3 (demo story) changed: redo it even if it was done.
- Phase numbers changed. Old → new: 0→0, 1→1, 2→2, 3→3 (new story), 4+9→4, 8a/8b→5, 5→6, 6→7, 8c→8, 11+12+13→9.
- CUT: old Phase 7 "Gegenseite prüft" (now a small optional item, no score), old Phase 10 DE/EN toggle (cut completely), "Dokumente prüfen" (pitch-only). If any half-built code for these exists, hide it from the UI.
- The hero demo now STARTS from "Tagesbericht prüfen" (the app detects the obstruction), not from the empty input box.
- Hard deadline: git tag `freeze-candidate` by 21:00 today.

# SITUATION
The app is live on Vercel with a real ANTHROPIC_API_KEY (production Demo-Modus is off; .env.local on this laptop has the key too). The backup video and the pitch-deck screenshots are made from the `freeze-candidate` version tonight, so that version must be finished by 21:00. Pitch is Sunday 13:00 in German, presented from this laptop on a projector. Reliability beats features.

Live URL: https://sakurajima-project-b.vercel.app

## Decisions already made (do not re-discuss)
- Product name: **Baufrist**, subtitle "Bauleiter-Assistent". Tagline: "Ein Assistent für den Bauleiter – kein Ersatz."
- Edge: the app spots situations that need a formal notice and drafts it before deadlines or claims get lost. The site manager always reviews and approves.
- Hero demo story (v2): Friday 20.11.2026, Bodenplatte. The Auftraggeber's Bewehrungspläne (from the AG's Tragwerksplaner) were due Thursday 19.11.2026 and are still missing. Reinforcement cannot start. 6 workers were planned: 2 were redeployed to other work, 4 cannot be used productively. Baufrist detects this in Friday's Tagesbericht, recommends a Behinderungsanzeige "unverzüglich – heute", and the draft is ready the same day.
- Main view for the pitch = desktop/projector at 1280×720 (Windows display scaling often makes a 1080p laptop behave like 1280×720). Mobile must still work well.
- Demo input is typed/pasted, not dictated live. No Whisper, no more mic work.
- Dropped (pitch "next steps" only): morning briefing, "Dokumente prüfen" PDF tab, photos, claim file, Outlook/calendar, DE/EN interface, vector search.

# HOW TO WORK
- Before EACH phase, check the time (`Get-Date`) and follow the TIME RULES below.
- Items marked [MUST] are required. Items marked [IF TIME] are skipped when you are behind the TIME RULES.
- After EACH phase: `npm run build`, fix errors, update TASKS.md, `git add -A`, commit "<phase name>".
  - Until the `freeze-candidate` tag: also `git push` after each phase (never force push). If the push fails, keep committing locally and tell me at the end.
  - AFTER the `freeze-candidate` tag: commit locally only. Push ONLY when I explicitly say "push". Every push changes the live demo.
- If a phase goes badly after a few attempts: `git reset --hard` to the last good commit, note it under Bugs in TASKS.md, continue with the next phase.
- Never break these flows. Re-test them after every phase that touches them:
  1. Eingabe → Rückfragen → Entwurf → Export
  2. Tagesbericht prüfen → Abweichung → Anzeige entwerfen → Entwurf → Export
  3. Both of the above with `?beispiel=1`
- No new dependencies. Mobile-first code, but the projector view must look excellent.
- Teammates may have edited files in /prompts or /data. Never throw away their changes; build on them.
- Our API budget is small (~€5), but YOUR OWN work (reading, reviewing, writing) costs us nothing:
  - Run the full test set at most twice in total (Phase 1 and Phase 4). For quick checks, use 3–5 situations.
  - Do all UI click-throughs with `?beispiel=1` (no API calls). Only use real AI where a phase explicitly tests AI quality.
  - Judge output quality YOURSELF by reading the saved results instead of calling the API again.
- Never print, log or commit the API key.
- You may update HANDOVER.md, but ONLY section 3 (scope) and section 13 (status). See Phase 9.

## TIME RULES
- Do the phases in order.
- Phase 5 (design system) MUST start by 17:00. If you are behind, do only the [MUST] items of the phases before it. Exception: always finish Phase 4's full test run, because it produces the pitch metrics.
- At 20:30 at the latest: stop what you are doing (commit it if it works, otherwise revert the half-done step) and go to Phase 9.
- If I say "freeze": go straight to Phase 9.
- After `freeze-candidate`: only bug fixes I ask for. OPTIONAL items only if I say "go optional" AND it is before 22:00.

# PHASE 0 — Safety net (2 min)
Commit anything uncommitted. Create git tag `pre-final-v2` so we can always roll back.

# PHASE 1 — Real-AI health check (20 min)
- [MUST] Run the test set once against the LIVE URL (`npm run test:letters -- https://sakurajima-project-b.vercel.app`).
- [MUST] In TASKS.md, a short table per situation: expected vs detected type, number of follow-up questions, parse errors, errors, response time per step ON THE LIVE URL (these are the waits we will have on stage).
- [MUST] Read every saved letter YOURSELF (no API call) and rate it: brauchbar / Nacharbeit / falsch + one-line reason (wrong type? weak questions? missing VOB/B logic? bad German?).
- [MUST] Count "erfundene Fakten" per letter: any date, name, number, plan number, address or quantity in the letter that is NOT in the input or the answers and is not a [Platzhalter]. Add a column.
- [MUST] List the 5 most common problems. Phase 4 uses this list.
- [MUST] Fix CODE problems only (parsing, timeouts, crashes, error handling). If a step fails or is very slow on Vercel but works locally, check the server function time limit for the AI routes and raise it (e.g. 60 s). A timeout on stage is the worst case.

# PHASE 2 — Speed + demo safety (20 min)
1. [MUST] Env var ANTHROPIC_FAST_MODEL (default "claude-haiku-5-5") for router and gaps; the letter and other long outputs stay on ANTHROPIC_MODEL (default "claude-sonnet-5-5"). Add ANTHROPIC_FAST_MODEL= to .env.example. Quick-check the 5 hardest Phase 1 situations with the fast model: if it detects a wrong type where Sonnet was right in Phase 1, keep Sonnet for the router and use the fast model only for gaps.
2. [MUST] Use temperature 0 for router and gaps (if the API accepts it), so the hero demo behaves the same way every time.
3. [MUST] Loading states with step text ("Tagesbericht wird geprüft …", "Situation wird analysiert …", "Schreiben wird erstellt …"); buttons disabled while loading.
4. [MUST] Any failed call: friendly German message + "Erneut versuchen". Never a blank screen.
5. [MUST] Presenter safety net: URL with `?beispiel=1` uses the prepared mock answers instead of Claude and shows a small but visible label "Beispielmodus (offline)". Honest, never hidden. All new features below must also work in this mode with mocks.

# PHASE 3 — One consistent demo story v2 (20 min) — REDO even if done before
- [MUST] data/project.json: Bauvorhaben in Garching (keep the name if a teammate already set one), Auftraggeber, Auftragnehmer "Musterbau GmbH", Bauleiter name, Vertragsgrundlage VOB/B, Ort "Garching", cost defaults: Verrechnungssatz 58 €/h, Arbeitsstunden pro Tag 8. All names fictional.
- [MUST] data/plan.json: "Bodenplatte bewehren" planned start Friday 20.11.2026, "Bodenplatte betonieren" after it; plan delivery "Bewehrungspläne Bodenplatte (Tragwerksplanung AG)" due Thursday 19.11.2026.
- [MUST] New latest daily report in data/samples/, dated Friday 20.11.2026, written like a real Bautagesbericht (Datum, Wetter, Personal, Geräte, ausgeführte Leistungen, Behinderungen / besondere Vorkommnisse). Content: Bewehrungspläne for the Bodenplatte from the AG's Tragwerksplaner were promised for 19.11. and are still missing; the Polier called the planner's office in the morning, no delivery date given; reinforcement cannot start; 6 workers planned, 2 redeployed to other work, 4 cannot be used productively.
- [MUST] The deviation card for this case in "Tagesbericht prüfen" shows: "Behinderungsanzeige empfohlen", a one-line reason ("Ursache im Bereich des Auftraggebers: fehlende Ausführungspläne"), urgency "Unverzüglich anzeigen – heute", and "Anzeige entwerfen" as the primary action. Facts from the report are passed into the draft flow, so at most 1–2 follow-up questions remain (target for the hero: exactly 1, e.g. the deadline by which the plans must arrive).
- [MUST] Letter date line: place from project.json + the date of the source Tagesbericht if the draft came from "Tagesbericht prüfen", otherwise today's date.
- [MUST] Numbers must agree everywhere (report, letter, mocks, cost card): 6 planned, 2 redeployed, 4 without productive work, 1 day so far.
- [MUST] Update all mocks so `?beispiel=1` follows exactly this story.
- [MUST] `data/DEMO_SCRIPT.md`: the exact demo steps, max 10 lines, starting at "Tagesbericht prüfen" with the sample report. Include the answers to type for the 2–3 most likely follow-up questions, and the fallback step (switch to the prepared `?beispiel=1` tab).

# PHASE 4 — Letter + router quality v2 + any language (45 min)
First copy the current router, gaps and letter prompts to prompts/archive/*.v1.xml. Then improve them using the Phase 1 problem list:
- [MUST] Gaps: max 3 questions, only for facts that are truly missing AND required (data/required_fields.json). Short, concrete, with an example answer. Never ask for something already in the input.
- [MUST] Letter: formal German business letter (DIN 5008 style), clear Betreff, short paragraphs; missing facts as visible placeholders in square brackets ("[Datum einsetzen]"), never invented; cite VOB/B only as "gem. § … VOB/B" when Vertragsgrundlage is VOB/B; legal_basis with the note "bitte prüfen"; concrete deadline_hint. Neutral, cooperative tone, no threats.
- [MUST] A Behinderungsanzeige contains, in this order: the affected work (Leistung/Bauteil); the cause and why it lies in the Auftraggeber's area; since when; consequences for the schedule; a request for remedy with a concrete deadline; reservation of a time extension and of additional costs (to be quantified separately); the measures taken to limit the damage (e.g. workers redeployed); and that the end of the obstruction will be notified separately.
- [MUST] One short, high-quality fictional example letter per type inside <example>, matching the demo project.
- [MUST] Router: two extra outcomes besides the notice types, each with a one-sentence reason: "Keine Anzeige nötig" (no relevant impact) and "Ursache möglicherweise im eigenen Bereich – bitte prüfen" (e.g. own crane broken, own crew ill). The UI shows these as a calm card with the button "Trotzdem Entwurf erstellen". The site manager decides; never a dead end.
- [IF TIME] Input in any language: router/gaps/letter accept input in any language (Polish, Romanian, Turkish, English …); follow-up questions are asked in the input's language; the letter is ALWAYS formal German. Small hint under the textarea: "Eingabe in jeder Sprache möglich – das Schreiben wird auf Deutsch erstellt."
- [MUST] Add to tests/situations.json: 2 "keine Anzeige nötig" cases, 2 "eigener Bereich" cases, and (if the any-language item was done) 1 Polish + 1 Turkish case.
- [MUST] Quick test: hero story + 2 messy situations + 2 of the new cases. Rate them yourself as in Phase 1 (incl. erfundene Fakten). If worse than v1, restore v1.
- [MUST] Commit + push, wait until Vercel has deployed the new version (about 2–3 min, check the live site), then run the FULL test set against the live URL (second and last full run). Write `tests/results/report.md` with columns: Situation | erwarteter Typ | erkannter Typ | Rückfragen sinnvoll? | erfundene Fakten | KI-Vorbewertung (rating + reason) | Bewertung Bauleiter/Mentor (empty) | Zeit bis Entwurf. Summary at the top: X/Y Typ korrekt (including the no-notice cases), erfundene Fakten in total, average time to draft, Phase 1 → Phase 4 comparison. State clearly that the KI-Vorbewertung is only a first pass; the human rating is what we pitch.
- [MUST] When report.md is pushed, print one line starting with "METRICS READY:" plus the summary. The team needs it for the mentor rating.

# PHASE 5 — Design system + restyle all existing screens (60 min) — MUST start by 17:00
Goal: after this phase the app looks like a finished, clean, minimalist professional product a construction company would trust. Do not change flows or logic. If a `frontend-design` skill is available to you, read it first.

## 5a — Design system (define once, use everywhere)
- Style: practical, industrial, trustworthy, minimalist. Professional construction software, not a chatbot. Lots of white space.
- Colours (Tailwind theme / CSS variables): background #FFFFFF, surface #F6F7F9, border #E3E6EB, text navy #1F2A44, secondary text #5B6475, ONE accent orange #E8710A only for the primary action per screen; muted success green, warning amber, error red. No gradients; at most a subtle shadow.
- Typography: system font stack. Page title ~24 px semibold, section ~18 px semibold, body 16 px, small 14 px, never below 14 px.
- Spacing scale 4/8/12/16/24/32 px. One card style: white, 1 px border, radius ~12 px, padding 16–20 px.
- Buttons: primary (orange), secondary (white, navy border), text link. Min height 48 px; full width on mobile.
- One status-chip component everywhere: "Angaben fehlen", "Entwurf", "Freigegeben", "Prüfung erforderlich", "Keine Anzeige nötig".
- Prepare the styles for the status banner, the Prüfliste card and the cost card now; Phases 6 and 7 use them.
- Simple inline SVG line icons only where helpful. No icon library.

## 5b — Layout and screens
- Header: logo (public/logo.svg or .png if present, else a simple navy mark) + "Baufrist" + small "Bauleiter-Assistent" + project name. Slim and calm.
- Navigation: mobile bottom tab bar (max 4 tabs, icons); desktop tabs at the top. "Tagesbericht prüfen" must be easy to find (it is where the demo starts).
- Desktop/projector (≥1024 px) is the PRIMARY pitch view: content centred; forms max ~760 px wide; draft screen in two columns (letter as a paper sheet on the left; status, Prüfliste, Stillstand-Kosten, export on the right). At 1280×720 the key parts of the draft screen are visible without scrolling. Text large enough to read from the back of a room.
- Main screen: one big question "Was ist auf der Baustelle passiert?", large textarea, one orange "Analysieren" button, small secondary links. Nothing competing.
- Tagesbericht result: the deviation card that recommends a notice is the most prominent element, with its urgency line and one orange "Anzeige entwerfen" button.
- Draft screen = star of the demo: letter rendered like a real sheet of paper (DIN 5008-like), editable; placeholders [ … ] visibly highlighted; status + banner clearly visible.
- Results screens (Tagesbericht, Zusammenfassen): consistent cards with chips and one clear action each.
- Empty states with one helpful sentence + "Beispiel laden"; error states with "Erneut versuchen".
- German copy: consistent "Sie"-form, short, no technical words (no "API", "JSON", "Mock") except the Beispielmodus label. No English words in the UI.
- Loading animation: small simple crane (SVG + CSS, ~50 px, navy line style) lifting a block; step text always below; static crane for prefers-reduced-motion. Max 10 min; if clumsy, keep a spinner.
- Finishing touches: tab title "Baufrist – Bauleiter-Assistent", SVG favicon (crane or navy mark), metadata, no leftover default Next.js content, visible focus, WCAG AA contrast.
- One quick screenshot check at 1280×720 and 375×812 with `?beispiel=1` to catch anything broken. The full review loop comes in Phase 8.

# PHASE 6 — Human in control: status + Prüfliste + evidence (30 min)
1. [MUST] Status per letter draft: Entwurf → Freigegeben (no "Geprüft" step), changed ONLY by the user.
   - While Entwurf: yellow "ENTWURF – VOR VERSAND PRÜFEN" banner on screen; Word/PDF exports carry a visible "ENTWURF" watermark.
   - "Freigeben": inline field for the approver's name (no browser popup); save name + timestamp in the browser (no database); remove any "Entwurf/zur Prüfung" line from the letter text; remove banner and watermark; show "Freigegeben von [Name] am [Datum, Uhrzeit]". If the Prüfliste has open items, show "Offen: X Punkte der Prüfliste" next to the button; approving is still allowed (the site manager decides).
   - Editing the text after approval sets the status back to Entwurf.
   - "Kopieren" button: copies the full letter (Empfänger, Betreff, Anrede, Text, Gruß) as plain text.
2. [MUST] Card "Prüfliste vor Versand" (no AI call): Datum des Ereignisses, Ursache, betroffene Leistung, Auswirkung auf Termine/Kosten, Frist zur Abhilfe gesetzt, Vorbehalt Bauzeit/Kosten, Nachweise, Unverzüglich (0–1 days since the event = ✓, more = orange "seit X Tagen – sofort versenden"). Green ✓ if present, orange "fehlt" otherwise.
3. [IF TIME] Evidence appendix: Word/PDF export gets a page "Anlage – Dokumentation" with the original input text, the follow-up answers, creation date + time, and the matching Tagesbericht excerpt if the flow came from "Tagesbericht prüfen".
4. [IF TIME] Small line on the draft screen: "Entwurf in X s erstellt" (sum of the real AI time of this flow). Hidden in Beispielmodus.

# PHASE 7 — "Was kostet der Stillstand?" (25 min)
- [MUST] For Behinderungsanzeige drafts, a prominent card in the right column: estimated standstill cost per day and so far, e.g. "4 Arbeitskräfte × 8 h × 58 €/h = 1.856 € pro Tag · bisher 1 Tag: 1.856 €".
- [MUST] Inputs: Arbeitskräfte ohne produktive Arbeit, Stunden pro Tag, Verrechnungssatz, Tage. Workers and days from the extracted facts if present; rate and hours/day from project.json. All four values are visible and editable; the result updates instantly (we will change the days from 1 to 5 live on stage → 9.280 €). If a value is unknown, show an empty input field instead of guessing. Pure arithmetic in code: the AI never invents these numbers.
- [MUST] Labels: "Schätzung – zur internen Information" and a small line "Nur Personal. Geräte (z. B. Kran) und Baustellengemeinkosten kommen hinzu."
- [MUST] Never inserted into the letter (the letter says costs will be quantified separately). No checkbox.
- [MUST] Mock for `?beispiel=1` with the demo story values.

# PHASE 8 — Screenshot review loop (40 min)
1. Dev server in background; headless Edge screenshots with `?beispiel=1` of every screen/state at 1280×720 AND 375×812 → docs/screenshots/review-1/: main empty, Tagesbericht result with the deviation card, follow-up question, draft (Entwurf with banner, Prüfliste, cost card), draft Freigegeben, "Keine Anzeige nötig" card, Zusammenfassen, error, loading.
2. Review them yourself like a strict senior product designer; list the 10 biggest visual problems in TASKS.md. Check especially: key parts of the draft screen visible at 1280×720 without scrolling; letter readable from the back of a room; no English or technical words; no "undefined", "NaN", empty boxes or overlapping text.
3. Fix them. Screenshots again → docs/screenshots/review-2/, fix anything still obviously wrong. Stop the server. Commit + push.

# PHASE 9 — Docs + final check + freeze-candidate (30 min)
1. `docs/SO_FUNKTIONIERT_ES.md`: one page, simple German, no code: the flow (Tagesbericht → erkannte Abweichung → Rückfrage → Entwurf → Prüfliste → Freigabe → Export), what each AI step does, why it doesn't invent facts (placeholders), why the site manager stays in control (status, Freigabe, nothing sent automatically), where data goes (processed via the Claude API; nothing stored on our server), limitations.
2. HANDOVER.md: Section 3: a "Built Saturday" list with ONLY what is actually built and working (check the app, do not copy this prompt) and a "Pitch only / next steps" list (Gegenseiten-Check, Dokumente prüfen, Ende der Behinderung if not built, morning briefing, photos, claim file, Outlook connector, Vier-Augen-Freigabe Bauleiter → Oberbauleiter, vector search for large document sets). Section 13: tick what is done, add the live URL. Do not change other sections.
3. Dev server in background; click through every flow at 1280×720 and 375×812 with `?beispiel=1`. Check console errors. Stop the server.
4. `npm run lint` + `npm run build`, commit, push. Wait for the Vercel deploy, then ONE real run of the hero story on the LIVE URL, following data/DEMO_SCRIPT.md exactly. Note the real waiting time of each step in TASKS.md.
5. Clean final screenshots for the pitch deck → docs/screenshots/final/ (Tagesbericht deviation card, follow-up question, draft with banner + Prüfliste + cost card, draft Freigegeben, "Keine Anzeige nötig" card) at 1280×720 and 375×812. Commit.
6. Tag `freeze-candidate`, push commit + tag. From now on: no push unless I say "push".

# OPTIONAL — only after `freeze-candidate`, only if I say "go optional", only before 22:00
A. "Ende der Behinderung anzeigen": one button on an approved Behinderungsanzeige → follow-up letter (work resumes, period of the obstruction, days lost). Reuse the letter prompt with type "Ende der Behinderung". Mock for `?beispiel=1`.
B. "Aus Sicht des Auftraggebers prüfen (simuliert)": ONE Sonnet call, new prompt prompts/critic.xml (same XML structure). The AI plays the Auftraggeber's advisor and returns max 3 weak points { "title", "why", "fix" }. NO score, NO automatic rewrite. Weak points shown as cards with the fix text + "Kopieren". Label: "Simulation – Sie entscheiden." Mock for `?beispiel=1`.
After each optional item: screenshots at 1280×720/375×812, build, commit locally, re-run step 3 of Phase 9 on the hero flow. If anything in the hero flow changed or broke: `git reset --hard freeze-candidate`. Push only when I say "push".

# FINAL REPORT (short)
- Phases done / skipped / problems
- Phase 1 vs Phase 4 numbers (types correct, erfundene Fakten, average time to draft)
- Real waiting time of each hero step on the live URL
- Anything I must do manually
- The 3 biggest remaining risks for the live demo
Then STOP.
