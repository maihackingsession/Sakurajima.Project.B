// Mengenänderung § 2 Abs. 3 VOB/B – plain code, no AI. The numbers go into the letter prompt as fixed values.
// Inputs come from the Rückfragen answers (field names from prompts/gaps.xml), the router facts and the input text.

export type Qty = { value: number; unit: string };

export type MengenCalc = {
  position: string;
  contract: Qty | null;
  actual: Qty | null;
  /** Deviation in % (+ more, − less); null if a quantity is missing. */
  percent: number | null;
  /** "mehr" > 110 %, "minder" < 90 %, "keine" within ±10 %, null unknown. */
  kind: "mehr" | "minder" | "keine" | null;
  /** Mehrmenge: quantity above 110 % (new price) and the 110 % threshold. */
  over: number | null;
  threshold: number | null;
  /** Einheitspreisvertrag: true / false / null (unknown). */
  unitPrice: boolean | null;
  /** The client ordered something (then § 2 Abs. 5/6 instead): true / false / null. */
  ordered: boolean | null;
};

/** German number: „1.200“ = 1200, „1,5“ = 1.5, „1.200,5“ = 1200.5. */
export function parseNumber(s: string): number | null {
  const m = /-?\d[\d.\s]*(?:,\d+)?/.exec(s);
  if (!m) return null;
  const n = Number(m[0].replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** „1.200 m³“ → {1200, "m³"}. */
export function parseQty(v: unknown): Qty | null {
  if (typeof v === "number") return Number.isFinite(v) ? { value: v, unit: "" } : null;
  if (typeof v !== "string") return null;
  const m = /(-?\d[\d.\s]*(?:,\d+)?)\s*(m³|m3|m²|m2|lfm|m|t|kg|stk\.?|stück|st\.?|psch)?/i.exec(v);
  if (!m) return null;
  const value = parseNumber(m[1]);
  if (value === null) return null;
  const unit = (m[2] ?? "").replace(/^m3$/i, "m³").replace(/^m2$/i, "m²");
  return { value, unit };
}

const yesNo = (v: unknown): boolean | null => {
  if (typeof v === "boolean") return v;
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  if (/^(ja|yes|tak|evet|da|j)\b/.test(t)) return true;
  if (/^(nein|no|nie|hayır|hayir|nu|n)\b|keine?\b|nicht\b/.test(t)) return false;
  if (/einheitspreis/.test(t)) return true;
  if (/pauschal/.test(t)) return false;
  return null;
};

const fmt = (n: number, digits = 1) => n.toLocaleString("de-DE", { maximumFractionDigits: digits });
export const qtyText = (q: Qty | null) => (q ? `${fmt(q.value, 2)}${q.unit ? ` ${q.unit}` : ""}` : "");
export const percentText = (p: number) => `${p > 0 ? "+" : ""}${fmt(p, 1)} %`;

function pick(sources: Record<string, unknown>[], ...keys: string[]) {
  for (const s of sources) for (const k of keys) if (s[k] !== undefined && s[k] !== null && String(s[k]).trim() !== "") return s[k];
  return undefined;
}

export function mengenCalc(input: string, facts: Record<string, unknown>, answers: Record<string, unknown>): MengenCalc {
  const src = [answers, facts];
  // From the text as a last resort: „LV 1.200 m³, tatsächlich 1.650 m³“.
  const lvText = /(?:LV|Vertrags?menge|ausgeschrieben)\D{0,12}(\d[\d.,]*\s*(?:m³|m3|m²|m2|lfm|m|t|kg|stk|stück)?)/i.exec(input)?.[1];
  const istText = /(?:tatsächlich|ausgeführt|ist|voraussichtlich|abgerechnet)\D{0,12}(\d[\d.,]*\s*(?:m³|m3|m²|m2|lfm|m|t|kg|stk|stück)?)/i.exec(input)?.[1];
  const posText = /Pos(?:ition)?\.?\s*([\d.]+\d)/i.exec(input)?.[1];

  const contract = parseQty(pick(src, "Vertragsmenge", "vertragsmenge", "lv_menge") ?? lvText);
  let actual = parseQty(pick(src, "Ausgeführte Menge", "ausgefuehrte_menge", "ist_menge", "menge_ist") ?? istText);
  if (actual && contract && !actual.unit) actual = { ...actual, unit: contract.unit };
  const position = String(pick(src, "LV-Position", "lv_position", "position") ?? (posText ? `Pos. ${posText}` : "")).trim();

  let percent: number | null = null;
  let kind: MengenCalc["kind"] = null;
  let over: number | null = null;
  let threshold: number | null = null;
  if (contract && actual && contract.value > 0) {
    percent = Math.round(((actual.value - contract.value) / contract.value) * 1000) / 10;
    threshold = Math.round(contract.value * 1.1 * 100) / 100;
    if (actual.value > contract.value * 1.1) {
      kind = "mehr";
      over = Math.round((actual.value - threshold) * 100) / 100;
    } else if (actual.value < contract.value * 0.9) kind = "minder";
    else kind = "keine";
  }
  const unitPriceRaw = pick(src, "Einheitspreisvertrag", "einheitspreisvertrag");
  // A yes/no answer wins; otherwise „angeordnet_durch“ from the router means someone ordered it.
  const orderedAnswer = pick(src, "Anordnung des Auftraggebers", "anordnung_ag");
  const ordered = orderedAnswer !== undefined ? yesNo(orderedAnswer) : pick(src, "angeordnet_durch") !== undefined ? true : null;
  return {
    position,
    contract,
    actual,
    percent,
    kind,
    over,
    threshold,
    unitPrice: unitPriceRaw === undefined ? null : yesNo(unitPriceRaw),
    ordered,
  };
}

/** Is a letter offered? Only with a unit-price contract and a deviation > 10 %. */
export function mengenBlocker(c: MengenCalc): string | null {
  if (c.unitPrice === false) return "Gilt nur bei Einheitspreisverträgen – keine Preisanpassung nach § 2 Abs. 3 VOB/B.";
  if (c.kind === "keine") return "Keine Preisanpassung nach § 2 Abs. 3 – Abweichung ≤ 10 %.";
  return null;
}

/** Fixed values for the letter prompt (the AI does not calculate). */
export function mengenPromptBlock(c: MengenCalc) {
  const lines = [
    "Rechenwerte (vom Code berechnet, genau so übernehmen):",
    c.position && `- LV-Position: ${c.position}`,
    c.contract && `- Vertragsmenge: ${qtyText(c.contract)}`,
    c.actual && `- Ausgeführte/voraussichtliche Menge: ${qtyText(c.actual)}`,
    c.percent !== null && `- Abweichung: ${percentText(c.percent)}`,
    c.kind === "mehr" && c.over !== null && c.threshold !== null && `- Mehrmenge: neuer Einheitspreis für ${qtyText({ value: c.over, unit: c.contract?.unit ?? "" })} über ${qtyText({ value: c.threshold, unit: c.contract?.unit ?? "" })} (110 % der Vertragsmenge)`,
    c.kind === "minder" && "- Mindermenge unter 90 %: Erhöhung des Einheitspreises für die tatsächlich ausgeführte Menge verlangen",
  ];
  return lines.filter(Boolean).join("\n");
}
