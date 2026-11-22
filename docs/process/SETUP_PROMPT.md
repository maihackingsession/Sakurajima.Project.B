Read HANDOVER.md first (and TASKS.md if it exists). Follow the project requirements and decisions exactly.

GOAL FOR THIS SESSION
Create a minimal, deployable Next.js skeleton. Do NOT implement any product features or AI functionality yet.

STEP 1 — INSPECT BEFORE CHANGING
1. Show me: the repo file tree, `git status`, `git remote -v`, current branch, and `node -v` / `npm -v`.
2. Node must be 18.18 or newer. If it isn't, stop and tell me.
3. List every existing file that the setup could conflict with (package.json, .gitignore, README.md, etc.).
4. If anything would be overwritten or deleted, list it and ASK ME before continuing. HANDOVER.md must never be changed in this session.

STEP 2 — SCAFFOLD
Run:
npx create-next-app@latest . --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --yes

If it refuses because the folder is not empty: scaffold into a temporary folder outside the repo (e.g. ../tmp-next), copy the generated files into the repo without overwriting HANDOVER.md or any other existing file (merge .gitignore instead of replacing it), then delete the temp folder.

STEP 3 — CONFIGURE
- app/layout.tsx: `<html lang="de">`, metadata title "Bauleiter-Assistent", description "KI-Assistent für Bauleiter – Entwurf, Prüfung, Export". Add a viewport export suitable for mobile (width=device-width, initialScale=1).
- app/page.tsx: replace the default page with a minimal mobile-first page: heading "Bauleiter-Assistent", one line "Status: bereit". No other components. Remove the default Next.js demo content and unused demo images from /public.
- app/api/health/route.ts: GET returns JSON { "ok": true }.
- Create these folders, each with an empty .gitkeep: prompts/, data/, tests/
- .gitignore: make sure it contains `.env*.local` AND explicitly `.env.local`. Make sure `.env.example` is NOT ignored.
- Create .env.example containing exactly one line:
  ANTHROPIC_API_KEY=
- Install: npm install @anthropic-ai/sdk docx
  Do not install anything else.

STEP 4 — CREATE CLAUDE.md (exact content)
---
# CLAUDE.md
Every session:
1. Read HANDOVER.md and TASKS.md first. HANDOVER.md is the source of truth.
2. Do one task at a time. Update TASKS.md when a task is done.
3. Never put API keys in code or commits. Keys live only in .env.local (gitignored).
4. Don't add frameworks, dependencies or features that aren't in HANDOVER.md section 3.
5. Every generated letter is an editable draft. Never auto-send anything.
6. UI language: German. Mobile-first.
7. Prompts live in /prompts as XML files. Don't rewrite prompt content unless asked; only wire them up.
8. Commit small and often. If something breaks badly, revert to the last working commit.
---

STEP 5 — CREATE TASKS.md (exact content)
---
# TASKS

Status: todo / doing / done / blocked

## Setup
| Task | Owner | Status |
|---|---|---|
| Next.js skeleton, folders, CLAUDE.md, TASKS.md | Builder | doing |
| /api/health route | Builder | doing |
| Push to GitHub | Builder | todo |
| Connect Vercel, test live URL on iPad | Builder | todo |
| Add ANTHROPIC_API_KEY to .env.local and Vercel (when credits arrive) | Builder | todo |
| Draft prompts/letter.xml | Prompt + test | todo |
| Ask challenge setters the open questions (HANDOVER §12) | Domain + pitch | todo |

## Friday — MVP (must work end to end)
| Task | Owner | Status |
|---|---|---|
| Text input page (German) + letter-type select + "Schreiben erstellen" button | Builder | todo |
| Letter writer: API route calls Claude with prompts/letter.xml, returns JSON | Builder | todo |
| Edit screen: editable draft, clearly marked "Entwurf" | Builder | todo |
| Export to Word (.docx) | Builder | todo |
| Export to PDF | Builder | todo |
| Deploy + test MVP on iPad via live link | Prompt + test | todo |

## Saturday — until 18:00 feature freeze
| Task | Owner | Status |
|---|---|---|
| Gap checker: follow-up questions for missing facts (date, cause, affected work, delay) | Builder | todo |
| Voice input (Web Speech API, German) + keyboard dictation fallback | Builder | todo |
| Router: one input box → letter / daily report / summary | Builder | todo |
| Deviation checker vs sample plan in /data → offer matching notice | Builder | todo |
| Summariser: diary / minutes / emails → summary with open items + deadlines | Builder | todo |
| Mobile layout polish: big buttons, simple screens | Builder | todo |
| Sample plan + sample emails/reports in /data | Prompt + test | todo |
| 10–20 test situations in /tests (incl. messy/incomplete) | Prompt + test | todo |

## After freeze (bug fixes + pitch only)
| Task | Owner | Status |
|---|---|---|
| Run full test set, save outputs | Prompt + test | todo |
| Rate letters: usable / needs edits / wrong | Domain + pitch | todo |
| Pitch deck | Domain + pitch | todo |
| Backup demo video (Sat night) | Domain + pitch | todo |

## Bugs
| Bug | Found by | Status |
|---|---|---|
---

STEP 6 — VERIFY
1. Start the dev server IN THE BACKGROUND (it must not block you).
2. curl http://localhost:3000/ → confirm it returns the page with "Bauleiter-Assistent".
3. curl http://localhost:3000/api/health → confirm {"ok":true}.
4. Stop the dev server.
5. Run `npm run lint` and `npm run build`. Fix any errors caused by your changes.
6. Run `git status` and confirm .env.local would NOT be committed.

RESTRICTIONS
- No AI functionality, no extra components, abstractions or dependencies.
- Do not modify HANDOVER.md or any unrelated documentation.
- No placeholder API keys or secrets anywhere.
- Do not commit or push. I will do that myself.

FINAL REPORT
- Files created / modified / deleted (one list each)
- Commands executed
- Lint + build result
- Remaining issues or warnings
- The exact git commands for me to commit and push

Then STOP. Do not start the MVP.
