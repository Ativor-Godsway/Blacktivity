"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AdminField,
  AutoGrowTextarea,
  SelectInput,
  TagInput,
  TextArea,
  TextInput,
} from "@/components/admin/ui/Field";
import ImageUploader from "./ImageUploader";
import TiptapContent from "@/lib/tiptap-render";
import { ARTICLE_CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import type { ImageRef } from "@/lib/types";

// The editor pulls in ProseMirror — keep it out of the initial admin bundle.
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <div className="min-h-[50vh] animate-pulse a-bg-hover" />,
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

  /** Mirrors articleSchema, so the common mistakes never cost a round trip. */
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    const title = values.title.trim();
    if (title.length < 3) e.title = "A title of at least 3 characters.";
    else if (title.length > 160) e.title = "At most 160 characters.";
    if (values.slug.trim().length < 3) e.slug = "A slug of at least 3 characters.";
    else if (!/^[a-z0-9-]+$/.test(values.slug)) e.slug = "Lowercase letters, numbers and dashes only.";
    if (values.excerpt.trim().length < 10) e.excerpt = "An excerpt of at least 10 characters.";
    if (values.authorName.trim().length < 2) e["author.name"] = "Who wrote it?";
    return e;
  }

  async function save(status: "draft" | "published") {
    setErrors({});
    setFormError("");

    const found = validate();
    if (!values.coverImage) found.coverImage = "A cover image is required.";
    if (Object.keys(found).length) {
      setErrors(found);
      setFormError("Fix the highlighted fields.");
      const first = ["title", "slug", "excerpt", "author.name"].find((k) => found[k]);
      if (first) document.getElementById(first === "author.name" ? "authorName" : first)?.focus();
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

  const excerptHint = `${values.excerpt.length} / 200 — used on cards and as the meta description`;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {restored ? (
          <p className="a-field-hint mb-6 rounded-lg border a-border a-bg-surface px-4 py-3">
            Restored an unsaved draft from this browser.
          </p>
        ) : null}

        <div className="flex flex-col gap-7">
          <AdminField label="Title" htmlFor="title" error={errors.title}>
            <AutoGrowTextarea
              id="title"
              value={values.title}
              onChange={(e) => onTitleChange(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="The headline is the artwork"
              invalid={Boolean(errors.title)}
            />
          </AdminField>

          <AdminField label="Slug" htmlFor="slug" error={errors.slug} hint={`/articles/${values.slug || "…"}`}>
            <TextInput
              id="slug"
              value={values.slug}
              spellCheck={false}
              autoCapitalize="off"
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              invalid={Boolean(errors.slug)}
              hint="slug"
            />
          </AdminField>

          <AdminField label="Excerpt" htmlFor="excerpt" error={errors.excerpt} hint={excerptHint}>
            <TextArea
              id="excerpt"
              rows={3}
              maxLength={200}
              value={values.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              invalid={Boolean(errors.excerpt)}
              hint={excerptHint}
            />
          </AdminField>
        </div>

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <span className="a-field-label" id="body-label">
              Body
            </span>
            <button type="button" onClick={() => setPreview((p) => !p)} className="a-btn a-btn-ghost">
              {preview ? "Back to editing" : "Preview ↗"}
            </button>
          </div>

          {preview ? (
            // The public renderer in a light section: the article as readers see it.
            <section data-theme="light" className="a-preview">
              <div className="prose-editorial px-6 py-8 md:px-10">
                <TiptapContent content={values.content} />
              </div>
            </section>
          ) : (
            <Editor content={values.content} onChange={(json) => set("content", json)} />
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-7 lg:sticky lg:top-6 lg:self-start">
        <div>
          <ImageUploader value={values.coverImage} onChange={(img) => set("coverImage", img)} />
          {errors.coverImage ? <p className="a-field-error mt-2">{errors.coverImage}</p> : null}
        </div>

        <AdminField label="Category" htmlFor="category" error={errors.category}>
          <SelectInput
            id="category"
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
            invalid={Boolean(errors.category)}
          >
            {ARTICLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectInput>
        </AdminField>

        <AdminField label="Tags" htmlFor="tags" hint="Press Enter or comma to add a tag">
          <TagInput
            id="tags"
            value={values.tags}
            onChange={(v) => set("tags", v)}
            hint="Press Enter or comma to add a tag"
          />
        </AdminField>

        <AdminField label="Author" htmlFor="authorName" error={errors["author.name"]}>
          <TextInput
            id="authorName"
            value={values.authorName}
            onChange={(e) => set("authorName", e.target.value)}
            invalid={Boolean(errors["author.name"])}
          />
        </AdminField>

        <AdminField label="Author Instagram" htmlFor="authorIg">
          <TextInput
            id="authorIg"
            value={values.authorIg}
            onChange={(e) => set("authorIg", e.target.value)}
            placeholder="@handle"
            autoCapitalize="off"
            spellCheck={false}
          />
        </AdminField>

        <label className="a-check">
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(e) => set("featured", e.target.checked)}
          />
          Feature on the home page
        </label>

        {formError ? (
          <p className="a-field-error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t a-border pt-6">
          <button
            type="button"
            className="a-btn a-btn-ghost justify-center py-3"
            disabled={pending !== null}
            onClick={() => save("draft")}
          >
            {pending === "draft" ? "Saving…" : "Save as draft"}
          </button>
          <button
            type="button"
            className="a-btn a-btn-primary justify-center py-3"
            disabled={pending !== null}
            onClick={() => save("published")}
          >
            {pending === "published"
              ? "Publishing…"
              : initialStatus === "published"
                ? "Update published"
                : "Publish ↗"}
          </button>
          {savedAt ? <p className="a-field-hint">Autosaved locally {savedAt}</p> : null}
        </div>
      </aside>
    </div>
  );
}

export default ArticleForm;
