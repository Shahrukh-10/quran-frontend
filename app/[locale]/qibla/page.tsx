import { QiblaCompass } from "@/components/qibla/qibla-compass";
import { BreadcrumbSchema, FaqSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import "./_qibla-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  return {
    title: "Qibla — direction to the Kaʿbah",
    description:
      "The great-circle direction from your location to the Kaʿbah in Makkah, computed on your device using the Haversine formula.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/qibla" : `/${locale}/qibla`),
      languages: hreflangLanguages("/qibla"),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/qibla" : `/${locale}/qibla`),
      type: "article",
      locale,
      images: mergedOgImages("Qibla — direction to the Kaʿbah"),
    },
  };
}

export default async function QiblaPage({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-dashboard px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <FaqSchema
        items={[
          {
            question: 'What is Qibla and why does direction matter?',
            answer:
              'Qibla (قِبْلَة) is the direction Muslims face during ṣalāh (the five daily prayers) — specifically toward the Kaaba in Mecca. Facing the Qibla is a condition for the validity of prayer according to all four Sunni schools of jurisprudence.',
          },
          {
            question: 'How does Quran Daily calculate Qibla direction?',
            answer:
              'The Qibla page uses the great-circle bearing formula on the WGS-84 ellipsoid, from your device\'s geolocation (latitude/longitude) to the Kaaba (21.4225°N, 39.8262°E). This gives the shortest true-north-referenced bearing across the surface of the Earth — the same math used by nautical navigation.',
          },
          {
            question: 'Does the compass work in the browser?',
            answer:
              'Yes on most modern smartphones. The compass uses the DeviceOrientationEvent Web API — on iOS Safari you\'ll be prompted to grant motion permission; on Android Chrome permission is implicit. On desktop browsers without a magnetometer, the arrow shows the true bearing but does not rotate with the device.',
          },
          {
            question: 'Why does the arrow drift or lag slightly?',
            answer:
              'Smartphone magnetometers are affected by nearby metal, magnets, and phone cases with magnetic clasps. The compass smooths readings using a shortest-arc filter over multiple frames; the residual drift you see is real magnetic-field noise, not a software bug. Calibrate by moving the phone in a figure-8 pattern.',
          },
          {
            question: 'Can I use the AR camera mode?',
            answer:
              'Yes on browsers with getUserMedia + WebXR support. Tap the AR button on the Qibla page and grant camera access to overlay a Qibla marker on the live camera feed. Works best in landscape mode with the phone held level.',
          },
          {
            question: 'Does the Qibla direction ever change?',
            answer:
              'The physical direction from a fixed location to the Kaaba does not change. Historical sources describe how the Qibla was initially toward Jerusalem (Bayt al-Maqdis) during the early Meccan period and was changed to Mecca in the second year of Hijrah (Surah al-Baqarah, ayah 144).',
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("qibla"), url: siteUrl("/qibla") },
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
