/** Customer-facing stock total, supplied by the products API (on hand minus reserved).
 * This is a snapshot for display; cart and checkout revalidate live inventory. */
export default function StockCount({
  availableQty,
  className = "",
}: {
  availableQty: number;
  className?: string;
}) {
  const count = Math.max(0, Math.floor(availableQty));
  const low = count <= 3;

  return (
    <span
      aria-label={count === 0 ? "Sold out" : `${count} units left in stock across all sizes`}
      className={`inline-flex w-fit items-center border px-2.5 py-1.5 font-body text-[0.7rem] font-semibold uppercase tracking-[0.1em] ${
        low ? "border-blood-accent/70 text-blood-accent" : "border-bone-white/30 text-bone-white/80"
      } ${className}`}
    >
      {count === 0 ? "SOLD OUT" : `${count} ${count === 1 ? "UNIT" : "UNITS"} LEFT`}
    </span>
  );
}
