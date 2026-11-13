/** Customer-facing *boolean* availability only. Exact inventory belongs to admin. */
export default function StockCount({
  inStock,
  className = "",
}: {
  inStock: boolean;
  className?: string;
}) {
  return (
    <span
      aria-label={inStock ? "Available" : "Sold out"}
      className={`inline-flex w-fit items-center border px-2.5 py-1.5 font-body text-[0.7rem] font-semibold uppercase tracking-[0.1em] ${
        inStock ? "border-bone-white/30 text-bone-white/80" : "border-blood-accent/70 text-blood-accent"
      } ${className}`}
    >
      {inStock ? "AVAILABLE" : "SOLD OUT"}
    </span>
  );
}
