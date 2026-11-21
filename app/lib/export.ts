import project from "@/data/project.json";
import type { Letter } from "@/lib/types";

const company = project.auftragnehmer;
export const senderLine = `${company.name} · ${company.strasse} · ${company.plz_ort}`;
export const signature = [company.name, "", "", project.bauleiter.name, project.bauleiter.funktion];

export function dateLine() {
  return `München, ${new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
}

export function paragraphs(text: string) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export { stripDraftLines } from "@/lib/text";

/** Full letter as plain text: Empfänger, Betreff, Anrede, Text, Gruß (+ Unterschrift). */
export function plainText(letter: Letter) {
  const sign = signature.filter(Boolean).join("\n");
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
export async function exportDocx(letter: Letter, kind = "Schreiben", isDraft = true) {
  const {
    Document, Packer, Paragraph, TextRun, AlignmentType, Footer, Header, BorderStyle, ImageRun,
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
              new TextRun({ text: company.name, bold: true, size: 26 }),
              new TextRun({ text: company.strasse, break: 1, size: 18 }),
              new TextRun({ text: company.plz_ort, break: 1, size: 18 }),
              new TextRun({ text: `Tel. ${company.telefon} · ${company.email}`, break: 1, size: 18 }),
            ],
            spacing: { after: 600 },
          }),
          new Paragraph({
            children: [new TextRun({ text: senderLine, size: 16 })],
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
            spacing: { after: 120 },
          }),
          new Paragraph({ children: lines(letter.recipient), spacing: { after: 720 } }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(dateLine())], spacing: { after: 480 } }),
          new Paragraph({ children: lines(letter.subject, { bold: true }), spacing: { after: 480 } }),
          new Paragraph({ children: [new TextRun(letter.salutation)], spacing: { after: 240 } }),
          ...paragraphs(letter.body).map((p) => new Paragraph({ children: lines(p), spacing: { after: 240 } })),
          new Paragraph({ children: lines(letter.closing), spacing: { before: 240 } }),
          new Paragraph({ children: lines(signature.join("\n")) }),
        ],
      },
    ],
  });
  download(await Packer.toBlob(doc), `${fileBase(kind, isDraft)}.docx`);
}
