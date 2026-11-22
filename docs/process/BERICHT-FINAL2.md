# Bericht final-2 – 22.11.2026

**Branch:** `final-2` · **Preview-URL:** https://sakurajima-project-b-git-final-2-emancipated.vercel.app (Vercel-geschützt → nur eingeloggt; antwortet 302)
**main nicht angefasst** (weiter `d77389c`), kein Merge, kein force push. Prompt-Dateien und alte Status-/Berichtsdateien nicht committet.

## Wichtig vorab
- **final-2 ist von `teil-final` abgezweigt, nicht von `main`.** main ist noch Version 1 (ohne Router v3, Mengenänderung, Rückfragen-Sprache …). Teil B baut direkt auf Router v3 auf; von main aus wäre das nicht gegangen. teil-final enthält genau das, was main nach dem noch offenen Merge hätte. (Steht auch in TASKS.md.)
- Live-Adresse in README/Metadaten ist jetzt https://baufrist.vercel.app. Vercel-Einstellungen habe ich nicht angefasst.

## Fertig (alle Teile, jeweils Build ✓, Commit, Push)
| Teil | Commit | Ergebnis | Test |
|---|---|---|---|
| A Fokusmodus + Einstellungen | `26c260e` | Schmale Leiste (← Zurück · Titel · Status) für Eingabe, Rückfragen, Schreiben, Tagesbericht, „Eintrag für anderen Tag“, Einstellungen; Reiter „Tagesbericht“ öffnet heute, „Frühere Tage“; „n fällig“ in der Kopfzeile. Einstellungen (Ich, Bauleitung, Absender, Projekt + Wetter-Ort über Open-Meteo Geocoding, Bauherr, weitere Beteiligte) im Browser; Brief, Absenderzeile, Anrede, Unterschrift, Freigabe-/Abzeichnen-Name, Stempel, Tagesbericht-PDF, Wetter, Projektzeile und **alle Prompts** lesen daraus; „Beispielprojekt · Einstellungen anpassen →“ | Demo-Modus: Namen/Adresse geändert → Brief, Stempel „A. Berg“, Druckblatt, Tagesbericht-PDF, Kopfzeile zeigen die neuen Werte |
| B Unklare Zuständigkeit | `04643a2` | Router v4 mit `unklar` (+ `unklar_art`), eine Frage mit zwei Knöpfen unter dem Eintrag, kein weiterer KI-Aufruf; Rückfrage-Beispiele neutral | **echte KI 21/21, 0 Leakage** (Tabelle unten); Demo: alle 4 Knopf-Wege |
| C Kleine Fehler | `86e3367` | Kopfzeilen-Datum = „Heute · …“ (eine Quelle, im Browser, minütlich neu); „Beispielmodus beenden“ | an → Neuladen → beenden → Neuladen: aus |
| D Kran-Logo | `b1dad7a` | `CraneMark` (Loader-Pfade, statisch, 40×30 / 32×24, Block setzt einmal ab), Favicon | scharf bei 3× Zoom, Datum bleibt in Linie |
| E Kalender | `5ba7190` | Fällig, Monatskalender (Haarlinien, Marker rot/blau/schwarz, Pfeiltasten, role=grid), Tagesliste, „Kalender · Liste“ gemerkt | 14 Marker mit Beispieldaten, Pfeiltasten über Monatsgrenzen, leerer Tag → Formular mit Datum |
| F Einfacher | `ccaa203` | „Eintrag“ überall, nur Freigeben → „PDF herunterladen“ + „Per E-Mail senden“ (mailto), Demo-Links nur im Beispielmodus, Reiter „Unterlagen“, Bauzeitenplan in den Einstellungen, „Fremden Bericht einfügen“ klein unten | Freigabe → mailto mit Betreff/Text; Bearbeiten danach → Entwurf |
| H Volle Seiten | `f5cc1a6` | Kennzahlen, Als Nächstes, Diese Woche, Zuletzt freigegeben (nur mit Daten), Seitenspalte ab 1100px, leere Zustände mit hellem Kran, Impressum-Fußzeile, baufrist.vercel.app | Stillstand 3.712 € nach Freigabe; Wochenleiste öffnet Kalender am Tag |
| G Bewegung | `65b1a99` | `lib/motion.ts` + CSS-Variablen, nur opacity/transform, CSS statt Bibliothek, aus bei reduced motion | Animationen aktiv; mit reduce: `animation none`, `transition 0s` |

