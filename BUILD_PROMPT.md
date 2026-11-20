Read HANDOVER.md, TASKS.md and CLAUDE.md first. HANDOVER.md is the source of truth. Do not modify HANDOVER.md.

# GOAL
Build the full app described in HANDOVER.md section 3 (MVP + Saturday features) in ONE session, in phases.
We have NO API key until tomorrow morning, so everything must work in MOCK MODE now and switch to real Claude calls automatically once ANTHROPIC_API_KEY is set.

# HOW TO WORK
- Work through the phases below IN ORDER.
- After EACH phase: run `npm run build`, fix errors, update TASKS.md, then `git add -A`, `git commit -m "<phase name>"` and `git push`. A finished phase must never be left uncommitted.
- If a phase is going badly after a few attempts, revert to the last commit, write the problem into TASKS.md under Bugs, and continue with the next phase.
- No new dependencies except: @anthropic-ai/sdk, docx (already installed). No databases, auth, agent frameworks or UI libraries. Tailwind only.
- UI text in German. Mobile-first: big buttons (min 48px tall), one column, readable on an iPad and phone.
- The scaffold switched on cacheComponents in next.config.ts. API routes must never be cached. If it causes any trouble, switch it off.

# PERSPECTIVE (important for all prompts and texts)
The user is the Bauleiter of a CONSTRUCTION COMPANY (the Auftragnehmer). Letters go:
- Behinderungsanzeige → to the Auftraggeber (client)
- Mehrkostenanzeige → to the Auftraggeber
- Bedenkenanzeige → to the Auftraggeber
- Mängelanzeige → to a Nachunternehmer (subcontractor)

# PHASE 1 — Core plumbing
1. `data/project.json`: one fake project, e.g.
   Bauvorhaben "Neubau Bürogebäude Forschungscampus Garching", Auftraggeber (name + address), Auftragnehmer = "Musterbau GmbH" (address), Bauleiter name, Vertragsnummer, Vertragsgrundlage "VOB/B", Nachunternehmer list (2–3 fake companies with trades, e.g. Erdbau, Rohbau, Elektro).
2. `lib/claude.ts`: one helper `runPrompt(name, input)`:
   - loads `prompts/<name>.xml`, fills `{user_input}` and `{project_context}` (from project.json) and any other placeholders,
   - if ANTHROPIC_API_KEY is empty → returns the mock JSON from `data/mocks/<name>.json` (pick the mock matching letter type / intent where relevant) after a short fake delay (~800 ms),
   - else calls Claude (model from env ANTHROPIC_MODEL, default "claude-sonnet-5-5"), max_tokens sensible, parses JSON from the reply (strip code fences), retries once on invalid JSON, returns a clear German error otherwise.
   - Make sure the /prompts and /data files are included in the Vercel deployment (e.g. outputFileTracingIncludes, or import them as strings). Verify it in the build output.
3. Add `ANTHROPIC_MODEL=` to .env.example (no value).
4. Every API route: `export const maxDuration = 60`, dynamic, POST JSON in / JSON out, never crashes the UI (always returns `{error}` with a German message on failure).
5. A small grey "Demo-Modus (ohne KI)" badge in the header when no key is set (expose via `/api/health` → `{ ok: true, mock: true|false }`).

# PHASE 2 — Prompts (v1 drafts) in /prompts
Write five XML prompts using EXACTLY the structure in HANDOVER.md section 7: letter.xml, gaps.xml, router.xml, deviation.xml, summary.xml. Put `<!-- v1 draft by Claude Code, to be tuned by the prompt person -->` at the top of each.
Shared rules in every prompt: never invent facts; anything required but missing goes into "missing"; formal German business style; output ONLY JSON.

- **router.xml** → `{ "intent": "letter" | "deviation" | "summary", "letter_type": "behinderung" | "mehrkosten" | "bedenken" | "maengel" | null, "facts": { ...extracted facts... }, "reason": "one short German sentence" }`
- **gaps.xml** → input = letter_type + facts + required fields. Output `{ "complete": bool, "questions": [ { "field": "...", "question": "short German question", "example": "short example answer" } ] }`. Max 4 questions, most important first.
- **letter.xml** → input = letter_type + facts + answers + project context. Output `{ "subject", "recipient", "salutation", "body", "closing", "legal_basis", "deadline_hint", "missing": [] }`.
  Domain rules to include (the domain person will verify them with mentors):
  - Behinderungsanzeige: VOB/B §6 Abs. 1 — must be written and sent without delay (unverzüglich); state cause, start, affected work, expected impact on schedule; reserve claims for extension of time (§6 Abs. 2) and costs (§6 Abs. 6).
  - Mehrkostenanzeige: VOB/B §2 Abs. 5 / Abs. 6 — for additional work, the claim must be announced BEFORE starting the work; describe changed/additional work, who ordered it, and that costs will be quantified separately.
  - Bedenkenanzeige: VOB/B §4 Abs. 3 — written, as early as possible, ideally before starting the work; name the concern (planning, materials, prior trades), possible consequences, request a decision/instruction.
  - Mängelanzeige (to subcontractor): describe defect, location, date found; set a reasonable deadline to remedy (Frist zur Mängelbeseitigung); reserve further rights.
  - Only cite VOB/B if project.json says Vertragsgrundlage is VOB/B.
  - The letter is a DRAFT for review; never claim it was sent.
