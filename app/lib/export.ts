import type { Letter } from "./letter";

function fileBase(letter: Letter) {
  const safe = (letter.typ || "Schreiben").replace(/[^\p{L}\p{N}]+/gu, "_");
  return `${safe}_${new Date().toISOString().slice(0, 10)}`;
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

function paragraphs(text: string) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function dateLine() {
  return new Date().toLocaleDateString("de-DE");
}

export async function exportDocx(letter: Letter) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
  const lines = (s: string) =>
    s.split("\n").map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : 0 }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        children: [
          new Paragraph({ children: lines(letter.empfaenger), spacing: { after: 480 } }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(dateLine())], spacing: { after: 360 } }),
          new Paragraph({ children: [new TextRun({ text: letter.betreff, bold: true })], spacing: { after: 360 } }),
          new Paragraph({ children: [new TextRun(letter.anrede)], spacing: { after: 240 } }),
          ...paragraphs(letter.text).map(
            (p) => new Paragraph({ children: lines(p), spacing: { after: 240 } }),
          ),
          new Paragraph({ children: lines(letter.grussformel), spacing: { before: 240 } }),
        ],
      },
    ],
  });
  download(await Packer.toBlob(doc), `${fileBase(letter)}.docx`);
}

export async function exportPdf(letter: Letter) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const left = 25;
  const width = 210 - left - 20;
  const lineH = 5.5;
  let y = 30;

  const write = (text: string, opts: { bold?: boolean; gapAfter?: number } = {}) => {
    pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
    const wrapped: string[] = pdf.splitTextToSize(text, width);
    for (const line of wrapped) {
      if (y > 297 - 25) {
        pdf.addPage();
        y = 25;
      }
      pdf.text(line, left, y);
      y += lineH;
    }
    y += opts.gapAfter ?? 0;
  };

  pdf.setFontSize(11);
  write(letter.empfaenger, { gapAfter: 12 });
  pdf.setFont("helvetica", "normal");
  pdf.text(dateLine(), 210 - 20, y, { align: "right" });
  y += lineH + 8;
  write(letter.betreff, { bold: true, gapAfter: 8 });
  write(letter.anrede, { gapAfter: 4 });
  for (const p of paragraphs(letter.text)) write(p, { gapAfter: 4 });
  y += 4;
  write(letter.grussformel);

  download(pdf.output("blob"), `${fileBase(letter)}.pdf`);
}
