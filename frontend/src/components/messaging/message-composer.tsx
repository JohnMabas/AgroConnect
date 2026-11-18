"use client";

import { useEffect, useRef, useState } from "react";
import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE,
  MESSAGE_MEDIA_MAX_AUDIO_SIZE_BYTES,
  MESSAGE_MEDIA_MAX_IMAGE_SIZE_BYTES,
} from "@/lib/api";
import { formatFileSize } from "@/lib/messaging";

type RecordState = "idle" | "recording" | "recorded";

interface AttachmentItem {
  file: File;
  previewUrl: string | null;
}

interface MessageComposerProps {
  onSendText: (content: string) => Promise<void>;
  onSendFiles: (files: File[], content?: string) => Promise<void>;
  disabled?: boolean;
}

function pickAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionForMime(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") && /(jpeg|jpg|png|webp)$/i.test(file.type);
}

export function MessageComposer({
  onSendText,
  onSendFiles,
  disabled = false,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordMime, setRecordMime] = useState<string | undefined>(undefined);

  const inFlight = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const attachmentsRef = useRef<AttachmentItem[]>([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const trimmed = value.trim();
  const tooLong = value.length > MESSAGE_MAX_LENGTH;
  const canSend =
    (trimmed.length > 0 || attachments.length > 0) &&
    !tooLong &&
    !sending &&
    !disabled &&
    recordState !== "recording";
  const canAttachMore =
    attachments.length < MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE && !sending && !disabled;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      for (const item of attachmentsRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, [recordedUrl]);

  function clearRecorded() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordState("idle");
    setRecordSeconds(0);
  }

  function removeAttachment(index: number) {
    setAttachments((current) => {
      const item = current[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  function clearAttachments() {
    setAttachments((current) => {
      for (const item of current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
  }

  function validateAndAddFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const next = [...attachments];
    let nextError = "";
    for (const file of list) {
      if (next.length >= MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE) {
        nextError = `You can attach up to ${MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE} files.`;
        break;
      }
      const isImage = isImageFile(file);
      const isAudio = file.type.startsWith("audio/") || file.type === "video/webm";
      if (!isImage && !isAudio) {
        nextError = "Only JPEG, PNG, WebP images and supported audio files can be attached.";
        continue;
      }
      if (isImage && file.size > MESSAGE_MEDIA_MAX_IMAGE_SIZE_BYTES) {
        nextError = `Image "${file.name}" is too large (max ${formatFileSize(MESSAGE_MEDIA_MAX_IMAGE_SIZE_BYTES)}).`;
        continue;
      }
      if (isAudio && file.size > MESSAGE_MEDIA_MAX_AUDIO_SIZE_BYTES) {
        nextError = `Audio "${file.name}" is too large (max ${formatFileSize(MESSAGE_MEDIA_MAX_AUDIO_SIZE_BYTES)}).`;
        continue;
      }
      next.push({
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : null,
      });
    }
    if (nextError) setError(nextError);
    setAttachments(next);
  }

  async function submit() {
    if (!canSend || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setError("");
    try {
      if (attachments.length > 0) {
        await onSendFiles(attachments.map((item) => item.file), trimmed || undefined);
        clearAttachments();
      } else {
        await onSendText(trimmed);
      }
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message could not be sent.");
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  async function startRecording() {
    if (disabled || sending || recordState === "recording") return;
    setError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickAudioMimeType();
      setRecordMime(mime);
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (blob.size === 0) {
          setError("Recording was empty. Please try again.");
          setRecordState("idle");
          return;
        }
        if (blob.size > MESSAGE_MEDIA_MAX_AUDIO_SIZE_BYTES) {
          setError(`Voice message is too large (max ${formatFileSize(MESSAGE_MEDIA_MAX_AUDIO_SIZE_BYTES)}).`);
          setRecordState("idle");
          return;
        }
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setRecordState("recorded");
      };
      recorder.start();
      setRecordState("recording");
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone permission was denied. Allow access to record a voice message.");
      } else {
        setError("Could not start voice recording. Please try again.");
      }
      setRecordState("idle");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  async function sendRecording() {
    if (!recordedBlob || inFlight.current) return;
    if (attachments.length >= MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE) {
      setError(`You can attach up to ${MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE} files.`);
      return;
    }
    inFlight.current = true;
    setSending(true);
    setError("");
    try {
      const mime = recordedBlob.type || recordMime || "audio/webm";
      const file = new File([recordedBlob], `voice-message.${extensionForMime(mime)}`, { type: mime });
      await onSendFiles([file], trimmed || undefined);
      setValue("");
      clearRecorded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice message could not be sent.");
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <div className="border-t border-deep-navy/8 bg-white px-4 py-3 sm:px-5">
      {error && (
        <div role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((item, index) => (
            <div key={`${item.file.name}-${index}`} className="relative flex w-40 flex-col overflow-hidden rounded-lg border border-deep-navy/10 bg-soft-bg text-xs text-deep-navy/70">
              {item.previewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.previewUrl}
                  alt={`Preview of ${item.file.name}`}
                  className="h-24 w-full object-cover"
                />
              ) : (
                <div className="flex h-24 items-center justify-center bg-deep-navy/5 px-2 text-center text-[11px] text-deep-navy/55">
                  Audio attachment
                </div>
              )}
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                <span className="shrink-0 text-[10px] text-deep-navy/40">{formatFileSize(item.file.size)}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="ml-1 shrink-0 font-bold text-deep-navy/45 hover:text-red-600"
                  aria-label={`Remove ${item.file.name}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {recordState !== "idle" && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-deep-navy/10 bg-soft-bg px-3 py-2 text-xs text-deep-navy/70">
          {recordState === "recording" ? (
            <>
              <span className="font-semibold text-red-600">Recording… {recordSeconds}s</span>
              <button type="button" onClick={stopRecording} className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white">
                Stop
              </button>
            </>
          ) : recordedUrl ? (
            <>
              <audio controls src={recordedUrl} className="h-8 max-w-xs" />
              <button type="button" onClick={() => void sendRecording()} disabled={sending} className="rounded-full bg-agro-green px-3 py-1 font-semibold text-white disabled:opacity-50">
                {sending ? "Sending…" : "Send voice message"}
              </button>
              <button type="button" onClick={clearRecorded} className="font-semibold text-deep-navy/55 hover:text-deep-navy">
                Discard
              </button>
            </>
          ) : null}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,audio/*,.webm,.ogg,.mp3,.wav,.m4a,.mp4"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) validateAndAddFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAttachMore || recordState === "recording"}
          title="Attach image or audio"
          aria-label="Attach image or audio"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-deep-navy/12 text-deep-navy/55 transition-colors hover:border-agro-green/30 hover:text-agro-green disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => void startRecording()}
          disabled={disabled || sending || recordState === "recording" || attachments.length >= MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE}
          title="Record voice message"
          aria-label="Record voice message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-deep-navy/12 text-deep-navy/55 transition-colors hover:border-agro-green/30 hover:text-agro-green disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
            <path d="M5 8a1 1 0 112 0 3 3 0 006 0 1 1 0 112 0 5 5 0 01-4 4.9V15h2a1 1 0 110 2H7a1 1 0 110-2h2v-2.1A5 5 0 015 8z" />
          </svg>
        </button>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit();
            }
          }}
          rows={2}
          maxLength={MESSAGE_MAX_LENGTH + 1}
          placeholder={attachments.length > 0 ? "Add a message (optional)…" : "Write a message…"}
          aria-label="Message"
          disabled={disabled}
          className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-deep-navy/12 bg-soft-bg px-3 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 focus:border-agro-green focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSend}
          className="flex h-11 shrink-0 items-center justify-center rounded-full bg-agro-green px-5 text-sm font-bold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-45"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-deep-navy/40">
        <span>Enter to send · Shift + Enter for a new line</span>
        {value.length > 0 && (
          <span className={tooLong ? "font-semibold text-red-600" : undefined}>
            {value.length}/{MESSAGE_MAX_LENGTH}
          </span>
        )}
      </div>
    </div>
  );
}
