export type UploadStage =
  | "received"
  | "validated"
  | "cloudinary_start"
  | "cloudinary_end"
  | "db_write"
  | "response_sent"
  | "failed";

export function logUploadStage(
  listingId: string,
  stage: UploadStage,
  details: Record<string, unknown> = {},
): void {
  const line = `[upload] ${JSON.stringify({ listingId, stage, ...details })}`;
  if (stage === "failed") console.error(line);
  else console.log(line);
}
