"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import RecordShell from "@/components/ui/RecordShell";
import SickoButton from "@/components/ui/SickoButton";
import { lookupOrder } from "@/lib/customerApi";

export default function OrderLookup() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reference = String(form.get("reference") ?? "").trim().toUpperCase();
    const identifier = String(form.get("identifier") ?? "").trim();

    if (!reference || !identifier) {
      setError("REFERENCE AND CONTACT ARE REQUIRED.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const order = await lookupOrder(reference, identifier);
      router.push(`/orders/${encodeURIComponent(order.reference)}`);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "NO MATCH FOUND.");
      setLoading(false);
    }
  }

  return (
    <RecordShell
      index="06"
      eyebrow="ORDER TRACKING / RESTRICTED LOOKUP"
      title="FIND THE FILE"
      subtitle="Use the order reference plus the email or phone used when the order was placed."
    >
      <form onSubmit={submit} className="grid max-w-4xl gap-6 border-l-2 border-blood-accent bg-off-black p-6 md:p-9">
        <label className="block">
          <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-concrete-gray">ORDER REFERENCE</span>
          <input required name="reference" placeholder="SS-XXXXXXXXX" className="mt-3 block w-full border-b border-bone-white/20 bg-transparent py-4 font-display text-[clamp(2rem,4vw,4rem)] uppercase tracking-crushed text-bone-white outline-none focus:border-blood-accent" />
        </label>
        <label className="block">
          <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-concrete-gray">EMAIL OR PHONE</span>
          <input required name="identifier" placeholder="THE CONTACT USED ON THE ORDER" className="mt-3 block w-full border-b border-bone-white/20 bg-transparent py-4 font-body text-lg font-semibold text-bone-white outline-none placeholder:text-sm placeholder:uppercase placeholder:tracking-[0.12em] placeholder:text-concrete-gray focus:border-blood-accent" />
        </label>
        {error && <p className="border-l border-blood-accent pl-4 font-body text-sm font-semibold uppercase tracking-[0.12em] text-blood-accent">{error}</p>}
        <div className="max-w-sm"><SickoButton type="submit" tone="blood" full disabled={loading}>{loading ? "LOCATING..." : "LOCATE ORDER"}</SickoButton></div>
      </form>
    </RecordShell>
  );
}
