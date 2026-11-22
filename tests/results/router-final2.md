# Router-Test – 22.11.2026, 02:22:15

Server: http://localhost:3124 (Version lokal) · Router: prompts/router.xml v4 (+ unklar) · echte KI

**Bestanden: 21/21** · Leakage: 0

| # | Eingabe (60 Zeichen) | erwartet | Ergebnis | ✓/✗ | Begründung | Leakage |
|---|---|---|---|---|---|---|
| 1 | Der vom Bauherrn beauftragte Gerüstbauer hat das Gerüst am T … | behinderung | behinderung | ✓ | Das vom Bauherrn beauftragte Gerüst fehlt, deshalb kann die Fassadendämmung nicht beginnen und 3 Personen warten. | ✓ |
| 2 | Die Stadt hat die Baustellenzufahrt seit heute früh wegen ei … | behinderung | behinderung | ✓ | Die Zufahrt wurde von der Stadt gesperrt, deshalb kommt die Betonlieferung nicht auf die Baustelle. Die Ursache liegt außerhalb unseres Bereichs. | ✓ |
| 3 | Der Elektriker des Bauherrn ist mit den Leerrohren in der De … | behinderung | behinderung | ✓ | Der Elektriker des Bauherrn ist mit den Leerrohren nicht fertig, deshalb können wir nicht betonieren. Die Ursache liegt bei einer Vorleistung des Bauherrn. | ✓ |
| 4 | Architekt nie przekazał planów wykonawczych dla klatki schod … | behinderung | behinderung | ✓ | Der Architekt des Auftraggebers hat die Ausführungspläne für das Treppenhaus nicht übergeben, daher können die Arbeiten nicht beginnen. Vier Arbeitskräfte warten. | ✓ |
| 5 | Der Bauherr hat heute vor Ort angeordnet, im 2. OG zusätzlic … | mehrkosten | mehrkosten | ✓ | Der Bauherr hat vor Ort eine zusätzliche, nicht im LV enthaltene Leistung angeordnet. | ✓ |
| 6 | Der Architekt will im Foyer statt der Feinsteinzeugfliesen j … | mehrkosten | mehrkosten | ✓ | Der Architekt, also der Planer des Auftraggebers, hat eine geänderte Leistung angeordnet: statt Feinsteinzeugfliesen nun Naturstein im Foyer. | ✓ |
| 7 | The client asked us today to install a second fire door in t … | mehrkosten | mehrkosten | ✓ | Der Auftraggeber verlangt eine zusätzliche Leistung, die nicht im Vertrag steht. | ✓ |
| 8 | Laut Ausführungsplan soll das Flachdach mit nur 1 % Gefälle  … | bedenken | bedenken | ✓ | Wir halten die im Ausführungsplan vorgesehene Ausführung des Flachdachs mit 1 % Gefälle ohne Gefälledämmung für zu flach, da das Wasser stehen bleibt. | ✓ |
| 9 | Der Estrich soll nach Vorgabe des Bauherrn auf die Rohdecke  … | bedenken | bedenken | ✓ | Die gemessene Restfeuchte der Rohdecke im EG ist zu hoch für den vorgegebenen Estrich, deshalb halten wir die Ausführung für bedenklich. | ✓ |
| 10 | Ausgeschrieben ist Beton C20/25 für die Tiefgaragendecke. We … | bedenken | bedenken | ✓ | Wir halten die ausgeschriebene Betongüte C20/25 für die Tiefgaragendecke wegen Tausalz für zu gering und fordern eine höhere Expositionsklasse. | ✓ |
| 11 | Unser Nachunternehmer für den Trockenbau hat im 3. OG die Wä … | maengel | maengel | ✓ | Unser Nachunternehmer für den Trockenbau hat mangelhaft gearbeitet. | ✓ |
| 12 | Der Fliesenleger, unser Subunternehmer, hat im Bad 2.14 die  … | maengel | maengel | ✓ | Unser Subunternehmer, der Fliesenleger, hat mangelhaft gearbeitet. | ✓ |
| 13 | Heute Schalung für die Wand in Achse 3 gestellt, 5 Mann, Wet … | keine | keine | ✓ | Normaler Baufortschritt: Schalung für die Wand in Achse 3 ist gestellt, das Wetter ist trocken und alles läuft nach Plan. | ✓ |
| 14 | Lieferung 12 t Betonstahl angekommen, Lieferschein 4471, vol … | keine | keine | ✓ | Die Lieferung von 12 t Betonstahl ist vollständig und ohne Beanstandung, es liegt keine Störung oder Anzeige vor. | ✓ |
| 15 | Wir haben die Innenwand im 2. OG selbst falsch eingemessen u … | keine | keine | ✓ | Eigener Fehler beim Einmessen der Innenwand im 2. OG, der Rückbau liegt in unserem Bereich; keine Anzeige an den Auftraggeber. | ✓ |
| 16 | Der Schalplan und der Bewehrungsplan widersprechen sich in A … | bedenken (behinderung ok) | bedenken | ✓ | Schalplan und Bewehrungsplan widersprechen sich bei der Wandstärke in Achse B, daher ist unklar, welcher gilt. Weil die Arbeit an der Wand deshalb steht, wäre auch eine Behinderung denkbar, die Widersprüchlichkeit der Pläne hat hier aber Vorrang. | ✓ |
| 17 | Aushub Baugrube, Pos. 02.03.0010, LV 1.200 m³, tatsächlich 1 … | mengenaenderung | mengenaenderung | ✓ | Die Menge der Position 02.03.0010 weicht deutlich um mehr als 10 % von der LV-Menge ab, ohne Anordnung des Auftraggebers. | ✓ |
| 18 | Der Trockenbauer hat die Wände schief gestellt. | unklar | unklar | ✓ | [mangel] Ein Mangel des Trockenbauers wird gemeldet, aber nicht, ob es unser Nachunternehmer oder eine Firma des Bauherrn ist. | ✓ |
| 19 | Unser Sub hat die Fliesen hohl verlegt. | maengel | maengel | ✓ | Unser Nachunternehmer hat die Fliesen mangelhaft verlegt (hohl). | ✓ |
| 20 | Die Betonlieferung war falsch, Festigkeit stimmt nicht. | unklar | unklar | ✓ | [mangel] Eine fehlerhafte Betonlieferung wird gemeldet, aber nicht, wer sie bestellt hat. | ✓ |
| 21 | Der vom Bauherrn bestellte Kran ist nicht gekommen. | behinderung | behinderung | ✓ | Der vom Bauherrn bestellte Kran ist nicht gekommen, dadurch kann die Arbeit nicht wie geplant weitergehen. | ✓ |
