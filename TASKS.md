# TASKS

Status: todo / doing / done / blocked

## Build phases (BUILD_PROMPT.md)
| Phase | Owner | Status |
|---|---|---|
| 1 Core plumbing: data/project.json, lib/claude.ts (mock mode), API routes, Demo-Modus badge | Builder | done |

## Setup
| Task | Owner | Status |
|---|---|---|
| Next.js skeleton, folders, CLAUDE.md, TASKS.md | Builder | done |
| /api/health route | Builder | done |
| Push to GitHub | Builder | done |
| Connect Vercel, test live URL on iPad | Builder | todo |
| Add ANTHROPIC_API_KEY to .env.local and Vercel (when credits arrive) | Builder | todo |
| Draft prompts/letter.xml (starter in repo; replace content + add mentor example) | Prompt + test | todo |
| Ask challenge setters the open questions (HANDOVER §12) | Domain + pitch | todo |

## Friday — MVP (must work end to end)
| Task | Owner | Status |
|---|---|---|
| Text input page (German) + letter-type select + "Schreiben erstellen" button | Builder | done |
| Letter writer: API route calls Claude with prompts/letter.xml, returns JSON | Builder | doing (built; live Claude call untested until API key is in .env.local) |
| Edit screen: editable draft, clearly marked "Entwurf" | Builder | done |
| Export to Word (.docx) | Builder | done |
| Export to PDF | Builder | done |
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
