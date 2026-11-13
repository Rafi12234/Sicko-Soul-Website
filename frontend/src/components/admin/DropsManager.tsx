"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import { adminButton } from "@/components/admin/AdminShell";
import { useAdminSession } from "@/components/admin/AdminSessionProvider";
import ProductEditor from "@/components/admin/ProductEditor";

type Status = "DRAFT" | "SCHEDULED" | "LIVE" | "SEALED" | "ARCHIVED";
type CollectionSummary = {
  id: string; code: string; slug: string; name: string; tagline: string | null;
  releaseYear: number | null; status: Status; opensAt: string | null; closesAt: string | null;
  productCount: number;
};
type Membership = {
  productId: string; productName: string; productSlug: string;
  productStatus: "ACTIVE" | "DRAFT" | "ARCHIVED";
  sortOrder: number; sealed: boolean;
};
type CollectionDetail = Omit<CollectionSummary, "productCount"> & { products: Membership[] };
type Product = {
  publicId: string; name: string; status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  category?: { name: string; slug: string };
};
type Category = { id: string; name: string; slug: string; segmentId: string | null; isActive: boolean };
type Segment = { id: string; name: string; isActive: boolean };
type Draft = {
  code: string; slug: string; name: string; tagline: string;
  releaseYear: string; status: Status; opensAt: string; closesAt: string;
};
const blank = (): Draft => ({ code: "", slug: "", name: "", tagline: "", releaseYear: String(new Date().getFullYear()), status: "DRAFT", opensAt: "", closesAt: "" });
const field = "mt-1.5 block min-h-11 w-full min-w-0 border border-white/25 bg-[#171719] px-3 py-2.5 text-sm text-white outline-none focus:border-red-500 disabled:opacity-50";
const panel = "min-w-0 border border-white/15 bg-[#111114] p-4 sm:p-6";
const label = "block text-xs font-semibold uppercase tracking-wide text-white/70";
const cleanSlug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const nullable = (v: string) => v.trim() || null;
const isoOrNull = (v: string) => v ? new Date(v).toISOString() : null;
const datetimeLocal = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // HTML datetime-local uses the browser's local time, not UTC.
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function DropsManager() {
  const { token } = useAdminSession();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [draft, setDraft] = useState<Draft>(blank);
  const [members, setMembers] = useState<Membership[]>([]);
  const [search, setSearch] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const call = useCallback(<T,>(path: string, init: RequestInit = {}) =>
    apiRequest<DataEnvelope<T>>(`/admin/${path}`, {
      cache: "no-store", ...init,
      headers: { Authorization: `Bearer ${token}`, ...init.headers },
    }), [token]);

  const loadRegistry = useCallback(async () => {
    if (!token) return;
    const [c, p, cats, segs] = await Promise.all([
      call<CollectionSummary[]>("collections"),
      call<Product[]>("catalog/products"),
      call<Category[]>("catalog/categories"),
      call<Segment[]>("catalog/segments"),
    ]);
    setCollections(c.data);
    setProducts(p.data);
    setCategories(cats.data);
    setSegments(segs.data);
  }, [call, token]);

  const loadCollection = useCallback(async (id: string) => {
    if (id === "new") {
      setDraft(blank()); setMembers([]); return;
    }
    const result = await call<CollectionDetail>(`collections/${encodeURIComponent(id)}`);
    const c = result.data;
    setDraft({
      code: c.code, slug: c.slug, name: c.name, tagline: c.tagline ?? "",
      releaseYear: c.releaseYear === null ? "" : String(c.releaseYear),
      status: c.status, opensAt: datetimeLocal(c.opensAt), closesAt: datetimeLocal(c.closesAt),
    });
    setMembers(c.products);
  }, [call]);

  useEffect(() => {
    let alive = true;
    if (!token) return;
    setLoading(true);
    void loadRegistry().catch((cause) => {
      if (alive) setError(cause instanceof Error ? cause.message : "Could not load New Drop settings.");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadRegistry, token]);

  const availableProducts = useMemo(() => products.filter(p => (p.status !== "ARCHIVED" || members.some(m => m.productId === p.publicId)) &&
    `${p.name} ${p.publicId} ${p.category?.name ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())), [products, members, search]);

  async function selectCollection(id: string) {
    setSelectedId(id); setError(""); setNotice(""); setAddingProduct(false);
    setBusy(true);
    try { await loadCollection(id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load this drop."); }
    finally { setBusy(false); }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (!draft.name.trim()) { setError("Enter a drop name."); return; }
    if (draft.releaseYear && (!Number.isInteger(Number(draft.releaseYear)) || Number(draft.releaseYear) < 2000 || Number(draft.releaseYear) > 2200)) { setError("Enter a valid release year."); return; }
    if (selectedId === "new" && (!draft.code.trim() || !draft.slug.trim())) { setError("A new drop needs a code and slug."); return; }
    if (draft.opensAt && Number.isNaN(Date.parse(draft.opensAt))) { setError("Enter a valid opening date."); return; }
    if (draft.closesAt && Number.isNaN(Date.parse(draft.closesAt))) { setError("Enter a valid closing date."); return; }
    setBusy(true);
    try {
      const existing = selectedId !== "new";
      const result = await call<CollectionDetail>(existing ? `collections/${encodeURIComponent(selectedId)}` : "collections", {
        method: existing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(!existing ? { code: draft.code.trim().toUpperCase(), slug: cleanSlug(draft.slug) } : {}),
          name: draft.name.trim(), tagline: nullable(draft.tagline),
          releaseYear: draft.releaseYear ? Number(draft.releaseYear) : null,
          // New drops must start DRAFT until explicit memberships have been added.
          status: existing ? draft.status : "DRAFT",
          opensAt: isoOrNull(draft.opensAt), closesAt: isoOrNull(draft.closesAt),
        }),
      });
      await loadRegistry();
      if (!existing) setSelectedId(result.data.id);
      await loadCollection(result.data.id);
      setNotice(existing ? "Drop details saved." : "Draft created. Now add the products that belong to this drop, then publish it.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save drop."); }
    finally { setBusy(false); }
  }

  function toggleProduct(product: Product, selected: boolean) {
    setMembers(prev => selected
      ? [...prev, { productId: product.publicId, productName: product.name, productSlug: "", productStatus: product.status, sortOrder: prev.length * 10, sealed: false }]
      : prev.filter(m => m.productId !== product.publicId));
  }

  async function persistMembers(next: Membership[]) {
    if (selectedId === "new") throw new Error("Save this drop as DRAFT before assigning products.");
    await call<CollectionDetail>(`collections/${encodeURIComponent(selectedId)}/products`, {
      method: "PUT",
      body: JSON.stringify({ products: next.map(({ productId, sortOrder, sealed }) => ({ productId, sortOrder, sealed })) }),
    });
    await Promise.all([loadCollection(selectedId), loadRegistry()]);
  }

  async function saveMembers() {
    setError(""); setNotice(""); setBusy(true);
    try { await persistMembers(members); setNotice("Drop membership saved. Regular products not selected here remain only in Products."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save drop members."); }
    finally { setBusy(false); }
  }

  async function createProductAndLink(productId: string) {
    if (selectedId === "new") throw new Error("Create a draft drop first.");
    // The ProductEditor already created the SAME product row in the catalog;
    // attach it through the junction table, never clone the product.
    const next: Membership[] = [
      ...members.filter(m => m.productId !== productId),
      { productId, productName: productId, productSlug: "", productStatus: "ACTIVE", sortOrder: members.length * 10, sealed: false },
    ];
    await persistMembers(next);
    setNotice("Product created in Products and linked to this New Drop. Publish the product and drop when ready.");
  }

  return <>
    <AdminPageHeading eyebrow="Commerce / Separate releases" title="NEW DROP MANAGER" description="Only products explicitly assigned to a drop appear on its shelf. All drop products are normal catalog products too. No duplicate products or stock." />
    <div className="mb-5 border-l-2 border-red-600 bg-red-950/15 p-4 text-sm text-white/75">
      <strong className="text-white">Important:</strong> Creating a product in Products does not place it in New Drops.
      Create a draft release here, assign its products, then publish. New products created here are saved to the normal Products database automatically.
    </div>
    {error && <p role="alert" className="my-4 border-l-2 border-red-600 bg-red-950/25 p-4 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="my-4 border-l-2 border-emerald-500 bg-emerald-950/20 p-4 text-sm text-emerald-200">{notice}</p>}
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className={panel}>
        <h2 className="font-display text-2xl">RELEASE FILES</h2>
        <button type="button" className={`${adminButton} mt-4 w-full border-red-600`} onClick={() => void selectCollection("new")} disabled={busy}>+ Create new drop</button>
        <div className="mt-4 space-y-2" role="group" aria-label="Select a drop to edit">
          {collections.map(c => <button key={c.id} type="button" disabled={busy} onClick={() => void selectCollection(c.id)} className={`block w-full border p-3 text-left text-sm transition-colors ${selectedId === c.id ? "border-red-600 bg-red-950/20" : "border-white/15 hover:border-white/50"}`}>
            <span className="block font-semibold">{c.name}</span>
            <span className="mt-1 block text-xs text-white/55">{c.status} · {c.productCount} linked product(s)</span>
          </button>)}
          {!loading && collections.length === 0 && <p className="text-sm text-white/50">No drop releases yet.</p>}
        </div>
      </aside>
      <div className="min-w-0 space-y-6">
        <form onSubmit={e => void saveDetails(e)} className={panel}>
          <h2 className="font-display text-2xl">{selectedId === "new" ? "CREATE DRAFT RELEASE" : "EDIT RELEASE"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={label}>Drop name<input className={field} required maxLength={160} value={draft.name} onChange={e => setDraft(v => ({...v,name:e.target.value, ...(selectedId === "new" ? { code: cleanSlug(e.target.value).replaceAll("-", "_").toUpperCase(), slug: cleanSlug(e.target.value) } : {})}))} placeholder="Winter Collection" /></label>
            <label className={label}>Release year<input className={field} type="number" min="2000" max="2200" value={draft.releaseYear} onChange={e => setDraft(v => ({...v,releaseYear:e.target.value}))}/></label>
            <label className={label}>Code<input className={field} value={draft.code} maxLength={80} readOnly={selectedId !== "new"} onChange={e => setDraft(v => ({...v,code:e.target.value}))}/></label>
            <label className={label}>URL slug<input className={field} value={draft.slug} maxLength={120} readOnly={selectedId !== "new"} onChange={e => setDraft(v => ({...v,slug:e.target.value}))}/></label>
            <label className={`${label} sm:col-span-2`}>Tagline<input className={field} value={draft.tagline} maxLength={255} onChange={e => setDraft(v => ({...v,tagline:e.target.value}))}/></label>
            <label className={label}>Status<select className={field} value={selectedId === "new" ? "DRAFT" : draft.status} disabled={selectedId === "new"} onChange={e => setDraft(v => ({...v,status:e.target.value as Status}))}>
              <option value="DRAFT">Draft — hidden</option><option value="SCHEDULED">Scheduled</option><option value="LIVE">Live — visible in New Drops</option><option value="SEALED">Sealed</option><option value="ARCHIVED">Archived</option>
            </select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>Opens<input className={field} type="datetime-local" value={draft.opensAt} onChange={e => setDraft(v => ({...v,opensAt:e.target.value}))}/></label>
              <label className={label}>Closes<input className={field} type="datetime-local" value={draft.closesAt} onChange={e => setDraft(v => ({...v,closesAt:e.target.value}))}/></label>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/50">A LIVE release must include at least one active catalogue product. Use DRAFT to remove all its products.</p>
          <button type="submit" className={`${adminButton} mt-5 border-red-600 bg-red-950/25`} disabled={busy || !token}>{busy ? "Saving…" : selectedId === "new" ? "Create draft" : "Save release details / status"}</button>
        </form>
        {selectedId !== "new" && <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-2xl">PRODUCTS IN THIS DROP</h2><p className="mt-1 text-xs text-white/55">{members.length} selected · only these are displayed in New Drop</p></div>
            <button type="button" disabled={busy} className={adminButton} onClick={() => setAddingProduct(v => !v)}>{addingProduct ? "Close product editor" : "+ Create product for this drop"}</button>
          </div>
          {addingProduct ? <div className="mt-5"><ProductEditor token={token} productId={null} categories={categories} segments={segments} onClose={() => setAddingProduct(false)} onSaved={setNotice} onCreated={createProductAndLink}/></div> : <>
            <p className="mt-4 text-sm text-white/60">Products are shared. <Link href="/admin/products" className="underline decoration-red-600 underline-offset-4">Manage all catalogue products</Link>. A product can be in Products without being in any drop.</p>
            <label className={`${label} mt-4`}>Find products<input className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, SKU, category" /></label>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {availableProducts.map(p => {
                const member = members.find(m => m.productId === p.publicId);
                return <div key={p.publicId} className="flex flex-wrap items-center gap-3 border border-white/10 p-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(member)} onChange={e => toggleProduct(p,e.target.checked)} disabled={busy} className="h-5 w-5 accent-red-600"/><span className="min-w-0"><strong className="block">{p.name}</strong><span className="text-xs text-white/50">{p.publicId} / {p.status}</span></span></label>
                  {member && <><label className="text-[0.65rem] uppercase text-white/60">Order <input className="ml-1 w-16 border border-white/20 bg-black p-2 text-white" type="number" min="0" max="4294967295" value={member.sortOrder} onChange={e => setMembers(prev => prev.map(m => m.productId === p.publicId ? {...m,sortOrder:Math.max(0,Number(e.target.value) || 0)} : m))} /></label>
                    <label className="flex items-center gap-2 text-xs uppercase text-white/60"><input type="checkbox" checked={member.sealed} onChange={e => setMembers(prev => prev.map(m => m.productId === p.publicId ? {...m,sealed:e.target.checked} : m))} /> Sealed</label></>}
                </div>;
              })}
              {!loading && availableProducts.length === 0 && <p className="p-3 text-sm text-white/55">No matching products. Create a product above or in Products first.</p>}
            </div>
            <button type="button" className={`${adminButton} mt-5 border-red-600 bg-red-950/25`} disabled={busy} onClick={() => void saveMembers()}>{busy ? "Saving…" : "Save selected products & order"}</button>
          </>}
        </section>}
      </div>
    </div>
  </>;
}
