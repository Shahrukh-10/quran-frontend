import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { hreflangLanguages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../blog.css";

// Weekly ISR — posts are long-form and rarely edited.
export const revalidate = 604800;

export function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];
  const posts = getAllPosts();
  for (const locale of locales) {
    for (const post of posts) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const path = locale === "en" ? `/blog/${slug}` : `/${locale}/blog/${slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: post.author }],
    alternates: {
      canonical: siteUrl(path),
      languages: hreflangLanguages(`/blog/${slug}`),
    },
    openGraph: {
      type: "article",
      url: siteUrl(path),
      title: post.title,
      description: post.excerpt,
      siteName: "Quran Daily",
      publishedTime: `${post.publishedAt}T00:00:00Z`,
      modifiedTime: post.updatedAt
        ? `${post.updatedAt}T00:00:00Z`
        : `${post.publishedAt}T00:00:00Z`,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const bc = await breadcrumbs(locale);
  const url = siteUrl(locale === "en" ? `/blog/${slug}` : `/${locale}/blog/${slug}`);
  const related = getRelatedPosts(slug, 3);

  // FAQPage JSON-LD (only emitted if the post declares FAQs)
  const faqJsonLd =
    post.faqs && post.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <main className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: "Blog", url: siteUrl("/blog") },
          { name: post.title, url },
        ]}
      />
      <ArticleSchema
        headline={post.title}
        description={post.excerpt}
        url={url}
        datePublished={`${post.publishedAt}T00:00:00Z`}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD script requires innerHTML
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <Link href="/blog" className="focus-ring text-sm text-accent hover:underline">
        ← All articles
      </Link>

      <header className="mt-4 mb-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-widest text-muted-foreground">
          <span>{post.category.replace(/-/g, " ")}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span aria-hidden="true">·</span>
          <span>{post.readingMin} min read</span>
        </div>
        <h1 className="mt-3 text-[clamp(1.75rem,4vw,3rem)] font-bold tracking-display leading-tight">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{post.author}</span>
        </p>
      </header>

      {post.coverImage && (
        <figure
          className="mb-10 rounded-2xl overflow-hidden border border-separator"
          style={{
            aspectRatio: "16 / 9",
            backgroundImage: `linear-gradient(135deg, ${post.coverGradient[0]}, ${post.coverGradient[1]})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt={post.title}
            loading="eager"
            className="w-full h-full object-cover"
          />
        </figure>
      )}

      <article
        className="blog-content prose prose-lg max-w-none"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: authored HTML from trusted content registry
        dangerouslySetInnerHTML={{ __html: post.bodyHtml.join("\n") }}
      />

      {(post.relatedPaths?.length || post.externalLinks?.length) && (
        <section className="mt-14 pt-10 border-t border-separator">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Read next</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {post.relatedPaths?.map((path) => (
              <Link
                key={path}
                href={path as "/quran"}
                className="rounded-xl border border-separator bg-surface p-4 hover:border-accent/40 focus-ring"
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Quran Daily
                </p>
                <p className="mt-1 font-semibold">{path}</p>
              </Link>
            ))}
            {post.externalLinks?.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-xl border border-separator bg-surface p-4 hover:border-accent/40 focus-ring"
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {link.site} ↗
                </p>
                <p className="mt-1 font-semibold">{link.label}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12 pt-10 border-t border-separator">
          <h2 className="text-xl font-bold tracking-title mb-4">More on the blog</h2>
          <ul className="list-none p-0 space-y-3">
            {related.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/blog/${p.slug}` as "/blog/[slug]"}
                  className="text-accent hover:underline"
                >
                  {p.title}
                </Link>
                <p className="text-sm text-muted-foreground">{p.excerpt.slice(0, 140)}…</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
