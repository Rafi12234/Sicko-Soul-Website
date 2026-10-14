"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import { useAdminSession } from "@/components/admin/AdminSessionProvider";
import { adminButton } from "@/components/admin/AdminShell";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";

type StockRow = {
  variantId: string; productId: string; productName: string; sku: string; size: string;
  onHandQty: number; reservedQty: number; availableQty: number; reorderLevel: number;
  lowStock: boolean; variantStatus: string;
};
const input = "mt-1.5 min-h-11 w-full min-w-0 border border-white/25 bg-[#171719] px-3 py-2.5 text-sm text-white outline-none focus:border-red-500";

export default function InventoryManager() {
  const { token } = useAdminSession();
  const [rows,setRows] = useState<StockRow[]>([]);
  const [drafts,setDrafts] = useState<Record<string,string>>({});
  const [search,setSearch] = useState("");
  const [lowOnly,setLowOnly] = useState(false);
  const [busy,setBusy] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");

  const read = useCallback(async () => {
    if (!token) return;
    setLoading(true);setError("");
    try {
      const result = await apiRequest<DataEnvelope<StockRow[]>>("/admin/inventory", {cache:"no-store",headers:{Authorization:`Bearer ${token}`}});
      setRows(result.data);
      setDrafts(Object.fromEntries(result.data.map(r => [r.variantId,String(r.onHandQty)])));
    } catch(cause){setError(cause instanceof Error?cause.message:"Could not load inventory.");}
    finally{setLoading(false);}
  },[token]);
  useEffect(()=>{void read()},[read]);
  const filtered=useMemo(()=>rows.filter(r=> {
    const match=`${r.productName} ${r.productId} ${r.size} ${r.sku}`.toLowerCase().includes(search.trim().toLowerCase());
    return match && (!lowOnly||r.lowStock);
  }),[rows,search,lowOnly]);
  const lowCount=rows.filter(r=>r.lowStock).length;

  async function save(row:StockRow){
    if(busy)return;
    const next=Number(drafts[row.variantId]);
    if(!Number.isSafeInteger(next)||next<0||next>100000){setError("Stock must be a whole number between 0 and 100,000.");return;}
    if(next<row.reservedQty){setError(`At least ${row.reservedQty} units are reserved for existing orders. Stock cannot go below this.`);return;}
    const delta=next-row.onHandQty;
    if(delta===0){setNotice("Stock is already at that quantity.");return;}
    if(!window.confirm(`Change ${row.productName} / ${row.size} from ${row.onHandQty} to ${next} units on hand?`))return;
    setBusy(row.variantId);setError("");setNotice("");
    try {
      await apiRequest(`/admin/inventory/${encodeURIComponent(row.variantId)}/adjust`,{
        method:"POST",cache:"no-store",headers:{Authorization:`Bearer ${token}`},
        body:JSON.stringify({movementType:delta>0?"RESTOCK":"ADJUSTMENT",onHandDelta:delta,reservedDelta:0,note:`Admin stock adjustment for ${row.productName} / ${row.size}`}),
      });
      setNotice(`${row.productName} / ${row.size}: stock updated successfully.`);
      await read();
    } catch(cause){setError(cause instanceof Error?cause.message:"Stock update was rejected.");}
    finally{setBusy(null);}
  }

  return <>
    <AdminPageHeading eyebrow="Commerce / Inventory" title="STOCK MANAGEMENT" description="See every product's size-wise stock and update the amount on hand. Quantities reserved by orders are protected automatically." />
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="border border-white/15 bg-[#141416] p-4"><p className="text-xs uppercase text-white/45">Product sizes</p><p className="mt-2 font-display text-3xl">{rows.length}</p></div>
      <div className="border border-white/15 bg-[#141416] p-4"><p className="text-xs uppercase text-white/45">Available units</p><p className="mt-2 font-display text-3xl">{rows.reduce((n,r)=>n+r.availableQty,0)}</p></div>
      <div className="border border-red-800/70 bg-[#141416] p-4"><p className="text-xs uppercase text-white/45">Low stock sizes</p><p className="mt-2 font-display text-3xl text-red-300">{lowCount}</p></div>
    </div>
    <div className="mt-5 flex flex-col gap-3 rounded-sm border border-white/15 bg-[#141416] p-4 sm:flex-row sm:items-end">
      <label className="w-full min-w-0 flex-1 text-xs font-bold uppercase text-white/65">Search product, size, or SKU<input className={input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inventory" /></label>
      <label className="flex min-h-11 items-center gap-2 text-xs font-bold uppercase text-white/65"><input type="checkbox" className="h-5 w-5 accent-red-700" checked={lowOnly} onChange={e=>setLowOnly(e.target.checked)} /> Show low stock only</label>
      <button type="button" className={adminButton} disabled={loading||busy!==null} onClick={()=>void read()}>Refresh stock</button>
    </div>
    {error&&<p role="alert" className="mt-4 border-l-2 border-red-500 p-4 text-sm text-red-200">{error}</p>}
    {notice&&<p role="status" className="mt-4 border-l-2 border-emerald-500 p-4 text-sm text-emerald-200">{notice}</p>}
    <p className="mt-4 text-xs text-white/55">{filtered.length} size variants shown. Available stock = on hand − reserved. Enter the total physical units you have, then Save stock.</p>
    <div className="mt-4 hidden overflow-x-auto border border-white/15 lg:block" role="region" aria-label="Inventory table" tabIndex={0}><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white/5 text-xs uppercase text-white/55"><tr>{["Product","Size / SKU","On hand","Reserved","Available","Set on hand","Action"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={r.variantId} className="border-t border-white/10"><td className="p-3"><p className="font-semibold">{r.productName}</p>{r.lowStock&&<p className="mt-1 text-xs text-amber-300">Low stock</p>}</td><td className="p-3">{r.size}<p className="text-xs text-white/45">{r.sku}</p></td><td className="p-3">{r.onHandQty}</td><td className="p-3">{r.reservedQty}</td><td className="p-3 font-semibold">{r.availableQty}</td><td className="p-3"><input aria-label={`On hand stock for ${r.productName} ${r.size}`} className={`${input} mt-0 max-w-32`} type="number" min={r.reservedQty} max="100000" step="1" value={drafts[r.variantId]??""} onChange={e=>setDrafts(s=>({...s,[r.variantId]:e.target.value}))} /></td><td className="p-3"><button type="button" className={adminButton} disabled={busy!==null||loading} onClick={()=>void save(r)}>{busy===r.variantId?"Saving…":"Save stock"}</button></td></tr>)}</tbody></table></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:hidden">{filtered.map(r=><article key={r.variantId} className="border border-white/15 bg-[#141416] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{r.productName}</h2><p className="mt-1 text-xs text-white/50">{r.size} · {r.sku}</p></div>{r.lowStock&&<span className="text-xs uppercase text-amber-300">Low stock</span>}</div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div><p className="text-xs text-white/50">On hand</p><p className="text-lg font-semibold">{r.onHandQty}</p></div><div><p className="text-xs text-white/50">Reserved</p><p className="text-lg font-semibold">{r.reservedQty}</p></div><div><p className="text-xs text-white/50">Available</p><p className="text-lg font-semibold">{r.availableQty}</p></div></div><div className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-xs uppercase text-white/65">Set total stock<input aria-label={`On hand stock for ${r.productName} ${r.size}`} type="number" min={r.reservedQty} max="100000" className={input} value={drafts[r.variantId]??""} onChange={e=>setDrafts(s=>({...s,[r.variantId]:e.target.value}))}/></label><button type="button" className={adminButton} disabled={busy!==null||loading} onClick={()=>void save(r)}>{busy===r.variantId?"Saving…":"Save stock"}</button></div></article>)}</div>
    {!loading&&filtered.length===0&&<p className="mt-4 border border-white/15 p-6 text-sm text-white/55">No stock records match this search.</p>}
    {loading&&<p className="mt-4 text-sm text-white/55" role="status">Loading size-wise stock…</p>}
  </>;
}
