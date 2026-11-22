import { dateLine, senderLine, signatureLines, signer, type Settings } from "@/lib/settings";
import type { Letter } from "@/lib/types";

// Letterhead, sender line, date line and signature come from the Einstellungen (lib/settings.ts).
export { dateLine, senderLine, signatureLines };

/** Evidence page for the export: what the draft is based on. */
export type Appendix = { input: string; answers: Record<string, string>; createdAt: string; report?: string };

export function appendixSections(a: Appendix): { title: string; text: string }[] {
  const created = new Date(a.createdAt);
  const answers = Object.entries(a.answers).map(([k, v]) => `${k}: ${v}`).join("\n");
  const day = created.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = created.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return [
    { title: "Erstellt", text: `${day}, ${time} Uhr` },
    ...(a.report ? [{ title: "Auszug Bautagesbericht", text: a.report.trim() }] : []),
    { title: "Ursprüngliche Eingabe", text: a.input.trim() || "–" },
    { title: "Antworten auf Rückfragen", text: answers || "–" },
  ];
}

export function paragraphs(text: string) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export { stripDraftLines } from "@/lib/text";

/** Full letter as plain text: Empfänger, Betreff, Anrede, Text, Gruß (+ Unterschrift). */
export function plainText(letter: Letter, s: Settings) {
  const sign = signatureLines(s).filter(Boolean).join("\n");
  return [letter.recipient, letter.subject, letter.salutation, letter.body, `${letter.closing}\n\n${sign}`]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n\n");
}

function fileBase(kind: string, isDraft: boolean) {
  const safe = kind.split("(")[0].trim().replace(/[^\p{L}\p{N}]+/gu, "_");
  return `${isDraft ? "ENTWURF_" : ""}${safe || "Schreiben"}_${new Date().toISOString().slice(0, 10)}`;
}

/** Diagonal "ENTWURF" as a transparent PNG, drawn in the browser (no image files needed). */
async function watermarkPng(): Promise<ArrayBuffer> {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 1400;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.translate(700, 700);
  ctx.rotate(-Math.PI / 5);
  ctx.font = "800 260px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(180, 83, 9, 0.18)";
  ctx.fillText("ENTWURF", 0, 0);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("no png");
  return blob.arrayBuffer();
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Word export in the browser, DIN 5008-like layout. Nothing is sent anywhere. */
export async function exportDocx(letter: Letter, kind: string, isDraft: boolean, date: string, s: Settings, appendix?: Appendix) {
  const me = signer(s);
  const {
    Document, Packer, Paragraph, TextRun, AlignmentType, Footer, Header, BorderStyle, ImageRun, PageBreak,
    HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, HorizontalPositionAlign, VerticalPositionAlign,
  } = await import("docx");
  const lines = (s: string, opts: { bold?: boolean; size?: number } = {}) =>
    s.split("\n").map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : 0, ...opts }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        properties: {
          page: { margin: { top: 1134, bottom: 1134, left: 1418, right: 1134 } }, // 2 / 2.5 cm
        },
        ...(isDraft && {
          // Watermark sits in the header so Word repeats it on every page, behind the text.
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      type: "png",
                      data: await watermarkPng(),
                      transformation: { width: 520, height: 520 },
                      floating: {
                        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER },
                        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.CENTER },
                        behindDocument: true,
                        allowOverlap: true,
                      },
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "ENTWURF – vor Versand prüfen", bold: true, color: "B45309", size: 18 })],
                }),
              ],
            }),
          },
        }),
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: s.absender.firma, bold: true, size: 26 }),
              new TextRun({ text: s.absender.strasse, break: 1, size: 18 }),
              new TextRun({ text: `${s.absender.plz} ${s.absender.ort}`.trim(), break: 1, size: 18 }),
              new TextRun({ text: [me.telefon && `Tel. ${me.telefon}`, s.ich.email].filter(Boolean).join(" · "), break: 1, size: 18 }),
            ],
            spacing: { after: 600 },
          }),
          new Paragraph({
            children: [new TextRun({ text: senderLine(s), size: 16 })],
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
            spacing: { after: 120 },
          }),
          new Paragraph({ children: lines(letter.recipient), spacing: { after: 720 } }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(dateLine(s, date))], spacing: { after: 480 } }),
          new Paragraph({ children: lines(letter.subject, { bold: true }), spacing: { after: 480 } }),
          new Paragraph({ children: [new TextRun(letter.salutation)], spacing: { after: 240 } }),
          ...paragraphs(letter.body).map((p) => new Paragraph({ children: lines(p), spacing: { after: 240 } })),
          new Paragraph({ children: lines(letter.closing), spacing: { before: 240 } }),
          new Paragraph({ children: lines(signatureLines(s).join("\n")) }),
          ...(appendix
            ? [
                new Paragraph({ children: [new PageBreak()] }),
                new Paragraph({ children: [new TextRun({ text: "Anlage – Dokumentation", bold: true, size: 28 })], spacing: { after: 240 } }),
                ...appendixSections(appendix).flatMap((sec) => [
                  new Paragraph({ children: [new TextRun({ text: sec.title, bold: true })], spacing: { before: 200, after: 80 } }),
                  new Paragraph({ children: lines(sec.text, { size: 20 }) }),
                ]),
              ]
            : []),
        ],
      },
    ],
  });
  download(await Packer.toBlob(doc), `${fileBase(kind, isDraft)}.docx`);
}
