"use client";

import { mengenBlocker, percentText, qtyText, type MengenCalc } from "@/lib/mengen";
import { kicker } from "../lib/ui";

/**
 * Mengenänderung § 2 Abs. 3 VOB/B: the code's calculation, shown above the letter (and on the Rückfragen page).
 * No AI – the same numbers go into the letter prompt as fixed values.
 */
export default function MengenBox({ calc }: { calc: MengenCalc }) {
  const unit = calc.contract?.unit ?? "";
  const blocked = mengenBlocker(calc);
  return (
    <section className="mt-8 border-t-2 border-[var(--ink)] pt-3" aria-labelledby="h-mengen">
      <h2 id="h-mengen" className={kicker}>Mengenänderung · § 2 Abs. 3 VOB/B · berechnet</h2>
      {calc.percent !== null ? (
        <>
          <p className="mt-2 font-serif text-[clamp(40px,6vw,64px)] leading-[1.05] font-bold tracking-[-.02em]">{percentText(calc.percent)}</p>
          <p className="text-[18px]">
            {calc.position && <>{calc.position} · </>}LV {qtyText(calc.contract)} → {qtyText(calc.actual)}
          </p>
          {calc.kind === "mehr" && calc.over !== null && calc.threshold !== null && (
            <p className="mt-2 text-[18px]">
              Neuer Einheitspreis für <strong>{qtyText({ value: calc.over, unit })}</strong> über {qtyText({ value: calc.threshold, unit })} (110 % der Vertragsmenge).
            </p>
          )}
          {calc.kind === "minder" && (
            <p className="mt-2 text-[18px]">Mindermenge unter 90 %: Eine Erhöhung des Einheitspreises für die tatsächlich ausgeführte Menge kann verlangt werden.</p>
          )}
        </>
      ) : (
        <p className="mt-2 font-sans text-[14px] text-[var(--grey)]">Vertragsmenge und ausgeführte Menge fehlen noch – dann rechnet Baufrist die Abweichung.</p>
      )}
      {blocked && <p className={`mt-3 font-sans text-[15px] font-semibold ${calc.unitPrice === false ? "text-[var(--urgent)]" : "text-[var(--grey)]"}`} role="status">{blocked}</p>}
      {calc.ordered && <p className="mt-3 font-sans text-[15px] font-semibold text-[var(--urgent)]">Der Auftraggeber hat angeordnet – dann gilt die Mehrkostenanzeige (§ 2 Abs. 5/6 VOB/B).</p>}
    </section>
  );
}
