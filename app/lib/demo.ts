// „Beispieldaten laden“: a demo day for the Garching project, so the app can be shown without the API.
// Fictional, built from the demo story in /data. Written only on request and only into this browser.
"use client";

import routerMock from "@/data/mocks/router.json";
import { fillDates } from "@/lib/dates";
import { saveDemo, shiftDay, isoDay, type DailyReport, type Entry } from "./store";

export function loadDemo() {
  const today = isoDay();
  const yesterday = shiftDay(today, -1);
  const facts = JSON.parse(fillDates(JSON.stringify(routerMock.facts))) as Record<string, unknown>;
  const none = (reason: string) => ({ status: "done" as const, letterType: null, reason, facts: {} });
  const id = (n: number) => `beispiel-${n}`;

  const entries: Entry[] = [
    // Today: four entries, one Behinderungsanzeige and one Mengenänderung recommended.
    {
      id: id(1), kind: "eintrag", date: today, time: "06:50", example: true,
      text: "Baustelle offen. Musterbau Betonbau mit 6 Arbeitskräften vor Ort, Polier Stefan Maier.",
      check: none("Normaler Baufortschritt – keine Anzeige nötig."),
    },
    {
      id: id(2), kind: "eintrag", date: today, time: "07:20", example: true,
      text: "Bewehrung Bodenplatte kann nicht anfangen: Die Bewehrungspläne vom Ingenieurbüro Kraus (Tragwerksplaner des AG) fehlen, waren für heute zugesagt. Polier hat um 7:15 Uhr angerufen, kein Liefertermin. 2 Leute auf Lagerfläche Schalung und Baustraße umgesetzt, 4 ohne Arbeit.",
      check: { status: "done", letterType: "behinderung", reason: routerMock.reason, facts },
    },
    {
      id: id(3), kind: "eintrag", date: today, time: "10:30", example: true,
      text: "Beton für die Fundamente Achse A geliefert, 8 m³, eingebaut.",
      check: none("Normaler Baufortschritt – keine Anzeige nötig."),
    },
    {
      id: id(8), kind: "eintrag", date: today, time: "11:15", example: true,
      text: "Aushub Baugrube, Pos. 02.03.0010, LV 1.200 m³, tatsächlich 1.650 m³, weil der Baugrund schlechter ist als im Gutachten.",
      check: {
        status: "done",
        letterType: "mengenaenderung",
        reason: "Die Menge der Position 02.03.0010 weicht ohne Anordnung um mehr als 10 % von der LV-Menge ab.",
        facts: { lv_position: "Pos. 02.03.0010 Aushub Baugrube", vertragsmenge: "1.200 m³", ist_menge: "1.650 m³", ursache: "Baugrund schlechter als im Gutachten" },
      },
    },
    // Yesterday: two entries with a finished, signed Tagesbericht.
    {
      id: id(4), kind: "eintrag", date: yesterday, time: "07:00", example: true,
      text: "Schalung Fundamente Achse A gestellt. Musterbau Betonbau 6 Arbeitskräfte, je 8 Std.",
      check: none("Normaler Baufortschritt – keine Anzeige nötig."),
    },
    {
      id: id(5), kind: "eintrag", date: yesterday, time: "14:10", example: true,
      text: "Herr Vogel (Architekt AG) auf der Baustelle, Begehung Bodenplatte, keine Anordnungen.",
      check: none("Begehung ohne Anordnung – keine Anzeige nötig."),
    },
    // Fristen & Verlauf: two events, one deadline due today.
    {
      id: id(6), kind: "frist", date: yesterday, time: "16:00", example: true,
      title: "Bewehrungspläne Bodenplatte (Zusage Ingenieurbüro Kraus)", text: "Laut Planlieferliste zugesagt.", due: today,
    },
    {
      id: id(7), kind: "notiz", date: today, time: "12:00", example: true,
      title: "Baubesprechung Nr. 5", text: "Nächste Baubesprechung mit dem AG am Dienstag, 10:00 Uhr, im Baubüro.",
    },
    // More days for the calendar in Fristen & Verlauf.
    {
      id: id(9), kind: "eintrag", date: shiftDay(today, -3), time: "07:10", example: true,
      text: "Sauberkeitsschicht eingebaut, 12 m³ C12/15. Musterbau Betonbau 5 Arbeitskräfte.",
      check: none("Normaler Baufortschritt – keine Anzeige nötig."),
    },
    {
      id: id(10), kind: "lieferung", date: shiftDay(today, -3), time: "09:30", example: true,
      title: "Betonstahl geliefert", text: "8 t Betonstahl, Lieferschein vollständig.",
    },
    {
      id: id(11), kind: "eintrag", date: shiftDay(today, -6), time: "15:20", example: true,
      text: "Grundleitungen verlegt und Dichtheitsprüfung bestanden.",
      check: none("Normaler Baufortschritt – keine Anzeige nötig."),
    },
    {
      id: id(12), kind: "frist", date: shiftDay(today, -2), time: "10:00", example: true,
      title: "Prüfbericht Baugrund an den AG", text: "Zusage aus der Baubesprechung.", due: shiftDay(today, 3),
    },
  ];

  const signedAt = new Date();
  signedAt.setDate(signedAt.getDate() - 1);
  signedAt.setHours(17, 30, 0, 0);
  const report: DailyReport = {
    date: yesterday,
    createdAt: signedAt.toISOString(),
    example: true,
    signed: { by: "Yuzhi Shao", at: signedAt.toISOString() },
    fields: {
      personal: "– Musterbau GmbH, Betonbau: 6 Arbeitskräfte, je 8 Std.",
      arbeiten: "– Schalung Fundamente Achse A gestellt",
      anordnungen: "– 14:10 Uhr Herr Vogel (Architekt AG): Begehung Bodenplatte, keine Anordnungen",
    },
  };

  saveDemo(entries, [report]);
}
