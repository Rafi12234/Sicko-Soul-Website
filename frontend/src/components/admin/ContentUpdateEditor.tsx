"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import { CONTENT_DEFAULTS, mergeCopy, type ContentKey, type SiteContent } from "@/lib/siteContent";
import { uploadToCloudinary, type UploadProgress } from "@/lib/adminCloudinary";
import UploadProgressIndicator from "@/components/admin/UploadProgressIndicator";

const SECTIONS: { key: ContentKey; label: string; detail: string }[] = [
  { key: "hero", label: "Hero", detail: "Headlines, changing words, ticker and captions" },
  { key: "manifesto", label: "Manifesto / Creed", detail: "Creed, paragraphs, verdict and annotations" },
  { key: "statementBands", label: "Statement Bands", detail: "Three interstitial messages and their headings" },
  { key: "drop", label: "New Drop", detail: "Section and drawer copy; collection/products stay in catalog" },
  { key: "rack", label: "The Rack", detail: "Archive titles, calls to action and instructions" },
  { key: "streets", label: "The Streets", detail: "Taglines, captions, story, quote and metrics" },
  { key: "lookbook", label: "Caught on Camera", detail: "Section copy; individual frame labels are in Site Media" },
  { key: "cred", label: "Street Cred", detail: "Headlines and review presentation copy" },
  { key: "feedback", label: "Complaints", detail: "Form labels, placeholders, errors and confirmation copy" },
  { key: "footer", label: "Footer", detail: "Headings, ticker, social/link labels and rights" },
  { key: "navigation", label: "Navigation", detail: "Menu copy and public link labels" },
  { key: "preloader", label: "Entry Screen", detail: "Public entry ritual copy (never shown to admins)" },
  { key: "audio", label: "Background Music", detail: "Cloudinary soundtrack URL on the public site only" },
];

const field = "mt-1 min-w-0 w-full rounded-none border border-white/20 bg-[#101014] px-3 py-2.5 text-sm leading-6 text-white outline-none transition-colors focus:border-red-500";
const button = "border border-white/25 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors hover:border-red-500 disabled:opacity-40";

function pretty(text: string) {
  return text.replace(/([A-Z])/g, " $1").replace(/([_-])/g," ").replace(/^(.)/, match => match.toUpperCase());
}
function clone<T>(val: T): T { return JSON.parse(JSON.stringify(val)) as T; }
function updatePath(root: unknown, path: Array<string | number>, value: string): Record<string, unknown> {
  const draft = clone(root) as Record<string, unknown>;
  let cursor: unknown = draft;
  for (const part of path.slice(0, -1)) cursor = (cursor as Record<string | number, unknown>)[part];
  (cursor as Record<string | number, unknown>)[path[path.length - 1]] = value;
  return draft;
}

function Inputs({ value, path, onEdit }: {
  value: unknown; path: Array<string | number>;
  onEdit: (path: Array<string | number>, next: string) => void;
}): ReactNode {
  if (typeof value === "string") {
    // IDs, route targets, theme/layout tokens and animation cipher templates
    // are structural, not visible marketing copy.
    const structural = ["id", "href", "index", "theme", "face", "tone", "indent", "width", "height", "offset", "aspect", "wordmarkCipher", "taglineCipher", "subCipher", "quoteCipher", "chars"];
    const key = String(path[path.length - 1]);
    if (structural.includes(key)) return null;
    const label = path.map(part => typeof part === "number" ? `Item ${part + 1}` : pretty(part)).join(" / ");
    const multiline = value.length > 72 || /line|paragraph|message|rest|aside|note|intro|ticker|marquee|verdict|rights|quote|description|text/i.test(key);
    return <label key={path.join(".")} className="block min-w-0">
      <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/65">{label}</span>
      {multiline ? <textarea rows={value.length > 160 ? 4 : 2} maxLength={2500} className={`${field} resize-y`} value={value} onChange={e => onEdit(path, e.target.value)} /> :
        <input maxLength={2500} className={field} value={value} onChange={e => onEdit(path, e.target.value)}/>}
    </label>;
  }
  if (Array.isArray(value)) return <div className="col-span-full space-y-3" key={path.join(".")}>
    <h4 className="border-b border-white/15 pb-2 text-sm font-semibold uppercase tracking-[0.12em] text-white/70">{path.map(part => pretty(String(part))).join(" / ")}</h4>
    {value.map((item, index) => <div key={index} className="grid gap-4 border-l border-red-900/50 pl-4 md:grid-cols-2"><Inputs value={item} path={[...path,index]} onEdit={onEdit} /></div>)}
  </div>;
  if (value && typeof value === "object") return <div className="col-span-full grid gap-4 md:grid-cols-2" key={path.join(".")}>
    {Object.entries(value).map(([key,item]) => <Inputs key={key} value={item} path={[...path,key]} onEdit={onEdit} />)}
  </div>;
  return null;
}

