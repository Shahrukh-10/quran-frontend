import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { Link } from "@/i18n/routing";
import { locales } from "@/i18n/config";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getAllPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/site";
import { hreflangLanguages } from "@/lib/seo";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import "./blog.css";

// Weekly ISR — post list rarely changes; new posts trigger revalidate on deploy.
export const revalidate = 604800;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const path = locale === "en" ? "/blog" : `/${locale}/blog`;
  return {
    title: "Blog",
    description:
      "Long-form articles on the Quran, Sunnah, prayer, and Islamic life — sourced, honest, and free.",
    alternates: {
      canonical: siteUrl(path),
      languages: hreflangLanguages("/blog"),
    },
    openGraph: {
      type: "website",
      url: siteUrl(path),
      title: "Quran Daily — Blog",
      description:
        "Long-form articles on the Quran, Sunnah, prayer, and Islamic life.",
      siteName: "Quran Daily",
    },
    twitter: {
      card: "summary_large_image",
      title: "Quran Daily — Blog",
      description:
        "Long-form articles on the Quran, Sunnah, prayer, and Islamic life.",
    },
  };
}

export default async function BlogIndex({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const bc = await breadcrumbs(locale);
  const posts = getAllPosts();

  return (
    <main className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: "Blog", url: siteUrl("/blog") },
        ]}
      />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          The Quran Daily blog
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,4vw,3rem)] font-bold tracking-display leading-tight">
          Long reads on the Quran, Sunnah, and prayer.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Sourced. Reviewed. Free. Every article cites the Quran, hadith, or
          classical scholarship it rests on — no hot takes, no AI-scraped filler.
        </p>
      </header>

      {posts.length === 0 ? (
        <section className="rounded-2xl border border-separator bg-surface p-8 text-center">
          <p className="text-muted-foreground">
            First articles publishing soon. In the meantime, read the{" "}
            <Link href="/quran" className="text-accent hover:underline">
              Quran
            </Link>
            {" · "}
            <Link href="/hadith" className="text-accent hover:underline">
              hadith library
            </Link>
            {" · "}
            <Link href="/duas" className="text-accent hover:underline">
              sourced duas
            </Link>
            .
          </p>
        </section>
      ) : (
        <ol className="list-none p-0 space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <article
                className="rounded-2xl border border-separator bg-surface p-6 md:p-8 hover:border-accent/40 transition-colors"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${post.coverGradient[0]}0d, ${post.coverGradient[1]}0d)`,
                }}
              >
                <ArticleSchema
                  headline={post.title}
                  description={post.excerpt}
                  url={siteUrl(`/blog/${post.slug}`)}
                  datePublished={`${post.publishedAt}T00:00:00Z`}
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-widest text-muted-foreground">
                  <span>{post.category.replace(/-/g, " ")}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={post.publishedAt}>
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingMin} min read</span>
                </div>
                <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-title leading-tight">
                  <Link
                    href={`/blog/${post.slug}` as "/blog/[slug]"}
                    className="hover:text-accent"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 text-muted-foreground">{post.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full border border-separator text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
