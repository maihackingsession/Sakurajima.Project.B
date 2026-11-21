// Runs every situation in tests/situations.json through router → gaps → letter
// against a running app and writes tests/results/<id>.json + tests/results/report.md.
//
// Usage:  npm run test:letters                     (default http://localhost:3000)
//         npm run test:letters -- https://my-app.vercel.app
// Refuses to run in Demo-Modus (no API key), because mock letters prove nothing.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Options: --only=s01,s03 (subset), --out=tests/results/xyz (output folder)
const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const base = (args.find((a) => !a.startsWith("--")) || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const root = path.resolve(import.meta.dirname, "..");
const outDir = opt("out") ? path.resolve(root, opt("out")) : path.join(root, "tests", "results");
const only = opt("only")?.split(",");

const LABELS = {
  behinderung: "Behinderungsanzeige",
  mehrkosten: "Mehrkostenanzeige",
  bedenken: "Bedenkenanzeige",
  maengel: "Mängelanzeige",
};

async function post(route, body) {
  const started = Date.now();
  const res = await fetch(`${base}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}, keine JSON-Antwort` }));
  if (!res.ok || data.error) throw new Error(`${route}: ${data.error || res.status}`);
  return { data, ms: Date.now() - started };
}

const cell = (s) => String(s ?? "").replace(/\|/g, "\|").replace(/\n+/g, "<br>");

async function main() {
  let health;
  try {
    health = await (await fetch(`${base}/api/health`)).json();
  } catch {
    console.error(`App unter ${base} nicht erreichbar. Läuft "npm run dev" bzw. "npm start"?`);
    process.exit(1);
  }
  if (health.mock !== false) {
    console.error(
      "Abbruch: Die App läuft im Demo-Modus (kein ANTHROPIC_API_KEY). " +
        "Testergebnisse wären nur Mock-Daten. Key in .env.local setzen, Server neu starten, erneut ausführen.",
    );
    process.exit(1);
  }

  const situations = JSON.parse(await readFile(path.join(root, "tests", "situations.json"), "utf8")).filter(
    (s) => !only || only.includes(s.id),
  );
  await mkdir(outDir, { recursive: true });
  const rows = [];

  for (const s of situations) {
    process.stdout.write(`${s.id} … `);
    const result = { id: s.id, expected: s.expected, messy: s.messy, input: s.text };
    try {
      const router = await post("/api/route", { input: s.text });
      result.router = router.data;
      const type = router.data.letter_type || s.expected;
      const gaps = await post("/api/gaps", { letter_type: type, input: s.text, facts: router.data.facts });
      result.gaps = gaps.data;
      // Letter without answers: shows how the draft handles missing facts (placeholders + "missing").
      const letter = await post("/api/letter", { letter_type: type, input: s.text, facts: router.data.facts, answers: {} });
      result.letter = letter.data;
      result.ms = { router: router.ms, gaps: gaps.ms, letter: letter.ms };
      console.log(router.data.letter_type === s.expected ? "ok" : `Typ ${router.data.letter_type} ≠ ${s.expected}`);
    } catch (e) {
      result.error = e.message;
      console.log(`FEHLER: ${e.message}`);
    }
    await writeFile(path.join(outDir, `${s.id}.json`), JSON.stringify(result, null, 2));
    rows.push(result);
  }

  const correct = rows.filter((r) => r.router?.letter_type === r.expected).length;
  const asked = rows.filter((r) => r.gaps?.questions?.length > 0).length;
  const messy = rows.filter((r) => r.messy);
  const messyAsked = messy.filter((r) => r.gaps?.questions?.length > 0).length;
  const errors = rows.filter((r) => r.error).length;

  let md = `# Testlauf Schreiben – ${new Date().toLocaleString("de-DE")}\n\n`;
  md += `App: ${base}\n\n`;
  md += `- Schreibenart richtig erkannt: **${correct} / ${rows.length}**\n`;
  md += `- Rückfragen gestellt: **${asked} / ${rows.length}** (davon unvollständige Eingaben: ${messyAsked} / ${messy.length})\n`;
  md += `- Fehler: ${errors}\n\n`;
  md += `Bewertung bitte in der letzten Spalte eintragen: **brauchbar / Nacharbeit / falsch**\n\n`;
  md += `| ID | Situation | Erwartet | Erkannt | Rückfragen | Bewertung |\n|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    const q = r.gaps?.questions?.map((x) => x.question).join("<br>") || "–";
    md += `| ${r.id} | ${cell(r.input)} | ${LABELS[r.expected]} | ${r.error ? "FEHLER" : LABELS[r.router?.letter_type] ?? "–"} | ${cell(q)} |  |\n`;
  }
  md += `\n## Schreiben im Detail\n`;
  for (const r of rows) {
    md += `\n### ${r.id} – ${LABELS[r.expected]}${r.messy ? " (unvollständige Eingabe)" : ""}\n\n`;
    md += `**Eingabe:** ${r.input}\n\n`;
    if (r.error) {
      md += `**Fehler:** ${r.error}\n`;
      continue;
    }
    md += `**Erkannt:** ${LABELS[r.router.letter_type] ?? "–"} – ${r.router.reason}\n\n`;
    if (r.gaps.questions.length) md += `**Rückfragen:**\n${r.gaps.questions.map((x) => `- ${x.question}`).join("\n")}\n\n`;
    const l = r.letter;
    md += `**Betreff:** ${l.subject}\n\n**Empfänger:**\n\n${l.recipient.split("\n").map((x) => `> ${x}`).join("\n")}\n\n`;
    md += `${l.salutation}\n\n${l.body}\n\n${l.closing}\n\n`;
    md += `**Rechtsgrundlage:** ${l.legal_basis || "–"}  \n**Frist/Form:** ${l.deadline_hint || "–"}  \n`;
    md += `**Noch offen:** ${l.missing.length ? l.missing.join("; ") : "–"}  \n`;
    md += `**Dauer:** Router ${r.ms.router} ms, Rückfragen ${r.ms.gaps} ms, Schreiben ${r.ms.letter} ms\n\n`;
    md += `**Bewertung:** ☐ brauchbar ☐ Nacharbeit ☐ falsch\n`;
  }
  await writeFile(path.join(outDir, "report.md"), md);
  console.log(`\nFertig: ${correct}/${rows.length} richtig erkannt. Bericht: tests/results/report.md`);
}

main();
