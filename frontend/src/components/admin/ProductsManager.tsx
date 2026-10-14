"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import { useAdminSession } from "@/components/admin/AdminSessionProvider";
import { adminButton } from "@/components/admin/AdminShell";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import ProductEditor from "@/components/admin/ProductEditor";

type Product = {publicId:string;slug:string;name:string;skuBase:string;basePrice:number;currency:string;status:"DRAFT"|"ACTIVE"|"ARCHIVED";category?:{slug:string;name:string};imageCount:number;variantCount:number};
type Category = {id:string;name:string;slug:string;segmentId:string|null;isActive:boolean};
type Segment = {id:string;name:string;isActive:boolean};
const input = "mt-1.5 min-h-11 w-full min-w-0 border border-white/25 bg-[#141416] px-3 py-2.5 text-sm text-white outline-none focus:border-red-500";
const money = (n:number) => `৳ ${n.toLocaleString("en-BD")}`;

export default function ProductsManager() {
  const {token} = useAdminSession();
  const [products,setProducts] = useState<Product[]>([]);
  const [categories,setCategories] = useState<Category[]>([]);
  const [segments,setSegments] = useState<Segment[]>([]);
  const [view,setView] = useState<"list"|"create"|"edit">("list");
  const [selected,setSelected] = useState<string|null>(null);
  const [query,setQuery] = useState("");
  const [status,setStatus] = useState("");
  const [category,setCategory] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");

  const read = useCallback(async () => {
    if (!token) return;
    setLoading(true);setError("");
    try {
      const headers = {Authorization:`Bearer ${token}`};
      const [p,c,s] = await Promise.all([
        apiRequest<DataEnvelope<Product[]>>("/admin/catalog/products",{cache:"no-store",headers}),
        apiRequest<DataEnvelope<Category[]>>("/admin/catalog/categories",{cache:"no-store",headers}),
        apiRequest<DataEnvelope<Segment[]>>("/admin/catalog/segments",{cache:"no-store",headers}),
      ]);
      setProducts(p.data ?? []);setCategories(c.data ?? []);setSegments(s.data ?? []);
    } catch (cause) {setError(cause instanceof Error?cause.message:"Could not load product catalog.");}
    finally {setLoading(false);}
  },[token]);
  useEffect(()=>{void read()},[read]);

  const filtered = useMemo(() => products.filter(p => {
    const text = `${p.name} ${p.publicId} ${p.skuBase} ${p.category?.name ?? ""}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (!status || status===p.status) && (!category || category===p.category?.slug);
  }),[products,query,status,category]);

  async function archive(product:Product) {
    if(!window.confirm(`Archive ${product.name}? It will disappear from the public shop but its order history will remain. You can re-activate it later.`))return;
    setBusy(true);setError("");setNotice("");
    try {
      await apiRequest(`/admin/catalog/products/${encodeURIComponent(product.publicId)}`,{method:"DELETE",cache:"no-store",headers:{Authorization:`Bearer ${token}`}});
      await read();setNotice(`${product.name} archived. Existing orders are preserved.`);
    } catch(cause){setError(cause instanceof Error?cause.message:"Could not archive product.");}
    finally{setBusy(false);}
  }
  const openEdit=(id:string)=>{setSelected(id);setView("edit");setNotice("");setError("");window.scrollTo({top:0,behavior:"smooth"});};
  const goList=()=>{setView("list");setSelected(null);void read();};

  return <>
    <AdminPageHeading eyebrow="Commerce / Products" title="PRODUCT MANAGER" description="Create products, upload photos, write descriptions and set stock for every size. No coding, SQL or manual product IDs needed." />
    {error && <p role="alert" className="my-4 border-l-2 border-red-600 p-4 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="my-4 border-l-2 border-emerald-500 p-4 text-sm text-emerald-200">{notice}</p>}
    {view!=="list" ? <ProductEditor key={selected ?? "new-product"} token={token} productId={selected} categories={categories} segments={segments} onClose={goList} onSaved={message=>{setNotice(message);void read();}} /> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-white/65">{products.length} products in database</p><p className="mt-1 text-xs text-white/45">Drafts are hidden from customers. Archived products remain in order history.</p></div><button type="button" className={`${adminButton} border-red-700 bg-red-900/50`} onClick={()=>{setSelected(null);setView("create");setError("");window.scrollTo({top:0,behavior:"smooth"});}}>+ Create new product</button></div>
      <div className="mt-5 grid gap-3 rounded-sm border border-white/15 bg-[#141416] p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold uppercase text-white/65">Search products<input className={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, category or SKU" /></label>
        <label className="text-xs font-semibold uppercase text-white/65">Visibility<select className={input} value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></label>
        <label className="text-xs font-semibold uppercase text-white/65">Subcategory<select className={input} value={category} onChange={e=>setCategory(e.target.value)}><option value="">All subcategories</option>{categories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-white/55">Showing {filtered.length} of {products.length}</p><button type="button" className={adminButton} disabled={loading||busy} onClick={()=>void read()}>Refresh</button></div>
      <div className="mt-4 hidden overflow-x-auto border border-white/15 lg:block" role="region" tabIndex={0} aria-label="Product registry">
        <table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-white/5 text-xs uppercase text-white/55"><tr>{["Product","Subcategory","Base price","Status","Sizes","Photos","Actions"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(p=><tr key={p.publicId} className="border-t border-white/10 hover:bg-white/5"><td className="p-3"><p className="font-medium">{p.name}</p><p className="mt-1 text-xs text-white/40">{p.publicId}</p></td><td className="p-3">{p.category?.name??"—"}</td><td className="p-3">{money(p.basePrice)}</td><td className="p-3 text-xs uppercase">{p.status}</td><td className="p-3">{p.variantCount}</td><td className="p-3">{p.imageCount}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button type="button" className={adminButton} onClick={()=>openEdit(p.publicId)}>Edit</button>{p.status!=="ARCHIVED"&&<button type="button" className={`${adminButton} border-red-900 text-red-200`} disabled={busy} onClick={()=>void archive(p)}>Archive</button>}</div></td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:hidden">{filtered.map(p=><article key={p.publicId} className="min-w-0 border border-white/15 bg-[#141416] p-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{p.name}</h2><span className="text-xs uppercase text-white/55">{p.status}</span></div><p className="mt-1 text-xs text-white/50">{p.category?.name??"Unassigned"} · {p.publicId}</p><p className="mt-3 text-sm">{money(p.basePrice)} · {p.variantCount} sizes · {p.imageCount} photos</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={adminButton} onClick={()=>openEdit(p.publicId)}>Edit product</button>{p.status!=="ARCHIVED"&&<button className={`${adminButton} border-red-900 text-red-200`} disabled={busy} type="button" onClick={()=>void archive(p)}>Archive</button>}</div></article>)}</div>
      {!loading&&filtered.length===0&&<p className="mt-4 border border-white/15 p-5 text-sm text-white/55">No products match your search. Select “Create new product” to add your first item.</p>}
      {loading&&<p role="status" className="mt-4 text-sm text-white/55">Loading catalog…</p>}
    </>}
  </>;
}
