# Bericht Nacht 21./22.11.2026 – Branch `teil-final`

**Preview-URL:** https://sakurajima-project-b-git-teil-final-emancipated.vercel.app (Vercel-geschützt → nur eingeloggt erreichbar; `/api/health` zeigt `mock` und Version)
**Stand:** `teil-final` = `3bb12f6`, `npm run build` und Lint fehlerfrei. **`main` unverändert auf `d77389c`** (live = Version 1).

## Wichtig vorab
- **router-fix ist NICHT in main gemergt.** Der Merge (fast-forward + push) wurde vom Berechtigungssystem von Claude Code blockiert und nicht umgangen. `teil-final` wurde deshalb von `router-fix` abgezweigt (gleicher Inhalt, den main nach dem Merge gehabt hätte). Wenn main live gehen soll: selbst mergen (enthält V2 + Router-Fix + alles unten).
- **baufrist-fokus-einstellungen-prompt.md fehlt** – zweimal gesucht (Projektordner, Desktop, Downloads, Documents), nicht gefunden → nicht umgesetzt.

## Fertig (getestet)
| Teil | Ergebnis | Test |
|---|---|---|
| Wetter auf „Heute“ | Route immer dynamisch ohne Fetch-Cache, Client wiederholt und fragt notfalls Open-Meteo direkt im Browser | Headless-Edge: normal + mit blockiertem /api/weather |
| teil3 Teil 1 – Rückfragen in der Eingabesprache | Router-Sprache → /api/gaps → `{input_language}` im Prompt; Erklärsatz + „Weiß ich nicht“ übersetzt; Brief bleibt Deutsch | **echt:** polnische Eingabe → 3 polnische Fragen, „Nie wiem“ (vorher: deutsche Fragen) |
| teil3 Teil 2 – Stillstand zählt bei jeder Änderung | 0,6 s ease-out vom alten Wert, reduced motion springt | 1 → 5 Tage: 1.856 € → 7.746 € (mitten) → 9.280 € |
| teil3 Teil 3 – Mengenänderung § 2 Abs. 3 | neuer Typ überall; Rechnung im Code (`lib/mengen.ts`), Anzeige über dem Schreiben, Prüfliste 7 Punkte; ≤ 10 % → kein Schreiben; kein EP-Vertrag → roter Hinweis; AG-Anordnung → Mehrkostenanzeige | **echt:** Router → mengenaenderung; Brief mit +37,5 %, 330 m³ über 1.320 m³, keine Klammern. Demo: Prüfliste 7/7 |
| Router-Tests neu | 16 Fälle + #17 Mengenänderung | **echt: 17/17, 0 Leakage**, keine Wiederholung (`tests/results/router-22-11.md`) |
| Regression | `scripts/screenshots.mjs` bei 1280/375/768 im Beispielmodus | 0 Befunde, 0 Konsolenfehler |

## Weggelassen / offen
- Fokus-Modus + Einstellungen (Prompt-Datei fehlt). Namen/Adressen kommen weiter aus `data/project.json`.
- Polnischer **Brief** nicht erneut echt getestet (1 echter Test war für die Rückfragen vorgesehen); der Brief-Prompt verlangt weiterhin immer Deutsch, frühere echte Tests (Polnisch/Türkisch) lieferten deutsche Briefe.
- 2.4 Tageszusammenfassung (nur Einträge des Tages, keine Demo-Daten) – noch nicht gemacht.
- Rückfrage-Beispiel nennt bei der polnischen Eingabe „Ingenieurbüro Kraus“ – kommt aus den Projektdaten (erlaubt), aber prüfen, ob das gewünscht ist.

## Echte API-Aufrufe
| Wann | Aufrufe |
|---|---|
| Nacht 21.11. (Budget 5) | 3 – Router Mengenänderung, Brief Mengenänderung, Rückfragen Polnisch (damals noch deutsch) |
| 22.11. Teil 2 (1 Test) | 1 – Rückfragen Polnisch |
| 22.11. Teil 3 | 17 – 16 Router-Fälle + Mengenänderung |
| **Summe** | **21** (keine automatischen Wiederholungen laut Server-Log) |

## Commits auf teil-final
- `b8937b3` Wetter auf Heute + Entscheidungen
- `a037b5d` Teil 3 (Sprache, Zählanimation, Mengenänderung)
- `7510995` Rückfragen in der Eingabesprache mit echter KI
- `3bb12f6` Router-Tests 17/17
