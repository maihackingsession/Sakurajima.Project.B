# Architektur

```mermaid
flowchart TD
    A["Eingabe<br/>Tagesbericht, Text oder Sprache"] --> B{"Tagesbericht?"}
    B -- ja --> C["Bericht prüfen<br/>Abgleich mit Bauzeitenplan<br/>(Sonnet)"]
    C --> D["Abweichungskarte<br/>Dringlichkeit per Code"]
    D -- "Anzeige entwerfen" --> F
    B -- nein --> E["Router<br/>Welches Schreiben? Anzeige nötig?<br/>(Haiku)"]
    E -- "Keine Anzeige / eigener Bereich" --> E2["Hinweis<br/>Bauleiter entscheidet"]
    E2 -- "Trotzdem Entwurf" --> F
    E -- "Anzeige" --> F["Rückfragen<br/>höchstens 3, nur Fehlendes<br/>(Haiku)"]
    F --> G["Schreiben<br/>Brief auf Deutsch, JSON<br/>(Sonnet)"]
    G --> H["Entwurf bearbeiten<br/>Prüfliste je Schreibenart + Kosten<br/>(Code, keine KI)"]
    H --> I["Freigabe<br/>nur durch den Bauleiter"]
    I --> J["Export<br/>Word, PDF, Kopieren"]
    I --> V["Fristen & Verlauf<br/>nur im Browser"]
    S["Zusammenfassen<br/>Protokoll, E-Mail<br/>(Sonnet)"] -.-> E
```

- Jeder KI-Schritt ist eine API-Route mit eigenem XML-Prompt aus `/prompts` und liefert JSON.
- Keine Datenbank. Projektdaten und Bauzeitenplan liegen als JSON in `/data`; Freigaben und Verlauf nur im Browser.
- Beispielmodus (`?beispiel=1`): Jeder Schritt antwortet mit vorbereiteten Daten aus `data/mocks/`, ohne KI.
- Baufrist versendet nichts. Ein Schreiben bleibt Entwurf, bis der Bauleiter es freigibt.
