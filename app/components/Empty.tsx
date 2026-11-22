import CraneMark from "./CraneMark";

/** Empty state: one short sentence and the crane mark, large and very light, centered. */
export default function Empty({ text }: { text: string; small?: boolean }) {
  return (
    <div className="fade-in flex flex-col items-center py-6 text-center">
      <CraneMark size="xl" />
      <p className="mt-3 font-serif text-[18px] text-[var(--grey)] italic">{text}</p>
    </div>
  );
}
