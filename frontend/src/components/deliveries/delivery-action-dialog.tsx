"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Textarea } from "@/components/ui";

interface DeliveryActionDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function DeliveryActionDialog({
  title,
  description,
  confirmLabel,
  reasonLabel,
  reasonRequired = false,
  busy,
  onConfirm,
  onClose,
}: DeliveryActionDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reasonRequired && !reason.trim()) {
      setError("Enter a reason before continuing.");
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep-navy/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-action-title"
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2
          id="delivery-action-title"
          className="font-heading text-lg font-extrabold text-deep-navy"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-deep-navy/60">
          {description}
        </p>

        {reasonLabel && (
          <div className="mt-5">
            <Textarea
              id="delivery-action-reason"
              label={reasonLabel}
              required={reasonRequired}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError("");
              }}
              rows={3}
              placeholder={reasonRequired ? "Explain what happened" : "Optional"}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
