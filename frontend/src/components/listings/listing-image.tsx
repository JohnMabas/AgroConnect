"use client";

import { createElement, useState } from "react";

interface ListingImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  placeholder?: string;
}

export function ListingImage({
  src,
  alt,
  className,
  loading,
  placeholder = "🌾",
}: ListingImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <span
        className="flex h-full w-full items-center justify-center bg-soft-bg text-3xl"
        role="img"
        aria-label={`${alt || "Photo"} unavailable`}
      >
        {placeholder}
      </span>
    );
  }

  return createElement("img", {
    src,
    alt,
    className,
    loading,
    onError: () => setFailed(true),
  });
}
