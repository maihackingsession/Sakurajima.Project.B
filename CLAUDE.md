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
