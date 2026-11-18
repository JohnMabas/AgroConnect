"use client";

import { useEffect, useState } from "react";
import type { MessageAttachmentData, MessageData } from "@/lib/api";
import {
  formatDateSeparator,
  formatDurationSeconds,
  formatFileSize,
  formatMessageTime,
} from "@/lib/messaging";

interface MessageListProps {
  messages: MessageData[];
  currentUserId: string;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  getAttachmentBlob?: (downloadUrl: string) => Promise<Blob>;
}

function statusLabel(message: MessageData): string {
  if (message.status === "read" || message.read_at) return "Read";
  if (message.status === "delivered" || message.delivered_at) return "Delivered";
  return "Sent";
}

function AttachmentUnavailable({
  mine,
  onRetry,
}: {
  mine: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      className={`flex w-56 flex-col items-start gap-2 rounded-xl border px-3 py-3 text-xs ${
        mine
          ? "border-white/15 bg-white/10 text-white/85"
          : "border-deep-navy/10 bg-soft-bg text-deep-navy/70"
      }`}
    >
      <span>Attachment unavailable</span>
      <button
        type="button"
        onClick={onRetry}
        className={`rounded-full px-3 py-1 font-semibold ${
          mine ? "bg-white/15 text-white hover:bg-white/20" : "bg-white text-agro-green hover:bg-agro-green/10"
        }`}
      >
        Retry
      </button>
    </div>
  );
}

function useAttachmentBlob(
  downloadUrl: string,
  getAttachmentBlob?: (downloadUrl: string) => Promise<Blob>,
) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(!!getAttachmentBlob);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!getAttachmentBlob) {
      setLoading(false);
      setError(false);
      setUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setUrl(null);

    getAttachmentBlob(downloadUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [downloadUrl, getAttachmentBlob, retryNonce]);

  return {
    url,
    error,
    loading,
    retry: () => setRetryNonce((n) => n + 1),
  };
}

function ImageAttachment({
  attachment,
  mine,
  getAttachmentBlob,
}: {
  attachment: MessageAttachmentData;
  mine: boolean;
  getAttachmentBlob?: (downloadUrl: string) => Promise<Blob>;
}) {
  const { url, error, loading, retry } = useAttachmentBlob(
    attachment.download_url,
    getAttachmentBlob,
  );

  return (
    <div className="overflow-hidden rounded-xl border border-black/5">
      {loading ? (
        <div className={`flex h-36 w-56 items-center justify-center text-xs ${mine ? "bg-white/10 text-white/70" : "bg-deep-navy/5 text-deep-navy/45"}`}>
          Loading image…
        </div>
      ) : error || !url ? (
        <AttachmentUnavailable mine={mine} onRetry={retry} />
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={attachment.file_name || "Image attachment"}
            className="max-h-72 w-full max-w-xs object-cover"
            loading="lazy"
          />
        </a>
      )}
      <div className={`px-2 py-1 text-[10px] ${mine ? "text-white/65" : "text-deep-navy/40"}`}>
        {attachment.file_name} · {formatFileSize(attachment.file_size_bytes)}
      </div>
    </div>
  );
}

