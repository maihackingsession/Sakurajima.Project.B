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

function fileBase(letter: Letter) {
  const kind = (letter.subject.split(/[–-]/)[0] || "Schreiben").trim();
  const safe = kind.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/_+$/, "");
  return `ENTWURF_${safe || "Schreiben"}_${new Date().toISOString().slice(0, 10)}`;
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
export async function exportDocx(letter: Letter) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, BorderStyle } = await import("docx");
  const lines = (s: string, opts: { bold?: boolean; size?: number } = {}) =>
    s.split("\n").map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : 0, ...opts }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        properties: {
          page: { margin: { top: 1134, bottom: 1134, left: 1418, right: 1134 } }, // 2 / 2.5 cm
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
  download(await Packer.toBlob(doc), `${fileBase(letter)}.docx`);
}
