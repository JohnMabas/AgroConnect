"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { thumbnailImageUrl } from "@/lib/cloudinary";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type ImageUploadRequest = (
  file: File,
  onProgress: (percent: number) => void,
) => Promise<string>;

interface SingleImageUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  upload: ImageUploadRequest;
  remove?: () => Promise<void>;
  label?: string;
  hint?: string;
  alt?: string;
  disabled?: boolean;
}

export function SingleImageUpload({
  value,
  onChange,
  upload,
  remove,
  label = "Image",
  hint = "JPEG, PNG or WebP, up to 5 MB.",
  alt = "Image preview",
  disabled = false,
}: SingleImageUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function clearObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Upload a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    clearObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreview(objectUrl);
    setUploading(true);
    setProgress(0);
    setError("");

    try {
      const imageUrl = await upload(file, setProgress);
      setPreview(undefined);
      onChange(imageUrl);
    } catch (err) {
      setPreview(undefined);
      setError((err as Error)?.message ?? "Upload failed.");
    } finally {
      clearObjectUrl();
      setUploading(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    setError("");
    try {
      if (remove) await remove();
      onChange(null);
      setPreview(undefined);
      clearObjectUrl();
    } catch (err) {
      setError((err as Error)?.message ?? "Could not remove image.");
    } finally {
      setRemoving(false);
    }
  }

  const displayUrl = preview ?? thumbnailImageUrl(value);
  const busy = uploading || removing;

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="single-image-upload-input"
          className="mb-1.5 block text-sm font-semibold text-deep-navy"
        >
          {label}
        </label>
        <p className="mb-2 text-xs text-deep-navy/55">{hint}</p>
      </div>

      {displayUrl ? (
        <div
          role="img"
          aria-label={alt}
          className="h-40 w-full rounded-xl border border-deep-navy/10 bg-soft-bg bg-cover bg-center"
          style={{ backgroundImage: `url("${displayUrl.replace(/"/g, '\\"')}")` }}
        />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-deep-navy/20 bg-soft-bg text-sm text-deep-navy/45">
          No image uploaded
        </div>
      )}

      <input
        id="single-image-upload-input"
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        disabled={busy || disabled}
        onChange={(event) => void handleFileChange(event)}
        className="block w-full cursor-pointer rounded-xl border border-dashed border-deep-navy/25 bg-white px-4 py-3 text-sm text-deep-navy/70 file:mr-4 file:rounded-full file:border-0 file:bg-agro-green file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
      />

      {uploading && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-deep-navy/10">
            <div
              className="h-full rounded-full bg-agro-green transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-deep-navy/60">Uploading… {progress}%</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {(value || preview) && (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => void handleRemove()}
          className="rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {removing ? "Removing…" : "Remove image"}
        </button>
      )}
    </div>
  );
}
