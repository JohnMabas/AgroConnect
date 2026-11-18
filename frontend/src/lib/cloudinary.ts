const CLOUDINARY_MARKER = "/image/upload/";

function isTransformSegment(segment: string): boolean {
  if (/^v\d+$/.test(segment)) return false;
  if (/^s--.+--$/.test(segment)) return false;
  return /(?:^|,)[a-z]_[^/,]*|^[a-z]_/.test(segment);
}

export function isCloudinaryUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.includes(CLOUDINARY_MARKER)
    );
  } catch {
    return false;
  }
}

export function transformedImageUrl(
  url: string | null | undefined,
  width: number,
): string | undefined {
  if (!url) return undefined;
  if (!isCloudinaryUrl(url)) return url;

  const parsed = new URL(url);
  const markerIndex = parsed.pathname.indexOf(CLOUDINARY_MARKER);
  if (markerIndex === -1) return url;

  const prefix = parsed.pathname.slice(0, markerIndex + CLOUDINARY_MARKER.length);
  let tail = parsed.pathname.slice(markerIndex + CLOUDINARY_MARKER.length);

  const firstSlash = tail.indexOf("/");
  if (firstSlash > 0) {
    const firstSegment = tail.slice(0, firstSlash);
    if (isTransformSegment(firstSegment)) {
      tail = tail.slice(firstSlash + 1);
    }
  }

  parsed.pathname = `${prefix}f_auto,q_auto,c_limit,w_${width}/${tail}`;
  return parsed.toString();
}

export function thumbnailImageUrl(
  url: string | null | undefined,
): string | undefined {
  return transformedImageUrl(url, 320);
}

export function cardImageUrl(
  url: string | null | undefined,
): string | undefined {
  return transformedImageUrl(url, 640);
}

export function detailImageUrl(
  url: string | null | undefined,
): string | undefined {
  return transformedImageUrl(url, 1200);
}
