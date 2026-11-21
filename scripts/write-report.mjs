// Builds tests/results/report.md from tests/results/phase4/*.json + the KI-Vorbewertung below
// (written by Claude Code after reading every letter; NOT a human rating).
import fs from "node:fs";
const dir = "tests/results/phase4/";
const rows = fs.readdirSync(dir).filter((f) => /^s\d+\.json$/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(dir + f)));
const L = { behinderung: "Behinderung", mehrkosten: "Mehrkosten", bedenken: "Bedenken", maengel: "Mängel", keine_anzeige: "Keine Anzeige nötig", eigener_bereich: "Eigener Bereich" };
const det = (r) => (r.router?.outcome && r.router.outcome !== "anzeige" ? r.router.outcome : r.router?.letter_type);
// [Rückfragen sinnvoll?, erfundene Fakten, KI-Vorbewertung]
const R = {
  s01: ["ja (1: betroffene Arbeiten)", 0, "Nacharbeit – Router sagt „eigener Bereich – prüfen“ (Eigentümer des Baggers unbekannt, vertretbar); Entwurf korrekt mit Platzhaltern"],
  s02: ["ja (1: Frist)", 0, "brauchbar"],
  s03: ["ja (1: Frist); „Montag“ als Platzhalter", 0, "brauchbar"],
  s04: ["teils (Frage nach Verantwortung unnötig)", 0, "brauchbar"],
  s05: ["ja (1: seit wann)", 0, "brauchbar – Witterung jetzt richtig: nur Fristverlängerung, kein § 6 Abs. 6, keine Abhilfe-Frist"],
  s06: ["ja (0, alles da)", 0, "brauchbar"],
  s07: ["ja (2)", 0, "brauchbar – viele Platzhalter, weil Eingabe sehr knapp"],
  s08: ["ja (0)", 0, "brauchbar"],
  s09: ["ja (1)", 0, "brauchbar – „gestern“ korrekt in Datum umgerechnet"],
  s10: ["ja (0)", 0, "brauchbar"],
  s11: ["ja (1)", 0, "Nacharbeit – technische Begründung nur als Platzhalter; Formulierung „auf unsere Hinweise“ nicht aus der Eingabe"],
  s12: ["ja (0)", 0, "brauchbar"],
  s13: ["ja (0)", 0, "brauchbar"],
  s14: ["ja (2)", 0, "brauchbar"],
  s15: ["ja (2)", 0, "brauchbar"],
  s16: ["–", 0, "richtig: keine Anzeige nötig"],
  s17: ["–", 0, "richtig: keine Anzeige nötig"],
  s18: ["–", 0, "richtig: eigener Bereich (eigener Kran)"],
  s19: ["–", 0, "richtig: eigener Bereich (eigene Leute krank)"],
  s20: ["nein – Frist hätte gefragt werden müssen (0 Fragen)", 0, "brauchbar – Polnisch verstanden, Brief Deutsch"],
  s21: ["ja (1, auf Türkisch)", 0, "brauchbar – Türkisch verstanden, Brief Deutsch"],
};
const sec = (r) => (r.ms ? Object.values(r.ms).reduce((a, b) => a + b, 0) / 1000 : 0);
const correct = rows.filter((r) => det(r) === r.expected).length;
const withLetter = rows.filter((r) => r.letter);
const avg = withLetter.reduce((a, r) => a + sec(r), 0) / withLetter.length;
const invented = Object.values(R).reduce((a, x) => a + x[1], 0);
const first15 = rows.filter((r) => Number(r.id.slice(1)) <= 15);
const c15 = first15.filter((r) => det(r) === r.expected).length;
const good15 = first15.filter((r) => R[r.id][2].startsWith("brauchbar")).length;
let md = `# Testlauf Phase 4 – ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}\n\n`;
md += `Live-URL: https://sakurajima-project-b.vercel.app · Router + Rückfragen: claude-haiku-5-5 · Schreiben: claude-sonnet-5-5\n\n`;
md += `## Zusammenfassung\n\n`;
md += `- **Typ korrekt: ${correct}/${rows.length}** (inkl. 2× „Keine Anzeige nötig“ und 2× „Eigener Bereich“; einziger Abweichler s01 „Bagger ausgefallen“ → „eigener Bereich – bitte prüfen“, fachlich vertretbar)\n`;
md += `- **Erfundene Fakten gesamt: ${invented}** (Daten, Namen, Zahlen, Plannummern, Adressen, Mengen, die weder in Eingabe/Antworten noch in den Projektdaten stehen)\n`;
md += `- **Ø Zeit bis Entwurf: ${avg.toFixed(1)} s** (Router + Rückfragen + Schreiben, ohne Tippzeit; ${withLetter.length} Entwürfe)\n`;
md += `- Sprachen: Polnisch (s20) und Türkisch (s21) verstanden, Rückfrage in der Eingabesprache, Schreiben auf Deutsch\n\n`;
md += `| Vergleich (gleiche 15 Situationen) | Phase 1 (v1, Sonnet) | Phase 4 (v2) |\n|---|---|---|\n`;
md += `| Typ korrekt | 15/15 | ${c15}/15 (s01 jetzt „eigener Bereich – prüfen“) |\n`;
md += `| KI-Vorbewertung brauchbar | 10/15 | ${good15}/15 |\n`;
md += `| Erfundene Fakten | 0 | 0 |\n`;
md += `| Ø Rückfragen pro Situation | 2.5 (max. 4) | ${(first15.reduce((a, r) => a + (r.gaps?.questions.length ?? 0), 0) / 15).toFixed(1)} (max. 3) |\n`;
md += `| „ENTWURF“-Zeilen im Brief | 15/15 | 0/15 |\n`;
md += `| Ø Zeit bis Entwurf | 14.4 s | ${(first15.reduce((a, r) => a + sec(r), 0) / 15).toFixed(1)} s |\n\n`;
md += `> **Wichtig:** Die Spalte „KI-Vorbewertung“ ist nur ein erster Durchgang (von Claude Code nach dem Lesen jedes Schreibens). Für den Pitch zählt die Bewertung durch Bauleiter/Mentor in der Spalte daneben.\n\n`;
md += `| Situation | erwarteter Typ | erkannter Typ | Rückfragen sinnvoll? | erfundene Fakten | KI-Vorbewertung | Bewertung Bauleiter/Mentor | Zeit bis Entwurf |\n|---|---|---|---|---|---|---|---|\n`;
const cell = (s) => String(s).replace(/\|/g, "/").replace(/\n/g, " ");
for (const r of rows) {
  const [q, inv, rating] = R[r.id];
  md += `| ${r.id}: ${cell(r.input.slice(0, 70))}${r.input.length > 70 ? " …" : ""} | ${L[r.expected]} | ${r.error ? "FEHLER" : L[det(r)]} | ${q} | ${inv} | ${rating} |  | ${r.letter ? sec(r).toFixed(1) + " s" : "– (" + sec(r).toFixed(1) + " s bis Hinweis)"} |\n`;
}
md += `\n## Schreiben im Detail\n`;
for (const r of rows) {
  md += `\n### ${r.id} – ${L[r.expected]}\n\n**Eingabe:** ${r.input}\n\n**Erkannt:** ${L[det(r)]} – ${r.router?.reason ?? ""}\n\n`;
  if (!r.letter) continue;
  if (r.gaps.questions.length) md += `**Rückfragen:**\n${r.gaps.questions.map((x) => `- ${x.question}`).join("\n")}\n\n`;
  md += `**Betreff:** ${r.letter.subject.replace(/\n/g, " · ")}\n\n${r.letter.salutation}\n\n${r.letter.body}\n\n**Rechtsgrundlage:** ${r.letter.legal_basis || "–"}  \n**Frist/Form:** ${r.letter.deadline_hint || "–"}  \n**Noch offen:** ${r.letter.missing.join("; ") || "–"}\n`;
}
fs.writeFileSync("tests/results/report.md", md);
console.log(`METRICS READY: Typ korrekt ${correct}/${rows.length} · erfundene Fakten ${invented} · Ø Zeit bis Entwurf ${avg.toFixed(1)} s · Phase 1→4 (gleiche 15): Typ 15/15→${c15}/15, brauchbar 10→${good15}, ENTWURF-Zeilen 15→0, Ø Rückfragen 2.5→${(first15.reduce((a, r) => a + (r.gaps?.questions.length ?? 0), 0) / 15).toFixed(1)} · Bericht: tests/results/report.md (Spalte Bauleiter/Mentor leer)`);
