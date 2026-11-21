# Demo-Ablauf (Hero-Story, alle Daten = heute)

1. Vorbereitet: Tab A https://sakurajima-project-b.vercel.app · Tab B dieselbe URL mit `?beispiel=1` (Fallback, ohne KI). Browser-Zoom 100 %, Fenster 1280×720.
2. Tab A → Kachel „Tagesbericht“ → „Beispiel laden“ (Bautagesbericht Nr. 16 von heute: Bewehrungspläne fehlen, 4 von 6 Leuten ohne Arbeit).
3. „Bericht prüfen“ → Karte „Behinderungsanzeige empfohlen“ · „Ursache im Bereich des Auftraggebers: fehlende Ausführungspläne“ · „Unverzüglich anzeigen – heute“.
4. „Anzeige entwerfen“ → Rückfrage „Bis wann müssen die Pläne spätestens da sein?“ → tippen: **„<Datum übermorgen>, 12:00 Uhr“** (steht als Beispiel im Feld) → Enter.
5. Falls andere Rückfragen kommen: „Seit wann?“ → **„seit heute, <Datum>“** · „Wie viele Arbeitskräfte betroffen?“ → **„6 eingeplant, 2 umgesetzt, 4 ohne produktive Arbeit“** · „Ursache beim AG?“ → **„Ja, Tragwerksplaner des AG (Ingenieurbüro Kraus)“**.
6. Entwurf zeigen: Brief (Garching, heutiges Datum), Prüfliste alle ✓, Kostenkarte 1.856 € pro Tag → Feld „Tage“ von 1 auf 5 → **9.280 €**.
7. „Freigeben“ → Name steht schon drin → „Freigabe bestätigen“ → Banner verschwindet, „Freigegeben von … am …“ → „Word“ zeigen.
8. Fallback: hängt ein Schritt > 20 s oder kommt eine Fehlermeldung → Tab B (`?beispiel=1`, Label „Beispielmodus (offline)“) und ab Schritt 2 wiederholen.
