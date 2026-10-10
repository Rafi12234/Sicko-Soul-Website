"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import type { EditableLookbookImage, SiteMediaConfig } from "@/lib/siteMedia";

const EMPTY_IMAGE: EditableLookbookImage = {
  src: "", title: "", alt: "", spec: "", line: "", reveal: "",
};
const inputClass = "mt-1 w-full min-w-0 border border-white/25 bg-[#151515] px-3 py-2 text-sm text-white outline-none focus:border-red-500";
const actionClass = "border border-white/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:border-red-500 hover:text-red-300 disabled:opacity-50";

function isCloudinaryUrl(value: string, kind: "image" | "video") {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith(`/dec82taov/${kind}/upload/`) && !url.username && !url.password;
  } catch { return false; }
}

export default function SiteMediaEditor({ token }: { token: string }) {
  const [media, setMedia] = useState<SiteMediaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const reload = useCallback(async () => {
    setLoading(true); setError(""); setNotice("");
    try {
      const result = await apiRequest<DataEnvelope<SiteMediaConfig>>("/admin/site-media", {
        cache: "no-store", headers: { Authorization: `Bearer ${token}` },
      });
      setMedia(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load site media. Check the local database seed and backend.");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void reload(); }, [reload]);

  function editImage(index: number, field: keyof EditableLookbookImage, value: string) {
    setMedia(prev => prev ? {
      ...prev,
      lookbookImages: prev.lookbookImages.map((img, i) => i === index ? { ...img, [field]: value } : img),
    } : prev);
    setNotice("");
  }

  function moveImage(index: number, direction: number) {
    setMedia(prev => {
      if (!prev) return prev;
      const other = index + direction;
      if (other < 0 || other >= prev.lookbookImages.length) return prev;
      const images = [...prev.lookbookImages];
      [images[index], images[other]] = [images[other], images[index]];
      return { ...prev, lookbookImages: images };
    });
    setNotice("");
  }

  /** Signed direct-to-Cloudinary upload: no image/video bytes pass through cPanel. */
  async function uploadFile(file: File, kind: "image" | "video", target: "hero" | "drop" | number) {
    const label = typeof target === "number" ? `photo-${target}` : target;
    const maximum = kind === "image" ? 15 * 1024 * 1024 : 80 * 1024 * 1024;
    if (file.size > maximum) {
      setError(`${kind === "image" ? "Images" : "Videos"} must be under ${Math.floor(maximum / 1024 / 1024)} MB. Compress large files before upload.`);
      return;
    }
    if (!file.type.startsWith(`${kind}/`)) {
      setError(`Choose a valid ${kind} file.`);
      return;
    }
    setUploading(label); setError(""); setNotice("");
    try {
      const signed = await apiRequest<DataEnvelope<{
        apiKey: string; cloudName: string; publicId: string; timestamp: number;
        overwrite: string; signature: string;
      }>>("/admin/site-media/upload-signature", {
        method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind }),
      });
      const values = signed.data;
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", values.apiKey);
      form.append("timestamp", String(values.timestamp));
      form.append("public_id", values.publicId);
      form.append("overwrite", values.overwrite);
      form.append("signature", values.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${values.cloudName}/${kind}/upload`, {
        method: "POST", body: form,
      });
      const payload = await response.json() as { secure_url?: string; error?: { message?: string } };
      if (!response.ok || !payload.secure_url || !isCloudinaryUrl(payload.secure_url, kind)) {
        throw new Error(payload.error?.message || "Cloudinary upload failed.");
      }
      const src = payload.secure_url;
      setMedia(prev => {
        if (!prev) return prev;
        if (target === "hero") return { ...prev, heroVideoUrl: src };
        if (target === "drop") return { ...prev, dropVideoUrl: src };
        return { ...prev, lookbookImages: prev.lookbookImages.map((item, index) =>
          index === target ? { ...item, src } : item) };
      });
      setNotice("Uploaded to Cloudinary. Click SAVE below to publish it to your database.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Media upload failed.");
    } finally { setUploading(null); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!media) return;
    setError(""); setNotice("");
    if (!isCloudinaryUrl(media.heroVideoUrl, "video") || !isCloudinaryUrl(media.dropVideoUrl, "video")) {
      setError("Hero and New Drop must use secure Cloudinary video URLs from dec82taov."); return;
    }
    if (media.lookbookImages.length > 40 || media.lookbookImages.some(img => !isCloudinaryUrl(img.src, "image"))) {
      setError("Every gallery entry needs a valid Cloudinary image URL (40 images maximum)."); return;
    }
    setSaving(true);
    try {
      await apiRequest<DataEnvelope<SiteMediaConfig>>("/admin/site-media", {
        method: "PUT", cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(media),
      });
      setNotice("Saved to the database. Reload the public homepage to see the new media. No deployment needed.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save media."); }
    finally { setSaving(false); }
  }

  if (loading) return <p role="status" className="mt-8 text-sm text-white/60">Loading site media…</p>;
  if (!media) return <section className="mt-8 border border-red-700 p-4">
    <p role="alert" className="text-red-300">{error || "Media configuration is unavailable."}</p>
    <button type="button" onClick={() => void reload()} className={`${actionClass} mt-4`}>Retry</button>
  </section>;

  return <section className="mt-7 border border-red-900/70 bg-[#101010] p-4 md:p-7" aria-label="Site media settings">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-display text-3xl uppercase text-white">Site Media</h2>
        <p className="mt-1 text-xs text-white/55">Change Cloudinary URLs without a Git commit. Gallery count is automatic.</p></div>
      <button type="button" onClick={() => void reload()} disabled={saving || uploading !== null} className={actionClass}>Discard edits / Reload</button>
    </div>
    <form onSubmit={save} className="mt-6 space-y-7">
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block text-sm font-semibold uppercase tracking-wider text-white/80">Hero background video URL
          <input required type="url" maxLength={1200} className={inputClass} value={media.heroVideoUrl} onChange={e => setMedia(prev => prev ? { ...prev, heroVideoUrl: e.target.value } : prev)} />
        </label>
        <label className="block text-sm font-semibold uppercase tracking-wider text-white/80">New Drop background video URL
          <input required type="url" maxLength={1200} className={inputClass} value={media.dropVideoUrl} onChange={e => setMedia(prev => prev ? { ...prev, dropVideoUrl: e.target.value } : prev)} />
        </label>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className={actionClass}>Upload Hero video directly to Cloudinary
          <input type="file" accept="video/*" disabled={uploading !== null || saving} className="mt-2 block w-full text-xs" onChange={event => {
            const file = event.target.files?.[0]; event.target.value = "";
            if (file) void uploadFile(file, "video", "hero");
          }} />
        </label>
        <label className={actionClass}>Upload New Drop video directly to Cloudinary
          <input type="file" accept="video/*" disabled={uploading !== null || saving} className="mt-2 block w-full text-xs" onChange={event => {
            const file = event.target.files?.[0]; event.target.value = "";
            if (file) void uploadFile(file, "video", "drop");
          }} />
        </label>
      </div>
      <p className="text-xs text-white/50">Files upload directly from your browser to Cloudinary. Requires Cloudinary API credentials in the backend environment only. Copying a URL needs no credentials.</p>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-6">
        <div><h3 className="font-display text-2xl uppercase">Caught on Camera</h3>
          <p className="text-xs text-white/55">{media.lookbookImages.length} visible photograph{media.lookbookImages.length === 1 ? "" : "s"}; reorder or remove freely</p></div>
        <button type="button" className={actionClass} disabled={media.lookbookImages.length >= 40 || uploading !== null} onClick={() => setMedia(prev => prev ? { ...prev, lookbookImages: [...prev.lookbookImages, { ...EMPTY_IMAGE }] } : prev)}>+ Add photo</button>
      </div>
      {media.lookbookImages.map((img, index) => <div key={`${index}`} className="grid gap-4 border border-white/15 bg-black/50 p-4 md:grid-cols-[120px_minmax(0,1fr)]">
        <div className="relative h-36 w-full overflow-hidden border border-white/20 bg-[#191919] md:w-[120px]">
          {isCloudinaryUrl(img.src, "image") ? <Image src={img.src} alt={img.alt || `Photo ${index + 1}`} fill sizes="120px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-center text-xs text-white/40">Photo {index + 1}</span>}
        </div>
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm tracking-widest">FRAME {String(index + 1).padStart(2, "0")}</strong>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-label={`Move frame ${index + 1} up`} disabled={index === 0 || uploading !== null} className={actionClass} onClick={() => moveImage(index, -1)}>↑</button>
              <button type="button" aria-label={`Move frame ${index + 1} down`} disabled={index === media.lookbookImages.length - 1 || uploading !== null} className={actionClass} onClick={() => moveImage(index, 1)}>↓</button>
              <button type="button" disabled={uploading !== null} className={`${actionClass} border-red-900 text-red-300`} onClick={() => setMedia(prev => prev ? { ...prev, lookbookImages: prev.lookbookImages.filter((_, i) => i !== index) } : prev)}>Remove</button>
            </div>
          </div>
          <label className="block text-xs uppercase">Cloudinary photo URL<input required type="url" maxLength={1200} className={inputClass} value={img.src} onChange={e => editImage(index, "src", e.target.value)} /></label>
          <label className="mt-2 block text-xs uppercase text-white/70">Or upload a photo directly to Cloudinary
            <input type="file" accept="image/*" disabled={uploading !== null || saving} className="mt-2 block w-full text-xs" onChange={event => {
              const file = event.target.files?.[0]; event.target.value = "";
              if (file) void uploadFile(file, "image", index);
            }} />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["title", "alt", "spec", "line", "reveal"] as const).map(field => <label key={field} className="block text-xs uppercase">{field === "line" ? "Caption" : field === "reveal" ? "Flip message" : field}
              <input type="text" maxLength={field === "title" || field === "spec" ? 160 : 255} className={inputClass} value={img[field]} onChange={e => editImage(index, field, e.target.value)} />
            </label>)}
          </div>
        </div>
      </div>)}
      {media.lookbookImages.length === 0 && <p className="border border-dashed border-white/25 p-5 text-sm text-white/60">No photos configured. The gallery section will be hidden until you add one.</p>}
      {uploading && <p role="status" className="border-l-2 border-white/60 p-3 text-sm text-white/75">Uploading {uploading} directly to Cloudinary… do not navigate away.</p>}
      {error && <p role="alert" className="border-l-2 border-red-600 p-3 text-sm text-red-300">{error}</p>}
      {notice && <p role="status" className="border-l-2 border-green-500 p-3 text-sm text-green-300">{notice}</p>}
      <button type="submit" disabled={saving || uploading !== null} className="w-full border border-red-700 bg-[#8a0303] px-6 py-4 text-sm font-semibold uppercase tracking-widest text-white hover:bg-red-700 disabled:opacity-50">
        {saving ? "Saving…" : "Save videos and gallery"}
      </button>
    </form>
  </section>;
}
