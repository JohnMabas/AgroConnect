"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  produceApi,
  listingsApi,
  type ProduceCategoryData,
  type ProduceTypeData,
  type ApiError,
} from "@/lib/api";
import {
  EMPTY_LISTING_FORM,
  LISTING_UNITS,
  MAX_IMAGES_PER_LISTING,
  isImageWithinSizeLimit,
  isSupportedImageType,
  listingFormToPayload,
  validateListingForm,
  type ListingFormValues,
} from "@/lib/listing-form";

// ─── Constants ────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateListingPage() {
  const router = useRouter();
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [categories, setCategories] = useState<ProduceCategoryData[]>([]);
  const [produceTypes, setProduceTypes] = useState<ProduceTypeData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Derive filtered types without a separate effect
  const filteredTypes = useMemo(
    () =>
      selectedCategory
        ? produceTypes.filter((t) => t.category_id === selectedCategory)
        : produceTypes,
    [selectedCategory, produceTypes],
  );

  const [form, setForm] = useState<ListingFormValues>(EMPTY_LISTING_FORM);
  const [images, setImages] = useState<Array<{ file: File; preview: string }>>(
    [],
  );
  const imagesRef = useRef(images);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Load categories and all types
  useEffect(() => {
    async function loadCatalogue() {
      try {
        const [catRes, typeRes] = await Promise.all([
          produceApi.getCategories(),
          produceApi.getTypes(),
        ]);
        setCategories(catRes.data.categories.filter((c) => c.is_active));
        setProduceTypes(typeRes.data.types.filter((t) => t.is_active));
      } catch {
        // non-fatal — form still usable but dropdowns empty
      }
    }
    void loadCatalogue();
  }, []);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setSaveError("");
  }

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview));
    };
  }, []);

  function addImageFiles(files: FileList | null) {
    if (!files) return;
    const accepted: Array<{ file: File; preview: string }> = [];
    for (const file of Array.from(files)) {
      if (images.length + accepted.length >= MAX_IMAGES_PER_LISTING) break;
      if (!isSupportedImageType(file.type)) {
        setSaveError("Only image files can be uploaded.");
        continue;
      }
      if (!isImageWithinSizeLimit(file.size)) {
        setSaveError(`${file.name} is larger than the 5 MB limit.`);
        continue;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
    }
    if (accepted.length > 0) {
      setImages((prev) => [...prev, ...accepted]);
      setSaveError("");
    }
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: FormEvent, publish: boolean) {
    e.preventDefault();
    const errs = validateListingForm(form);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    if (!token) return;
    setSaving(true);
    setSaveError("");
    let createdId: string | null = null;
    try {
      const payload = listingFormToPayload(form);
      const createRes = await listingsApi.create(token, payload);
      createdId = createRes.data.listing.id;

      for (const image of images) {
        await listingsApi.addImage(token, createdId, image.file);
      }

      if (publish) {
        await listingsApi.publish(token, createdId);
      }

      router.push("/farmer/listings");
    } catch (err) {
      if (createdId) {
        setSaveError(
          "Your listing was saved as a draft, but the remaining images could not be uploaded. Add them from the edit page.",
        );
        router.push(`/farmer/listings/${createdId}/edit`);
        return;
      }
      const apiErr = err as ApiError;
      if (apiErr.errors && apiErr.errors.length > 0) {
        const errsFromApi: Record<string, string> = {};
        apiErr.errors.forEach(({ field, message }) => {
          errsFromApi[field] = message;
        });
        setFieldErrors(errsFromApi);
      } else {
        setSaveError(apiErr.message ?? "Failed to create listing.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Create Listing
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          List your produce for buyers on AgroConnect.
        </p>
      </div>

      <form noValidate className="space-y-6">
        {saveError && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {/* Section 1: Produce type */}
        <Section title="Produce Type">
          <div>
            <label htmlFor="category_select" className={labelClass}>
              Category
            </label>
            <select
              id="category_select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={inputClass}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="produce_type_id" className={labelClass}>
              Produce type <Required />
            </label>
            <select
              id="produce_type_id"
              name="produce_type_id"
              value={form.produce_type_id}
              onChange={handleChange}
              className={`${inputClass} ${fieldErrors.produce_type_id ? "border-red-400" : ""}`}
            >
              <option value="">Select produce type…</option>
              {filteredTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <FieldError msg={fieldErrors.produce_type_id} />
          </div>
        </Section>

        {/* Section 2: Listing details */}
        <Section title="Listing Details">
          <div>
            <label htmlFor="title" className={labelClass}>
              Title <Required />
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Fresh Tomatoes — Large Grade A"
              className={`${inputClass} ${fieldErrors.title ? "border-red-400" : ""}`}
            />
            <FieldError msg={fieldErrors.title} />
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe your produce…"
              className="w-full resize-y rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="variety" className={labelClass}>
                Variety
              </label>
              <input
                id="variety"
                name="variety"
                type="text"
                value={form.variety}
                onChange={handleChange}
                placeholder="Roma"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="grade" className={labelClass}>
                Grade
              </label>
              <input
                id="grade"
                name="grade"
                type="text"
                value={form.grade}
                onChange={handleChange}
                placeholder="Grade A"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="packaging_description" className={labelClass}>
                Packaging
              </label>
              <input
                id="packaging_description"
                name="packaging_description"
                type="text"
                value={form.packaging_description}
                onChange={handleChange}
                placeholder="Sold in 50 kg woven bags"
                className={inputClass}
              />
            </div>
          </div>
        </Section>

        {/* Section 3: Quantity & pricing */}
        <Section title="Quantity &amp; Pricing">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="quantity" className={labelClass}>
                Quantity <Required />
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min={0}
                step="0.001"
                value={form.quantity}
                onChange={handleChange}
                placeholder="500"
                className={`${inputClass} ${fieldErrors.quantity ? "border-red-400" : ""}`}
              />
              <FieldError msg={fieldErrors.quantity} />
            </div>
            <div>
              <label htmlFor="unit" className={labelClass}>
                Unit <Required />
              </label>
              <select
                id="unit"
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className={`${inputClass} ${fieldErrors.unit ? "border-red-400" : ""}`}
              >
                {LISTING_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <FieldError msg={fieldErrors.unit} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="price_per_unit" className={labelClass}>
                Price per unit <Required />
              </label>
              <input
                id="price_per_unit"
                name="price_per_unit"
                type="number"
                min={0}
                step="0.01"
                value={form.price_per_unit}
                onChange={handleChange}
                placeholder="1500"
                className={`${inputClass} ${fieldErrors.price_per_unit ? "border-red-400" : ""}`}
              />
              <FieldError msg={fieldErrors.price_per_unit} />
            </div>
            <div>
              <label htmlFor="currency" className={labelClass}>
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="NGN">NGN — Nigerian Naira</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Section 4: Location */}
        <Section title="Location">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="country" className={labelClass}>
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                value={form.country}
                onChange={handleChange}
                placeholder="Nigeria"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="state_or_region" className={labelClass}>
                State / Region
              </label>
              <input
                id="state_or_region"
                name="state_or_region"
                type="text"
                value={form.state_or_region}
                onChange={handleChange}
                placeholder="Plateau State"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="local_government_area" className={labelClass}>
                LGA
              </label>
              <input
                id="local_government_area"
                name="local_government_area"
                type="text"
                value={form.local_government_area}
                onChange={handleChange}
                placeholder="Jos North"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="community" className={labelClass}>
                Community
              </label>
              <input
                id="community"
                name="community"
                type="text"
                value={form.community}
                onChange={handleChange}
                placeholder="Tudun Wada"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="collection_location" className={labelClass}>
              Collection / pickup location
            </label>
            <input
              id="collection_location"
              name="collection_location"
              type="text"
              value={form.collection_location}
              onChange={handleChange}
              placeholder="Farm gate, Zaria Road"
              className={inputClass}
            />
          </div>
        </Section>

        {/* Section 5: Dates */}
        <Section title="Dates">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="harvest_date" className={labelClass}>
                Harvest date
              </label>
              <input
                id="harvest_date"
                name="harvest_date"
                type="date"
                value={form.harvest_date}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="available_from" className={labelClass}>
                Available from
              </label>
              <input
                id="available_from"
                name="available_from"
                type="date"
                value={form.available_from}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="expiry_date" className={labelClass}>
                Expiry date
              </label>
              <input
                id="expiry_date"
                name="expiry_date"
                type="date"
                value={form.expiry_date}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </Section>

        {/* Section 6: Images */}
        <Section title="Images">
          <p className="text-xs text-deep-navy/50 bg-harvest-gold/10 rounded-lg px-3 py-2">
            Upload up to 5 JPEG, PNG or WebP images (maximum 5 MB each). The
            first image becomes the primary photo.
          </p>
          <label className={labelClass} htmlFor="listing_images">
            Add photos
          </label>
          <input
            id="listing_images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={images.length >= MAX_IMAGES_PER_LISTING}
            onChange={(event) => {
              addImageFiles(event.target.files);
              event.target.value = "";
            }}
            className="block w-full cursor-pointer rounded-xl border border-dashed border-deep-navy/25 bg-soft-bg px-4 py-6 text-sm text-deep-navy/60 file:mr-4 file:rounded-full file:border-0 file:bg-agro-green file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
          />
          {images.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((image, index) => (
                <li
                  key={image.preview}
                  className="relative overflow-hidden rounded-xl border border-deep-navy/10 bg-soft-bg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.preview}
                    alt={`Selected photo ${index + 1}`}
                    className="h-28 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-red-600 shadow-sm hover:bg-white"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    Remove
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-agro-green px-2 py-0.5 text-xs font-semibold text-white">
                      Primary
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={saving}
            onClick={(e) => handleSubmit(e as unknown as FormEvent, false)}
            className="flex-1 rounded-full border border-deep-navy/20 px-5 py-3 text-sm font-semibold text-deep-navy transition-colors hover:bg-deep-navy/5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save as Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={(e) => handleSubmit(e as unknown as FormEvent, true)}
            className="flex-1 rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Publishing…" : "Save and Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Sub-components ────────────────────────────────────────────────────────────

const labelClass = "mb-1.5 block text-sm font-semibold text-deep-navy";

function Required() {
  return <span className="text-red-500 ml-0.5">*</span>;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm space-y-4">
      <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-deep-navy/10 bg-white p-6 space-y-4"
        >
          <div className="h-4 w-24 rounded bg-deep-navy/10" />
          <div className="h-10 rounded-xl bg-deep-navy/5" />
          <div className="h-10 rounded-xl bg-deep-navy/5" />
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm text-red-700">{message}</p>
      <a
        href="/login"
        className="mt-4 block text-sm font-semibold text-agro-green hover:underline"
      >
        Return to login
      </a>
    </div>
  );
}
