import { CalligraphyBg } from "@/components/layout/calligraphy-bg";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { NavProgress } from "@/components/layout/nav-progress";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/structured-data";
import { locales, rtlLocales } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { siteName, siteUrl } from "@/lib/site";
import { amiri, amiriQuran, inter, notoArabic } from "@/app/fonts";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import type { ReactNode } from "react";
import "@/app/globals.css";
import "./_hig-shared.css";

// Force SSG for the locale root — docs/ARCHITECTURE.md rendering table.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFBFD" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.hero" });

  return {
    metadataBase: new URL(siteUrl("/")),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: t("subtitle"),
    applicationName: siteName,
    referrer: "no-referrer-when-downgrade",
    keywords: ["Quran", "Islam", "duas", "prayer times", "qibla", "salah", "hadith", "Muslim"],
    alternates: {
      // Trailing-slash policy — site-wide: NO trailing slash on any canonical.
      // - Content paths (`/quran`, `/duas`, `/prayer-times`, `/quran/al-fatihah`)
      //   already ship without a trailing slash.
      // - The site root emits `http://<host>` (no trailing slash) because
      //   Next.js's metadata resolver deliberately collapses `pathname === "/"`
      //   to `result.origin` (node_modules/next/dist/lib/metadata/resolvers/
      //   resolve-url.js L109). We accept that behavior so root canonicals
      //   match the rest of the site — one consistent form, no duplicate-URL
      //   ambiguity.
      // - `metadataBase` in this file matches (`http://<host>/` — the URL
      //   constructor normalizes but pathname `/` is invisible).
      canonical: siteUrl(locale === routing.defaultLocale ? "/" : `/${locale}`),
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [l, siteUrl(l === routing.defaultLocale ? "/" : `/${l}`)]),
        ),
        // x-default → same as the default-locale root. Emits both an HTML
        // `<link rel="alternate" hreflang="x-default">` tag AND is echoed in
        // the response `Link:` header by next-intl middleware.
        "x-default": siteUrl("/"),
      },
    },
    openGraph: {
      // No `title:` here — let Next.js inherit each page's `title` for og:title
      // (via the templated <title>). If we set a static openGraph.title,
      // every social share on every page shows the same string.
      // og:url defaults to the locale root; pages that override
      // `alternates.canonical` also override `openGraph.url` (see the
      // codemod at /tmp/codemod-og-url.py that keeps them in sync).
      url: siteUrl(locale === routing.defaultLocale ? "/" : `/${locale}`),
      type: "website",
      siteName,
      description: t("subtitle"),
      locale,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
    },
    twitter: {
      // Same reason as openGraph: let the per-page title cascade.
      card: "summary_large_image",
      description: t("subtitle"),
      images: ["/opengraph-image"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
    },
    // Optional supplementary verification tags (belt-and-suspenders alongside
    // DNS-TXT verification which is the primary method). Values are injected
    // via env at build time so the token strings don't sit in the repo.
    verification: {
      google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
    },
    other: {
      "ai-content-declaration": "human-authored, AI-formatted; religious content scholar-reviewed",
      // iOS PWA hints — Safari doesn't read the standard manifest for these.
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      "apple-mobile-web-app-title": "Quran Daily",
      // Format-detection off so verse numbers don't get auto-linked as phone numbers.
      "format-detection": "telephone=no",
    },
    appleWebApp: {
      capable: true,
      title: "Quran Daily",
      statusBarStyle: "black-translucent",
    },
    manifest: "/manifest.webmanifest",
    icons: {
      // Modern browsers pick the SVG; older browsers and email clients pick favicon.ico.
      // iOS home screen uses apple-touch-icon (180×180 opaque PNG per Apple guidelines).
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: ["/favicon.ico"],
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  const dir = (rtlLocales as readonly string[]).includes(locale) ? "rtl" : "ltr";
  const fontVars = `${inter.variable} ${amiri.variable} ${amiriQuran.variable} ${notoArabic.variable}`;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${fontVars} font-sans antialiased min-h-screen flex flex-col`}>
        {/* Applies user theme before hydration to prevent flash. Reads iw.v1 in localStorage. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: inline pre-hydration theme script
          dangerouslySetInnerHTML={{
            // Default = LIGHT. Only apply dark if user explicitly picked 'dark'.
            // System preference no longer forces dark — matches mockup brief.
            __html: `(function(){try{var raw=localStorage.getItem('iw.v1');var t=raw?JSON.parse(raw)?.settings?.theme:'light';var d=(t==='dark');document.documentElement.classList.toggle('dark',!!d);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
        <NextIntlClientProvider messages={messages}>
          {/* Decorative Arabic-typography background — deferred to client-only
              mount so 40k SSR pages don't ship 500 chars of identical decoration
              in the initial HTML (Googlebot/AI-crawler classifier was seeing all
              deep pages as near-duplicate because of this). Users still see the
              exact same visual after first frame. See components/layout/calligraphy-bg.tsx. */}
          <CalligraphyBg />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-[hsl(var(--accent-foreground))]"
          >
            {(messages as { common: { skipToContent: string } }).common.skipToContent}
          </a>
          <Header />
          <NavProgress />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <OrganizationSchema />
          <WebSiteSchema />
          <ServiceWorkerRegister />
          <InstallPrompt />
        </NextIntlClientProvider>
        {/* Google Analytics 4 — Quran Daily property (G-HXWM89S71H).
            Loaded with `strategy="lazyOnload"` so gtag.js is fetched AFTER the
            window `load` event, keeping it out of the LCP network contention
            window. `@next/third-parties`'s <GoogleAnalytics> component was
            replaced here because it hard-codes `afterInteractive`, which
            Lighthouse (2026-09) showed was still competing with the initial
            paint on mobile (gtag.js is a ~175 KB script, 74 KB unused).
            NEXT_PUBLIC_GA_ID env var still gates the tag; empty in staging. */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="lazyOnload"
            />
            <Script id="ga4-init" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', { send_page_view: true });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
