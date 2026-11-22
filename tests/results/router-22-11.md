# Router-Test – 22.11.2026, 01:01:07

Server: http://localhost:3127 (Version lokal) · Router: prompts/router.xml v3 (+ Mengenänderung) · echte KI

**Bestanden: 17/17** · Leakage: 0

| # | Eingabe (60 Zeichen) | erwartet | Ergebnis | ✓/✗ | Begründung | Leakage |
|---|---|---|---|---|---|---|
| 1 | Der vom Bauherrn beauftragte Gerüstbauer hat das Gerüst am T … | behinderung | behinderung | ✓ | Das vom Bauherrn beauftragte Gerüst am Treppenhaus Nord fehlt noch, deshalb kann die Fassadendämmung nicht beginnen. Drei Arbeitskräfte warten. | ✓ |
| 2 | Die Stadt hat die Baustellenzufahrt seit heute früh wegen ei … | behinderung | behinderung | ✓ | Die Baustellenzufahrt ist gesperrt, deshalb kann die Betonlieferung für die Wände im 1. OG nicht anliefern. Die Ursache liegt nicht bei uns. | ✓ |
| 3 | Der Elektriker des Bauherrn ist mit den Leerrohren in der De … | behinderung | behinderung | ✓ | Der Elektriker des Bauherrn ist mit den Leerrohren in der Decke über dem 1. OG nicht fertig, deshalb können wir nicht betonieren. Die Ursache liegt bei einem Vorgewerk des Bauherrn, nicht bei uns. | ✓ |
| 4 | Architekt nie przekazał planów wykonawczych dla klatki schod … | behinderung | behinderung | ✓ | Die Ausführungspläne für die Treppenhaus-Klasse fehlen vom Architekten, deshalb kann die Arbeit nicht beginnen. Die Ursache liegt beim Auftraggeber. | ✓ |
| 5 | Der Bauherr hat heute vor Ort angeordnet, im 2. OG zusätzlic … | mehrkosten | mehrkosten | ✓ | Der Bauherr hat vor Ort die zusätzliche Herstellung von drei Wanddurchbrüchen im 2. OG angeordnet, die nicht im LV steht. | ✓ |
| 6 | Der Architekt will im Foyer statt der Feinsteinzeugfliesen j … | mehrkosten | mehrkosten | ✓ | Der Architekt als Planer des Auftraggebers ordnet statt der Feinsteinzeugfliesen im Foyer Naturstein an, das ist eine geänderte Leistung. | ✓ |
| 7 | The client asked us today to install a second fire door in t … | mehrkosten | mehrkosten | ✓ | Der Auftraggeber verlangt eine zusätzliche Leistung, die nicht im Vertrag steht: eine zweite Brandschutztür im Keller. | ✓ |
| 8 | Laut Ausführungsplan soll das Flachdach mit nur 1 % Gefälle  … | bedenken | bedenken | ✓ | Wir halten das im Ausführungsplan vorgesehene Flachdach mit 1 % Gefälle ohne Gefälledämmung für zu flach, da das Wasser stehen bleibt. | ✓ |
| 9 | Der Estrich soll nach Vorgabe des Bauherrn auf die Rohdecke  … | bedenken | bedenken | ✓ | Der vorgegebene Estrich auf der Rohdecke im EG ist laut unserer Messung mit 4 CM-% noch zu feucht, daher haben wir Bedenken gegen die Ausführung. | ✓ |
| 10 | Ausgeschrieben ist Beton C20/25 für die Tiefgaragendecke. We … | bedenken | bedenken | ✓ | Wir halten den ausgeschriebenen Beton C20/25 für die Tiefgaragendecke wegen Tausalz für ungeeignet und sehen eine höhere Expositionsklasse als nötig an. | ✓ |
| 11 | Unser Nachunternehmer für den Trockenbau hat im 3. OG die Wä … | maengel | maengel | ✓ | Unser Nachunternehmer für den Trockenbau hat mangelhaft gearbeitet: Wände im 3. OG sind schief gestellt und die Fugen offen. | ✓ |
| 12 | Der Fliesenleger, unser Subunternehmer, hat im Bad 2.14 die  … | maengel | maengel | ✓ | Unser Subunternehmer, der Fliesenleger, hat mangelhaft gearbeitet, die Fliesen im Bad 2.14 sind hohl verlegt. | ✓ |
| 13 | Heute Schalung für die Wand in Achse 3 gestellt, 5 Mann, Wet … | keine | keine | ✓ | Normaler Baufortschritt: Schalung für die Wand in Achse 3 gestellt, Wetter trocken, alles nach Plan. Keine Anzeige nötig. | ✓ |
| 14 | Lieferung 12 t Betonstahl angekommen, Lieferschein 4471, vol … | keine | keine | ✓ | Lieferung ist vollständig und ohne Beanstandung angekommen, daher keine Anzeige an den Auftraggeber. | ✓ |
| 15 | Wir haben die Innenwand im 2. OG selbst falsch eingemessen u … | keine | keine | ✓ | Eigener Einmessfehler mit Abriss der Wand liegt in unserem Bereich, daher keine Anzeige an den Auftraggeber. | ✓ |
| 16 | Der Schalplan und der Bewehrungsplan widersprechen sich in A … | bedenken (behinderung ok) | bedenken | ✓ | Schalplan und Bewehrungsplan widersprechen sich in Achse B bei der Wandstärke, deshalb ist unklar welcher gilt. Die Arbeit an der Wand steht, daher auch eine Behinderung, die Planwidersprüche haben jedoch Vorrang. | ✓ |
| 17 | Aushub Baugrube, Pos. 02.03.0010, LV 1.200 m³, tatsächlich 1 … | mengenaenderung | mengenaenderung | ✓ | Die Menge der Position 02.03.0010 weicht ohne Anordnung des Auftraggebers um mehr als 10 % von der LV-Menge ab. Ursache ist ein schlechterer Baugrund als im Gutachten. | ✓ |
