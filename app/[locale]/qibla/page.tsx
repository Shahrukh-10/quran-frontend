import { QiblaCompass } from "@/components/qibla/qibla-compass";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import "./_qibla-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Qibla — direction to the Kaʿbah",
    description:
      "The great-circle direction from your location to the Kaʿbah in Makkah, computed on your device using the Haversine formula.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/qibla" : `/${locale}/qibla`),
    },
  };
}

export default async function QiblaPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-dashboard px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: "Qibla", url: siteUrl("/qibla") },
        ]}
      />

      <header className="max-w-reading">
        <p className="kicker">Qibla · Direction to the Kaʿbah</p>
        <h1 className="page-title">Face Makkah.</h1>
        <p className="page-lede">
          Great-circle bearing computed on your device using the Haversine formula. Nothing sent to
          any server.
        </p>
      </header>

      <div className="qibla-layout">
        <QiblaCompass />
      </div>

      <div className="tafsir-quote">
        <p className="verse-ar" dir="rtl" lang="ar">
          فَوَلِّ وَجْهَكَ شَطْرَ ٱلْمَسْجِدِ ٱلْحَرَامِ ۚ وَحَيْثُ مَا كُنتُمْ فَوَلُّوا۟ وُجُوهَكُمْ شَطْرَهُۥ
        </p>
        <p className="verse-en">
          &ldquo;So turn your face toward al-Masjid al-Ḥarām, and wherever you are, turn your faces
          toward it.&rdquo;
        </p>
        <p className="verse-cite">Qur&apos;ān 2:144 · Al-Baqarah</p>
      </div>
    </div>
  );
}
