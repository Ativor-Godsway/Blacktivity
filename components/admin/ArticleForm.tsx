"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import MonoLabel from "@/components/ui/MonoLabel";
import ImageUploader from "./ImageUploader";
import TiptapContent from "@/lib/tiptap-render";
import { ARTICLE_CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import type { ImageRef } from "@/lib/types";

// The editor pulls in ProseMirror — keep it out of the initial admin bundle.
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <div className="min-h-[50vh] animate-pulse bg-[var(--admin-hover)]" />,
});

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export type ArticleFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: unknown;
  coverImage: ImageRef | null;
  category: string;
  tags: string;
  authorName: string;
  authorIg: string;
  featured: boolean;
};

const BLANK: ArticleFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: EMPTY_DOC,
  coverImage: null,
  category: "Culture",
  tags: "",
  authorName: "",
  authorIg: "",
  featured: false,
};

export function ArticleForm({
  id,
  initial,
  initialStatus = "draft",
}: {
  id?: string;
  initial?: ArticleFormValues;
  initialStatus?: "draft" | "published";
}) {
  const router = useRouter();
  const draftKey = `blacktivity:article-draft:${id ?? "new"}`;

  const [values, setValues] = useState<ArticleFormValues>(initial ?? BLANK);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState<"draft" | "published" | null>(null);
  const [preview, setPreview] = useState(false);
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");

  const set = useCallback(<K extends keyof ArticleFormValues>(key: K, value: ArticleFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  }, []);

  // Autosave to localStorage so a dropped connection never loses a post.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      try {
        const stored = localStorage.getItem(draftKey);
        if (stored && !initial) {
          setValues(JSON.parse(stored) as ArticleFormValues);
          setRestored(true);
        }
      } catch {
        // Storage unavailable — autosave is a convenience, not a requirement.
      }
      return;
    }

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(values));
        setSavedAt(new Date().toLocaleTimeString());
      } catch {
        /* ignore */
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [values, draftKey, initial]);

  function onTitleChange(title: string) {
    setValues((v) => ({
      ...v,
      title,
      slug: slugTouched ? v.slug : slugify(title),
    }));
  }

  async function save(status: "draft" | "published") {
    setErrors({});
    setFormError("");

    if (!values.coverImage) {
      setFormError("A cover image is required.");
      return;
    }

    setPending(status);

    const payload = {
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt,
      content: values.content,
      coverImage: values.coverImage,
      category: values.category,
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      author: { name: values.authorName, igHandle: values.authorIg.replace(/^@/, "") },
      status,
      featured: values.featured,
    };

    try {
      const res = await fetch(id ? `/api/admin/articles/${id}` : "/api/admin/articles", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          /* ignore */
        }
        router.push("/admin/articles");
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
      setFormError("Network error — your draft is saved locally.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        {restored ? (
          <p className="a-meta mb-6 border border-[var(--admin-rule)] px-4 py-3 a-muted">
            ↳ Restored an unsaved draft from this browser.
          </p>
        ) : null}

        <div className="flex flex-col gap-8">
          <Field label="Title" htmlFor="title" error={errors.title}>
            <Input
              id="title"
              value={values.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="The headline is the artwork"
            />
          </Field>

          <Field label="Slug" htmlFor="slug" error={errors.slug} hint="/articles/…">
            <Input
              id="slug"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
            />
          </Field>

          <Field
            label="Excerpt"
            htmlFor="excerpt"
            error={errors.excerpt}
            hint={`${values.excerpt.length} / 200 — used on cards and as the meta description`}
          >
            <Textarea
              id="excerpt"
              rows={3}
              maxLength={200}
              value={values.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-12 border-t border-[var(--admin-rule)] pt-6">
          <div className="flex items-center justify-between">
            <MonoLabel dim>Body</MonoLabel>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="a-meta a-muted hover:text-[var(--admin-ink)]"
            >
              {preview ? "Back to editing" : "Preview ↗"}
            </button>
          </div>

          {preview ? (
            <div className="prose-editorial py-8">
              <TiptapContent content={values.content} />
            </div>
          ) : (
            <Editor content={values.content} onChange={(json) => set("content", json)} />
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-10 lg:sticky lg:top-24 lg:self-start">
        <ImageUploader value={values.coverImage} onChange={(img) => set("coverImage", img)} />

        <Field label="Category" htmlFor="category" error={errors.category}>
          <Select
            id="category"
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {ARTICLE_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[var(--admin-surface)]">
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tags" htmlFor="tags" hint="Comma separated">
          <Input id="tags" value={values.tags} onChange={(e) => set("tags", e.target.value)} />
        </Field>

        <Field label="Author" htmlFor="authorName" error={errors["author.name"]}>
          <Input
            id="authorName"
            value={values.authorName}
            onChange={(e) => set("authorName", e.target.value)}
          />
        </Field>

        <Field label="Author Instagram" htmlFor="authorIg">
          <Input
            id="authorIg"
            value={values.authorIg}
            onChange={(e) => set("authorIg", e.target.value)}
            placeholder="@handle"
          />
        </Field>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(e) => set("featured", e.target.checked)}
            className="size-4 accent-[currentColor]"
          />
          <MonoLabel>Feature on the home page</MonoLabel>
        </label>

        {formError ? (
          <p className="a-meta text-[var(--admin-ink)]" role="alert">
            ↳ {formError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-[var(--admin-rule)] pt-6">
          <Button
            type="button"
            variant="outline"
            disabled={pending !== null}
            onClick={() => save("draft")}
          >
            {pending === "draft" ? "Saving…" : "Save as draft"}
          </Button>
          <Button type="button" disabled={pending !== null} onClick={() => save("published")}>
            {pending === "published"
              ? "Publishing…"
              : initialStatus === "published"
                ? "Update published"
                : "Publish ↗"}
          </Button>
          {savedAt ? <MonoLabel dim>Autosaved locally {savedAt}</MonoLabel> : null}
        </div>
      </aside>
    </div>
  );
}

export default ArticleForm;