- **deviation.xml** → input = daily report text + plan (data/plan.json). Output `{ "deviations": [ { "activity", "planned", "actual", "severity": "niedrig"|"mittel"|"hoch", "suggested_letter": letter_type|null, "explanation" } ], "summary": "..." }`.
- **summary.xml** → input = pasted diary entries / minutes / emails. Output `{ "summary": "...", "decisions": [], "open_items": [ { "task", "owner", "due" } ], "deadlines": [ { "date", "what" } ], "risks": [] }`.

Also create `data/required_fields.json` (editable by non-coders), e.g.:
- behinderung: Datum Beginn, Ursache, betroffene Leistung, voraussichtliche Auswirkung, Verursacher/Verantwortungsbereich
- mehrkosten: Art der Zusatz-/Änderungsleistung, Anordnung durch wen + wann, betroffene Leistung, Beginn der Ausführung
- bedenken: Gegenstand der Bedenken, Grund, mögliche Folgen, betroffene Leistung
- maengel: Nachunternehmer, Mangelbeschreibung, Ort, Feststellungsdatum, Frist

And mocks in `data/mocks/`: router.json, gaps.json (one incomplete example with 2–3 questions), one letter mock PER letter type (letter-behinderung.json etc., realistic full German letters), deviation.json, summary.json.

# PHASE 3 — Sample data in /data and /tests
- `data/plan.json`: a fake Bauzeitenplan for the project, ~12 activities (Baustelleneinrichtung, Erdarbeiten/Aushub, Verbau, Bodenplatte, Kellerwände, Decken EG–2.OG, Elektro-Rohinstallation, …) with start/end dates around Nov–Dec 2026, trade and responsible company.
- `data/samples/`: 3 daily reports (Bautagesberichte) where 2 contain deviations from the plan; 1 set of meeting minutes (Baubesprechungsprotokoll); 3 emails (one with a hidden deadline).
- `tests/situations.json`: 15 realistic German site situations, labelled with the expected letter type, including at least 5 messy/incomplete ones (dictation style, missing date, missing cause), e.g. "Bagger ausgefallen, Baustelle steht seit Dienstag".

# PHASE 4 — Main flow UI (the MVP + gap checker)
One main page:
1. Big textarea "Was ist auf der Baustelle passiert?" + mic button + button "Analysieren". Below it, small links: "Beispiel einfügen" (fills a random test situation) and the manual letter-type select as an override.
2. "Analysieren" → router (+ gaps if intent = letter). Max 2 Claude calls per action.
3. If letter and NOT complete → show the gap questions as simple input fields ("Es fehlen noch Angaben:"), each with the example as placeholder, plus "Trotzdem erstellen" and "Schreiben erstellen".
4. Letter → editable draft screen: a big yellow "ENTWURF – vor Versand prüfen" banner, editable fields (Empfänger, Betreff, Text, Gruß), a box showing legal_basis and deadline_hint (e.g. "Behinderungsanzeige unverzüglich schriftlich absenden"), and a list of anything still missing.
5. Export buttons: "Word (.docx)" — generate in the browser with docx (DIN 5008-like layout: sender block, recipient, date, Betreff, body, closing, Bauleiter name; footer "Entwurf"), and "PDF" — a clean print view + window.print() (works on iPad via Share → Print → PDF). Nothing is ever sent automatically.
6. Routes: /api/route (router), /api/gaps, /api/letter.

# PHASE 5 — Voice input
- Mic button uses the Web Speech API (SpeechRecognition / webkitSpeechRecognition), lang "de-DE", appends text to the textarea, shows a clear recording state.
- If unsupported, hide the button and show a hint: "Tipp: Diktierfunktion der Tastatur nutzen 🎤".

# PHASE 6 — Deviation checker
- Second tab/screen "Tagesbericht prüfen": textarea + "Beispiel-Bericht laden" (from data/samples) + "Mit Bauzeitenplan abgleichen".
- Shows deviations as cards (colour by severity). Each card with suggested_letter has a button "Anzeige entwerfen" that jumps into the letter flow pre-filled.
- Route: /api/deviation.

# PHASE 7 — Summariser
- Third tab "Zusammenfassen": textarea + "Beispiel laden" (minutes/emails) + "Zusammenfassen".
- Shows summary, decisions, open items (table), deadlines highlighted, risks.
- Route: /api/summary.

# PHASE 8 — Test runner (for the pitch numbers)
- `scripts/run-tests.mjs` + npm script `test:letters`: runs every situation in tests/situations.json through router → gaps → letter against a given base URL (default http://localhost:3000), saves each result to `tests/results/<id>.json` and a combined `tests/results/report.md` (situation, detected type vs expected, questions asked, letter) with an empty rating column (usable / needs edits / wrong).
- It must refuse to run in mock mode (check /api/health) with a clear message.

# PHASE 9 — Polish + final check
- Consistent German labels, loading states ("Wird erstellt …"), friendly error messages, nothing overflows on a 375px wide screen.
- Header: "Bauleiter-Assistent" + tagline "Ein Assistent für den Bauleiter – kein Ersatz."
- Run lint + build, click through every flow in mock mode with the dev server running in the background (stop it afterwards), fix bugs, commit, push.

# FINAL REPORT
- Phases done / skipped / with known bugs
- What to do tomorrow when the API key arrives (exact steps for .env.local and Vercel)
- Files the prompt person should edit (prompts/*.xml, data/required_fields.json) and how to test a change
- Top 5 known issues, written into TASKS.md as well
Then STOP.
