"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import { useAdminSession } from "@/components/admin/AdminSessionProvider";
import { adminButton } from "@/components/admin/AdminShell";
import { apiRequest } from "@/lib/apiClient";

type OrderItem = { id: string; productName: string; size: string; sku: string; quantity: number; unitPrice: number; lineTotal: number };
type Order = {
  reference: string; placedAt: string; customerName: string; customerPhone: string; customerEmail: string;
  shippingAddress: string; shippingCity: string; shippingDistrict: string; shippingPostalCode?: string;
  shippingLandmark?: string; paymentMethod: string; paymentStatus: string; status: string;
  stockHoldStatus: string; callAttempts?: { id:string; outcome:string; calledAt:string; callbackAt:string|null; note:string|null }[]; subtotal: number; deliveryCharge: number; grandTotal: number; currency: string;
  note?: string; items: OrderItem[];
  history: { id: string; fromStatus?: string | null; toStatus: string; changedAt: string; note?: string }[];
};
type Filter = { q: string; status: string; from: string; to: string };
const emptyFilter: Filter = { q: "", status: "", from: "", to: "" };
const todayDhaka = () => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const find = (key: string) => parts.find(part => part.type === key)?.value ?? "";
  return `${find("year")}-${find("month")}-${find("day")}`;
};
const statuses = ["PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REJECTED", "RETURNED", "OUT_OF_STOCK"];
const input = "mt-1.5 w-full min-w-0 rounded-sm border border-white/25 bg-[#151515] px-3 py-3 text-sm text-white outline-none focus:border-red-500";
const money = (n: number) => `৳ ${n.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
const dateLabel = (s: string) => new Date(s).toLocaleString("en-BD", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });
const readable = (s: string) => s.replaceAll("_", " ");

export default function OrdersManager() {
  const { token } = useAdminSession();
  const [draft, setDraft] = useState<Filter>(emptyFilter);
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [selected, setSelected] = useState<Order | null>(null);
  const [rejection, setRejection] = useState<Order | null>(null);
  const [rejectionAction, setRejectionAction] = useState<"REJECTED" | "OUT_OF_STOCK">("REJECTED");
  const [followUp, setFollowUp] = useState<Order | null>(null);
  const [callOutcome, setCallOutcome] = useState<"CALL_AGAIN" | "NO_ANSWER">("CALL_AGAIN");
  const [callbackAt, setCallbackAt] = useState("");
  const [callNote, setCallNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const detailsRef = useRef<HTMLElement>(null);
  const rejectionRef = useRef<HTMLElement>(null);
  const followUpRef = useRef<HTMLElement>(null);

  useEffect(() => { if (selected) detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [selected]);
  useEffect(() => { if (rejection) rejectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [rejection]);
  useEffect(() => { if (followUp) followUpRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [followUp]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      for (const key of ["q", "status", "from", "to"] as const) if (filter[key]) params.set(key, filter[key]);
      const result = await apiRequest<{data: Order[]; meta: {total: number; totalPages: number}}>(`/admin/orders?${params}`, {
        cache: "no-store", headers: { Authorization: `Bearer ${token}` },
      });
      setRows(result.data);
      setTotal(result.meta.total);
      setPages(result.meta.totalPages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load orders.");
    } finally { setLoading(false); }
  }, [token, filter, page]);

  useEffect(() => { void load(); }, [load]);

  const applyFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { setError("Start date must be before or equal to end date."); return; }
    setPage(1); setFilter({ ...draft, q: draft.q.trim() }); setSelected(null); setNotice("");
  };

  const quickFilter = (preset: "today" | "pending" | "all") => {
    const date = todayDhaka();
    const updated: Filter = preset === "all" ? emptyFilter :
      preset === "pending" ? { q: "", from: "", to: "", status: "PENDING_CONFIRMATION" } :
      { q: "", from: date, to: date, status: "" };
    setDraft(updated); setFilter(updated); setPage(1); setSelected(null); setError(""); setNotice("");
  };

  async function changeOrder(order: Order, status: "CONFIRMED" | "REJECTED" | "OUT_OF_STOCK", explanation = "") {
    if (busy || order.status !== "PENDING_CONFIRMATION") return;
    if (status === "CONFIRMED" && !window.confirm(`I spoke with ${order.customerName} at ${order.customerPhone} and they AGREED to buy. Confirm order ${order.reference}? The server will check stock and deduct it immediately. This cannot be undone.`)) return;
    if (status === "REJECTED" && !explanation.trim()) { setError("Enter why the customer declined before rejecting."); return; }
    if (status === "OUT_OF_STOCK" && !window.confirm(`Mark ${order.reference} as OUT OF STOCK? This closes the request and queues an unavailable-item email. Check sizes and alternatives first.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest(`/admin/orders/${encodeURIComponent(order.reference)}/status`, {
        method: "PATCH", cache: "no-store", headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, note: explanation || (status === "CONFIRMED" ? "Customer confirmed by phone" : "Out of stock after review"), ...((explanation && status !== "CONFIRMED") ? { cancellationReason: explanation } : {}) }),
      });
      setNotice(`Order ${order.reference}: ${readable(status)}. ${status === "CONFIRMED" ? "Stock deducted; confirmation email queued when email is enabled." : "Customer email queued when email is enabled."}`);
      setSelected(null); setRejection(null); setReason("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Order action failed. Check available stock or refresh.");
    } finally { setBusy(false); }
  }

  async function saveCall() {
    if (!followUp || busy) return;
    if (callbackAt && new Date(callbackAt).getTime() <= Date.now()) { setError("Choose a future callback time."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest(`/admin/orders/${encodeURIComponent(followUp.reference)}/calls`, {
        method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ outcome: callOutcome, ...(callNote.trim() ? { note: callNote.trim() } : {}), ...(callbackAt ? { callbackAt: new Date(callbackAt).toISOString() } : {}) }),
      });
      setNotice(`Phone attempt saved for ${followUp.reference}. This order remains pending; no stock was changed.`);
      setFollowUp(null); setCallNote(""); setCallbackAt(""); setSelected(null);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save call attempt."); }
    finally { setBusy(false); }
  }

  const actions = (order: Order) => order.status === "PENDING_CONFIRMATION" ? (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${order.customerPhone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-10 items-center rounded-sm border border-white/40 px-3 py-2 text-xs font-bold uppercase text-white hover:border-white">Call</a>
      <button type="button" disabled={busy} className="min-h-10 rounded-sm border border-emerald-600/70 bg-emerald-950/30 px-3 py-2 text-xs font-bold uppercase text-emerald-200 disabled:opacity-50" onClick={() => void changeOrder(order, "CONFIRMED")}>Confirm</button>
      <button type="button" disabled={busy} className="min-h-10 rounded-sm border border-red-600/70 px-3 py-2 text-xs font-bold uppercase text-red-200 disabled:opacity-50" onClick={() => { setRejectionAction("REJECTED"); setRejection(order); setReason(""); }}>Reject</button>
      <button type="button" disabled={busy} className="min-h-10 rounded-sm border border-amber-600/70 px-3 py-2 text-xs font-bold uppercase text-amber-200 disabled:opacity-50" onClick={() => { setRejectionAction("OUT_OF_STOCK"); setRejection(order); setReason("Requested size is no longer in stock"); }}>Out of stock</button>
      <button type="button" disabled={busy} className="min-h-10 rounded-sm border border-blue-600/70 px-3 py-2 text-xs font-bold uppercase text-blue-200 disabled:opacity-50" onClick={() => { setFollowUp(order); setCallOutcome("CALL_AGAIN"); setCallbackAt(""); setCallNote(""); }}>Call again</button>
    </div>
  ) : <span className="text-xs text-white/45">{readable(order.status)}</span>;

  return <>
    <AdminPageHeading eyebrow="Commerce / Orders" title="ORDER MANAGEMENT" description="Review daily COD requests, call customers, then confirm only those who agree. Unconfirmed requests never reserve stock; confirmation deducts stock atomically." />
    <form onSubmit={applyFilter} className="rounded-sm border border-white/15 bg-[#141416] p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold uppercase text-white/65 xl:col-span-2">Search name, phone, email or order number
          <input className={input} value={draft.q} onChange={e => setDraft(s => ({...s,q:e.target.value}))} placeholder="Search orders" maxLength={255} /></label>
        <label className="text-xs font-semibold uppercase text-white/65">Status
          <select className={input} value={draft.status} onChange={e => setDraft(s => ({...s,status:e.target.value}))}><option value="">All statuses</option>{statuses.map(s => <option key={s} value={s}>{readable(s)}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 xl:col-span-1">
          <label className="min-w-0 text-xs font-semibold uppercase text-white/65">From date<input type="date" className={input} value={draft.from} onChange={e => setDraft(s => ({...s,from:e.target.value}))} /></label>
          <label className="min-w-0 text-xs font-semibold uppercase text-white/65">To date<input type="date" min={draft.from || undefined} className={input} value={draft.to} onChange={e => setDraft(s => ({...s,to:e.target.value}))} /></label>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className={`${adminButton} border-red-700 bg-red-900/50`} type="submit" disabled={busy}>Apply filters</button>
        <button type="button" className={adminButton} onClick={() => quickFilter("today")}>Today's orders</button>
        <button type="button" className={adminButton} onClick={() => quickFilter("pending")}>Pending calls (oldest first)</button>
        <button className={adminButton} type="button" onClick={() => { quickFilter("all"); }}>Clear filters</button>
        <button className={adminButton} type="button" onClick={() => void load()} disabled={loading || busy}>Refresh</button>
        <span className="ml-auto text-xs text-white/55">{total} matching order{total === 1 ? "" : "s"} · Dates in Bangladesh time</span>
      </div>
    </form>

    {error && <p role="alert" className="mt-4 border-l-2 border-red-500 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="mt-4 border-l-2 border-emerald-500 p-4 text-sm text-emerald-200">{notice}</p>}
    {loading && <p role="status" className="mt-4 text-sm text-white/55">Loading orders…</p>}

    <div className="mt-5 hidden overflow-x-auto rounded-sm border border-white/15 lg:block" role="region" aria-label="Orders table" tabIndex={0}>
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase text-white/55"><tr>{["Order / Date","Customer","Phone / Email","Items","Amount","Status","Actions"].map(h => <th scope="col" className="p-3" key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.reference} className="border-t border-white/10 align-top hover:bg-white/[.04]">
          <td className="p-3"><button className="font-semibold text-red-200 underline underline-offset-4" type="button" onClick={() => setSelected(row)}>{row.reference}</button><div className="mt-1 text-xs text-white/50">{dateLabel(row.placedAt)}</div></td>
          <td className="p-3">{row.customerName}</td>
          <td className="p-3"><span className="block">{row.customerPhone}</span><span className="block max-w-48 break-all text-xs text-white/50">{row.customerEmail}</span></td>
          <td className="p-3 text-xs text-white/70">{row.items.map(i => `${i.productName} (${i.size}) ×${i.quantity}`).join(", ")}</td>
          <td className="p-3 font-semibold whitespace-nowrap">{money(row.grandTotal)}</td>
          <td className="p-3"><span className="text-xs uppercase">{readable(row.status)}</span>{row.stockHoldStatus === "RELEASED" && <p className="mt-1 text-xs text-amber-300">Legacy hold expired</p>}{row.stockHoldStatus === "NONE" && <p className="mt-1 text-xs text-white/45">No stock reserved</p>}{row.callAttempts?.[0]?.outcome === "CALL_AGAIN" && <p className="mt-1 text-xs text-blue-300">Call again</p>}</td>
          <td className="p-3">{actions(row)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="mt-5 space-y-3 lg:hidden">{rows.map(row => <article key={row.reference} className="min-w-0 border border-white/15 bg-[#141416] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><button type="button" className="font-bold text-red-200 underline underline-offset-4" onClick={() => setSelected(row)}>{row.reference}</button><span className="text-xs uppercase text-white/55">{readable(row.status)}</span></div>
      <p className="mt-1 text-xs text-white/50">{dateLabel(row.placedAt)}</p>
      <p className="mt-3 font-medium">{row.customerName}</p><p className="mt-1 text-xs text-white/65">{row.customerPhone}</p>
      <p className="mt-2 text-sm font-semibold">{money(row.grandTotal)} · {row.items.reduce((n, item) => n + item.quantity, 0)} units</p>
      <div className="mt-4 flex flex-wrap gap-2"><button className={adminButton} type="button" onClick={() => setSelected(row)}>Details</button>{actions(row)}</div>
    </article>)}</div>
    {!loading && rows.length === 0 && <p className="mt-5 border border-white/15 p-6 text-sm text-white/55">No orders match these filters.</p>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-white/55">Page {pages ? page : 0} of {pages} · 25 orders per page</span>
      <div className="flex gap-2"><button type="button" className={adminButton} disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><button type="button" className={adminButton} disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}>Next</button></div>
    </div>

    {selected && <section ref={detailsRef} aria-label={`Order ${selected.reference} details`} className="mt-7 space-y-5 border border-red-800/60 bg-[#141416] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-3xl">ORDER {selected.reference}</h2><p className="mt-1 text-xs text-white/60">{dateLabel(selected.placedAt)} · {readable(selected.status)}</p></div><button className={adminButton} type="button" onClick={() => setSelected(null)}>Close details</button></div>
      <div className="grid gap-5 sm:grid-cols-2"><div><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-300">Customer</h3><p>{selected.customerName}</p><p className="break-all text-sm text-white/75">{selected.customerPhone} · {selected.customerEmail}</p><p className="mt-3 text-sm text-white/75">{[selected.shippingAddress, selected.shippingCity, selected.shippingDistrict, selected.shippingPostalCode, selected.shippingLandmark].filter(Boolean).join(", ")}</p></div>
      <div><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-300">Payment & delivery</h3><p className="text-sm">{selected.paymentMethod} · {readable(selected.paymentStatus)}</p><p className="mt-2 text-sm">Stock: {readable(selected.stockHoldStatus)}</p>{selected.note && <p className="mt-3 text-sm text-white/65">Customer note: {selected.note}</p>}</div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[470px] text-sm"><thead className="text-left text-xs uppercase text-white/55"><tr><th className="py-2">Product</th><th>Size</th><th>Qty</th><th>Price</th></tr></thead><tbody>{selected.items.map(i => <tr key={i.id} className="border-t border-white/10"><td className="py-3 pr-3">{i.productName}<span className="ml-2 text-xs text-white/50">{i.sku}</span></td><td>{i.size}</td><td>{i.quantity}</td><td>{money(i.lineTotal)}</td></tr>)}</tbody></table></div>
      <p className="text-right text-sm text-white/65">Subtotal: {money(selected.subtotal)} · Delivery: {money(selected.deliveryCharge)}</p><p className="text-right text-lg font-bold">Total: {money(selected.grandTotal)}</p>
      <div><h3 className="mb-3 text-xs font-bold uppercase text-white/55">Phone call history</h3>
        {selected.callAttempts?.length ? <div className="space-y-2">{selected.callAttempts.map(call => <p key={call.id} className="text-xs text-white/65">{dateLabel(call.calledAt)} — {readable(call.outcome)}{call.callbackAt ? ` · Call back ${dateLabel(call.callbackAt)}` : ""}{call.note ? ` · ${call.note}` : ""}</p>)}</div> : <p className="text-xs text-white/50">No calls recorded yet.</p>}
      </div>
      <div><h3 className="mb-3 text-xs font-bold uppercase text-white/55">Order history</h3><div className="space-y-2">{selected.history.map(h => <p key={h.id} className="text-xs text-white/65">{dateLabel(h.changedAt)} — {readable(h.toStatus)}{h.note ? ` · ${h.note}` : ""}</p>)}</div></div>
      {selected.status === "PENDING_CONFIRMATION" && <div className="flex flex-wrap gap-3">{actions(selected)}</div>}
    </section>}
    {rejection && <section ref={rejectionRef} aria-label="Close order request" className="mt-6 border border-red-700 bg-red-950/20 p-4 sm:p-6">
      <h2 className="font-display text-3xl">{rejectionAction === "REJECTED" ? "REJECT ORDER?" : "MARK OUT OF STOCK?"}</h2>
      <p className="mt-2 text-sm text-white/70">This closes order <strong>{rejection.reference}</strong>. An email is queued if the email worker is configured. New requests never reserved stock; active legacy holds will be released safely.</p>
      <label className="mt-4 block text-xs font-bold uppercase">Reason {rejectionAction === "REJECTED" ? "(required)" : "(recommended)"}<textarea rows={3} maxLength={500} className={input} value={reason} onChange={e => setReason(e.target.value)} placeholder="What happened on the call / which item is unavailable?" /></label>
      <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy || (rejectionAction === "REJECTED" && !reason.trim())} className={`${adminButton} border-red-600 bg-red-900/40`} onClick={() => void changeOrder(rejection, rejectionAction, reason)}>{rejectionAction === "REJECTED" ? "Reject order" : "Send out-of-stock notice"}</button><button type="button" className={adminButton} onClick={() => { setRejection(null); setReason(""); }}>Cancel</button></div>
    </section>}
    {followUp && <section ref={followUpRef} aria-label="Schedule customer call" className="mt-6 border border-blue-800 bg-[#141416] p-4 sm:p-6">
      <h2 className="font-display text-3xl">RECORD PHONE CALL</h2>
      <p className="mt-2 text-sm text-white/70">{followUp.customerName} · {followUp.customerPhone} · {followUp.reference}. This will not confirm the order or change stock.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-bold uppercase">Call outcome<select className={input} value={callOutcome} onChange={e => setCallOutcome(e.target.value as "CALL_AGAIN" | "NO_ANSWER")}><option value="CALL_AGAIN">Call again</option><option value="NO_ANSWER">No answer</option></select></label>
        <label className="block text-xs font-bold uppercase">Call back at (optional)<input type="datetime-local" className={input} value={callbackAt} onChange={e => setCallbackAt(e.target.value)} /></label>
      </div>
      <label className="mt-4 block text-xs font-bold uppercase">Call notes<textarea className={input} maxLength={500} rows={3} value={callNote} onChange={e => setCallNote(e.target.value)} placeholder="e.g. Customer requested a call tomorrow" /></label>
      <div className="mt-4 flex flex-wrap gap-3"><button type="button" className={`${adminButton} border-blue-600 bg-blue-950/40`} disabled={busy} onClick={() => void saveCall()}>Save call attempt</button><button type="button" className={adminButton} onClick={() => setFollowUp(null)}>Cancel</button></div>
    </section>}
  </>;
}
