"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import UploadProgressIndicator from "@/components/admin/UploadProgressIndicator";
import { uploadToCloudinary, saveUploadedSiteMedia, type UploadProgress } from "@/lib/adminCloudinary";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import type { StreetsImages, StreetsImage } from "@/lib/siteMedia";

const input = "mt-2 min-w-0 w-full border border-white/25 bg-[#101014] px-3 py-2 text-sm text-white outline-none focus:border-red-500";
const button = "border border-red-700 px-5 py-3 text-xs font-bold uppercase tracking-wider hover:bg-red-800 disabled:opacity-50";
const blank = (): StreetsImage => ({ src: "", alt: "", caption: "" });
export default function StreetsMediaEditor({ token }: { token: string }) {
  const [values, setValues] = useState<StreetsImages>({ primary: null, secondary: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"primary" | "secondary" | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await apiRequest<DataEnvelope<StreetsImages>>("/admin/site-media/streets", {
        cache: "no-store", headers: { Authorization: `Bearer ${token}` },
      });
      setValues(result.data);
    } catch (err) { setError(err instanceof Error ? err.message : "Cannot load Streets media."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void reload(); }, [reload]);
  async function uploadStreetImage(file: File, key: "primary" | "secondary") {
    setUploading(key); setProgress({ stage: "signing", percent: 0 }); setError(""); setNotice("");
    let uploadedUrl = "";
    try {
      uploadedUrl = await uploadToCloudinary(file, "image", token, setProgress);
      setProgress({ stage: "saving", percent: 100 });
      await saveUploadedSiteMedia(token, key === "primary" ? "streetsPrimary" : "streetsSecondary", uploadedUrl,
        { alt: values[key]?.alt || file.name.slice(0, 255) });
      setValues(previous => ({ ...previous, [key]: {
        ...(previous[key] ?? blank()),
        src: uploadedUrl,
        alt: previous[key]?.alt || file.name.slice(0, 255),
      } }));
      setNotice(`${key} image uploaded to Cloudinary and URL saved to the Streets database slot. Caption edits still require Save.`);
    } catch (err) {
      setError(`${err instanceof Error ? err.message : "Upload failed."}${uploadedUrl ? ` Cloudinary URL for recovery: ${uploadedUrl}` : ""}`);
    } finally { setUploading(null); setProgress(null); }
  }
  const save = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest("/admin/site-media/streets", {
        method: "PUT", cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      setNotice("Saved. Refresh the homepage after a few seconds to see the updated photographs.");
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed."); }
    finally { setSaving(false); }
  };
  return <section className="mt-8 min-w-0 overflow-hidden border border-white/15 bg-[#111114] p-3 sm:p-5 lg:p-7">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h3 className="font-display text-2xl uppercase sm:text-3xl">The Streets — Two Photographs</h3>
        <p className="text-sm text-white/55">Upload each photo to Cloudinary and automatically save its URL to the correct database slot. Product photography remains a separate workflow.</p></div>
      <button className={button} type="button" onClick={() => void reload()}>Reload</button>
    </div>
    {loading ? <p className="mt-5 text-sm text-white/60">Loading…</p> : <div className="mt-5 grid gap-6 lg:grid-cols-2">
      {(["primary", "secondary"] as const).map(key => <div key={key} className="min-w-0 space-y-4 border border-white/15 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3"><h4 className="font-semibold uppercase">{key} image</h4>
          <button type="button" className="text-xs text-red-300 underline" onClick={() => setValues(previous => ({ ...previous, [key]: previous[key] ? null : blank() }))}>{values[key] ? "Clear image" : "+ Add URL"}</button></div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-white/70">Upload {key} photograph · max 3 MB — automatically saves
          <input type="file" accept="image/*" disabled={uploading !== null || saving || loading}
            className="mt-2 block w-full max-w-full text-xs file:mr-2 file:mb-2 file:border file:border-red-700 file:bg-[#201315] file:p-2 file:text-white" onChange={event => {
              const file = event.target.files?.[0]; event.target.value = "";
              if (file) void uploadStreetImage(file, key);
            }} />
        </label>
        {/^https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\//i.test(values[key]?.src ?? "") &&
          <div className="relative aspect-[4/3] w-full overflow-hidden border border-white/15">
            <Image src={values[key]!.src} alt={values[key]!.alt || `${key} Streets photo`} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" />
          </div>}
        {values[key] && <>
          {(["src", "alt", "caption"] as const).map(prop => <label key={prop} className="block text-xs uppercase tracking-wide text-white/60">{prop === "src" ? "Image Cloudinary URL" : prop === "alt" ? "Accessibility description" : "Visible caption"}
            <input className={input} value={values[key]?.[prop] ?? ""} onChange={e => setValues(previous => ({ ...previous, [key]: { ...previous[key]!, [prop]: e.target.value } }))} /></label>)}
        </>}
      </div>)}
    </div>}
    <div className="mt-6 flex flex-wrap items-center gap-4"><button disabled={saving || loading || uploading !== null} onClick={() => void save()} className={`${button} bg-red-900`}>{saving ? "SAVING…" : "SAVE STREET IMAGES"}</button>
      {notice && <p role="status" className="text-sm text-green-300">{notice}</p>}</div>
    {uploading && <div className="mt-4"><UploadProgressIndicator value={progress} label={`Streets ${uploading} image`} /></div>}
    {error && <p role="alert" className="mt-4 break-words text-sm text-red-300">{error}</p>}
  </section>;
}
