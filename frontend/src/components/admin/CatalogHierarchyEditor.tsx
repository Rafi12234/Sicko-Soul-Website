"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import type { CatalogSegmentRecord } from "@/types/commerce";

type AdminCategory = {
  id: string; code: string; slug: string; name: string; segmentId: string | null;
  indexCode: string | null; ghostName: string | null; spec: string | null;
  tagline: string | null; registry: string | null; coverUrl: string | null;
  coverAlt: string | null; sortOrder: number; isActive: boolean; productCount: number;
};
type SegmentDraft = {
  code: string; slug: string; name: string; coverUrl: string; coverAlt: string;
  tagline: string; sortOrder: number; isActive: boolean;
};
type CategoryDraft = {
  code: string; slug: string; name: string; segmentId: string;
  indexCode: string; ghostName: string; spec: string; tagline: string;
  registry: string; coverUrl: string; coverAlt: string; sortOrder: number; isActive: boolean;
};
const blankSegment = (): SegmentDraft => ({ code: "", slug: "", name: "", coverUrl: "", coverAlt: "", tagline: "", sortOrder: 0, isActive: true });
const blankCategory = (segmentId = ""): CategoryDraft => ({ code: "", slug: "", name: "", segmentId, indexCode: "", ghostName: "", spec: "", tagline: "", registry: "", coverUrl: "", coverAlt: "", sortOrder: 0, isActive: true });
const field = "mt-1 block w-full min-w-0 border border-bone-white/20 bg-[#151515] px-3 py-2 font-body text-sm text-bone-white outline-none focus:border-blood-accent";
const action = "border border-bone-white/25 px-4 py-2 font-stencil text-[0.63rem] uppercase tracking-wider text-bone-white transition hover:border-blood-accent hover:text-blood-accent disabled:opacity-40";
const textOpt = (v: string) => v.trim() || null;

