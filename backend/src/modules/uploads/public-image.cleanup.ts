import { publicImageStorage } from "../../integrations/storage/index.js";

export async function deletePublicImageBestEffort(
  publicId: string | null | undefined,
  context: string,
): Promise<void> {
  if (!publicId) return;
  try {
    await publicImageStorage.deleteImage(publicId);
  } catch (error) {
    console.error(`[public-image] Failed to delete ${context} image ${publicId}:`, error);
  }
}
