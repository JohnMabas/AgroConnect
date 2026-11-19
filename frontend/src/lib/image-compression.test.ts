import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImageForUpload } from "@/lib/image-compression";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("compressImageForUpload", () => {
  it("downscales and compresses a large photo before upload", async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      ((callback: BlobCallback) => {
        callback(new Blob([new Uint8Array(100)], { type: "image/jpeg" }));
      }) as typeof HTMLCanvasElement.prototype.toBlob,
    );
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({
        width: 4000,
        height: 3000,
        close: vi.fn(),
      }),
    );

    const file = new File(["x"], "phone.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 });

    const compressed = await compressImageForUpload(file);

    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(compressed.size).toBe(100);
    expect(compressed.name).toBe("phone.jpg");
    expect(compressed.type).toBe("image/jpeg");
  });

  it("returns the original file when browser image APIs are unavailable", async () => {
    const file = new File(["x"], "photo.png", { type: "image/png" });

    await expect(compressImageForUpload(file)).resolves.toBe(file);
  });
});
