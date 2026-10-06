"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminField, TextArea, TextInput } from "@/components/admin/ui/Field";
import ImageUploader from "./ImageUploader";
import WebAddress from "./WebAddress";
import type { ImageRef } from "@/lib/types";

export type EventFormValues = {
  title: string;
  slug: string;
  description: string;
  poster: ImageRef | null;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  ticketUrl: string;
  featured: boolean;
};

const BLANK: EventFormValues = {
  title: "",
  slug: "",
  description: "",
  poster: null,
  startDate: "",
  endDate: "",
  venue: "",
  city: "Accra",
  ticketUrl: "",
  featured: false,
};

export function EventForm({ id, initial }: { id?: string; initial?: EventFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>(initial ?? BLANK);
  /** An address the owner chose in "Change web address" — sent only then. */
  const [requestedSlug, setRequestedSlug] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save() {
    setErrors({});
    setFormError("");

    // Mirrors eventSchema, so the common mistakes never cost a round trip.
    const found: Record<string, string> = {};
    if (values.title.trim().length < 3) found.title = "A title of at least 3 characters.";
    if (values.description.trim().length < 10) found.description = "A description of at least 10 characters.";
    if (!values.startDate) found.startDate = "A start date is required.";
    if (values.venue.trim().length < 2) found.venue = "Where is it?";
    if (!values.poster) found.poster = "A poster image is required.";
    if (Object.keys(found).length) {
      setErrors(found);
      setFormError("Fix the highlighted fields.");
      const first = ["title", "description", "startDate", "venue"].find((k) => found[k]);
      if (first) document.getElementById(first)?.focus();
      return;
    }
    if (!values.poster) return;

    setPending(true);

    const { blurDataURL: _unused, ...poster } = values.poster;

    try {
      const res = await fetch(id ? `/api/admin/events/${id}` : "/api/admin/events", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          ...(requestedSlug ? { slug: requestedSlug } : {}),
          description: values.description,
          poster,
          startDate: values.startDate,
          endDate: values.endDate || null,
          venue: values.venue,
          city: values.city,
          ticketUrl: values.ticketUrl,
          featured: values.featured,
        }),
      });

      if (res.ok) {
        router.push("/admin/events");
        router.refresh();
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
      };
      if (body.fields) setErrors(body.fields);
      setFormError(body.error ?? "Couldn't save.");
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-7">
        <AdminField label="Title" htmlFor="title" error={errors.title}>
          <TextInput
            id="title"
            value={values.title}
            onChange={(e) =>
              setValues((v) => ({ ...v, title: e.target.value }))
            }
            invalid={Boolean(errors.title)}
          />
        </AdminField>

        <WebAddress
          type="event"
          id={id}
          title={values.title}
          slug={values.slug}
          // Events are public from their first save, so the address is locked then.
          live={Boolean(id)}
          followsTitle={!id}
          requested={requestedSlug}
          onRequest={setRequestedSlug}
        />
        {errors.slug ? <p className="a-field-error -mt-4">{errors.slug}</p> : null}

        <AdminField label="Description" htmlFor="description" error={errors.description}>
          <TextArea
            id="description"
            rows={10}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What is it, who is it for, what should people expect?"
            invalid={Boolean(errors.description)}
          />
        </AdminField>

        <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
          <AdminField label="Starts" htmlFor="startDate" error={errors.startDate}>
            <TextInput
              id="startDate"
              type="datetime-local"
              value={values.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              invalid={Boolean(errors.startDate)}
            />
          </AdminField>

          <AdminField label="Ends" htmlFor="endDate" hint="Optional">
            <TextInput
              id="endDate"
              type="datetime-local"
              value={values.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              hint="Optional"
            />
          </AdminField>
        </div>
      </div>

      <aside className="flex flex-col gap-7 lg:sticky lg:top-6 lg:self-start">
        <div>
          <ImageUploader label="Poster" value={values.poster} onChange={(img) => set("poster", img)} />
          {errors.poster ? <p className="a-field-error mt-2">{errors.poster}</p> : null}
        </div>

        <AdminField label="Venue" htmlFor="venue" error={errors.venue}>
          <TextInput
            id="venue"
            value={values.venue}
            onChange={(e) => set("venue", e.target.value)}
            invalid={Boolean(errors.venue)}
          />
        </AdminField>

        <AdminField label="City" htmlFor="city">
          <TextInput id="city" value={values.city} onChange={(e) => set("city", e.target.value)} />
        </AdminField>

        <AdminField label="Ticket URL" htmlFor="ticketUrl" error={errors.ticketUrl} hint="Optional">
          <TextInput
            id="ticketUrl"
            type="url"
            value={values.ticketUrl}
            onChange={(e) => set("ticketUrl", e.target.value)}
            placeholder="https://"
            invalid={Boolean(errors.ticketUrl)}
            hint="Optional"
          />
        </AdminField>

        <label className="a-check">
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(e) => set("featured", e.target.checked)}
          />
          Featured event
        </label>

        {formError ? (
          <p className="a-field-error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="border-t a-border pt-6">
          <button
            type="button"
            className="a-btn a-btn-primary w-full justify-center py-3"
            disabled={pending}
            onClick={save}
          >
            {pending ? "Saving…" : id ? "Update event" : "Create event ↗"}
          </button>
        </div>
      </aside>
    </div>
  );
}

export default EventForm;
