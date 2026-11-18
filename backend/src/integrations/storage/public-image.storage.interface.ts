export type PublicImageFolder = "listings" | "produce" | "farms" | "profiles";

export interface SavePublicImageInput {
  folder: PublicImageFolder;
  buffer: Buffer;
  mimeType: string;
  extension: string;
  ownerId?: string;
}

export interface StoredPublicImage {
  imageUrl: string;
  publicId: string;
}

export interface PublicImageStorageAdapter {
  saveImage(input: SavePublicImageInput): Promise<StoredPublicImage>;
  deleteImage(publicId: string): Promise<void>;
}
