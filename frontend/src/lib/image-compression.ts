const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIMENSION = 1600;
const MAX_BYTES = 500 * 1024;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  if (typeof canvas.toBlob !== "function") return Promise.resolve(null);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function outputName(name: string, type: string): string {
  const extension =
    type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  return `${name.replace(/\.[^.]+$/, "")}.${extension}`;
}

export async function compressImageForUpload(file: File): Promise<File> {
  if (!ALLOWED_TYPES.includes(file.type)) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close?.();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let blob: Blob | null = null;
  for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45]) {
    blob = await canvasToBlob(canvas, file.type, quality);
    if (blob && blob.size <= MAX_BYTES) break;
  }
  if (!blob || blob.size > MAX_BYTES) {
    for (const quality of [0.7, 0.55, 0.4]) {
      blob = await canvasToBlob(canvas, "image/webp", quality);
      if (blob && blob.size <= MAX_BYTES) break;
    }
  }
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], outputName(file.name, blob.type), {
    type: blob.type,
  });
}
