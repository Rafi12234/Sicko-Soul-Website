"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import { uploadToCloudinary, type UploadProgress } from "@/lib/adminCloudinary";
import UploadProgressIndicator from "@/components/admin/UploadProgressIndicator";
import { adminButton } from "@/components/admin/AdminShell";

type Category = { id: string; name: string; slug: string; segmentId: string | null; isActive: boolean };
type Segment = { id: string; name: string; isActive: boolean };
type ImageType = "STILL" | "WORN" | "GALLERY" | "OTHER";
type ImageEntry = { id?: string; type: ImageType; url: string; alt: string | null; sortOrder: number };
type FeatureEntry = { id: string; text: string };
type SizeGroup = "TOP" | "PANT" | "GENERAL";
type VariantEntry = {
  id: string; size: string; sizeLabel: string; sizeGroup: SizeGroup; sku: string;
  priceOverride: number | null; isDefault: boolean; status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  inventory: {onHandQty: number; reservedQty: number; availableQty: number; reorderLevel: number} | null;
};
type ProductDetails = {
  publicId: string; name: string; description: string | null; spec: string | null; tagline: string | null;
  basePrice: number; currency: string; status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  category: {slug: string; id: string}; images: ImageEntry[]; features: FeatureEntry[]; variants: VariantEntry[];
};
type ProductForm = {name: string; description: string; spec: string; tagline: string; category: string; basePrice: string; status: "DRAFT" | "ACTIVE" | "ARCHIVED"};
type NewVariant = {sizeCode: string; sizeGroup: SizeGroup; initialStock: string; priceOverride: string; reorderLevel: string};
const emptyForm = (): ProductForm => ({ name: "", description: "", spec: "", tagline: "", category: "", basePrice: "", status: "DRAFT" });
const emptyVariant = (): NewVariant => ({ sizeCode: "", sizeGroup: "GENERAL", initialStock: "0", priceOverride: "", reorderLevel: "3" });
const input = "mt-1.5 block w-full min-w-0 rounded-sm border border-white/25 bg-[#171719] px-3 py-3 text-sm text-white outline-none focus:border-red-500 disabled:opacity-50";
const titleClass = "font-display text-2xl uppercase text-white sm:text-3xl";
const cardClass = "min-w-0 rounded-sm border border-white/15 bg-[#111114] p-4 sm:p-5";
const labelClass = "block min-w-0 text-xs font-bold uppercase tracking-wide text-white/65";
const miniButton = `${adminButton} min-h-10 px-3`;
function slugify(s: string) { return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 65) || "product"; }
function cloudinaryPhoto(url: string) {
  try { const p = new URL(url); return p.protocol === "https:" && p.hostname === "res.cloudinary.com" && /^\/[a-z0-9_-]+\/image\/upload\//i.test(p.pathname); }
  catch { return false; }
}
function numericStock(s: string) { const value = Number(s); return Number.isSafeInteger(value) && value >= 0 && value <= 100000; }
function numericPrice(s: string) { return s.trim() === "" || (Number.isFinite(Number(s)) && Number(s) > 0 && Number(s) <= 1_000_000); }

export default function ProductEditor({ token, productId, categories, segments, onClose, onSaved }: {
  token: string; productId: string | null; categories: Category[]; segments: Segment[];
  onClose: () => void; onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [segmentId, setSegmentId] = useState("");
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [features, setFeatures] = useState<FeatureEntry[]>([]);
  const [featureText, setFeatureText] = useState("");
  const [variants, setVariants] = useState<VariantEntry[]>([]);
  const [newSize, setNewSize] = useState<NewVariant>(emptyVariant);
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(productId));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [imageType, setImageType] = useState<ImageType>("STILL");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const isEdit = Boolean(productId);

  const call = useCallback(<T,>(path: string, init: RequestInit = {}) => apiRequest<DataEnvelope<T>>(`/admin/${path}`, {
    cache: "no-store", ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  }), [token]);

  const readProduct = useCallback(async () => {
    if (!productId) return;
    const result = await call<ProductDetails>(`catalog/products/${encodeURIComponent(productId)}`);
    const p = result.data;
    setForm({ name:p.name, description:p.description ?? "", spec:p.spec ?? "", tagline:p.tagline ?? "", category:p.category.slug, basePrice:String(p.basePrice), status:p.status });
    setSegmentId(categories.find(c => c.slug === p.category.slug)?.segmentId ?? "");
    setImages(p.images.map(i => ({ ...i, alt:i.alt ?? "" })));
    setFeatures(p.features);
    setVariants(p.variants);
    setStockDrafts(Object.fromEntries(p.variants.map(v => [v.id, String(v.inventory?.onHandQty ?? 0)])));
    setOverrideDrafts(Object.fromEntries(p.variants.map(v => [v.id, v.priceOverride === null ? "" : String(v.priceOverride)])));
  }, [call, productId, categories]);

  useEffect(() => {
    if (!productId) return;
    let mounted = true;
    setLoading(true);
    void readProduct().catch(cause => { if (mounted) setError(cause instanceof Error ? cause.message : "Could not load product."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [productId, readProduct]);

  const visibleCategories = categories.filter(c => c.segmentId === segmentId && (c.isActive || c.slug === form.category));
  const groups = segments.filter(s => s.isActive || s.id === segmentId);
  const newProductImages = images.map((i, n) => ({ type:i.type, url:i.url, alt:i.alt || null, sortOrder:n * 10 }));
  const pendingFeatures = features.map(i => i.text);

  async function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const price = Number(form.basePrice);
    if (!form.name.trim() || !form.category || !Number.isFinite(price) || price <= 0 || price > 1_000_000) { setError("Enter a product name, subcategory, and valid price."); return; }
    if (!isEdit) {
      if (images.length === 0) { setError("Upload at least one product photo before creating this product."); return; }
      if (!variants.length && !newSize.sizeCode.trim()) { setError("Add at least one size with its available stock."); return; }
      if (!variants.length) { setError("Click 'Add size' to include your size and stock in the product."); return; }
    }
    setSaving(true);
    try {
      const common = {
        category:form.category, name:form.name.trim(), basePrice:price, currency:"BDT",
        description:form.description.trim() || null, spec:form.spec.trim() || null, tagline:form.tagline.trim() || null, status:form.status,
      };
      if (productId) {
        await call(`catalog/products/${encodeURIComponent(productId)}`, { method:"PATCH", body:JSON.stringify(common) });
        setNotice("Product details saved. Photos, sizes and stock can be managed below.");
        onSaved("Product details updated in database.");
      } else {
        const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().replaceAll("-", "").slice(0, 12) : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const slug = `${slugify(form.name)}-${id.slice(-6)}`;
        const skuBase = `SS-${id.toUpperCase()}`;
        await call("catalog/products", { method:"POST", body:JSON.stringify({ ...common,
          publicId:skuBase, skuBase, slug,
          images:newProductImages, features:pendingFeatures,
          variants:variants.map((v, i) => ({
            sizeCode:v.size.trim().toUpperCase(), sizeLabel:v.sizeLabel || v.size,
            sizeGroup:v.sizeGroup, sku:`${skuBase}-${v.size.replace(/[^a-z0-9]/gi, "").toUpperCase()}-${i+1}`,
            priceOverride:v.priceOverride, isDefault:i===0, status:"ACTIVE",
            initialStock:v.inventory?.onHandQty ?? 0, reorderLevel:v.inventory?.reorderLevel ?? 3,
          })),
        }) });
        onSaved("Product created with its photos, description, sizes and initial stock.");
        onClose();
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save product. Check the fields and retry."); }
    finally { setSaving(false); }
  }

  async function addPhoto(url: string, alt: string, type: ImageType, photoIndex = images.length) {
    if (!cloudinaryPhoto(url)) { setError("Use a secure Cloudinary image URL or upload a photo."); return; }
    if (photoIndex >= 50) { throw new Error("A product can have up to 50 images."); }
    if (productId) {
      await call(`catalog/products/${encodeURIComponent(productId)}/images`, { method:"POST", body:JSON.stringify({type, url, alt:alt || null, sortOrder:photoIndex * 10}) });
      await readProduct();
      setNotice("Photo attached to the product.");
    } else {
      setImages(curr => [...curr, { type, url, alt:alt || null, sortOrder:photoIndex * 10 }]);
      setNotice("Photo ready. It will appear on the website when you create the product.");
    }
    setImageAlt(""); setImageUrl("");
  }

  async function uploadPhotos(files: File[]) {
    if (!files.length) return;
    setUploading(true); setError(""); setNotice("");
    try {
      const selection = files;
      const firstPhotoIndex = images.length;
      if (firstPhotoIndex + selection.length > 50) throw new Error("Maximum 50 photos per product.");
      for (let i = 0; i < selection.length; i++) {
        const file = selection[i];
        setProgress({stage:"signing", percent:0});
        const url = await uploadToCloudinary(file, "image", token, setProgress);
        try {
          // The first uploaded image becomes the product's primary still.
          const imageIndex = firstPhotoIndex + i;
          const type = imageType === "STILL" && imageIndex > 0 ? "GALLERY" : imageType;
          await addPhoto(url, file.name.slice(0, 255), type, imageIndex);
        } catch (cause) { throw new Error(`Uploaded ${file.name}, but it could not be attached. Recovery URL: ${url}. ${cause instanceof Error ? cause.message : ""}`); }
      }
      setNotice(`${selection.length} photo${selection.length===1?"":"s"} uploaded. ${productId?"Saved to the product.":"Create the product to publish."}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Photo upload failed."); }
    finally { setUploading(false); setProgress(null); }
  }

  async function removePhoto(item: ImageEntry, index: number) {
    if (!window.confirm("Remove this photo from the product? The Cloudinary file itself will not be deleted.")) return;
    setSaving(true); setError("");
    try {
      if (productId && item.id) {
        await call(`catalog/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(item.id)}`, {method:"DELETE"});
        await readProduct();
      } else setImages(curr => curr.filter((_, n) => n !== index));
      setNotice("Photo removed from the product.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove photo."); }
    finally { setSaving(false); }
  }

  async function addFeature() {
    const text = featureText.trim();
    if (!text) return;
    setSaving(true); setError("");
    try {
      if (productId) {
        await call(`catalog/products/${encodeURIComponent(productId)}/features`, {method:"POST",body:JSON.stringify({text,sortOrder:features.length*10})});
        await readProduct();
      } else setFeatures(curr => [...curr,{id:`draft-${curr.length}-${Date.now()}`,text}]);
      setFeatureText(""); setNotice("Feature added.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add feature."); }
    finally { setSaving(false); }
  }

  async function removeFeature(item: FeatureEntry) {
    setSaving(true); setError("");
    try {
      if (productId) {
        await call(`catalog/products/${encodeURIComponent(productId)}/features/${encodeURIComponent(item.id)}`,{method:"DELETE"});
        await readProduct();
      } else setFeatures(curr => curr.filter(x => x.id !== item.id));
      setNotice("Feature removed.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove feature."); }
    finally { setSaving(false); }
  }

  async function addVariant() {
    if (!newSize.sizeCode.trim() || !numericStock(newSize.initialStock) || !numericStock(newSize.reorderLevel) || !numericPrice(newSize.priceOverride)) {
      setError("Enter a size, a valid whole-number stock count and an optional positive price."); return;
    }
    const size = newSize.sizeCode.trim().toUpperCase();
    if (variants.some(v => v.size.toUpperCase() === size && v.sizeGroup === newSize.sizeGroup)) { setError("This size already exists in this size group."); return; }
    const qty = Number(newSize.initialStock);
    const price = newSize.priceOverride ? Number(newSize.priceOverride) : null;
    setSaving(true); setError("");
    try {
      if (productId) {
        const uniqueSku = `SS-${slugify(productId).toUpperCase().slice(0,45)}-${size.replace(/[^A-Z0-9]/g, "")}-${Date.now().toString(36).slice(-5).toUpperCase()}`.slice(0,100);
        await call(`catalog/products/${encodeURIComponent(productId)}/variants`, {method:"POST",body:JSON.stringify({
          sizeCode:size,sizeLabel:size,sizeGroup:newSize.sizeGroup,sku:uniqueSku,priceOverride:price,
          isDefault:variants.length===0,status:"ACTIVE",initialStock:qty,reorderLevel:Number(newSize.reorderLevel),
        })});
        await readProduct();
      } else setVariants(curr => [...curr,{
        id:`draft-${curr.length}-${Date.now()}`,size,sizeLabel:size,sizeGroup:newSize.sizeGroup,sku:"",
        priceOverride:price,isDefault:curr.length===0,status:"ACTIVE",
        inventory:{onHandQty:qty,reservedQty:0,availableQty:qty,reorderLevel:Number(newSize.reorderLevel)},
      }]);
      setNewSize(emptyVariant());setNotice("Size added. You can adjust stock any time.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add size."); }
    finally { setSaving(false); }
  }

  async function updateStock(variant: VariantEntry) {
    const desired = stockDrafts[variant.id] ?? "";
    const current = variant.inventory?.onHandQty ?? 0;
    if (!numericStock(desired)) { setError("Stock must be a whole number between 0 and 100,000."); return; }
    const delta = Number(desired) - current;
    if (delta === 0) { setNotice("Stock is already at that value."); return; }
    if (Number(desired) < (variant.inventory?.reservedQty ?? 0)) { setError("On-hand stock cannot be less than stock reserved by existing orders."); return; }
    setSaving(true); setError("");
    try {
      await call(`inventory/${encodeURIComponent(variant.id)}/adjust`, {method:"POST",body:JSON.stringify({movementType:delta>0?"RESTOCK":"ADJUSTMENT",onHandDelta:delta,reservedDelta:0,note:`Stock updated from product editor for ${productId}`})});
      await readProduct(); setNotice(`Stock updated for ${variant.size}. Reserved orders were preserved.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update stock."); }
    finally { setSaving(false); }
  }

  async function updateVariant(variant: VariantEntry, patch: Record<string, unknown>) {
    setSaving(true); setError("");
    try {
      await call(`catalog/products/${encodeURIComponent(productId)}/variants/${variant.id}`, {method:"PATCH",body:JSON.stringify(patch)});
      await readProduct();setNotice(`Size ${variant.size} updated.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update size."); }
    finally { setSaving(false); }
  }

  const disabled = saving || uploading || loading;
  const closeEditor = () => {
    if (!isEdit && (form.name.trim() || images.length > 0 || variants.length > 0 || features.length > 0) &&
        !window.confirm("Leave without creating this product? Uploaded Cloudinary photos will remain online but will not be attached to a product.")) return;
    onClose();
  };
  return <section className="mt-6 min-w-0 space-y-5" aria-label={isEdit ? "Edit product" : "Create product"}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-red-400">{isEdit ? "EDIT EXISTING PRODUCT" : "CREATE NEW PRODUCT"}</p><h2 className="mt-1 font-display text-3xl sm:text-4xl">{isEdit ? form.name || "Loading product" : "NEW PRODUCT"}</h2></div><button type="button" className={adminButton} disabled={disabled} onClick={closeEditor}>← Back to products</button></div>
    {error && <p role="alert" className="break-words border-l-2 border-red-500 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="border-l-2 border-emerald-500 bg-emerald-950/10 p-4 text-sm text-emerald-200">{notice}</p>}
    {loading && <p className="text-sm text-white/55">Loading product information…</p>}
    {!loading && <>
      <form onSubmit={e => void submitDetails(e)} className={cardClass}>
        <h3 className={titleClass}>1. Product information</h3><p className="mt-1 text-sm text-white/55">Choose the subcategory where this product should appear.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Main segment
            <select required className={input} value={segmentId} onChange={e => {setSegmentId(e.target.value);setForm(s=>({...s,category:""}));}}><option value="">Choose a segment</option>{groups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className={labelClass}>Subcategory
            <select required className={input} value={form.category} disabled={!segmentId} onChange={e=>setForm(s=>({...s,category:e.target.value}))}><option value="">Choose a subcategory</option>{visibleCategories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select>
            {segmentId && !visibleCategories.length && <span className="mt-1 block text-xs text-amber-300">Add a subcategory under Categories &amp; Segments first.</span>}</label>
          <label className={labelClass}>Product name<input required maxLength={160} className={input} value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} placeholder="e.g. Heavyweight Oversized T-Shirt" /></label>
          <label className={labelClass}>Base price (BDT)<input required type="number" min="0.01" max="1000000" step="0.01" className={input} value={form.basePrice} onChange={e=>setForm(s=>({...s,basePrice:e.target.value}))} placeholder="1499" /></label>
          <label className={labelClass}>Short highlight / tagline<input maxLength={255} className={input} value={form.tagline} onChange={e=>setForm(s=>({...s,tagline:e.target.value}))} placeholder="A short line customers will see" /></label>
          <label className={labelClass}>Specification<input maxLength={255} className={input} value={form.spec} onChange={e=>setForm(s=>({...s,spec:e.target.value}))} placeholder="e.g. 240 GSM cotton" /></label>
          <label className={`${labelClass} sm:col-span-2`}>Full product description<textarea className={`${input} min-h-32 resize-y`} maxLength={20000} rows={4} value={form.description} onChange={e=>setForm(s=>({...s,description:e.target.value}))} placeholder="Explain what makes this product special, fabric, fit, care instructions…" /></label>
          <label className={labelClass}>Product visibility<select className={input} value={form.status} onChange={e=>setForm(s=>({...s,status:e.target.value as ProductForm["status"]}))}><option value="DRAFT">Draft · hidden from customers</option><option value="ACTIVE">Active · visible in shop</option><option value="ARCHIVED">Archived · hidden from shop</option></select></label>
        </div>
        <div className="mt-5 border-t border-white/10 pt-4"><button type="submit" disabled={disabled} className={`${adminButton} border-red-600 bg-red-950/60 px-5`}>{saving ? "Saving…" : isEdit ? "Save product details" : "Create product with photos & sizes"}</button><p className="mt-2 text-xs text-white/45">{isEdit ? "Photos, features and size stock have their own save actions below." : "First add photos and sizes below, then click Create product here."}</p></div>
      </form>

      <div className={cardClass}>
        <h3 className={titleClass}>2. Product photos <span className="text-base text-white/40">({images.length}/50)</span></h3>
        <p className="mt-1 text-sm text-white/55">Upload photos from your phone or computer. The first main photo appears on product cards. Images are uploaded directly to Cloudinary (up to 3 MB each).</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-end">
          <label className={labelClass}>Photo type<select className={input} value={imageType} onChange={e=>setImageType(e.target.value as ImageType)}><option value="STILL">Main product photo</option><option value="WORN">On a model</option><option value="GALLERY">Additional photo</option><option value="OTHER">Other photo</option></select></label>
          <label className={labelClass}>Choose photos (you can select multiple)
            <input className={`${input} max-w-full file:mr-3 file:rounded-sm file:border-0 file:bg-red-900 file:px-3 file:py-2 file:text-white`} accept="image/*" type="file" multiple disabled={disabled || images.length>=50} onChange={e=>{const files=Array.from(e.target.files ?? []);e.target.value="";void uploadPhotos(files);}} /></label>
        </div>
        {uploading && <div className="mt-3"><UploadProgressIndicator label="Product photo" value={progress} /></div>}
        <details className="mt-3 text-xs text-white/60"><summary className="cursor-pointer py-2">Or add an existing Cloudinary image link</summary><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className={labelClass}>Image URL<input type="url" className={input} value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." /></label><label className={labelClass}>Photo description<input className={input} value={imageAlt} maxLength={255} onChange={e=>setImageAlt(e.target.value)} placeholder="Front view of product" /></label></div><button type="button" disabled={disabled} className={`${miniButton} mt-3`} onClick={()=>{void addPhoto(imageUrl,imageAlt,imageType).catch(c=>setError(c instanceof Error?c.message:"Could not add photo."));}}>Add image link</button></details>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{images.map((image,index)=><div key={image.id ?? `${image.url}-${index}`} className="min-w-0 border border-white/15 p-3"><div className="relative aspect-[4/3] overflow-hidden bg-black">{cloudinaryPhoto(image.url) ? <Image src={image.url} alt={image.alt || form.name || "Product photo"} fill sizes="(max-width:640px) 90vw, 230px" className="object-contain" /> : <p className="p-4 text-xs text-white/40">Image preview unavailable</p>}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs uppercase text-white/65">{image.type === "STILL" ? "Main photo" : image.type === "WORN" ? "On model" : "Gallery"}</span><button className={`${miniButton} border-red-800 text-red-300`} type="button" disabled={disabled} onClick={()=>void removePhoto(image,index)}>Remove</button></div></div>)}</div>
        {images.length===0&&<p className="mt-4 border border-dashed border-white/20 p-5 text-sm text-white/50">No photos added yet. Upload at least one before publishing.</p>}
      </div>

      <div className={cardClass}>
        <h3 className={titleClass}>3. Sizes & stock</h3><p className="mt-1 text-sm text-white/55">Each size has its own stock. Available = On hand − Reserved for orders. Never lower on-hand stock below reserved units.</p>
        <div className="mt-5 space-y-3">{variants.map((variant,index)=><div key={variant.id} className="grid gap-3 border border-white/15 bg-[#191919] p-3 sm:p-4 lg:grid-cols-[minmax(110px,1fr)_minmax(140px,1fr)_minmax(135px,1fr)_auto] lg:items-end">
          <div><p className="font-bold">{variant.size}</p><p className="mt-1 text-xs text-white/50">{variant.sizeGroup} · {variant.status}</p><p className="mt-1 text-xs text-emerald-300">Available: {variant.inventory?.availableQty ?? 0}</p><p className="text-xs text-white/50">Reserved: {variant.inventory?.reservedQty ?? 0}</p></div>
          {isEdit ? <label className={labelClass}>Total stock on hand<input aria-label={`${variant.size} stock on hand`} type="number" min={variant.inventory?.reservedQty ?? 0} max="100000" step="1" className={input} value={stockDrafts[variant.id] ?? ""} onChange={e=>setStockDrafts(s=>({...s,[variant.id]:e.target.value}))} /></label> : <div><p className="text-xs uppercase text-white/55">Stock on hand</p><p className="mt-2 font-semibold">{variant.inventory?.onHandQty ?? 0}</p></div>}
          {isEdit ? <label className={labelClass}>Size-specific price (optional)<input aria-label={`${variant.size} price override`} type="number" min="0.01" max="1000000" step="0.01" placeholder="Uses base price" className={input} value={overrideDrafts[variant.id] ?? ""} onChange={e=>setOverrideDrafts(s=>({...s,[variant.id]:e.target.value}))} /></label> : <p className="text-xs text-white/60">{variant.priceOverride ? `Price: ৳ ${variant.priceOverride}` : "Uses base price"}</p>}
          <div className="flex flex-wrap gap-2">{isEdit ? <><button type="button" disabled={disabled} className={miniButton} onClick={()=>void updateStock(variant)}>Save stock</button><button type="button" disabled={disabled} className={miniButton} onClick={()=>{const v=overrideDrafts[variant.id]??"";if(!numericPrice(v)){setError("Use a positive price or leave blank.");return;}void updateVariant(variant,{priceOverride:v ? Number(v) : null});}}>Save price</button><button type="button" disabled={disabled || variant.isDefault} className={miniButton} onClick={()=>void updateVariant(variant,{isDefault:true})}>Set default</button><button type="button" disabled={disabled} className={miniButton} onClick={()=>void updateVariant(variant,{status:variant.status==="ACTIVE"?"INACTIVE":"ACTIVE"})}>{variant.status==="ACTIVE"?"Disable size":"Enable size"}</button></> : <button type="button" className={miniButton} disabled={disabled} onClick={()=>setVariants(curr=>curr.filter(v=>v.id!==variant.id).map((v,n)=>({...v,isDefault:n===0})))}>Remove</button>}</div>
        </div>)}</div>
        <div className="mt-5 border-t border-white/15 pt-5"><h4 className="text-sm font-bold uppercase tracking-wider text-white">Add a size / variant</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className={labelClass}>Size code<input className={input} maxLength={20} placeholder="S, M, L, XL, ONE SIZE" value={newSize.sizeCode} onChange={e=>setNewSize(s=>({...s,sizeCode:e.target.value}))} /></label>
            <label className={labelClass}>Size type<select className={input} value={newSize.sizeGroup} onChange={e=>setNewSize(s=>({...s,sizeGroup:e.target.value as SizeGroup}))}><option value="GENERAL">General / One size</option><option value="TOP">Tops / Shirts</option><option value="PANT">Pants</option></select></label>
            <label className={labelClass}>Initial stock<input className={input} type="number" min="0" step="1" max="100000" value={newSize.initialStock} onChange={e=>setNewSize(s=>({...s,initialStock:e.target.value}))} /></label>
            <label className={labelClass}>Custom price (optional)<input className={input} type="number" min="0.01" max="1000000" step="0.01" placeholder="Base price" value={newSize.priceOverride} onChange={e=>setNewSize(s=>({...s,priceOverride:e.target.value}))} /></label>
            <label className={labelClass}>Low-stock alert level<input className={input} type="number" min="0" max="100000" step="1" value={newSize.reorderLevel} onChange={e=>setNewSize(s=>({...s,reorderLevel:e.target.value}))} /></label>
          </div><button type="button" className={`${miniButton} mt-4 border-red-700`} disabled={disabled || !newSize.sizeCode.trim()} onClick={()=>void addVariant()}>{isEdit?"Save new size":"Add size to new product"}</button>
        </div>
      </div>

      <div className={cardClass}>
        <h3 className={titleClass}>4. Features / highlights</h3><p className="mt-1 text-sm text-white/55">Examples: 100% cotton, relaxed fit, or hand-finished details.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input aria-label="New product feature" maxLength={255} className={`${input} mt-0 sm:flex-1`} value={featureText} onChange={e=>setFeatureText(e.target.value)} placeholder="Add a product feature" /><button type="button" disabled={disabled || !featureText.trim()} className={miniButton} onClick={()=>void addFeature()}>Add feature</button></div>
        <div className="mt-4 space-y-2">{features.map(feature=><div key={feature.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-2"><span className="min-w-0 break-words text-sm">{feature.text}</span><button type="button" disabled={disabled} className={`${miniButton} border-red-800 text-red-300`} onClick={()=>void removeFeature(feature)}>Remove</button></div>)}</div>
      </div>
      {!isEdit && <div className="border border-red-800 bg-red-950/20 p-5"><p className="text-sm text-white/70">Ready? Your photos, sizes and features are staged. Return to Step 1 and click <strong>Create product with photos &amp; sizes</strong> to save everything together.</p></div>}
    </>}
  </section>;
}
