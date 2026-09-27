"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import RecordShell from "@/components/ui/RecordShell";
import SickoButton from "@/components/ui/SickoButton";
import { getOrder, requestRefund } from "@/lib/customerApi";
import { humanizeStatus, money, orderStatusIndex } from "@/lib/commerce";
import type { CustomerOrder } from "@/types/commerce";

const FLOW = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

export default function OrderFile({
  reference,
  confirmation = false,
}: {
  reference: string;
  confirmation?: boolean;
}) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundOpen, setRefundOpen] = useState(false);
  const [signal, setSignal] = useState("");

  useEffect(() => {
    let alive = true;
    getOrder(reference).then((result) => {
      if (alive) {
        setOrder(result);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [reference]);

  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;

    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "").trim();
    if (reason.length < 8) {
      setSignal("GIVE US A REAL REASON.");
      return;
    }

    try {
      const refund = await requestRefund({
        orderReference: order.reference,
        amount: order.grandTotal,
        reason,
      });
      setOrder({ ...order, refunds: [...(order.refunds ?? []), refund] });
      setSignal("REFUND REQUEST FILED.");
      setRefundOpen(false);
    } catch (error) {
      setSignal(error instanceof Error ? error.message : "REFUND REQUEST FAILED.");
    }
  }

  if (loading) {
    return (
      <RecordShell index="05" eyebrow="ORDER FILE / SEARCHING" title="LOCATING RECORD">
        <div className="h-px w-full origin-left animate-pulse bg-blood-accent" />
      </RecordShell>
    );
  }

  if (!order) {
    return (
      <RecordShell
        index="00"
        eyebrow="ORDER FILE / NO MATCH"
        title="FILE NOT FOUND"
        subtitle="The reference could not be located. Use the tracker with the same email or phone used at checkout."
      >
        <div className="max-w-sm">
          <SickoButton href="/track-order" tone="blood" full>TRACK AN ORDER</SickoButton>
        </div>
      </RecordShell>
    );
  }

  const current = orderStatusIndex(order.status);
  const progressionStopped = current < 0;

  return (
    <RecordShell
      index="05"
      eyebrow={confirmation ? "ORDER SEALED / RECEIPT" : "ORDER FILE / LIVE STATUS"}
      title={confirmation ? "ORDER RECEIVED" : order.reference}
      subtitle={confirmation ? `Your order request has been recorded as ${order.reference}. Keep this reference.` : "Everything cleared for the customer is shown below."}
    >
      <div className="grid gap-10 xl:grid-cols-12">
        <div className="space-y-8 xl:col-span-8">
          <section className="border border-bone-white/15 bg-off-black p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-blood-accent">ORDER PROGRESSION</span>
              <span className="border border-bone-white/20 px-3 py-2 font-body text-[0.68rem] font-semibold uppercase tracking-[0.15em]">{humanizeStatus(order.status)}</span>
            </div>

            {progressionStopped ? (
              <div className="mt-7 border-l-2 border-blood-accent bg-blood-accent/10 p-5">
                <p className="font-display text-[clamp(2.3rem,5vw,4.8rem)] leading-[0.85] tracking-crushed">{humanizeStatus(order.status)}</p>
                <p className="mt-3 max-w-[46ch] font-body text-base leading-relaxed text-bone-white/60">This order is no longer moving through the standard delivery sequence.</p>
              </div>
            ) : (
              <div className="mt-8 grid gap-2 md:grid-cols-5">
                {FLOW.map((status, index) => {
                  const reached = current >= index;
                  return (
                    <div key={status} className={`relative border p-4 ${reached ? "border-blood-accent bg-blood-accent/10" : "border-bone-white/12"}`}>
                      <span className={`block h-2 w-2 ${reached ? "bg-blood-accent shadow-[0_0_18px_rgba(138,3,3,.85)]" : "bg-concrete-gray/30"}`} />
                      <span className="mt-4 block font-body text-[0.66rem] font-semibold uppercase leading-[1.5] tracking-[0.13em]">{humanizeStatus(status)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-end justify-between gap-6 border-b border-bone-white/15 pb-4">
              <h2 className="font-display text-[clamp(3rem,6vw,6rem)] leading-[0.8] tracking-crushed">ORDER CONTENTS</h2>
              <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.17em] text-blood-accent">{order.items.length} FILES</span>
            </div>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <article key={item.id} className="grid gap-5 border border-bone-white/15 p-5 sm:grid-cols-[7rem_1fr_auto]">
                  <div className="relative aspect-[4/5] overflow-hidden bg-off-black">
                    {item.imageUrl && <Image src={item.imageUrl} alt={item.productName} fill sizes="7rem" className="media-product object-cover" />}
                  </div>
                  <div>
                    <span className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-blood-accent">{item.sku}</span>
                    <h3 className="mt-2 font-display text-3xl leading-[0.88] tracking-crushed">{item.productName}</h3>
                    <p className="mt-3 font-body text-sm font-semibold uppercase tracking-[0.12em] text-concrete-gray">SIZE {item.size} / QTY {item.quantity}</p>
                  </div>
                  <strong className="font-body text-xl">{money(item.lineTotal)}</strong>
                </article>
              ))}
            </div>
          </section>

          {order.shipment && (
            <section className="border-l-2 border-blood-accent bg-off-black p-6">
              <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-blood-accent">COURIER FEED</span>
              <h2 className="mt-4 font-display text-[clamp(3rem,6vw,6rem)] leading-[0.82] tracking-crushed">{humanizeStatus(order.shipment.status)}</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <div><span className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-concrete-gray">COURIER</span><p className="mt-2 font-body text-lg font-semibold">{order.shipment.courierName ?? "NOT ASSIGNED"}</p></div>
                <div><span className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-concrete-gray">SERVICE</span><p className="mt-2 font-body text-lg font-semibold">{order.shipment.courierService ?? "—"}</p></div>
                <div><span className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-concrete-gray">TRACKING</span><p className="mt-2 font-body text-lg font-semibold">{order.shipment.trackingCode ?? "PENDING"}</p></div>
              </div>
              {order.shipment.history.length > 0 && (
                <div className="mt-7 border-t border-bone-white/10 pt-5">
                  {order.shipment.history.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap justify-between gap-4 border-b border-bone-white/10 py-3 font-body text-sm">
                      <span className="font-semibold uppercase tracking-[0.12em]">{humanizeStatus(entry.toStatus)}</span>
                      <time className="text-concrete-gray">{new Date(entry.changedAt).toLocaleString()}</time>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section>
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-bone-white/15 pb-4">
              <div>
                <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">AFTERCARE</span>
                <h2 className="mt-2 font-display text-[clamp(3rem,6vw,6rem)] leading-[0.82] tracking-crushed">RETURN / REFUND</h2>
              </div>
              <SickoButton type="button" tone="ghost" onClick={() => setRefundOpen((currentValue) => !currentValue)}>REQUEST REFUND</SickoButton>
            </div>

            {order.refunds?.length ? (
              <div className="mt-4 space-y-2">
                {order.refunds.map((refund) => (
                  <div key={refund.id} className="flex flex-wrap items-center justify-between gap-4 border border-bone-white/15 p-4">
                    <div>
                      <p className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-blood-accent">{refund.status}</p>
                      <p className="mt-2 font-body text-bone-white/65">{refund.reason}</p>
                    </div>
                    <strong className="font-body text-lg">{money(refund.amount)}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {refundOpen && (
              <form onSubmit={submitRefund} className="mt-6 border-l-2 border-blood-accent bg-off-black p-6">
                <label className="block font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-concrete-gray">
                  REASON
                  <textarea required name="reason" rows={5} className="mt-3 block w-full resize-none border border-bone-white/15 bg-black p-4 font-body text-base normal-case tracking-normal text-bone-white outline-none focus:border-blood-accent" placeholder="TELL US WHAT HAPPENED" />
                </label>
                <div className="mt-5 max-w-sm"><SickoButton type="submit" tone="blood" full>FILE REQUEST</SickoButton></div>
              </form>
            )}
            {signal && <p className="mt-4 font-body text-sm font-semibold uppercase tracking-[0.12em] text-blood-accent">{signal}</p>}
          </section>
        </div>

        <aside className="h-fit border border-bone-white/15 bg-off-black p-6 xl:sticky xl:top-28 xl:col-span-4">
          <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">ORDER SUMMARY</span>
          <dl className="mt-6 divide-y divide-bone-white/10">
            <div className="flex justify-between gap-5 py-4"><dt className="font-body text-sm font-semibold uppercase tracking-[0.12em] text-concrete-gray">PRODUCT</dt><dd className="font-body font-semibold">{money(order.subtotal)}</dd></div>
            <div className="flex justify-between gap-5 py-4"><dt className="font-body text-sm font-semibold uppercase tracking-[0.12em] text-concrete-gray">DELIVERY</dt><dd className="font-body font-semibold">{money(order.deliveryCharge)}</dd></div>
            <div className="flex justify-between gap-5 py-4"><dt className="font-body text-sm font-semibold uppercase tracking-[0.12em] text-concrete-gray">TOTAL</dt><dd className="font-body text-2xl font-semibold">{money(order.grandTotal)}</dd></div>
          </dl>
          <div className="mt-7 border-t border-bone-white/15 pt-5">
            <p className="font-body text-sm font-semibold uppercase tracking-[0.12em] text-concrete-gray">SHIP TO</p>
            <p className="mt-3 font-body text-lg leading-relaxed">{order.customerName}<br />{order.shippingAddress}<br />{order.shippingCity}, {order.shippingDistrict}</p>
          </div>
          <div className="mt-8"><SickoButton href="/products" tone="blood" full>RETURN TO ARCHIVE</SickoButton></div>
        </aside>
      </div>
    </RecordShell>
  );
}