Geprüft bei 375 / 768 / 1280 px (Heute, Einstellungen, Kalender, Schreiben nach Freigabe, Unklar-Frage): keine Konsolenfehler, kein waagerechtes Scrollen (Stempel und Fokusleiste dafür bei 375 px angepasst).

## Weggelassen / Abweichungen (Gründe in TASKS.md)
- **G:** Das Ausblenden des alten Reiters (150 ms) fehlt – die Reiter bleiben gemountet (ungespeicherte Eingaben), ein Ausblenden hätte jeden Wechsel verzögert. Kein FLIP für die nachrückende Liste. **Lighthouse nicht gemessen** (nur Sichtprüfung bei 375 px).
- **F:** „Als geprüft markieren“ gab es im Code nicht mehr – nichts zu entfernen. Neues optionales Feld **E-Mail beim Bauherrn**, weil mailto sonst keinen Empfänger hätte; bei Mängelanzeigen (an Nachunternehmer) bleibt der Empfänger leer.
- **H:** „Stillstand bisher“ braucht Beträge: Freigegebene Behinderungsanzeigen speichern jetzt die Stillstand-Schätzung (`stillstand`) mit. Alte Testberichte unter `tests/results/` behalten die alte URL (Verlauf).
- **A:** „← Zurück“ im offenen Eingabefeld verwirft den Text (Status zeigt vorher „Nicht gespeichert“). Im Demo-Modus werden die vorbereiteten Antworten mit den Namen aus den Einstellungen umgeschrieben.
- Der Bauzeitenplan liegt in `data/plan.json` (nicht in project.json) – die Einstellungen zeigen ihn von dort.

## Router-Test (echte KI, `tests/results/router-final2.md`)
**Bestanden: 21/21 · Leakage: 0 · keine Wiederholung**

| # | Eingabe | erwartet | Ergebnis |
|---|---|---|---|
| 1 | Vom Bauherrn beauftragter Gerüstbauer nicht fertig | behinderung | behinderung ✓ |
| 2 | Stadt sperrt Zufahrt | behinderung | behinderung ✓ |
| 3 | Elektriker des Bauherrn nicht fertig | behinderung | behinderung ✓ |
| 4 | Architekt nie przekazał planów … (polnisch) | behinderung | behinderung ✓ |
| 5 | Bauherr ordnet Wanddurchbrüche an | mehrkosten | mehrkosten ✓ |
| 6 | Architekt will Naturstein statt Fliesen | mehrkosten | mehrkosten ✓ |
| 7 | Client asks for second fire door (englisch) | mehrkosten | mehrkosten ✓ |
| 8 | Flachdach 1 % Gefälle | bedenken | bedenken ✓ |
| 9 | Estrich auf zu feuchte Decke | bedenken | bedenken ✓ |
| 10 | C20/25 trotz Tausalz | bedenken | bedenken ✓ |
| 11 | Unser NU Trockenbau, Wände schief | maengel | maengel ✓ |
| 12 | Fliesenleger, unser Subunternehmer | maengel | maengel ✓ |
| 13 | Schalung gestellt, alles nach Plan | keine | keine ✓ |
| 14 | Betonstahl geliefert, ohne Beanstandung | keine | keine ✓ |
| 15 | Selbst falsch eingemessen | keine | keine ✓ |
| 16 | Schal- und Bewehrungsplan widersprechen sich | bedenken | bedenken ✓ |
| 17 | Aushub LV 1.200 m³ → 1.650 m³ | mengenaenderung | mengenaenderung ✓ |
| 18 | **Der Trockenbauer hat die Wände schief gestellt.** | unklar | unklar (mangel) ✓ |
| 19 | **Unser Sub hat die Fliesen hohl verlegt.** | maengel | maengel ✓ |
| 20 | **Die Betonlieferung war falsch, Festigkeit stimmt nicht.** | unklar | unklar (mangel) ✓ |
| 21 | **Der vom Bauherrn bestellte Kran ist nicht gekommen.** | behinderung | behinderung ✓ |

## Echte API-Aufrufe
**21** (nur die Router-Tests in Teil B; Budget 25). Alles andere im Demo-Modus ohne Schlüssel getestet.

## Commits auf final-2
`8606138` Scope → `26c260e` A → `04643a2` B → `86e3367` C → `b1dad7a` D → `5ba7190` E → `ccaa203` F → `f5cc1a6` H → `65b1a99` G → dieser Bericht.