export default function ContentUpdateEditor({ token, onMedia }: { token: string; onMedia: () => void }) {
  const [selectedKey, setSelectedKey] = useState<ContentKey>("hero");
  const [savedValues, setSavedValues] = useState<SiteContent>({});
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [assetProgress, setAssetProgress] = useState<UploadProgress | null>(null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const readCurrent = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await apiRequest<DataEnvelope<SiteContent>>("/admin/site-content", {
        cache: "no-store", headers: { Authorization: `Bearer ${token}` },
      });
      setSavedValues(result.data ?? {});
    } catch (err) { setError(err instanceof Error ? err.message : "Cannot load content."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void readCurrent(); }, [readCurrent]);
  useEffect(() => {
    setDraft(clone(mergeCopy(CONTENT_DEFAULTS[selectedKey], savedValues[selectedKey])) as Record<string, unknown>);
    setDirty(false);
  }, [selectedKey, savedValues]);

  const active = useMemo(() => SECTIONS.find(entry => entry.key === selectedKey)!, [selectedKey]);
  const choose = (key: ContentKey) => {
    if (dirty && !window.confirm("You have unsaved edits. Discard them and change section?")) return;
    setNotice(""); setError("");
    setSelectedKey(key);
  };
  const edit = (path: Array<string|number>, next: string) => {
    setDraft(current => updatePath(current, path, next)); setDirty(true); setNotice("");
  };
  async function uploadContentAsset(file: File, target: "logo" | "soundtrack") {
    if (dirty && !window.confirm("You have unsaved text edits. Save or discard them before uploading this asset?")) return;
    if (dirty) { setError("Please save or discard unsaved text edits before uploading."); return; }
    setUploadingAsset(true); setAssetProgress({ stage: "signing", percent: 0 }); setError(""); setNotice("");
    let uploadedUrl = "";
    try {
      uploadedUrl = await uploadToCloudinary(file, target === "logo" ? "image" : "video", token, setAssetProgress);
      setAssetProgress({ stage: "saving", percent: 100 });
      await apiRequest("/admin/site-content/uploaded-asset", {
        method: "PUT", cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target, url: uploadedUrl }),
      });
      const section = target === "logo" ? "navigation" : "audio";
      const key = target === "logo" ? "logoUrl" : "soundtrackUrl";
      setSavedValues(previous => ({
        ...previous,
        [section]: { ...(previous[section] ?? {}), [key]: uploadedUrl },
      }));
      setNotice(`${target === "logo" ? "Logo" : "Soundtrack"} uploaded to Cloudinary and its URL saved to MySQL.`);
    } catch (err) {
      setError(`${err instanceof Error ? err.message : "Upload failed."}${uploadedUrl ? ` Cloudinary URL for recovery: ${uploadedUrl}` : ""}`);
    } finally { setUploadingAsset(false); setAssetProgress(null); }
  }
  const save = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`/admin/site-content/${selectedKey}`, {
        method: "PUT", cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: draft }),
      });
      setSavedValues(previous => ({ ...previous, [selectedKey]: clone(draft) }));
      setDirty(false);
      setNotice("Saved to the database. Refresh the storefront to see changes (allow about 10 seconds for cache refresh).");
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed."); }
    finally { setSaving(false); }
  };
  return <div className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-5 border-b border-white/15 pb-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">Content Management / 01</p>
        <h2 className="mt-2 font-display text-4xl uppercase md:text-5xl">Content Update</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/55">Edit the live homepage text by section. Your changes are saved in MySQL; no code upload or GitHub deployment is required after a save.</p>
      </div>
      <button className={button} type="button" onClick={onMedia}>Manage images &amp; videos →</button>
    </header>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[225px_minmax(0,1fr)]">
      <nav aria-label="Homepage sections" className="flex min-w-0 max-w-full gap-1 overflow-x-auto border border-white/15 bg-[#111114] p-2 xl:max-h-[70vh] xl:flex-col xl:overflow-x-visible xl:overflow-y-auto">
        {SECTIONS.map((item, index) => <button key={item.key} type="button" onClick={() => choose(item.key)}
          className={`flex shrink-0 items-center gap-3 whitespace-nowrap border-l-2 px-3 py-3 text-left text-sm transition-colors xl:w-full xl:whitespace-normal ${selectedKey === item.key ? "border-red-600 bg-red-950/25 text-white" : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"}`}>
          <span className="w-5 font-mono text-xs text-red-500">{String(index+1).padStart(2,"0")}</span><span>{item.label}</span>
        </button>)}
      </nav>
      <section className="min-w-0 border border-white/15 bg-[#111114] p-4 sm:p-6" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-4">
          <div><h3 className="font-display text-3xl uppercase">{active.label}</h3><p className="text-sm text-white/50">{active.detail}</p></div>
          {dirty && <span className="border border-amber-500/50 px-3 py-1 text-xs text-amber-300">UNSAVED EDITS</span>}
        </div>
        {loading ? <p role="status" className="py-10 text-sm text-white/60">Loading editable content…</p> : <>
          <div className="mt-6 grid max-h-[66vh] gap-5 overflow-y-auto pr-1 md:grid-cols-2"><Inputs value={draft} path={[]} onEdit={edit}/></div>
          {(selectedKey === "navigation" || selectedKey === "audio") && (
            <div className="mt-6 border border-red-900/40 bg-black/30 p-4">
              <h4 className="font-display text-xl uppercase">{selectedKey === "navigation" ? "Upload Site Logo" : "Upload Background Music"}</h4>
              <p className="mt-1 text-xs text-white/55">The file uploads directly to Cloudinary and its returned URL is saved automatically to this section. Logo maximum 3 MB; soundtrack maximum 60 MB. No API secret is exposed to the browser.</p>
              <input type="file" accept={selectedKey === "navigation" ? "image/*" : "audio/*"}
                disabled={uploadingAsset || saving || dirty} className="mt-4 block w-full max-w-full text-sm file:mr-2 file:mb-2 file:border file:border-red-700 file:bg-[#201315] file:p-2 file:text-white"
                onChange={event => { const file = event.target.files?.[0]; event.target.value = "";
                  if (file) void uploadContentAsset(file, selectedKey === "navigation" ? "logo" : "soundtrack"); }} />
              {uploadingAsset && <p role="status" className="mt-2 text-xs text-white/70">Uploading to Cloudinary and saving URL to MySQL…</p>}
              {dirty && <p className="mt-2 text-xs text-amber-300">Save or discard text changes to enable media upload.</p>}
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-3 border-t border-white/15 pt-5">
            <button type="button" disabled={!dirty || saving || uploadingAsset} onClick={() => void save()} className={`${button} border-red-600 bg-red-800 hover:bg-red-700`}>{saving ? "SAVING…" : "SAVE SECTION"}</button>
            <button type="button" disabled={saving} onClick={() => { setDraft(clone(mergeCopy(CONTENT_DEFAULTS[selectedKey], savedValues[selectedKey])) as Record<string, unknown>); setDirty(false); setNotice(""); }} className={button}>Discard changes</button>
            <button type="button" disabled={saving} onClick={() => { if (window.confirm("Restore the original copy in the form? Click Save to publish.")) { setDraft(clone(CONTENT_DEFAULTS[selectedKey]) as Record<string, unknown>); setDirty(true); } }} className={button}>Restore original copy</button>
          </div>
        </>}
        {notice && <p role="status" className="mt-4 border-l-2 border-green-600 p-3 text-sm text-green-200">{notice}</p>}
        {uploadingAsset && <UploadProgressIndicator value={assetProgress} label={selectedKey === "navigation" ? "Website logo" : "Soundtrack"} />}
    {error && <p role="alert" className="mt-4 border-l-2 border-red-600 p-3 text-sm text-red-300">{error}</p>}
      </section>
    </div>
  </div>;
}
