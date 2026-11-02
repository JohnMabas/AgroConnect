export function getSafeDatabaseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return message
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]")
    .replace(/(password\s*[=:]\s*)\S+/gi, "$1[redacted]")
    .slice(0, 500);
}
