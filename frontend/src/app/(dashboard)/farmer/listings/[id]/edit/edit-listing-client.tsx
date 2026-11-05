"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  listingsApi,
  mediaUrl,
  type ApiError,
  type ListingData,
  type ListingImageData,
} from "@/lib/api";
import {
  LISTING_UNITS,
  MAX_IMAGES_PER_LISTING,
  isImageWithinSizeLimit,
  isSupportedImageType,
  listingFormToPayload,
  listingToFormValues,
  validateListingForm,
  type ListingFormValues,
} from "@/lib/listing-form";

const inputClass =
  "mt-1 w-full rounded-xl border border-deep-navy/20 bg-white px-3 py-2 text-sm text-deep-navy outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30 disabled:bg-deep-navy/5";

export default function EditListingClient({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [listing, setListing] = useState<ListingData | null>(null);
  const [form, setForm] = useState<ListingFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyImage, setBusyImage] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imageUrl, setImageUrl] = useState("");
  const [showUrlFallback, setShowUrlFallback] = useState(false);

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const res = await listingsApi.getById(listingId, token!);
        setListing(res.data.listing);
        setForm(listingToFormValues(res.data.listing));
      } catch {
        setError("Listing not found or you do not have access to it.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [listingId, token]);

  const canEdit =
    listing?.status === "draft" || listing?.status === "paused";
  const images = listing?.images ?? [];

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !listing || !form) return;

    const nextErrors = validateListingForm(form, {
      requireProduceType: false,
    });
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await listingsApi.update(token, listing.id, listingFormToPayload(form));
      router.push("/farmer/listings");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors?.length) {
        const fromApi: Record<string, string> = {};
        apiErr.errors.forEach(({ field, message }) => {
          fromApi[field] = message;
        });
        setFieldErrors(fromApi);
      }
      setError(
        apiErr.message ??
          "Unable to save. Published listings must be paused before editing.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function pauseListing() {
    if (!token || !listing) return;
    setSaving(true);
    setError("");
    try {
      const res = await listingsApi.pause(token, listing.id);
      setListing(res.data.listing);
      setForm(listingToFormValues(res.data.listing));
    } catch (err) {
      setError((err as ApiError).message ?? "Unable to pause this listing.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshListing() {
    if (!token || !listing) return;
    const res = await listingsApi.getById(listing.id, token);
    setListing(res.data.listing);
    setForm(listingToFormValues(res.data.listing));
  }

  async function uploadImages(files: FileList | null) {
    if (!files || !token || !listing) return;
    const availableSlots = MAX_IMAGES_PER_LISTING - images.length;
    if (availableSlots <= 0) {
      setError(`This listing already has the maximum of ${MAX_IMAGES_PER_LISTING} images.`);
      return;
    }

    setBusyImage(true);
    setError("");
    try {
      for (const file of Array.from(files).slice(0, availableSlots)) {
        if (!isSupportedImageType(file.type)) {
          throw new Error(`${file.name} is not a supported image type.`);
        }
        if (!isImageWithinSizeLimit(file.size)) {
          throw new Error(`${file.name} is larger than the 5 MB limit.`);
        }
        await listingsApi.addImage(token, listing.id, file);
      }
      await refreshListing();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The image could not be uploaded.",
      );
    } finally {
      setBusyImage(false);
    }
  }

  async function addImageByUrl() {
    if (!token || !listing || !imageUrl.trim()) return;
    setBusyImage(true);
    setError("");
    try {
      await listingsApi.addImage(token, listing.id, imageUrl.trim());
      setImageUrl("");
      await refreshListing();
    } catch (err) {
      setError((err as ApiError).message ?? "The image URL could not be added.");
    } finally {
      setBusyImage(false);
    }
  }

  async function deleteImage(image: ListingImageData) {
    if (!token || !listing) return;
    if (!confirm("Remove this image?")) return;
    setBusyImage(true);
    setError("");
    try {
      await listingsApi.deleteImage(token, listing.id, image.id);
      await refreshListing();
    } catch (err) {
      setError((err as ApiError).message ?? "The image could not be removed.");
    } finally {
      setBusyImage(false);
    }
  }

  async function setPrimary(image: ListingImageData) {
    if (!token || !listing || image.is_primary) return;
    setBusyImage(true);
    setError("");
    try {
      await listingsApi.setPrimaryImage(token, listing.id, image.id);
      await refreshListing();
    } catch (err) {
      setError(
        (err as ApiError).message ?? "The primary image could not be updated.",
      );
    } finally {
      setBusyImage(false);
    }
  }

  if (authLoading || loading) {
    return <p className="p-8 text-deep-navy/60">Loading listing…</p>;
  }

  if (authError || error === "Listing not found or you do not have access to it.") {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">
          {authError || error || "Listing not found."}
        </p>
        <Link
          href="/farmer/listings"
          className="mt-4 inline-block text-sm font-semibold text-agro-green hover:underline"
        >
          Back to my listings
        </Link>
      </div>
    );
  }

  if (!listing || !form) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
            Edit Listing
          </h1>
          <p className="text-sm text-deep-navy/60">
            {listing.produce_type?.name ?? "Produce"} ·{" "}
            <span className="capitalize">{listing.status.replace("_", " ")}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {listing.status === "published" && (
            <Link
              href={`/produce/listings/${listing.id}`}
              className="rounded-full border border-deep-navy/20 px-4 py-2 text-sm font-semibold text-deep-navy/70 hover:bg-deep-navy/5"
            >
              View public page
            </Link>
          )}
          <Link
            href="/farmer/listings"
            className="rounded-full border border-deep-navy/20 px-4 py-2 text-sm font-semibold text-deep-navy/70 hover:bg-deep-navy/5"
          >
            Back
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {listing.status === "published" && (
        <div className="rounded-2xl border border-harvest-gold/30 bg-harvest-gold/10 p-4">
          <p className="text-sm text-deep-navy/75">
            This listing is published. Pause it before changing details or
            quantity.
          </p>
          <button
            type="button"
            onClick={() => void pauseListing()}
            disabled={saving}
            className="mt-3 rounded-full bg-harvest-gold px-4 py-2 text-sm font-semibold text-deep-navy disabled:opacity-60"
          >
            {saving ? "Pausing…" : "Pause listing"}
          </button>
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <section className="grid gap-4 rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm sm:grid-cols-2">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50 sm:col-span-2">
            Listing details
          </h2>
          <label className="text-sm font-medium text-deep-navy sm:col-span-2">
            Title
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
            {fieldErrors.title && (
              <span className="mt-1 block text-xs text-red-600">
                {fieldErrors.title}
              </span>
            )}
          </label>
          <label className="text-sm font-medium text-deep-navy sm:col-span-2">
            Description
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-deep-navy">
            Variety
            <input
              name="variety"
              value={form.variety}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-deep-navy">
            Grade
            <input
              name="grade"
              value={form.grade}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-deep-navy sm:col-span-2">
            Packaging
            <input
              name="packaging_description"
              value={form.packaging_description}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
        </section>

        <section className="grid gap-4 rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm sm:grid-cols-2">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50 sm:col-span-2">
            Quantity and pricing
          </h2>
          <label className="text-sm font-medium text-deep-navy">
            Quantity
            <input
              name="quantity"
              type="number"
              min="0.001"
              step="0.001"
              value={form.quantity}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
            {fieldErrors.quantity && (
              <span className="mt-1 block text-xs text-red-600">
                {fieldErrors.quantity}
              </span>
            )}
          </label>
          <label className="text-sm font-medium text-deep-navy">
            Unit
            <select
              name="unit"
              value={form.unit}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            >
              {LISTING_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-deep-navy">
            Price per unit
            <input
              name="price_per_unit"
              type="number"
              min="0"
              step="0.01"
              value={form.price_per_unit}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
            {fieldErrors.price_per_unit && (
              <span className="mt-1 block text-xs text-red-600">
                {fieldErrors.price_per_unit}
              </span>
            )}
          </label>
          <label className="text-sm font-medium text-deep-navy">
            Currency
            <select
              name="currency"
              value={form.currency}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            >
              <option value="NGN">NGN — Nigerian Naira</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </label>
        </section>

        <section className="grid gap-4 rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm sm:grid-cols-2">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50 sm:col-span-2">
            Location and dates
          </h2>
          <label className="text-sm font-medium text-deep-navy">
            Country
            <input
              name="country"
              value={form.country}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-deep-navy">
            State / region
            <input
              name="state_or_region"
              value={form.state_or_region}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-deep-navy">
            Local government area
            <input
              name="local_government_area"
              value={form.local_government_area}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-deep-navy">
            Community
            <input
              name="community"
              value={form.community}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-deep-navy sm:col-span-2">
            Collection location
            <input
              name="collection_location"
              value={form.collection_location}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-deep-navy">
            Harvest date
            <input
              name="harvest_date"
              type="date"
              value={form.harvest_date}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-deep-navy">
            Available from
            <input
              name="available_from"
              type="date"
              value={form.available_from}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-deep-navy">
            Expiry date
            <input
              name="expiry_date"
              type="date"
              value={form.expiry_date}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputClass}
            />
          </label>
        </section>

        {canEdit && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </form>

      <section className="space-y-4 rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50">
            Photos ({images.length}/5)
          </h2>
          <p className="mt-1 text-xs text-deep-navy/55">
            JPEG, PNG or WebP, up to 5 MB each. The primary photo is shown in
            the catalogue.
          </p>
        </div>

        {images.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <li
                key={image.id}
                className="overflow-hidden rounded-xl border border-deep-navy/10 bg-soft-bg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(image.image_url)}
                  alt={`Listing photo ${image.display_order + 1}`}
                  className="h-32 w-full object-cover"
                />
                <div className="flex flex-wrap gap-2 p-2">
                  <button
                    type="button"
                    disabled={busyImage || image.is_primary}
                    onClick={() => void setPrimary(image)}
                    className="rounded-full border border-deep-navy/20 px-2.5 py-1 text-xs font-semibold text-deep-navy/70 disabled:opacity-50"
                  >
                    {image.is_primary ? "Primary" : "Make primary"}
                  </button>
                  <button
                    type="button"
                    disabled={busyImage}
                    onClick={() => void deleteImage(image)}
                    className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-deep-navy/60">No photos uploaded yet.</p>
        )}

        {images.length < 5 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-deep-navy">
              Add photos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={busyImage}
                onChange={(event) => {
                  void uploadImages(event.target.files);
                  event.target.value = "";
                }}
                className="mt-1 block w-full cursor-pointer rounded-xl border border-dashed border-deep-navy/25 bg-soft-bg px-4 py-5 text-sm text-deep-navy/60 file:mr-4 file:rounded-full file:border-0 file:bg-agro-green file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-deep-navy disabled:opacity-60"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowUrlFallback((value) => !value)}
              className="text-xs font-semibold text-agro-green hover:underline"
            >
              {showUrlFallback ? "Hide URL option" : "Add an image by URL instead"}
            </button>

            {showUrlFallback && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://example.com/produce.jpg"
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={busyImage || !imageUrl.trim()}
                  onClick={() => void addImageByUrl()}
                  className="shrink-0 rounded-full bg-deep-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Add URL
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
