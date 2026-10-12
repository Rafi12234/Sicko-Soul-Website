import { apiRequest, type DataEnvelope } from "@/lib/apiClient";

export type CloudinaryKind = "image" | "video";
export type UploadStage = "signing" | "uploading" | "saving";
export type UploadProgress = { stage: UploadStage; percent: number };
export const ADMIN_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const ADMIN_VIDEO_MAX_BYTES = 60 * 1024 * 1024;


type SignedUpload = {
  kind: CloudinaryKind;
  apiKey: string;
  cloudName: string;
  publicId: string;
  timestamp: number;
  overwrite: string;
  signature: string;
};

/** Browser uploads file bytes to Cloudinary, NEVER through the cPanel API.
 * The API secret remains only in backend/.env and signs each short-lived upload.
 * The returned URL is NOT persisted until the calling editor saves its target.
 */
export async function uploadToCloudinary(
  file: File,
  kind: CloudinaryKind,
  token: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  const isAudio = kind === "video" && file.type.startsWith("audio/");
  const maxBytes = kind === "image" ? ADMIN_IMAGE_MAX_BYTES : ADMIN_VIDEO_MAX_BYTES;
  if (!file.size || file.size > maxBytes) {
    throw new Error(`${kind === "image" ? "Images" : "Videos and audio"} must be under or equal to ${maxBytes / 1048576} MB.`);
  }
  if (!file.type.startsWith(`${kind}/`) && !isAudio) {
    throw new Error(kind === "image" ? "Select a valid image." : "Select a video or audio file.");
  }
  onProgress?.({ stage: "signing", percent: 0 });
  const signature = await apiRequest<DataEnvelope<SignedUpload>>(
    "/admin/site-media/upload-signature", {
      method: "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, sizeBytes: file.size }),
    },
  );
  const signed = signature.data;
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(signed.cloudName) || signed.kind !== kind) {
    throw new Error("Unexpected Cloudinary upload configuration.");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("public_id", signed.publicId);
  form.append("overwrite", signed.overwrite);
  form.append("signature", signed.signature);
  // XHR provides upload progress events; fetch() does not expose them reliably.
  const body = await new Promise<{ secure_url?: string; error?: { message?: string } }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/${kind}/upload`);
    xhr.timeout = 240000;
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.({ stage: "uploading", percent: Math.min(99, Math.round(event.loaded / event.total * 100)) });
      }
    };
    xhr.onload = () => {
      let result: { secure_url?: string; error?: { message?: string } };
      try { result = JSON.parse(xhr.responseText) as typeof result; }
      catch { reject(new Error("Invalid Cloudinary upload response.")); return; }
      if (xhr.status < 200 || xhr.status >= 300 || !result.secure_url) {
        reject(new Error(result.error?.message || `Cloudinary upload failed (${xhr.status}).`)); return;
      }
      onProgress?.({ stage: "uploading", percent: 100 });
      resolve(result);
    };
    xhr.onerror = () => reject(new Error("Network error uploading to Cloudinary."));
    xhr.ontimeout = () => reject(new Error("Cloudinary upload timed out. Please try again."));
    onProgress?.({ stage: "uploading", percent: 0 });
    xhr.send(form);
  });
  const src = new URL(body.secure_url);
  if (src.protocol !== "https:" || src.hostname !== "res.cloudinary.com" ||
      !src.pathname.startsWith(`/${signed.cloudName}/${kind}/upload/`)) {
    throw new Error("Cloudinary returned an unexpected media URL.");
  }
  return src.toString();
}

export type SiteMediaUploadTarget = "hero" | "drop" | "lookbook" | "streetsPrimary" | "streetsSecondary";

export async function saveUploadedSiteMedia(
  token: string,
  target: SiteMediaUploadTarget,
  url: string,
  options: { index?: number; alt?: string } = {},
): Promise<void> {
  await apiRequest("/admin/site-media/uploaded-asset", {
    method: "PUT", cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ target, url, ...options }),
  });
}
