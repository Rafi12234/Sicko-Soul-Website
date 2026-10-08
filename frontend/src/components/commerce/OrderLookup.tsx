"use client";

import { useState, type FormEvent } from "react";
import RecordShell from "@/components/ui/RecordShell";
import SickoButton from "@/components/ui/SickoButton";
import { getCustomerAccess, saveCustomerAccess } from "@/lib/customerAccess";

// Without customer accounts or verified email, the private checkout capability
// is the only safe way to retrieve an existing customer's information.
export default function OrderLookup() {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reference = String(form.get("reference") ?? "").trim().toUpperCase();
    const privateLink = String(form.get("privateLink") ?? "").trim();
    if (!reference) { setError("ORDER REFERENCE IS REQUIRED."); return; }

    if (privateLink) {
      let token = privateLink;
      if (/^https?:\/\//i.test(privateLink)) {
        try {
          const link = new URL(privateLink);
          if (link.pathname !== `/orders/${encodeURIComponent(reference)}`) {
            setError("THAT PRIVATE LINK BELONGS TO A DIFFERENT ORDER."); return;
          }
          token = new URLSearchParams(link.hash.slice(1)).get("access") ?? "";
        } catch { setError("INVALID PRIVATE LINK."); return; }
      }
      saveCustomerAccess("order", reference, token);
    }
    if (!getCustomerAccess("order", reference)) {
      setError("PRIVATE ACCESS REQUIRED. USE THE SAME BROWSER AS CHECKOUT OR PASTE YOUR SAVED PRIVATE LINK.");
      return;
    }
    window.location.assign(`/orders/${encodeURIComponent(reference)}`);
  }

  return (
    <RecordShell
      index="06" eyebrow="ORDER TRACKING / PRIVATE ACCESS" title="FIND THE FILE"
      subtitle="Your order was saved securely on the device used for checkout. To open it elsewhere, use your private link. Email-based recovery is temporarily unavailable."
    >
      <form onSubmit={submit} className="grid max-w-4xl gap-6 border-l-2 border-blood-accent bg-off-black p-6 md:p-9">
        <label className="block">
          <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-concrete-gray">ORDER REFERENCE</span>
          <input required name="reference" placeholder="SS-XXXXXXXXX" className="mt-3 block w-full border-b border-bone-white/20 bg-transparent py-4 font-display text-[clamp(2rem,4vw,4rem)] uppercase tracking-crushed text-bone-white outline-none focus:border-blood-accent" />
        </label>
        <label className="block">
          <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-concrete-gray">PRIVATE ACCESS LINK OR TOKEN (IF USING A DIFFERENT DEVICE)</span>
          <input name="privateLink" autoComplete="off" placeholder="PASTE THE PRIVATE LINK SAVED AT CHECKOUT" className="mt-3 block w-full border-b border-bone-white/20 bg-transparent py-4 font-body text-sm text-bone-white outline-none focus:border-blood-accent" />
        </label>
        {error && <p role="alert" className="border-l border-blood-accent pl-4 font-body text-sm font-semibold uppercase tracking-[0.12em] text-blood-accent">{error}</p>}
        <p className="font-body text-sm text-concrete-gray">Never share your private link. It grants access to your order information for up to 30 days; contact support if it is lost.</p>
        <div className="max-w-sm"><SickoButton type="submit" tone="blood" full>OPEN PRIVATE ORDER</SickoButton></div>
      </form>
    </RecordShell>
  );
}
