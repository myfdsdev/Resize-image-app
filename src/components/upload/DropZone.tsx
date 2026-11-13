"use client";

import { ImagePlus, Upload } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { convertHeic } from "@/lib/heic";
import { NO_EDITS } from "@/lib/image-processing/edits";
import { makeThumbnail } from "@/lib/thumbnail";
import { ACCEPTED_EXT, MAX_FILES, MAX_FILE_SIZE_MB, validateFile } from "@/lib/validation";
import { useImageStore, type ImageItem } from "@/store/image-store";

let counter = 0;
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `img-${Date.now()}-${++counter}-${Math.random().toString(36).slice(2)}`;

function thumbnail(id: string, file: File, mime: string) {
  makeThumbnail(file, mime !== "image/jpeg")
    .then((t) => useImageStore.getState().setThumb(id, t.url, t.width, t.height))
    .catch(() => useImageStore.getState().patchItem(id, { thumbFailed: true }));
}

/** iPhone photos: convert to JPEG once, then treat like any other image. */
async function prepareHeic(item: ImageItem) {
  try {
    const jpeg = await convertHeic(item.file);
    const st = useImageStore.getState();
    if (!st.items.some((i) => i.id === item.id)) return; // removed meanwhile
    st.patchItem(item.id, {
      file: jpeg,
      mime: "image/jpeg",
      previewUrl: URL.createObjectURL(jpeg),
      converting: false,
    });
    thumbnail(item.id, jpeg, "image/jpeg");
  } catch {
    useImageStore.getState().patchItem(item.id, {
      converting: false,
      thumbFailed: true,
      status: "error",
      error: "Could not read this HEIC file",
    });
  }
}

export interface Rejection {
  name: string;
  reason: string;
}

/** Validate files and add them to the workspace. Returns the files that were skipped. */
export function addFilesToWorkspace(files: File[]): Rejection[] {
  const rejected: Rejection[] = [];
  const accepted: ImageItem[] = [];
  let room = MAX_FILES - useImageStore.getState().items.length;
  for (const file of files) {
    const v = validateFile(file);
    if (!v.ok) {
      rejected.push({ name: file.name, reason: v.reason });
      continue;
    }
    if (room <= 0) {
      rejected.push({ name: file.name, reason: `Limit of ${MAX_FILES} images reached` });
      continue;
    }
    room--;
    const heic = v.mime === "image/heic";
    accepted.push({
      id: newId(),
      file,
      name: file.name,
      size: file.size,
      mime: v.mime,
      previewUrl: heic ? "" : URL.createObjectURL(file),
      status: "idle",
      converting: heic,
      edits: NO_EDITS,
      outputs: [],
    });
  }
  if (accepted.length) {
    useImageStore.getState().addItems(accepted);
    for (const it of accepted) {
      if (it.converting) void prepareHeic(it);
      else thumbnail(it.id, it.file, it.mime);
    }
  }
  return rejected;
}

export function DropZone({ compact = false, onRejected }: { compact?: boolean; onRejected: (r: Rejection[]) => void }) {
  const count = useImageStore((s) => s.items.length);
  const running = useImageStore((s) => s.running);

  const onDrop = useCallback((files: File[]) => onRejected(addFilesToWorkspace(files)), [onRejected]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: running,
    // Validation is done by us so users get a clear reason for each skipped file.
    multiple: true,
  });

  const accept = [...ACCEPTED_EXT, "image/jpeg", "image/png", "image/webp"].join(",");

  if (compact) {
    return (
      <div {...getRootProps()} className="contents">
        <input {...getInputProps({ accept })} data-testid="file-input" />
        <button
          type="button"
          onClick={open}
          disabled={running}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-line-strong bg-surface-3 px-3 text-sm hover:bg-[#222226] disabled:opacity-40"
        >
          <ImagePlus className="h-4 w-4" /> Add images
        </button>
        {isDragActive && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="rounded-2xl border-2 border-dashed border-white/60 px-10 py-8 text-lg">Drop to add images</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`relative flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        isDragActive ? "border-white/70 bg-surface-3" : "border-line-strong bg-surface hover:border-faint"
      }`}
    >
      <input {...getInputProps({ accept })} data-testid="file-input" />
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line-strong bg-surface-3">
        <Upload className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-lg font-medium">{isDragActive ? "Drop your images here" : "Upload your images"}</h2>
      <p className="mt-1.5 text-sm text-muted">Drag & drop or choose from your device</p>
      <button
        type="button"
        onClick={open}
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-medium text-black hover:bg-zinc-200"
      >
        Choose files
      </button>
      <p className="mt-5 text-xs text-faint">
        JPG, PNG, WebP, HEIC · up to {MAX_FILE_SIZE_MB} MB each · max {MAX_FILES} images
        {count > 0 ? ` · ${count} added` : ""}
      </p>
    </div>
  );
}
