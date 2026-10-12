"use client";

import type { UploadProgress } from "@/lib/adminCloudinary";

export default function UploadProgressIndicator({ value, label }: { value: UploadProgress | null; label: string }) {
  if (!value) return null;
  const heading = value.stage === "signing" ? "SECURING UPLOAD" :
    value.stage === "uploading" ? "UPLOADING TO CLOUDINARY" : "SAVING TO DATABASE";
  return <div role="status" aria-live="polite" className="min-w-0 border border-red-700/60 bg-[#190e10] p-3 sm:p-4">
    <div className="flex flex-wrap items-center gap-3">
      <span aria-hidden className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-white">{heading}</p>
        <p className="mt-1 break-words text-xs text-white/60">{label} · Do not close this page until saving finishes.</p>
      </div>
      <strong className="font-mono text-sm tabular-nums text-red-300">{value.stage === "uploading" ? `${value.percent}%` : value.stage === "saving" ? "100%" : "…"}</strong>
    </div>
    <div role="progressbar" aria-label={`${label} upload progress`} aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={value.percent} className="mt-3 h-2 w-full overflow-hidden bg-white/10">
      <div className="h-full bg-red-600 transition-[width] duration-150 ease-out" style={{ width: `${value.percent}%` }} />
    </div>
    <div className="mt-2 flex justify-between text-[0.62rem] uppercase tracking-widest text-white/50"><span>Cloudinary transfer</span><span>Database save</span></div>
  </div>;
}
