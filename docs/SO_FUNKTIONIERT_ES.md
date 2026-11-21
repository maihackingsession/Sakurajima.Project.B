# So funktioniert Baufrist

**Baufrist – Bauleiter-Assistent.** Ein Assistent für den Bauleiter – kein Ersatz.
Baufrist erkennt Situationen, die eine formale Anzeige brauchen, und schreibt den Entwurf, bevor Fristen oder Ansprüche verloren gehen. Prüfen, freigeben und versenden tut immer der Bauleiter.

## Der Ablauf

1. **Tagesbericht** – Der Bauleiter fügt den Bautagesbericht ein (oder beschreibt eine Situation in eigenen Worten, auch auf Polnisch, Türkisch, Englisch …).
2. **Erkannte Abweichung** – Baufrist gleicht den Bericht mit dem Bauzeitenplan ab. Braucht eine Abweichung eine Anzeige, zeigt eine Karte z. B. „Behinderungsanzeige empfohlen – Ursache im Bereich des Auftraggebers – Unverzüglich anzeigen, heute“.
3. **Rückfrage** – Fehlt noch eine Pflichtangabe (z. B. die Frist, bis wann die Pläne kommen müssen), fragt Baufrist gezielt nach. Höchstens drei kurze Fragen, oft nur eine.
4. **Entwurf** – Baufrist schreibt einen formellen Brief nach DIN 5008, mit Betreff, Empfänger, Vorbehalten und den passenden Stellen der VOB/B.
5. **Prüfliste** – Neben dem Brief steht eine Prüfliste: Datum, Ursache, betroffene Leistung, Auswirkung, Frist, Vorbehalt, Nachweise, „unverzüglich“. Dazu eine Schätzung, was der Stillstand pro Tag kostet (nur intern, nie im Brief).
6. **Freigabe** – Erst wenn der Bauleiter auf „Freigeben“ drückt und seinen Namen bestätigt, verschwindet das Wasserzeichen „ENTWURF“.
7. **Export** – Word, PDF oder Kopieren. Mit Anlage „Dokumentation“: ursprüngliche Eingabe, Antworten, Zeitpunkt, Auszug aus dem Tagesbericht.

## Was die KI in jedem Schritt tut

| Schritt | Aufgabe der KI |
|---|---|
| Tagesbericht prüfen | Bericht mit dem Bauzeitenplan vergleichen, Abweichungen finden, passendes Schreiben vorschlagen, Fakten aus dem Bericht herausziehen |
| Eingabe analysieren | Erkennen, worum es geht (Behinderung, Mehrkosten, Bedenken, Mangel), und ob überhaupt eine Anzeige nötig ist oder die Ursache vielleicht im eigenen Bereich liegt |
| Rückfragen | Prüfen, welche Pflichtangaben fehlen, und nur danach fragen |
| Schreiben | Den Brief formulieren – immer auf Deutsch |

Alles andere ist feste Programmlogik, keine KI: die Dringlichkeit („heute“ / „seit X Tagen“), die Prüfliste, die Kostenrechnung, der Status und der Export.

## Warum Baufrist keine Fakten erfindet

- Die KI darf nur verwenden, was in der Eingabe, den Antworten oder den Projektdaten steht.
- Fehlt etwas, steht im Brief ein gelb markierter **[Platzhalter]**, z. B. „[Frist zur Abhilfe einsetzen]“. Der Bauleiter sieht sofort, was noch fehlt.
- Die Rechtsgrundlage ist immer mit „bitte prüfen“ gekennzeichnet.
- In unserem Test mit 21 Baustellen-Situationen hat die KI **keine** Daten, Namen oder Zahlen erfunden.

## Warum der Bauleiter die Kontrolle behält

- Jeder Brief ist zuerst ein **Entwurf** – gelber Balken auf dem Bildschirm, Wasserzeichen in Word und PDF.
- **Nur der Bauleiter** gibt frei, mit Namen und Uhrzeit. Ändert er danach noch etwas, ist der Brief wieder ein Entwurf.
- Baufrist **versendet nichts**. Der Bauleiter exportiert und verschickt selbst.
- Sagt Baufrist „Keine Anzeige nötig“ oder „Ursache möglicherweise im eigenen Bereich“, kann der Bauleiter trotzdem einen Entwurf erstellen. Er entscheidet.

## Wohin die Daten gehen

- Der eingegebene Text wird zur Verarbeitung an die Claude-KI (Anthropic) geschickt und das Ergebnis zurückgegeben.
- Auf unserem Server wird nichts gespeichert. Freigaben (Name, Zeitpunkt) liegen nur im Browser des Bauleiters.
- Projektdaten (Bauvorhaben, Auftraggeber, Nachunternehmer) sind im Prototyp Beispieldaten.

## Grenzen des Prototyps

- Die Projektdaten und der Bauzeitenplan sind fest hinterlegte Beispiele, keine Anbindung an echte Systeme.
- Die rechtliche Einordnung ist eine Formulierungshilfe, keine Rechtsberatung – der Brief muss geprüft werden.
- Die Kostenschätzung rechnet nur Personal (Arbeitskräfte × Stunden × Satz); Geräte und Baustellengemeinkosten kommen hinzu.
- Eine Antwort der KI dauert einige Sekunden (im Test ca. 11 Sekunden bis zum fertigen Entwurf).
- Ohne Internet läuft nur der Beispielmodus (`?beispiel=1`) mit vorbereiteten Antworten.
