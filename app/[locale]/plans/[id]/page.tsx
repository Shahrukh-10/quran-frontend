import { PlanTracker } from "@/components/plans/plan-tracker";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllPlans, getPlanById } from "@/lib/plans";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const params: Array<{ locale: string; id: string }> = [];
  for (const locale of locales) {
    for (const plan of getAllPlans()) {
      params.push({ locale, id: plan.id });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const plan = await getPlanById(id);
  if (!plan) return {};
  return {
    title: `${plan.name} — Learning Plan`,
    description: plan.description,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/plans/${id}` : `/${locale}/plans/${id}`),
    },
  };
}

export default async function PlanDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const plan = await getPlanById(id);
  if (!plan) notFound();

  return (
    <div className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: "Learning Plans", url: siteUrl("/plans") },
          { name: plan.name, url: siteUrl(`/plans/${plan.id}`) },
        ]}
      />
      <Link href="/plans" className="focus-ring text-sm text-accent hover:underline">
        ← All plans
      </Link>
      <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display">
        {plan.name}
      </h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">{plan.description}</p>
      <p className="mt-2 text-sm text-muted-foreground">{plan.totalDays} days</p>

      <PlanTracker planId={plan.id} plan={plan} />
    </div>
  );
}
