# Integration – wie Baufrist an bestehende Abläufe andockt

Baufrist ist ein Prototyp. Hier steht, wie Daten heute hineinkommen und wieder herauskommen und welche Schritte als Nächstes kommen.

## 3 Wege rein

1. **Text oder Sprache.** Der Bauleiter beschreibt die Lage in eigenen Worten, getippt oder diktiert (Diktierfunktion des Browsers). Das geht auch auf Polnisch, Türkisch oder Englisch. Das Schreiben ist trotzdem immer auf Deutsch.
2. **Eingefügte Texte aus anderen Programmen.** Ein Bautagesbericht aus der Bautagebuch-Software, eine E-Mail oder ein Besprechungsprotokoll wird einfach hineinkopiert. Baufrist braucht kein festes Format.
3. **Die vorhandenen API-Routen.** Andere Programme können dieselben Schritte direkt aufrufen (siehe unten). Sie bekommen JSON zurück.

## 3 Wege raus

1. **Word (.docx).** Bis zur Freigabe mit dem Wasserzeichen „ENTWURF“. Dazu kommt eine Anlage „Dokumentation“ mit Eingabe, Antworten, Zeitpunkt und Auszug aus dem Tagesbericht.
2. **PDF** über die Druckansicht des Browsers („Als PDF speichern“).
3. **Klartext zum Kopieren**, z. B. direkt in eine Outlook-Mail.

Dazu kommt **JSON über die API** für alle, die die Ergebnisse in eigene Systeme übernehmen wollen.

Baufrist **versendet nichts selbst**. Verschicken tut immer der Bauleiter.

## Die API-Routen

Alle KI-Routen nehmen `POST` mit JSON an und antworten mit JSON. Bei einem Fehler kommt `{ "error": "…" }` mit Status 400 oder 500 zurück.

Mit dem Header `x-beispiel: 1` kommt eine vorbereitete Antwort ohne KI-Aufruf (Beispielmodus).

Die Beispiele zeigen die Demo-Geschichte: Die Bewehrungspläne für die Bodenplatte fehlen. „Heute“ ist hier der 21.11.2026. In der App sind die Demo-Daten immer relativ zum aktuellen Tag. Lange Texte sind gekürzt (`…`).

### 1. `POST /api/deviation` – Tagesbericht prüfen

Vergleicht einen Bautagesbericht mit dem Bauzeitenplan, findet Abweichungen und schlägt ein Schreiben vor. Modell: Sonnet.

Anfrage:

```json
{ "input": "BAUTAGESBERICHT Nr. 16\nBauvorhaben: Neubau Bürogebäude Forschungscampus Garching …\nDatum: 21.11.2026\n…\n- Die Bewehrungspläne für die Bodenplatte vom Tragwerksplaner des Auftraggebers (Ingenieurbüro Kraus) waren für heute zugesagt und liegen bis Arbeitsende nicht vor.\n…" }
```

Antwort:

```json
{
  "summary": "Eine Abweichung mit Handlungsbedarf: Das Bewehren der Bodenplatte kann wegen fehlender Pläne des Auftraggebers nicht beginnen.",
  "deviations": [
    {
      "activity": "Bodenplatte bewehren",
      "planned": "Beginn 21.11.2026 (Rohbau Schneider, 6 Arbeitskräfte); Bewehrungspläne vom Tragwerksplaner des AG fällig 21.11.2026",
      "actual": "Nicht begonnen: Bewehrungspläne fehlen, kein Liefertermin. 2 Arbeitskräfte umgesetzt, 4 ohne produktive Arbeit.",
      "severity": "hoch",
      "suggested_letter": "behinderung",
      "explanation": "Die Ausführungsplanung schuldet der Auftraggeber. Ohne Anzeige drohen Ansprüche auf Bauzeit und Mehrkosten verloren zu gehen.",
      "reason": "Ursache im Bereich des Auftraggebers: fehlende Ausführungspläne",
      "event_date": "21.11.2026",
      "facts": {
        "datum_beginn": "21.11.2026",
        "ursache": "Bewehrungspläne Bodenplatte vom Tragwerksplaner des AG (Ingenieurbüro Kraus) fehlen, zugesagt für 21.11.2026",
        "betroffene_leistung": "Bodenplatte bewehren (Folge: Bodenplatte betonieren)",
        "arbeitskraefte_ohne_produktive_arbeit": 4,
        "quelle": "Bautagesbericht Nr. 16 vom 21.11.2026"
      }
    }
  ]
}
```

