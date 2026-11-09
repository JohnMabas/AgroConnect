/**
 * Normalize user-authored content before storing it. Reviews are stored as
 * plain text, so markup is removed and control characters are stripped. This
 * is not a substitute for output encoding, but it keeps stored content clean.
 */
function stripControlCharacters(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("");
}

export function sanitizePlainText(value: string): string {
  const withoutControls = stripControlCharacters(value);
  const withoutMarkup = withoutControls.replace(/<[^>]*>/g, "");
  return withoutMarkup
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeSingleLineText(value: string): string {
  return sanitizePlainText(value).replace(/\s+/g, " ").trim();
}

export function cleanOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = sanitizePlainText(value);
  return cleaned.length > 0 ? cleaned : null;
}

export function cleanOptionalSingleLine(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = sanitizeSingleLineText(value);
  return cleaned.length > 0 ? cleaned : null;
}
