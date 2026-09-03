import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import Article from "@/models/Article";
import { getAdminContext } from "@/lib/admin-context";
import AdminShell from "@/components/admin/AdminShell";
import ArticleForm from "@/components/admin/ArticleForm";

export const metadata: Metadata = { title: "Edit article" };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  const ctx = await getAdminContext();

  await dbConnect();
  const doc = await Article.findById(id).lean();
  if (!doc) notFound();

  return (
    <AdminShell
      {...ctx}
      title="Edit article"
      subtitle="Autosaved locally as you type."
      collapsedRail
    >
      <ArticleForm
        id={id}
        initialStatus={doc.status === "published" ? "published" : "draft"}
        initial={{
          title: doc.title,
          slug: doc.slug,
          excerpt: doc.excerpt,
          content: doc.content,
          coverImage: {
            url: doc.coverImage.url,
            publicId: doc.coverImage.publicId ?? "",
            alt: doc.coverImage.alt ?? "",
            width: doc.coverImage.width ?? 1200,
            height: doc.coverImage.height ?? 1600,
            blurDataURL: doc.coverImage.blurDataURL ?? "",
          },
          category: doc.category,
          tags: (doc.tags ?? []).join(", "),
          authorName: doc.author?.name ?? "",
          authorIg: doc.author?.igHandle ?? "",
          featured: Boolean(doc.featured),
        }}
      />
    </AdminShell>
  );
}