`severity` ist `niedrig`, `mittel` oder `hoch`. `suggested_letter` ist `behinderung`, `mehrkosten`, `bedenken`, `maengel` oder `null`.

### 2. `POST /api/route` – Situation einordnen

Erkennt, welches Schreiben passt und ob überhaupt eine Anzeige nötig ist. Modell: Haiku.

Anfrage:

```json
{ "input": "Bewehrungspläne Bodenplatte vom Tragwerksplaner immer noch nicht da, waren für heute zugesagt. 4 Eisenflechter stehen rum." }
```

Antwort:

```json
{
  "intent": "letter",
  "letter_type": "behinderung",
  "outcome": "anzeige",
  "facts": {
    "datum_beginn": "21.11.2026",
    "ursache": "Bewehrungspläne Bodenplatte vom Tragwerksplaner des AG fehlen, zugesagt für 21.11.2026",
    "betroffene_leistung": "Bodenplatte bewehren",
    "arbeitskraefte_ohne_produktive_arbeit": 4
  },
  "reason": "Fehlende Pläne des Auftraggebers verhindern den Beginn der Bewehrung – das ist eine Behinderung."
}
```

`intent` ist `letter`, `deviation` (Text ist ein Tagesbericht) oder `summary` (Text ist ein Protokoll oder eine E-Mail). `outcome` ist `anzeige`, `keine_anzeige` oder `eigener_bereich`.

### 3. `POST /api/gaps` – Rückfragen

Prüft, welche Pflichtangaben noch fehlen. Es kommen höchstens 3 Fragen, in der Sprache der Eingabe. Modell: Haiku.

Anfrage:

```json
{
  "letter_type": "behinderung",
  "input": "Bodenplatte bewehren: Nicht begonnen, Bewehrungspläne fehlen …",
  "facts": { "datum_beginn": "21.11.2026", "ursache": "…", "betroffene_leistung": "Bodenplatte bewehren" }
}
```

Antwort:

```json
{
  "complete": false,
  "questions": [
    {
      "field": "Frist zur Abhilfe",
      "question": "Bis wann müssen die Bewehrungspläne spätestens bei Ihnen sein?",
      "example": "23.11.2026, 12:00 Uhr"
    }
  ]
}
```

### 4. `POST /api/letter` – Schreiben erstellen

Schreibt den Brief auf Deutsch. Fehlt eine Angabe, steht im Text ein `[Platzhalter]`. Modell: Sonnet.

Anfrage:

```json
{
  "letter_type": "behinderung",
  "input": "Bodenplatte bewehren: Nicht begonnen, Bewehrungspläne fehlen …",
  "facts": { "datum_beginn": "21.11.2026", "ursache": "…" },
  "answers": { "Frist zur Abhilfe": "23.11.2026, 12:00 Uhr" }
}
```

Antwort:

