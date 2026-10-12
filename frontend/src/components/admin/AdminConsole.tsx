"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiError } from "@/lib/apiClient";
import { getAdminAccessToken, getAdminStaff, listenForAdminSession, refreshAdminSession, setAdminSession, signOutAdmin } from "@/lib/adminSession";
import ContentUpdateEditor from "@/components/admin/ContentUpdateEditor";
import StreetsMediaEditor from "@/components/admin/StreetsMediaEditor";
import SiteMediaEditor from "@/components/admin/SiteMediaEditor"; // SICKO_DYNAMIC_SITE_MEDIA
import CatalogHierarchyEditor from "@/components/admin/CatalogHierarchyEditor";

type Staff = { id: string; fullName: string; email: string; role: string };
type RecordRow = Record<string, unknown>;
type Resource = "orders" | "inventory" | "shipments" | "reviews" | "complaints" | "refunds" | "payments" | "email/outbox";
const options: { resource: Resource; roles: string[] }[] = [
  { resource: "orders", roles: ["ADMIN", "ORDER_MANAGER"] },
  { resource: "inventory", roles: ["ADMIN", "INVENTORY_MANAGER"] },
  { resource: "shipments", roles: ["ADMIN", "ORDER_MANAGER"] },
  { resource: "reviews", roles: ["ADMIN", "SUPPORT"] },
  { resource: "complaints", roles: ["ADMIN", "SUPPORT"] },
  { resource: "refunds", roles: ["ADMIN", "ORDER_MANAGER"] },
  { resource: "payments", roles: ["ADMIN", "ORDER_MANAGER"] },
  { resource: "email/outbox", roles: ["ADMIN"] },
];
const statusOptions: Partial<Record<Resource, string[]>> = {
  orders: ["CONFIRMED", "PROCESSING", "CANCELLED", "REJECTED"],
  shipments: ["READY", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED", "CANCELLED"],
  reviews: ["APPROVED", "REJECTED", "HIDDEN"],
  complaints: ["OPEN", "IN_REVIEW", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "REJECTED"],
  refunds: ["APPROVED", "PROCESSING", "COMPLETED", "REJECTED"],
  payments: ["INITIATED", "PENDING", "PAID", "FAILED", "CANCELLED"],
};
const fieldNames: Record<Resource, string[]> = {
  orders: ["reference", "customerName", "status", "stockHoldStatus", "paymentStatus", "grandTotal"],
  inventory: ["variantId", "sku", "onHandQty", "reservedQty", "availableQty"],
  shipments: ["id", "orderReference", "status", "trackingCode", "courierName"],
  reviews: ["id", "productName", "displayName", "rating", "status"],
  complaints: ["id", "reference", "status", "priority", "subject"],
  refunds: ["id", "orderReference", "amount", "status"],
  payments: ["id", "orderReference", "amount", "status"],
  "email/outbox": ["id", "eventType", "status", "attemptCount", "sentAt"],
};

export default function AdminConsole() {
  // Short-lived JWT in memory; HttpOnly rotating refresh cookie survives reload.
  const [checkingSession, setCheckingSession] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [token, setToken] = useState("");
  const [pane, setPane] = useState<"content" | "media" | "catalog" | "operations">("content");
  const [staff, setStaff] = useState<Staff | null>(null);
  const [resource, setResource] = useState<Resource>("orders");
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [desired, setDesired] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shipmentOrderRef, setShipmentOrderRef] = useState("");
  const [shipmentCourier, setShipmentCourier] = useState("");
  const [shipmentTracking, setShipmentTracking] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  useEffect(() => {
    let active = true;
    const sync = () => {
      if (!active) return;
      setToken(getAdminAccessToken());
      const user = getAdminStaff();
      setStaff(user);
    };
    const unsubscribe = listenForAdminSession(sync);
    void refreshAdminSession().then(session => {
      if (!active) return;
      setPane(session.staff.role === "SUPER_ADMIN" || session.staff.role === "ADMIN" ? "content" : "operations");
      sync();
      setRestoreError("");
    }).catch(err => {
      if (!active) return;
      sync();
      if (!(err instanceof ApiError && (err.status === 401 || err.status === 403)))
        setRestoreError("Could not restore the existing admin session. Check the API connection and retry.");
    }).finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; unsubscribe(); };
  }, []);
  const permitted = options.filter((item) => staff?.role === "SUPER_ADMIN" || item.roles.includes(staff?.role ?? ""));
  const api = useCallback(<T,>(path: string, init: RequestInit = {}) => apiRequest<T>(`/admin${path}`, {
    ...init, cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  }), [token]);
  const refresh = useCallback(async (value: Resource = resource) => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const response = await api<{ data: RecordRow[] }>(`/${value}${value === "orders" ? "?limit=50" : ""}`);
      setRows(response.data ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "REQUEST FAILED"); }
    finally { setLoading(false); }
  }, [api, resource, token]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await apiRequest<{ data: { token: string; staff: Staff } }>("/admin/auth/login", {
        method: "POST", cache: "no-store", body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      setAdminSession(response.data); setToken(response.data.token); setStaff(response.data.staff); setPane((response.data.staff.role === "ADMIN" || response.data.staff.role === "SUPER_ADMIN") ? "content" : "operations"); setLoginPassword("");
      const first = options.find((option) => response.data.staff.role === "SUPER_ADMIN" || option.roles.includes(response.data.staff.role));
      if (first) {
        setResource(first.resource);
        const result = await apiRequest<{data: RecordRow[]}>(`/admin/${first.resource}${first.resource === "orders" ? "?limit=50" : ""}`, { cache: "no-store", headers: { Authorization: `Bearer ${response.data.token}` } });
        setRows(result.data ?? []);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "LOGIN FAILED"); }
    finally { setLoading(false); }
  }
  function choose(value: Resource) { setMobileNavOpen(false); setPane("operations"); setResource(value); setRows([]); setSelected(null); setDesired(""); setComment(""); void refresh(value); }
  async function mutate(path: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    setLoading(true);setError("");setNotice("");
    try {
      await api(path, { method, body: JSON.stringify(body) });
      setNotice("CHANGE SAVED / CHECK AUDIT LOG");
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "CHANGE REJECTED"); }
    finally { setLoading(false); }
  }
  function execute() {
    if (!selected) return;
    const id = String(selected.id ?? selected.reference ?? selected.variantId ?? "");
    if (!id) { setError("MISSING RECORD IDENTIFIER");return; }
    if (!window.confirm(`Apply ${desired || "action"} to ${resource} ${id}?`)) return;
    if (resource === "orders") { void mutate(`/orders/${encodeURIComponent(id)}/status`, "PATCH", { status: desired, note: comment }); return; }
    if (resource === "inventory") { const delta = Number(desired); if (!Number.isSafeInteger(delta)) { setError("ENTER AN INTEGER STOCK CHANGE");return; } void mutate(`/inventory/${encodeURIComponent(id)}/adjust`, "POST", { movementType: "ADJUSTMENT", onHandDelta: delta, reservedDelta: 0, note: comment || "Admin stock adjustment" });return; }
    if (resource === "email/outbox") { void mutate(`/email/outbox/${encodeURIComponent(id)}/retry`, "POST", {});return; }
    if (resource === "complaints" && desired === "REPLY") { void mutate(`/complaints/${encodeURIComponent(id)}/messages`, "POST", { message: comment });return; }
    const endpoints: Partial<Record<Resource,string>> = { shipments: "shipments", reviews: "reviews", complaints: "complaints", refunds: "refunds", payments: "payments" };
    const endpoint = endpoints[resource];
    if (endpoint) void mutate(`/${endpoint}/${encodeURIComponent(id)}`, "PATCH", { status: desired, ...(resource === "reviews" ? {note: comment} : resource === "shipments" ? {note: comment} : {}) });
  }
  const surface = "border border-white/20 bg-[#141414] p-3 text-white";
  const button = "border border-white/25 px-4 py-2 font-semibold uppercase text-xs tracking-widest hover:border-red-600 disabled:opacity-40";
  const columns = fieldNames[resource];
  return <main className="min-h-screen min-w-0 overflow-x-clip bg-[#0b0b0d] px-3 pb-16 pt-5 text-white sm:px-5 sm:pt-8 md:px-8">
    <div className="mx-auto max-w-[1600px]">
      <p className="text-xs font-semibold tracking-[0.3em] text-red-600">SICKO SOUL / RESTRICTED OPERATIONS</p>
      <h1 className="mt-3 font-display text-4xl uppercase leading-none sm:text-5xl lg:text-6xl">CONTROL ROOM</h1>
      {checkingSession ? <div role="status" className="mt-12 flex items-center gap-3 text-sm text-white/65"><span className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent"/> RESTORING SECURE SESSION…</div> : restoreError && !staff ? <section role="alert" className="mt-9 max-w-md border border-amber-700 p-4 text-sm text-amber-200">
        <p>{restoreError}</p><button className={`${button} mt-4`} type="button" onClick={() => {
          setCheckingSession(true);
          void refreshAdminSession().then(session => {
            setRestoreError("");
            setToken(session.token); setStaff(session.staff);
            setPane(session.staff.role === "ADMIN" || session.staff.role === "SUPER_ADMIN" ? "content" : "operations");
          }).catch(err => {
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setRestoreError("");
            else setRestoreError("The API is still unreachable. Retry when it is available.");
          }).finally(() => setCheckingSession(false));
        }}>RETRY SECURE SESSION</button>
      </section> : !staff ? <form onSubmit={login} className="mt-10 flex max-w-md flex-col gap-4">
        <label className="text-sm">Staff email<input className={`mt-1 block w-full ${surface}`} type="email" required value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} /></label>
        <label className="text-sm">Staff password<input className={`mt-1 block w-full ${surface}`} type="password" required value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} /></label>
        <button className={button} disabled={loading}>AUTHENTICATE</button>
      </form> : <>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-white/70"><p>{staff.fullName} / {staff.role}</p><button className={button} onClick={()=>{ void signOutAdmin().then(() => { setRows([]); setSelected(null); }).catch(() => setError("Could not revoke session. Please retry Sign Out.")); }}>SIGN OUT</button></div>
        <button type="button" aria-controls="admin-navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(x => !x)}
          className={`${button} mt-5 flex w-full items-center justify-between gap-3 border-red-700/70 py-3.5 lg:hidden`}>
          <span>{mobileNavOpen ? "CLOSE NAVIGATION" : "☰  OPEN ADMIN MENU"}</span><span aria-hidden>{mobileNavOpen ? "✕" : "☰"}</span>
        </button>
        <div className="mt-5 grid min-w-0 items-start gap-5 lg:mt-8 lg:grid-cols-[225px_minmax(0,1fr)] lg:gap-6">
          <aside id="admin-navigation" className={`${mobileNavOpen ? "block" : "hidden"} min-w-0 space-y-1 border border-white/15 bg-[#121215] p-3 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto`} aria-label="Control Room sidebar">
            <p className="px-3 pb-2 pt-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/40">Workspace</p>
            {(staff.role === "SUPER_ADMIN" || staff.role === "ADMIN") && <>
              <button type="button" onClick={() => { setPane("content"); setMobileNavOpen(false); }} className={`${button} w-full text-left ${pane === "content" ? "border-red-600 bg-red-950/25 text-white" : "border-transparent text-white/60"}`}>✎ &nbsp; Content Update</button>
              <button type="button" onClick={() => { setPane("media"); setMobileNavOpen(false); }} className={`${button} w-full text-left ${pane === "media" ? "border-red-600 bg-red-950/25 text-white" : "border-transparent text-white/60"}`}>▧ &nbsp; Site Media</button>
              <button type="button" onClick={() => { setPane("catalog"); setMobileNavOpen(false); }} className={`${button} w-full text-left ${pane === "catalog" ? "border-red-600 bg-red-950/25 text-white" : "border-transparent text-white/60"}`}>▤ &nbsp; Catalog Setup</button>
            </>}
            <p className="px-3 pb-2 pt-5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/40">Operations</p>
            {permitted.map(item => <button key={item.resource} type="button" onClick={() => choose(item.resource)} className={`${button} w-full text-left ${pane === "operations" && resource===item.resource ? "border-red-600 bg-red-950/25 text-white" : "border-transparent text-white/60"}`}>
              {item.resource.replace("/outbox"," OUTBOX")}
            </button>)}
            <a href="/" target="_blank" rel="noopener noreferrer" className="mt-6 block border-t border-white/15 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-white/60 hover:text-white">↗ &nbsp; View storefront</a>
          </aside>
          <div className="min-w-0 w-full">
            {pane === "content" && (staff.role === "SUPER_ADMIN" || staff.role === "ADMIN") && <ContentUpdateEditor token={token} onMedia={() => setPane("media")} />}
            {pane === "catalog" && (staff.role === "SUPER_ADMIN" || staff.role === "ADMIN") && <CatalogHierarchyEditor token={token} />}
            {pane === "media" && (staff.role === "SUPER_ADMIN" || staff.role === "ADMIN") && <><SiteMediaEditor token={token} /><StreetsMediaEditor token={token} /></>}
            {pane === "operations" && <>
        <div className="mt-6 flex items-center justify-between"><h2 className="text-xl font-bold uppercase">{resource} / {rows.length} records</h2><button onClick={()=>void refresh()} disabled={loading} className={button}>REFRESH</button></div>
        {resource === "shipments" && <form onSubmit={event => {
          event.preventDefault();
          void mutate("/shipments", "POST", { orderReference: shipmentOrderRef.trim(), courierName: shipmentCourier.trim(), trackingCode: shipmentTracking.trim(), shippingCost: 0 });
        }} className="mt-4 flex flex-wrap items-end gap-3 border border-white/15 p-4">
          <label className="text-xs uppercase">Order reference<input required value={shipmentOrderRef} onChange={event=>setShipmentOrderRef(event.target.value)} className={`mt-1 block ${surface}`}/></label>
          <label className="text-xs uppercase">Courier<input value={shipmentCourier} onChange={event=>setShipmentCourier(event.target.value)} className={`mt-1 block ${surface}`}/></label>
          <label className="text-xs uppercase">Tracking code<input value={shipmentTracking} onChange={event=>setShipmentTracking(event.target.value)} className={`mt-1 block ${surface}`}/></label>
          <button disabled={loading} type="submit" className={button}>CREATE SHIPMENT</button>
        </form>}
        <div className="mt-4 max-w-full overflow-x-auto border border-white/20 overscroll-x-contain"><table className="w-full text-left text-sm"><thead className="bg-white/10"><tr>{columns.map(column=><th key={column} className="p-3 uppercase">{column}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={String(row.id ?? row.reference ?? row.variantId ?? i)} onClick={()=>{setSelected(row);setDesired("");setComment("");}} className="cursor-pointer border-t border-white/15 hover:bg-white/10">{columns.map(column=><td key={column} className="max-w-[15rem] truncate p-3">{String(row[column]??"—")}</td>)}</tr>)}</tbody></table></div>
        {selected && <section className="mt-8 min-w-0 overflow-hidden border border-red-900 p-3 sm:p-5"><h3 className="font-bold uppercase">Selected record</h3>
          <p className="mt-2 text-sm text-white/50">Sensitive customer information — staff only. Do not copy into external logs.</p>
          {resource === "orders" && selected.status === "PENDING_CONFIRMATION" && selected.stockHoldStatus === "RELEASED" && (
            <p role="status" className="mt-3 border-l-2 border-amber-500 p-3 text-sm text-amber-300">
              STOCK HOLD EXPIRED — ORDER STILL PENDING. Confirmation will check current stock again.
              If the product sold out, confirmation will be rejected safely; contact the customer before promising delivery.
            </p>
          )}
          <pre className="mt-3 max-h-64 max-w-full overflow-auto whitespace-pre-wrap break-all text-xs text-white/70">{JSON.stringify(selected,null,2)}</pre>
          <div className="mt-5 grid max-w-2xl gap-4 md:grid-cols-2"><label className="text-xs uppercase">Action / status
          {resource==="inventory"?<input type="number" className={`mt-2 block w-full ${surface}`} placeholder="On-hand stock delta" value={desired} onChange={e=>setDesired(e.target.value)}/>:
            <select className={`mt-2 block w-full ${surface}`} value={desired} onChange={e=>setDesired(e.target.value)}><option value="">Choose action</option>{(statusOptions[resource] ?? (resource==="email/outbox"?["RETRY"]:[])).concat(resource==="complaints"?["REPLY"]:[]).map(s=><option key={s} value={s}>{s}</option>)}</select>}
          </label><label className="text-xs uppercase">Note / reply<input className={`mt-2 block w-full ${surface}`} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Reason or customer reply"/></label></div>
          <button className={`${button} mt-4`} disabled={loading || desired===""} onClick={execute}>APPLY / CONFIRM</button>
        </section>}
        <p className="mt-6 text-xs text-white/50">For safety, shipping requires a shipment record. Order statuses SHIPPED, DELIVERED and RETURNED must be updated in Shipments, not Orders. Create shipments here after order confirmation/processing, then dispatch, deliver or return them using the shipment status actions.</p>
            </>}
          </div>
        </div>
      </>}
      {error && <p role="alert" className="mt-5 border-l-2 border-red-600 p-3 text-red-300">{error}</p>}
      {notice && <p role="status" className="mt-5 border-l-2 border-white/50 p-3">{notice}</p>}
    </div>
  </main>;
}
