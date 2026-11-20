# Bauleiter-Assistent

*Ein Assistent für den Bauleiter – kein Ersatz.* Hackathon project (TUM.ai × BBIV, Challenge B). Scope and rules: see `HANDOVER.md`. Task board: `TASKS.md`.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Without `ANTHROPIC_API_KEY` the app runs in **Demo-Modus**: grey badge in the header, fixed example answers from `data/mocks/`.

## Switch on real Claude calls

1. Create `.env.local` in the project root (it is gitignored, never commit it):
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   # optional, default claude-sonnet-5-5
   ANTHROPIC_MODEL=
   ```
2. Restart `npm run dev`. The Demo-Modus badge disappears.
3. On Vercel, go to Project → Settings → Environment Variables, add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) for Production + Preview, then redeploy.

## Files the prompt/domain people edit

| File | What |
|---|---|
| `prompts/letter.xml` | Letter writer (all 4 letter types, legal rules) |
| `prompts/gaps.xml` | Follow-up questions for missing facts |
| `prompts/router.xml` | Decides letter / Tagesbericht / summary |
| `prompts/deviation.xml` | Compares Tagesbericht to `data/plan.json` |
| `prompts/summary.xml` | Summarises minutes / diary / emails |
| `data/required_fields.json` | Required facts per letter type (used by the gap checker) |
| `data/project.json` | Project, client, our company, Bauleiter, subcontractors |
| `data/plan.json`, `data/samples/*.txt` | Sample schedule and documents |
| `tests/situations.json` | Test set for the pitch numbers |

Placeholders like `{user_input}` and `{project_context}` are filled by the code. Keep them and keep the JSON keys in `<output_format>` unchanged.

## Test a prompt change

1. Edit the XML file and save it. The dev server reads prompts on every request, so no restart is needed.
2. Try it in the browser (with a key set).
3. Run the full test set: `npm run test:letters` (against localhost:3000) or `npm run test:letters -- https://<vercel-url>`.
   Results go to `tests/results/report.md`; rate each letter there (brauchbar / Nacharbeit / falsch).
