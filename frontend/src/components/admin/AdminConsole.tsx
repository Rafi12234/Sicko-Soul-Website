"use client";

import { useCallback, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/apiClient";

type Staff = { fullName: string; email: string; role: string };
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
  // Tokens are kept in component memory only, not localStorage or cookies.
  // Refresh/sign-out drops the staff token. API always revalidates staff role.
  const [token, setToken] = useState("");
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
      setToken(response.data.token); setStaff(response.data.staff); setLoginPassword("");
      const first = options.find((option) => response.data.staff.role === "SUPER_ADMIN" || option.roles.includes(response.data.staff.role));
      if (first) {
        setResource(first.resource);
        const result = await apiRequest<{data: RecordRow[]}>(`/admin/${first.resource}${first.resource === "orders" ? "?limit=50" : ""}`, { cache: "no-store", headers: { Authorization: `Bearer ${response.data.token}` } });
        setRows(result.data ?? []);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "LOGIN FAILED"); }
    finally { setLoading(false); }
  }
  function choose(value: Resource) { setResource(value); setRows([]); setSelected(null); setDesired(""); setComment(""); void refresh(value); }
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
  return <main className="min-h-screen bg-black px-5 pb-16 pt-28 text-white md:px-12">
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold tracking-[0.3em] text-red-600">SICKO SOUL / RESTRICTED OPERATIONS</p>
      <h1 className="mt-4 font-display text-6xl uppercase">CONTROL ROOM</h1>
      {!staff ? <form onSubmit={login} className="mt-10 flex max-w-md flex-col gap-4">
        <label className="text-sm">Staff email<input className={`mt-1 block w-full ${surface}`} type="email" required value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} /></label>
        <label className="text-sm">Staff password<input className={`mt-1 block w-full ${surface}`} type="password" required value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} /></label>
        <button className={button} disabled={loading}>AUTHENTICATE</button>
      </form> : <>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-white/70"><p>{staff.fullName} / {staff.role}</p><button className={button} onClick={()=>{ setStaff(null);setToken("");setRows([]);setSelected(null); }}>SIGN OUT</button></div>
        <nav aria-label="Operations" className="mt-9 flex flex-wrap gap-2">{permitted.map(item=><button key={item.resource} className={`${button} ${resource===item.resource?"border-red-600 text-red-500":""}`} onClick={()=>choose(item.resource)}>{item.resource.replace("/outbox"," OUTBOX")}</button>)}</nav>
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
        <div className="mt-4 overflow-x-auto border border-white/20"><table className="w-full text-left text-sm"><thead className="bg-white/10"><tr>{columns.map(column=><th key={column} className="p-3 uppercase">{column}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={String(row.id ?? row.reference ?? row.variantId ?? i)} onClick={()=>{setSelected(row);setDesired("");setComment("");}} className="cursor-pointer border-t border-white/15 hover:bg-white/10">{columns.map(column=><td key={column} className="max-w-[15rem] truncate p-3">{String(row[column]??"—")}</td>)}</tr>)}</tbody></table></div>
        {selected && <section className="mt-8 border border-red-900 p-5"><h3 className="font-bold uppercase">Selected record</h3>
          <p className="mt-2 text-sm text-white/50">Sensitive customer information — staff only. Do not copy into external logs.</p>
          {resource === "orders" && selected.status === "PENDING_CONFIRMATION" && selected.stockHoldStatus === "RELEASED" && (
            <p role="status" className="mt-3 border-l-2 border-amber-500 p-3 text-sm text-amber-300">
              STOCK HOLD EXPIRED — ORDER STILL PENDING. Confirmation will check current stock again.
              If the product sold out, confirmation will be rejected safely; contact the customer before promising delivery.
            </p>
          )}
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-white/70">{JSON.stringify(selected,null,2)}</pre>
          <div className="mt-5 grid max-w-2xl gap-4 md:grid-cols-2"><label className="text-xs uppercase">Action / status
          {resource==="inventory"?<input type="number" className={`mt-2 block w-full ${surface}`} placeholder="On-hand stock delta" value={desired} onChange={e=>setDesired(e.target.value)}/>:
            <select className={`mt-2 block w-full ${surface}`} value={desired} onChange={e=>setDesired(e.target.value)}><option value="">Choose action</option>{(statusOptions[resource] ?? (resource==="email/outbox"?["RETRY"]:[])).concat(resource==="complaints"?["REPLY"]:[]).map(s=><option key={s} value={s}>{s}</option>)}</select>}
          </label><label className="text-xs uppercase">Note / reply<input className={`mt-2 block w-full ${surface}`} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Reason or customer reply"/></label></div>
          <button className={`${button} mt-4`} disabled={loading || desired===""} onClick={execute}>APPLY / CONFIRM</button>
        </section>}
        <p className="mt-6 text-xs text-white/50">For safety, shipping requires a shipment record. Order statuses SHIPPED, DELIVERED and RETURNED must be updated in Shipments, not Orders. Create shipments here after order confirmation/processing, then dispatch, deliver or return them using the shipment status actions.</p>
      </>}
      {error && <p role="alert" className="mt-5 border-l-2 border-red-600 p-3 text-red-300">{error}</p>}
      {notice && <p role="status" className="mt-5 border-l-2 border-white/50 p-3">{notice}</p>}
    </div>
  </main>;
}
