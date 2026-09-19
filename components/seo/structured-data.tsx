import { siteName, siteUrl } from "@/lib/site";

// One typed component per Schema.org shape we use. Keep them stateless and pure.
// Consumers pass a small props shape; the JSON-LD is written inline as a <script>.

type JsonLd = Record<string, unknown>;

function LdJson({ data }: { data: JsonLd }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw JSON in a script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationSchema() {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteName,
        url: siteUrl("/"),
        description:
          "Free, sourced, offline-first Islamic resource — Quran, duas, prayer times, Qibla, Salah tutorials.",
      }}
    />
  );
}

export function WebSiteSchema() {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: siteUrl("/"),
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl("/search")}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function ArticleSchema({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  author,
}: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
}) {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline,
        description,
        url,
        datePublished,
        dateModified: dateModified ?? datePublished,
        author: {
          "@type": "Organization",
          name: author ?? siteName,
        },
        publisher: {
          "@type": "Organization",
          name: siteName,
          url: siteUrl("/"),
        },
        mainEntityOfPage: url,
      }}
    />
  );
}

export function HowToSchema({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        step: steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
      }}
    />
  );
}

export function FaqSchema({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }}
    />
  );
}
