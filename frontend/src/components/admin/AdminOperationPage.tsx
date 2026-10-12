"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import {useAdminSession} from "@/components/admin/AdminSessionProvider";
import {adminButton} from "@/components/admin/AdminShell";
import {apiRequest,type DataEnvelope} from "@/lib/apiClient";

type Resource = "orders" | "inventory" | "shipments" | "reviews" | "complaints" | "refunds" | "payments" | "email/outbox";
type Row = Record<string,unknown>;
const fields:Record<Resource,string[]> = {
 orders:["reference","customerName","status","stockHoldStatus","paymentStatus","grandTotal"],
 inventory:["variantId","sku","onHandQty","reservedQty","availableQty"],
 shipments:["id","orderReference","status","trackingCode","courierName"],
 reviews:["id","productName","displayName","rating","status"],
 complaints:["id","reference","status","priority","subject"],
 refunds:["id","orderReference","amount","status"],
 payments:["id","orderReference","amount","status"],
 "email/outbox":["id","eventType","status","attemptCount","sentAt"],
};
const statuses:Partial<Record<Resource,string[]>>={
 orders:["CONFIRMED","PROCESSING","CANCELLED","REJECTED"],
 shipments:["READY","DISPATCHED","IN_TRANSIT","DELIVERED","FAILED","RETURNED","CANCELLED"],
 reviews:["APPROVED","REJECTED","HIDDEN"],
 complaints:["OPEN","IN_REVIEW","WAITING_CUSTOMER","RESOLVED","CLOSED","REJECTED","REPLY"],
 refunds:["APPROVED","PROCESSING","COMPLETED","REJECTED"],
 payments:["INITIATED","PENDING","PAID","FAILED","CANCELLED"],
 "email/outbox":["RETRY"],
};
const input = "mt-2 block min-h-11 w-full min-w-0 border border-white/20 bg-[#101014] p-3 text-sm text-white outline-none focus:border-red-500";
function display(value:unknown):string{return value===null||value===undefined?"—":typeof value==="object"?JSON.stringify(value):String(value)}
export default function AdminOperationPage({resource}:{resource:Resource}){
 const {token}=useAdminSession();
 const [rows,setRows]=useState<Row[]>([]);const [selected,setSelected]=useState<Row|null>(null);
 const [desired,setDesired]=useState("");const [note,setNote]=useState("");const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const [shipmentRef,setShipmentRef]=useState("");const [courier,setCourier]=useState("");const [tracking,setTracking]=useState("");
 const name=resource==="email/outbox"?"Email Outbox":resource;
 const cols=useMemo(()=>fields[resource],[resource]);
 const fetchRows=useCallback(async()=>{
  setLoading(true);setError("");
  try{const result=await apiRequest<DataEnvelope<Row[]>>(`/admin/${resource}${resource==="orders"?"?limit=50":""}`,{cache:"no-store",headers:{Authorization:`Bearer ${token}`}});setRows(result.data??[])}
  catch(err){setError(err instanceof Error?err.message:"Unable to load records")}finally{setLoading(false)}
 },[resource,token]);
 useEffect(()=>{void fetchRows()},[fetchRows]);
 const perform=async(path:string,method:"PATCH"|"POST",body:Record<string,unknown>)=>{
  setLoading(true);setError("");setNotice("");
  try{await apiRequest(`/admin/${path}`,{method,cache:"no-store",headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)});setNotice("Change saved. The action has been recorded in the audit log.");setSelected(null);setDesired("");setNote("");await fetchRows()}
  catch(err){setError(err instanceof Error?err.message:"Operation rejected")}finally{setLoading(false)}
 };
 const execute=()=>{
  if(!selected||!desired)return;
  const id=String(selected.id??selected.reference??selected.variantId??"");
  if(!id){setError("Record ID is missing");return}
  if(!window.confirm(`Apply ${desired} to ${resource} ${id}?`))return;
  if(resource==="orders") {void perform(`orders/${encodeURIComponent(id)}/status`,"PATCH",{status:desired,note});return}
  if(resource==="inventory"){
   const delta=Number(desired);if(!Number.isSafeInteger(delta)||delta===0){setError("Enter a nonzero whole-number stock change");return}
   void perform(`inventory/${encodeURIComponent(id)}/adjust`,"POST",{movementType:"ADJUSTMENT",onHandDelta:delta,reservedDelta:0,note:note||"Staff stock adjustment"});return;
  }
  if(resource==="email/outbox"){void perform(`email/outbox/${encodeURIComponent(id)}/retry`,"POST",{});return}
  if(resource==="complaints"&&desired==="REPLY"){if(!note.trim()){setError("Enter a reply first");return}void perform(`complaints/${encodeURIComponent(id)}/messages`,"POST",{message:note});return}
  void perform(`${resource}/${encodeURIComponent(id)}`,"PATCH",{status:desired,...(resource==="shipments"||resource==="reviews"?{note}:{})});
 };
 return <><AdminPageHeading eyebrow="Operations / Management" title={name.toUpperCase()} description="Protected staff operations. Validate each action before applying it; the backend checks session, role, and allowed state transitions."/>
  <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs uppercase tracking-wider text-white/50">{rows.length} records</p><button className={adminButton} type="button" onClick={()=>void fetchRows()} disabled={loading}>{loading?"Refreshing…":"Refresh"}</button></div>
  {error&&<p role="alert" className="my-4 border-l-2 border-red-600 bg-red-950/15 p-3 text-sm text-red-200">{error}</p>}{notice&&<p role="status" className="my-4 border-l-2 border-white/40 bg-white/5 p-3 text-sm">{notice}</p>}
  {resource==="shipments"&&<form onSubmit={(e:FormEvent)=>{e.preventDefault();if(!window.confirm(`Create shipment for ${shipmentRef}?`))return;void perform("shipments","POST",{orderReference:shipmentRef.trim(),courierName:courier.trim(),trackingCode:tracking.trim(),shippingCost:0})}} className="mt-5 grid gap-3 border border-white/15 bg-[#141416] p-4 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs uppercase text-white/70">Order reference<input className={input} required value={shipmentRef} onChange={e=>setShipmentRef(e.target.value)}/></label><label className="text-xs uppercase text-white/70">Courier<input className={input} value={courier} onChange={e=>setCourier(e.target.value)}/></label><label className="text-xs uppercase text-white/70">Tracking code<input className={input} value={tracking} onChange={e=>setTracking(e.target.value)}/></label><button disabled={loading} className={`${adminButton} self-end`}>Create shipment</button></form>}
  <div className="mt-5 overflow-x-auto border border-white/15 overscroll-x-contain" role="region" aria-label={`${name} records`} tabIndex={0}><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-white/5"><tr>{cols.map(k=><th key={k} scope="col" className="px-3 py-4 text-[0.65rem] font-semibold uppercase tracking-wider text-white/60">{k}</th>)}</tr></thead><tbody>{rows.map((row,i)=>{const id=String(row.id??row.reference??row.variantId??i);return <tr key={id} className={`border-t border-white/10 ${selected===row?"bg-red-950/25":"hover:bg-white/5"}`}>{cols.map((key,index)=><td key={key} className="max-w-[240px] truncate px-3 py-3" title={display(row[key])}>{index===0?<button type="button" className="text-left underline decoration-white/30 underline-offset-4 focus-visible:outline focus-visible:outline-red-500" onClick={()=>{setSelected(row);setDesired("");setNote("")}}>{display(row[key])}</button>:display(row[key])}</td>)}</tr>})}</tbody></table>{rows.length===0&&!loading&&<p className="p-5 text-sm text-white/50">No records found.</p>}{loading&&<p role="status" className="p-4 text-sm text-white/50">Loading records…</p>}</div>
  {selected&&<section className="mt-6 min-w-0 space-y-4 border border-red-900/70 bg-[#141416] p-4 sm:p-6"><h2 className="font-display text-2xl">SELECTED RECORD</h2><p className="text-xs text-white/50">Sensitive staff-only information. Do not copy to public logs.</p>{resource==="orders"&&selected.status==="PENDING_CONFIRMATION"&&selected.stockHoldStatus==="RELEASED"&&<p className="border-l-2 border-amber-500 p-3 text-sm text-amber-300">Stock hold expired; confirming will recheck availability.</p>}<pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all border border-white/10 bg-black/25 p-3 text-xs text-white/65">{JSON.stringify(selected,null,2)}</pre><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs uppercase tracking-wider text-white/70">Action{resource==="inventory"?<input type="number" step="1" value={desired} onChange={e=>setDesired(e.target.value)} placeholder="Stock delta (+/-)" className={input}/>:<select className={input} value={desired} onChange={e=>setDesired(e.target.value)}><option value="">Choose action</option>{(statuses[resource]??[]).map(v=><option key={v} value={v}>{v}</option>)}</select>}</label><label className="block text-xs uppercase tracking-wider text-white/70">Note / Reply<textarea rows={2} maxLength={500} className={`${input} resize-y`} value={note} onChange={e=>setNote(e.target.value)}/></label></div><div className="flex flex-wrap gap-3"><button type="button" disabled={loading||!desired} onClick={execute} className={`${adminButton} border-red-600`}>{loading?"Applying…":"Apply / Confirm"}</button><button type="button" onClick={()=>setSelected(null)} className={adminButton}>Close</button></div></section>}
  <p className="mt-6 text-xs leading-6 text-white/45">Shipping and delivery require the shipment workflow; do not mark an order shipped directly. Actions can be rejected when their status transition is invalid.</p>
 </>;
}