export default function CatalogHierarchyEditor({ token }: { token: string }) {
  const [segments, setSegments] = useState<CatalogSegmentRecord[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [segmentId, setSegmentId] = useState("new");
  const [categoryId, setCategoryId] = useState("new");
  const [segmentDraft, setSegmentDraft] = useState<SegmentDraft>(blankSegment);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(blankCategory);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const call = useCallback(<T,>(path: string, options: RequestInit = {}) =>
    apiRequest<DataEnvelope<T>>(`/admin/catalog/${path}`, {
      cache: "no-store", ...options,
      headers: { Authorization: `Bearer ${token}`, ...options.headers },
    }), [token]);

  const reload = useCallback(async () => {
    const [segmentResponse, categoryResponse] = await Promise.all([
      call<CatalogSegmentRecord[]>("segments"),
      call<AdminCategory[]>("categories"),
    ]);
    setSegments(segmentResponse.data);
    setCategories(categoryResponse.data);
  }, [call]);

  useEffect(() => { void reload().catch(err => setError(err instanceof Error ? err.message : "Could not load catalog hierarchy")); }, [reload]);

  function chooseSegment(id: string) {
    setSegmentId(id); setNotice(""); setError("");
    const s = segments.find(item => item.id === id);
    setSegmentDraft(s ? {
      code: s.code, slug: s.slug, name: s.name, coverUrl: s.coverUrl ?? "",
      coverAlt: s.coverAlt ?? "", tagline: s.tagline ?? "", sortOrder: s.sortOrder, isActive: s.isActive,
    } : blankSegment());
  }
  function chooseCategory(id: string) {
    setCategoryId(id); setNotice(""); setError("");
    const c = categories.find(item => item.id === id);
    setCategoryDraft(c ? {
      code: c.code, slug: c.slug, name: c.name, segmentId: c.segmentId ?? "",
      indexCode: c.indexCode ?? "", ghostName: c.ghostName ?? "", spec: c.spec ?? "",
      tagline: c.tagline ?? "", registry: c.registry ?? "", coverUrl: c.coverUrl ?? "",
      coverAlt: c.coverAlt ?? "", sortOrder: c.sortOrder, isActive: c.isActive,
    } : blankCategory(segments.find(s => s.isActive)?.id ?? ""));
  }

  async function saveSegment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const existing = segmentId !== "new";
      await call(existing ? `segments/${segmentId}` : "segments", {
        method: existing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(existing ? {} : { code: segmentDraft.code, slug: segmentDraft.slug }),
          name: segmentDraft.name, coverUrl: textOpt(segmentDraft.coverUrl),
          coverAlt: textOpt(segmentDraft.coverAlt), tagline: textOpt(segmentDraft.tagline),
          sortOrder: segmentDraft.sortOrder, isActive: segmentDraft.isActive,
        }),
      });
      await reload(); setNotice("MAIN SEGMENT SAVED / DATABASE UPDATED");
      if (!existing) chooseSegment("new");
    } catch (err) { setError(err instanceof Error ? err.message : "Segment save failed"); }
    finally { setBusy(false); }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const existing = categoryId !== "new";
      await call(existing ? `categories/${categoryId}` : "categories", {
        method: existing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(existing ? {} : { code: categoryDraft.code, slug: categoryDraft.slug }),
          segmentId: categoryDraft.segmentId || null,
          name: categoryDraft.name, indexCode: textOpt(categoryDraft.indexCode),
          ghostName: textOpt(categoryDraft.ghostName), spec: textOpt(categoryDraft.spec),
          tagline: textOpt(categoryDraft.tagline), registry: textOpt(categoryDraft.registry),
          coverUrl: textOpt(categoryDraft.coverUrl), coverAlt: textOpt(categoryDraft.coverAlt),
          sortOrder: categoryDraft.sortOrder, isActive: categoryDraft.isActive,
        }),
      });
      await reload(); setNotice("SUBCATEGORY SAVED / DATABASE UPDATED");
      if (!existing) chooseCategory("new");
    } catch (err) { setError(err instanceof Error ? err.message : "Category save failed"); }
    finally { setBusy(false); }
  }

  async function remove(kind: "segments" | "categories", id: string) {
    const entry = kind === "segments" ? segments.find(s => s.id === id) : categories.find(c => c.id === id);
    if (!entry || !window.confirm(`Permanently delete ${entry.name}? Only empty records can be deleted. Use INACTIVE to hide records that contain products or subcategories.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await call(`${kind}/${id}`, { method: "DELETE" });
      await reload();
      if (kind === "segments") chooseSegment("new"); else chooseCategory("new");
      setNotice("EMPTY RECORD PERMANENTLY DELETED");
    } catch (err) { setError(err instanceof Error ? err.message : "Deletion rejected: deactivate instead"); }
    finally { setBusy(false); }
  }

  return <section aria-label="Catalog hierarchy editor" className="mt-8 border border-blood-accent/40 bg-[#0f0f0f] p-4 text-bone-white md:p-7">
    <p className="font-stencil text-[0.6rem] tracking-[0.25em] text-blood-accent">SICKO SOUL / CATALOG CONTROL</p>
    <h2 className="mt-3 font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-none tracking-crushed">SEGMENTS & FILES</h2>
    <p className="mt-3 max-w-2xl font-body text-sm text-concrete-gray">Main segments own subcategories. Hide any entry using INACTIVE; permanent removal is allowed only when it has no dependent records. Covers accept Cloudinary HTTPS image URLs.</p>
    <div className="mt-6 grid gap-8 lg:grid-cols-2">
      <div className="border-t border-bone-white/20 pt-5">
        <h3 className="font-display text-3xl">MAIN SEGMENTS</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={action} type="button" onClick={() => chooseSegment("new")}>+ NEW SEGMENT</button>
          {segments.map(s => <button className={`${action} ${s.id === segmentId ? "border-blood-accent text-blood-accent" : ""}`} key={s.id} type="button" onClick={() => chooseSegment(s.id)}>{s.name}{s.isActive ? "" : " / HIDDEN"}</button>)}
        </div>
        <form onSubmit={saveSegment} className="mt-5 space-y-4">
          <p className="font-stencil text-xs text-blood-accent">{segmentId === "new" ? "CREATE MAIN SEGMENT" : "EDIT MAIN SEGMENT"}</p>
          {segmentId === "new" && <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs">CODE<input className={field} required maxLength={64} pattern="[a-z0-9_-]+" value={segmentDraft.code} onChange={e => setSegmentDraft(s => ({ ...s, code: e.target.value }))} placeholder="accessories" /></label>
            <label className="text-xs">SLUG<input className={field} required maxLength={120} pattern="[a-z0-9-]+" value={segmentDraft.slug} onChange={e => setSegmentDraft(s => ({ ...s, slug: e.target.value }))} placeholder="accessories" /></label>
          </div>}
          <label className="block text-xs">DISPLAY NAME<input className={field} required maxLength={120} value={segmentDraft.name} onChange={e => setSegmentDraft(s => ({ ...s, name: e.target.value }))}/></label>
          <label className="block text-xs">COVER IMAGE URL<input className={field} type="url" maxLength={1000} value={segmentDraft.coverUrl} onChange={e => setSegmentDraft(s => ({ ...s, coverUrl: e.target.value }))}/></label>
          <label className="block text-xs">COVER ALT TEXT<input className={field} maxLength={255} value={segmentDraft.coverAlt} onChange={e => setSegmentDraft(s => ({ ...s, coverAlt: e.target.value }))}/></label>
          <label className="block text-xs">TAGLINE<input className={field} maxLength={255} value={segmentDraft.tagline} onChange={e => setSegmentDraft(s => ({ ...s, tagline: e.target.value }))}/></label>
          <div className="flex flex-wrap items-center gap-5">
            <label className="text-xs">SORT ORDER<input className={field} type="number" min={0} max={100000} value={segmentDraft.sortOrder} onChange={e => setSegmentDraft(s => ({ ...s, sortOrder: Number(e.target.value) }))}/></label>
            <label className="flex items-center gap-3 font-stencil text-xs"><input type="checkbox" checked={segmentDraft.isActive} onChange={e => setSegmentDraft(s => ({ ...s, isActive: e.target.checked }))}/> ACTIVE / VISIBLE</label>
          </div>
          <div className="flex flex-wrap gap-3"><button className={`${action} border-blood-accent text-blood-accent`} type="submit" disabled={busy}>{busy ? "SAVING..." : "SAVE SEGMENT"}</button>
            {segmentId !== "new" && <button type="button" disabled={busy} onClick={() => void remove("segments", segmentId)} className={action}>DELETE IF EMPTY</button>}</div>
        </form>
      </div>
      <div className="border-t border-bone-white/20 pt-5">
        <h3 className="font-display text-3xl">SUBCATEGORIES</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={action} type="button" onClick={() => chooseCategory("new")}>+ NEW SUBCATEGORY</button>
          {categories.map(c => <button className={`${action} ${c.id === categoryId ? "border-blood-accent text-blood-accent" : ""}`} key={c.id} type="button" onClick={() => chooseCategory(c.id)}>{c.name}{c.isActive ? "" : " / HIDDEN"}</button>)}
        </div>
        <form onSubmit={saveCategory} className="mt-5 space-y-4">
          <p className="font-stencil text-xs text-blood-accent">{categoryId === "new" ? "CREATE SUBCATEGORY" : "EDIT SUBCATEGORY"}</p>
          {categoryId === "new" && <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs">CODE<input className={field} required maxLength={64} value={categoryDraft.code} onChange={e => setCategoryDraft(s => ({ ...s, code: e.target.value }))} placeholder="perfume" /></label>
            <label className="text-xs">SLUG<input className={field} required maxLength={120} value={categoryDraft.slug} onChange={e => setCategoryDraft(s => ({ ...s, slug: e.target.value }))} placeholder="perfume" /></label>
          </div>}
          <label className="block text-xs">MAIN SEGMENT<select className={field} value={categoryDraft.segmentId} onChange={e => setCategoryDraft(s => ({ ...s, segmentId: e.target.value }))}><option value="">UNASSIGNED / HIDDEN FROM CATALOG</option>{segments.map(s => <option key={s.id} value={s.id}>{s.name}{s.isActive ? "" : " (HIDDEN)"}</option>)}</select></label>
          <label className="block text-xs">DISPLAY NAME<input className={field} required maxLength={120} value={categoryDraft.name} onChange={e => setCategoryDraft(s => ({ ...s, name: e.target.value }))}/></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs">INDEX CODE<input className={field} maxLength={20} value={categoryDraft.indexCode} onChange={e => setCategoryDraft(s => ({ ...s, indexCode: e.target.value }))}/></label>
            <label className="text-xs">GHOST NAME<input className={field} maxLength={120} value={categoryDraft.ghostName} onChange={e => setCategoryDraft(s => ({ ...s, ghostName: e.target.value }))}/></label>
          </div>
          <label className="block text-xs">COVER IMAGE URL<input className={field} type="url" maxLength={1000} value={categoryDraft.coverUrl} onChange={e => setCategoryDraft(s => ({ ...s, coverUrl: e.target.value }))}/></label>
          <label className="block text-xs">COVER ALT TEXT<input className={field} maxLength={255} value={categoryDraft.coverAlt} onChange={e => setCategoryDraft(s => ({ ...s, coverAlt: e.target.value }))}/></label>
          <label className="block text-xs">SPECIFICATION<input className={field} maxLength={255} value={categoryDraft.spec} onChange={e => setCategoryDraft(s => ({ ...s, spec: e.target.value }))}/></label>
          <label className="block text-xs">TAGLINE<input className={field} maxLength={255} value={categoryDraft.tagline} onChange={e => setCategoryDraft(s => ({ ...s, tagline: e.target.value }))}/></label>
          <label className="block text-xs">REGISTRY<input className={field} maxLength={255} value={categoryDraft.registry} onChange={e => setCategoryDraft(s => ({ ...s, registry: e.target.value }))}/></label>
          <div className="flex flex-wrap items-center gap-5">
            <label className="text-xs">SORT ORDER<input className={field} type="number" min={0} max={100000} value={categoryDraft.sortOrder} onChange={e => setCategoryDraft(s => ({ ...s, sortOrder: Number(e.target.value) }))}/></label>
            <label className="flex items-center gap-3 font-stencil text-xs"><input type="checkbox" checked={categoryDraft.isActive} onChange={e => setCategoryDraft(s => ({ ...s, isActive: e.target.checked }))}/> ACTIVE / VISIBLE</label>
          </div>
          <div className="flex flex-wrap gap-3"><button className={`${action} border-blood-accent text-blood-accent`} type="submit" disabled={busy}>{busy ? "SAVING..." : "SAVE SUBCATEGORY"}</button>
            {categoryId !== "new" && <button type="button" disabled={busy} onClick={() => void remove("categories", categoryId)} className={action}>DELETE IF NO PRODUCTS</button>}</div>
        </form>
      </div>
    </div>
    {error && <p role="alert" className="mt-6 border-l-2 border-blood-accent p-3 text-sm text-red-300">{error}</p>}
    {notice && <p role="status" className="mt-6 border-l-2 border-bone-white p-3 font-stencil text-sm">{notice}</p>}
  </section>;
}
