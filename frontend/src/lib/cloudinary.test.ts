import { describe, expect, it } from "vitest";
import {
  cardImageUrl,
  detailImageUrl,
  isCloudinaryUrl,
  thumbnailImageUrl,
  transformedImageUrl,
} from "@/lib/cloudinary";

const VERSIONED =
  "https://res.cloudinary.com/demo/image/upload/v1700000000/agroconnect/listings/tomato.jpg";
const UNVERSIONED =
  "https://res.cloudinary.com/demo/image/upload/agroconnect/profiles/avatar.png";

describe("image URL transformations", () => {
  it("recognises public Cloudinary delivery URLs", () => {
    expect(isCloudinaryUrl(VERSIONED)).toBe(true);
    expect(isCloudinaryUrl("/uploads/listings/tomato.jpg")).toBe(false);
    expect(isCloudinaryUrl(undefined)).toBe(false);
  });

  it("injects automatic format, quality and size variants", () => {
    expect(thumbnailImageUrl(VERSIONED)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_320/v1700000000/agroconnect/listings/tomato.jpg",
    );
    expect(cardImageUrl(VERSIONED)).toContain("w_640/");
    expect(detailImageUrl(VERSIONED)).toContain("w_1200/");
    expect(transformedImageUrl(VERSIONED, 800)).toContain("f_auto,q_auto,c_limit,w_800/");
    expect(transformedImageUrl(UNVERSIONED, 320)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_320/agroconnect/profiles/avatar.png",
    );
  });

  it("leaves legacy and non-Cloudinary URLs untouched", () => {
    expect(cardImageUrl("/uploads/listings/tomato.jpg")).toBe(
      "/uploads/listings/tomato.jpg",
    );
    expect(
      thumbnailImageUrl("https://example.com/images/legacy.jpg?width=200"),
    ).toBe("https://example.com/images/legacy.jpg?width=200");
    expect(thumbnailImageUrl("blob:https://example.com/abc")).toBe(
      "blob:https://example.com/abc",
    );
    expect(thumbnailImageUrl("data:image/png;base64,AAAA")).toBe(
      "data:image/png;base64,AAAA",
    );
    expect(thumbnailImageUrl(null)).toBeUndefined();
  });

  it("preserves Cloudinary public IDs containing underscores", () => {
    expect(
      thumbnailImageUrl(
        "https://res.cloudinary.com/demo/image/upload/my_photos/avatar.png",
      ),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_320/my_photos/avatar.png",
    );
  });

  it("replaces existing transforms without breaking signed URLs", () => {
    expect(
      cardImageUrl(
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/agroconnect/listings/tomato.jpg",
      ),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/agroconnect/listings/tomato.jpg",
    );
    expect(
      thumbnailImageUrl(
        "https://res.cloudinary.com/demo/image/upload/s--abc123--/c_fill,w_400/id.jpg",
      ),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_320/s--abc123--/c_fill,w_400/id.jpg",
    );
  });

  it("preserves query strings on Cloudinary URLs", () => {
    expect(
      transformedImageUrl(
        "https://res.cloudinary.com/demo/image/upload/agroconnect/profiles/avatar.png?x=1",
        640,
      ),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/agroconnect/profiles/avatar.png?x=1",
    );
  });
});
