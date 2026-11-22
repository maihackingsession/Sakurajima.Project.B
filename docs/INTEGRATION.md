# Integration – wie Baufrist an bestehende Abläufe andockt

Baufrist ist ein Prototyp. Hier steht ehrlich, wie Daten heute hineinkommen und herauskommen, wie die Technik innen aussieht und was als Nächstes kommt.

## Heute

**Rein:**

1. **Text** – der Bauleiter beschreibt die Lage in eigenen Worten.
2. **Sprache** – Diktierfunktion des Browsers. Eingabe in jeder Sprache möglich (getestet: Polnisch, Türkisch); das Schreiben ist immer auf Deutsch.
3. **Eingefügte Texte** – ein Bautagesbericht, eine E-Mail oder ein Besprechungsprotokoll wird hineinkopiert. Ein festes Format ist nicht nötig.

**Raus:**

1. **Word (.docx)** – bis zur Freigabe mit Wasserzeichen „ENTWURF“, dazu eine Anlage „Dokumentation“ (Eingabe, Antworten, Zeitpunkt, Auszug aus dem Tagesbericht).
2. **PDF** – über die Druckansicht des Browsers („Als PDF speichern“).
3. **Kopieren** – der ganze Brief als Text, z. B. zum Einfügen in eine Outlook-Mail.

Baufrist **versendet nichts selbst**. Verschicken tut immer der Bauleiter.

## Technik

Die Oberfläche spricht intern mit einigen JSON-Routen. Sie sind ein **Prototyp ohne Anmeldung und keine öffentliche Schnittstelle** – andere Programme sollen sie so nicht anbinden.

Alle KI-Routen nehmen `POST` mit JSON an und antworten mit JSON. Bei einem Fehler kommt `{ "error": "…" }` mit Status 400 oder 500 zurück. Mit dem Header `x-beispiel: 1` kommt eine vorbereitete Antwort ohne KI-Aufruf (Beispielmodus).

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
  "recipient": "Campus Garching Projektgesellschaft mbH\nz. Hd. Herrn Prof. Jagtap\nBoltzmannstraße 15\n85748 Garching bei München",
  "salutation": "Sehr geehrter Herr Prof. Jagtap,",
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
- `GET /api/samples` liefert die Beispieltexte für „Beispiel laden“: `{ "reports": [...], "documents": [...] }`.

## Inhalt und Form

- **Inhalt orientiert sich an der VOB/B** (z. B. § 2 Abs. 5/6, § 4 Abs. 3, § 6 Abs. 1/2/6). Die Rechtsgrundlage ist immer mit „bitte prüfen“ gekennzeichnet.
- **Layout orientiert sich an DIN 5008** (Absender, Anschrift, Datum, Betreff, Anrede, Text, Gruß).
- Baufrist ersetzt keine Rechtsberatung. Jedes Schreiben muss der Bauleiter prüfen.

## Ehrliche Grenzen

- **Prototyp.** Projektdaten und Bauzeitenplan sind fest hinterlegte Beispieldaten.
- **Keine Anmeldung.** Die Routen sind nicht geschützt und nur für die eigene Oberfläche gedacht.
- **Keine Datenbank.** Nichts wird auf dem Server gespeichert. Freigaben und „Fristen & Verlauf“ liegen nur im Browser auf diesem Gerät.
- Eine KI-Antwort dauert einige Sekunden.

## Nächste Schritte

1. **Geschützte Schnittstelle pro Firma** – eigener Zugang je Firma, erst dann können andere Programme Baufrist anbinden.
2. **Firmen-Briefkopf** – Word-Export mit dem echten Briefpapier (Logo, Fußzeile, Bankdaten).
3. **E-Mail-Weiterleitung** – Tagesbericht oder Protokoll an eine Baufrist-Adresse schicken, der Entwurf wartet schon.
4. **GAEB-Import für Mehrkosten** – Positionen aus dem Leistungsverzeichnis direkt in die Mehrkostenanzeige übernehmen.
5. **Anbindung an Bautagebuch-Software** – Tagesberichte automatisch abholen statt kopieren.