function AudioAttachment({
  attachment,
  mine,
  getAttachmentBlob,
}: {
  attachment: MessageAttachmentData;
  mine: boolean;
  getAttachmentBlob?: (downloadUrl: string) => Promise<Blob>;
}) {
  const { url, error, loading, retry } = useAttachmentBlob(
    attachment.download_url,
    getAttachmentBlob,
  );
  const [playbackRate, setPlaybackRate] = useState(1);

  return (
    <div className={`w-72 max-w-full rounded-xl border px-3 py-2 ${mine ? "border-white/15 bg-white/10" : "border-deep-navy/8 bg-soft-bg"}`}>
      <div className={`mb-1 flex items-center justify-between gap-2 text-[11px] ${mine ? "text-white/75" : "text-deep-navy/55"}`}>
        <span className="truncate font-medium">Voice message</span>
        <span>{attachment.duration_seconds ? formatDurationSeconds(attachment.duration_seconds) : formatFileSize(attachment.file_size_bytes)}</span>
      </div>
      {loading ? (
        <p className={`text-xs ${mine ? "text-white/70" : "text-deep-navy/45"}`}>Loading audio…</p>
      ) : error || !url ? (
        <AttachmentUnavailable mine={mine} onRetry={retry} />
      ) : (
        <>
          <audio
            controls
            preload="metadata"
            src={url}
            className="h-9 w-full"
            onRateChange={(e) => setPlaybackRate(e.currentTarget.playbackRate)}
            ref={(el) => {
              if (el) el.playbackRate = playbackRate;
            }}
          />
          <div className="mt-1 flex gap-1">
            {[1, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  playbackRate === rate
                    ? mine
                      ? "bg-white text-agro-green"
                      : "bg-agro-green text-white"
                    : mine
                      ? "bg-white/10 text-white/75"
                      : "bg-white text-deep-navy/55"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FileAttachment({
  attachment,
  mine,
  getAttachmentBlob,
}: {
  attachment: MessageAttachmentData;
  mine: boolean;
  getAttachmentBlob?: (downloadUrl: string) => Promise<Blob>;
}) {
  const { url, error, loading, retry } = useAttachmentBlob(
    attachment.download_url,
    getAttachmentBlob,
  );

  return (
    <div className={`w-72 max-w-full rounded-xl border px-3 py-2 ${mine ? "border-white/15 bg-white/10" : "border-deep-navy/8 bg-soft-bg"}`}>
      <div className={`mb-1 truncate text-xs font-medium ${mine ? "text-white" : "text-deep-navy"}`}>
        {attachment.file_name || "Attachment"}
      </div>
      <div className={`mb-2 text-[11px] ${mine ? "text-white/70" : "text-deep-navy/50"}`}>
        {formatFileSize(attachment.file_size_bytes)}
      </div>
      {loading ? (
        <p className={`text-xs ${mine ? "text-white/70" : "text-deep-navy/45"}`}>Loading attachment…</p>
      ) : error || !url ? (
        <AttachmentUnavailable mine={mine} onRetry={retry} />
      ) : (
        <a
          href={url}
          download={attachment.file_name || "attachment"}
          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
            mine ? "bg-white text-agro-green hover:bg-white/90" : "bg-agro-green text-white hover:bg-deep-navy"
          }`}
        >
          Download file
        </a>
      )}
    </div>
  );
}

export function MessageList({
  messages,
  currentUserId,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  getAttachmentBlob,
}: MessageListProps) {
  let currentDay = "";

  return (
    <div className="space-y-4 px-4 py-5 sm:px-6">
      {hasOlder && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onLoadOlder}
            disabled={loadingOlder}
            className="rounded-full border border-deep-navy/15 px-4 py-1.5 text-xs font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/30 hover:text-agro-green disabled:opacity-50"
          >
            {loadingOlder ? "Loading…" : "Load older messages"}
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="py-14 text-center">
          <p className="font-heading text-sm font-bold text-deep-navy">No messages yet</p>
          <p className="mt-1 text-xs text-deep-navy/55">
            Send a message to start the conversation about this listing or request.
          </p>
        </div>
      ) : (
        messages.map((message) => {
          const day = new Date(message.created_at).toDateString();
          const showSeparator = day !== currentDay;
          currentDay = day;
          const mine = message.sender_user_id === currentUserId;
          const attachments = message.attachments ?? [];

          return (
            <div key={message.id}>
              {showSeparator && (
                <div className="mb-4 flex items-center gap-3" role="separator">
                  <span className="h-px flex-1 bg-deep-navy/8" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-deep-navy/40">
                    {formatDateSeparator(message.created_at)}
                  </span>
                  <span className="h-px flex-1 bg-deep-navy/8" />
                </div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[70%] ${
                    mine
                      ? "rounded-br-md bg-agro-green text-white"
                      : "rounded-bl-md border border-deep-navy/8 bg-white text-deep-navy"
                  }`}
                >
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((attachment) => {
                        if (attachment.attachment_type === "image") {
                          return (
                            <ImageAttachment
                              key={attachment.id}
                              attachment={attachment}
                              mine={mine}
                              getAttachmentBlob={getAttachmentBlob}
                            />
                          );
                        }
                        if (attachment.attachment_type === "audio") {
                          return (
                            <AudioAttachment
                              key={attachment.id}
                              attachment={attachment}
                              mine={mine}
                              getAttachmentBlob={getAttachmentBlob}
                            />
                          );
                        }
                        return (
                          <FileAttachment
                            key={attachment.id}
                            attachment={attachment}
                            mine={mine}
                            getAttachmentBlob={getAttachmentBlob}
                          />
                        );
                      })}
                    </div>
                  )}
                  {message.content?.trim() ? (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.content}
                    </p>
                  ) : null}
                  <div
                    className={`mt-1 flex items-center justify-end gap-2 text-[10px] ${
                      mine ? "text-white/70" : "text-deep-navy/40"
                    }`}
                  >
                    <time dateTime={message.created_at}>
                      {formatMessageTime(message.created_at)}
                    </time>
                    {mine && <span aria-label={`Status: ${statusLabel(message)}`}>{statusLabel(message)}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
