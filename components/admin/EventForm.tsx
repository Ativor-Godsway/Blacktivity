"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Input, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import MonoLabel from "@/components/ui/MonoLabel";
import ImageUploader from "./ImageUploader";
import { slugify } from "@/lib/utils";
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
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save() {
    setErrors({});
    setFormError("");

    if (!values.poster) {
      setFormError("A poster image is required.");
      return;
    }
    if (!values.startDate) {
      setFormError("A start date is required.");
      return;
    }

    setPending(true);

    const { blurDataURL: _unused, ...poster } = values.poster;

    try {
      const res = await fetch(id ? `/api/admin/events/${id}` : "/api/admin/events", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          slug: values.slug,
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
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-8">
        <Field label="Title" htmlFor="title" error={errors.title}>
          <Input
            id="title"
            value={values.title}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                title: e.target.value,
                slug: slugTouched ? v.slug : slugify(e.target.value),
              }))
            }
          />
        </Field>

        <Field label="Slug" htmlFor="slug" error={errors.slug} hint="/events/…">
          <Input
            id="slug"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", slugify(e.target.value));
            }}
          />
        </Field>

        <Field label="Description" htmlFor="description" error={errors.description}>
          <Textarea
            id="description"
            rows={10}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What is it, who is it for, what should people expect?"
          />
        </Field>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Field label="Starts" htmlFor="startDate" error={errors.startDate}>
            <Input
              id="startDate"
              type="datetime-local"
              value={values.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>

          <Field label="Ends" htmlFor="endDate" hint="Optional">
            <Input
              id="endDate"
              type="datetime-local"
              value={values.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </Field>
        </div>
      </div>

      <aside className="flex flex-col gap-10 lg:sticky lg:top-24 lg:self-start">
        <ImageUploader label="Poster" value={values.poster} onChange={(img) => set("poster", img)} />

        <Field label="Venue" htmlFor="venue" error={errors.venue}>
          <Input id="venue" value={values.venue} onChange={(e) => set("venue", e.target.value)} />
        </Field>

        <Field label="City" htmlFor="city">
          <Input id="city" value={values.city} onChange={(e) => set("city", e.target.value)} />
        </Field>

        <Field label="Ticket URL" htmlFor="ticketUrl" error={errors.ticketUrl} hint="Optional">
          <Input
            id="ticketUrl"
            type="url"
            value={values.ticketUrl}
            onChange={(e) => set("ticketUrl", e.target.value)}
            placeholder="https://"
          />
        </Field>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(e) => set("featured", e.target.checked)}
            className="size-4 accent-[currentColor]"
          />
          <MonoLabel>Featured event</MonoLabel>
        </label>

        {formError ? (
          <p className="a-meta a-ink" role="alert">
            ↳ {formError}
          </p>
        ) : null}

        <div className="border-t a-border pt-6">
          <Button type="button" disabled={pending} onClick={save} className="w-full">
            {pending ? "Saving…" : id ? "Update event" : "Create event ↗"}
          </Button>
        </div>
      </aside>
    </div>
  );
}

export default EventForm;