```json
{
  "subject": "Behinderungsanzeige gem. § 6 Abs. 1 VOB/B – Fehlende Bewehrungspläne Bodenplatte\nNeubau Bürogebäude Forschungscampus Garching, Vertrag BV-2026-0417",
  "recipient": "Campus Garching Projektgesellschaft mbH\nz. Hd. Frau Dr. Andrea Lindner\nBoltzmannstraße 15\n85748 Garching bei München",
  "salutation": "Sehr geehrte Frau Dr. Lindner,",
  "body": "hiermit zeigen wir Ihnen gem. § 6 Abs. 1 VOB/B an, dass wir in der Ausführung der uns übertragenen Leistungen behindert sind.\n\n… Wir bitten Sie, uns die freigegebenen Bewehrungspläne bis spätestens 23.11.2026, 12:00 Uhr zu übergeben. …",
  "closing": "Mit freundlichen Grüßen",
  "legal_basis": "§ 6 Abs. 1 VOB/B (Anzeige), § 6 Abs. 2 VOB/B (Fristverlängerung), § 6 Abs. 6 VOB/B (Mehrkosten) – bitte prüfen",
  "deadline_hint": "Heute noch schriftlich an den Auftraggeber senden (E-Mail und vorab per Einschreiben) – Zugang dokumentieren.",
  "missing": []
}
```

### 5. `POST /api/summary` – Zusammenfassen

Fasst ein Protokoll, ein Bautagebuch oder E-Mails zusammen. Modell: Sonnet.

Anfrage:

```json
{ "input": "Protokoll Baubesprechung Nr. 4 …" }
```

Antwort:

```json
{
  "summary": "In der Baubesprechung Nr. 4 wurden der Stand der Gründungsarbeiten, fehlende Bewehrungspläne für die Bodenplatte und eine zusätzliche Hebeanlage besprochen. …",
  "decisions": ["Bemusterung Fassadenplatten (Variante B, anthrazit) durch AG freigegeben"],
  "open_items": [{ "task": "Bewehrungspläne Bodenplatte liefern", "owner": "Tragwerksplaner (Ing.-Büro Kraus)", "due": "21.11.2026" }],
  "deadlines": [{ "date": "28.11.2026", "what": "Nachtragsangebot Hebeanlage" }],
  "risks": ["Hebeanlage ist Zusatzleistung – Mehrkostenanzeige vor Ausführungsbeginn nötig"]
}
```

### Weitere Routen (ohne KI)

- `GET /api/health` gibt `{ "ok": true, "mock": false, "version": "<commit>" }` zurück.
- `GET /api/samples` liefert die Beispieltexte für die Knöpfe „Beispiel laden“: `{ "reports": [...], "documents": [...] }`.

## Inhalt und Form

- **Inhalt orientiert sich an der VOB/B** (z. B. § 2 Abs. 5/6, § 4 Abs. 3, § 6 Abs. 1/2/6). Die Rechtsgrundlage ist immer mit „bitte prüfen“ gekennzeichnet.
- **Layout orientiert sich an DIN 5008** (Absender, Anschrift, Datum, Betreff, Anrede, Text, Gruß).
- Baufrist ist **nicht zertifiziert** und ersetzt keine Rechtsberatung. Jedes Schreiben muss der Bauleiter prüfen.

## Ehrliche Grenzen

- **Prototyp.** Projektdaten und Bauzeitenplan sind fest hinterlegte Beispieldaten.
- **Noch keine Anmeldung.** Die API-Routen sind nicht geschützt. Für den echten Einsatz braucht es einen Zugang pro Firma.
- **Keine Datenbank.** Nichts wird auf dem Server gespeichert. Freigaben liegen nur im Browser.
- Eine KI-Antwort dauert einige Sekunden.

## Nächste Schritte

1. **API-Schlüssel pro Firma.** Jede Firma bekommt einen eigenen Zugang, damit die Routen geschützt sind.
2. **Briefkopf der Firma als Vorlage.** Word-Export mit dem echten Briefpapier (Logo, Fußzeile, Bankdaten).
3. **E-Mail-Weiterleitung.** Tagesbericht oder Protokoll an eine Baufrist-Adresse schicken, und der Entwurf wartet schon.
4. **GAEB-Import für Mehrkosten.** Positionen aus dem Leistungsverzeichnis direkt in die Mehrkostenanzeige übernehmen.
5. **Anbindung an Bautagebuch-Programme.** Tagesberichte automatisch abholen statt kopieren.
