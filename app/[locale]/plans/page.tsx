import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllPlans } from "@/lib/plans";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Learning Plans",
    description:
      "Guided reading schedules — read the Quran in a month, in Ramadan, or study the last tenth.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/plans" : `/${locale}/plans`),
      languages: Object.fromEntries(
        locales.map((l) => [l, siteUrl(l === "en" ? "/plans" : `/${l}/plans`)]),
      ),
    },
  };
}

export default async function PlansIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const plans = getAllPlans();

  return (
    <div className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: "Learning Plans", url: siteUrl("/plans") },
        ]}
      />
      <h1 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display">
        Learning Plans
      </h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        Guided reading schedules — read the Quran in a month, in Ramadan, or study the last tenth.
        Progress is tracked locally on this device.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition hover:border-accent/60 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">{plan.name}</h2>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {plan.totalDays} days
              </span>
            </div>
            {plan.tags.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {plan.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-5">
              <Link
                href={`/plans/${plan.id}`}
                className="focus-ring inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                Open plan →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
