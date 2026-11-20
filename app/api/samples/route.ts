import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Sample documents for the "Beispiel laden" buttons. Files in data/samples/:
// tagesbericht-* → Tagesbericht prüfen, protokoll-* / email-* → Zusammenfassen.
export async function GET() {
  try {
    const dir = path.join(process.cwd(), "data", "samples");
    const names = (await readdir(dir)).filter((n) => n.endsWith(".txt")).sort();
    const files = await Promise.all(
      names.map(async (name) => ({ name, text: await readFile(path.join(dir, name), "utf8") })),
    );
    return Response.json({
      reports: files.filter((f) => f.name.startsWith("tagesbericht")),
      documents: files.filter((f) => !f.name.startsWith("tagesbericht")),
    });
  } catch {
    return Response.json({ error: "Beispiele konnten nicht geladen werden." }, { status: 500 });
  }
}
