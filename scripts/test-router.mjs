// Router test (FIX_PROMPT_ROUTER Schritt 3): runs tests/router-cases.json once each through POST /api/route
// (the same server function the app uses) and writes a Markdown table.
//
// Usage:  npm run test:router                        (default http://localhost:3000, needs the real key)
//         npm run test:router -- <URL> --only=3,16 --out=tests/results/router-21-11.md
// Refuses Demo-Modus: mock answers prove nothing.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const base = (args.find((a) => !a.startsWith("--")) || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const root = path.resolve(import.meta.dirname, "..");
const out = path.resolve(root, opt("out") || "tests/results/router-21-11.md");
const only = opt("only")?.split(",").map(Number);

// Words from the sample data that must not appear in a reason unless the input has them.
const LEAK = [/bodenplatte/i, /bewehrungspl[aä]n/i, /kraus/i, /lindner/i, /berger/i, /jagtap/i, /schneider/i, /garching/i, /musterbau/i];

const health = await fetch(`${base}/api/health`).then((r) => r.json());
if (health.mock) {
  console.error("Server läuft im Demo-Modus (kein ANTHROPIC_API_KEY) – Test abgebrochen.");
  process.exit(1);
}

const cases = JSON.parse(await readFile(path.join(root, "tests", "router-cases.json"), "utf8")).filter((c) => !only || only.includes(c.id));
const rows = [];
for (const c of cases) {
  const started = Date.now();
  let result = "Fehler";
  let reason = "";
  try {
    const res = await fetch(`${base}/api/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: c.input, date: new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    result = data.outcome === "keine_anzeige" ? "keine" : data.letter_type ?? "keine";
    reason = data.reason ?? "";
  } catch (e) {
    reason = String(e.message ?? e);
  }
  const leaked = LEAK.filter((re) => re.test(reason) && !re.test(c.input)).map((re) => re.source);
  const typeOk = result === c.expected || (c.accepted ?? []).includes(result);
  const pass = typeOk && leaked.length === 0;
  rows.push({ ...c, result, reason, leaked, pass, ms: Date.now() - started });
  console.log(`${pass ? "✓" : "✗"} #${c.id} ${c.expected} → ${result}${leaked.length ? ` LEAK ${leaked.join(",")}` : ""} (${Date.now() - started} ms)`);
}

const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const passed = rows.filter((r) => r.pass).length;
const leaks = rows.filter((r) => r.leaked.length).length;
const md = [
  `# Router-Test – ${new Date().toLocaleString("de-DE")}`,
  "",
  `Server: ${base} (Version ${health.version}) · Router: prompts/router.xml v3 · echte KI`,
  "",
  `**Bestanden: ${passed}/${rows.length}** · Leakage: ${leaks}`,
  "",
  "| # | Eingabe (60 Zeichen) | erwartet | Ergebnis | ✓/✗ | Begründung | Leakage |",
  "|---|---|---|---|---|---|---|",
  ...rows.map((r) =>
    `| ${r.id} | ${cell(r.input.slice(0, 60))}${r.input.length > 60 ? " …" : ""} | ${r.expected}${r.accepted ? ` (${r.accepted.join("/")} ok)` : ""} | ${r.result} | ${r.pass ? "✓" : "✗"} | ${cell(r.reason)} | ${r.leaked.length ? `✗ ${r.leaked.join(", ")}` : "✓"} |`,
  ),
  "",
].join("\n");
await writeFile(out, md);
console.log(`\n${passed}/${rows.length} bestanden, ${leaks} Leakage → ${path.relative(root, out)}`);
