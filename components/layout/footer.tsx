import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

// Github icon (single-color SVG, no lucide dep since lucide's Github icon
// is fine but we want stable stroke widths that match the nav's icon style).
const IconGithub = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);
const IconMail = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </svg>
);
const IconGlobe = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export function Footer() {
  const t = useTranslations("footer");
  const common = useTranslations("common");
  const nav = useTranslations("nav");
  const priv = useTranslations("privacy");
  const settings = useTranslations("settings");

  const year = new Date().getFullYear();

  return (
    <footer className="hig-footer" role="contentinfo">
      <div className="container">
        <div className="hig-footer__top">
          {/* Brand column */}
          <div className="hig-footer__brand">
            <div className="hig-footer__brand-mark">
              <span aria-hidden>ﷲ</span>
              <span>{common("siteName")}</span>
            </div>
            <p className="hig-footer__tagline">{common("tagline")}</p>
            <p className="hig-footer__basmala" lang="ar" dir="rtl" aria-hidden>
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </p>
          </div>

          {/* Read */}
          <div className="hig-footer__col">
            <h4>Read</h4>
            <ul>
              <li>
                <Link href="/quran">{nav("quran")}</Link>
              </li>
              <li>
                <Link href="/mushaf">{nav("mushaf")}</Link>
              </li>
              <li>
                <Link href="/names-of-allah">{nav("names")}</Link>
              </li>
              <li>
                <Link href="/duas">{nav("duas")}</Link>
              </li>
            </ul>
          </div>

          {/* Practice */}
          <div className="hig-footer__col">
            <h4>Practice</h4>
            <ul>
              <li>
                <Link href="/prayer-times">{nav("prayerTimes")}</Link>
              </li>
              <li>
                <Link href="/qibla">{nav("qibla")}</Link>
              </li>
              <li>
                <Link href="/learn-salah">{nav("learnSalah")}</Link>
              </li>
              <li>
                <Link href="/tools">{nav("tools")}</Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div className="hig-footer__col">
            <h4>About</h4>
            <ul>
              <li>
                <Link href="/about">{nav("about")}</Link>
              </li>
              <li>
                <Link href="/sources">{nav("sources")}</Link>
              </li>
              <li>
                <Link href="/settings">{settings("title")}</Link>
              </li>
              <li>
                <Link href="/privacy">{priv("title")}</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="hig-footer__bottom">
          <div>
            © {year} {common("siteName")} · {t("copy")}
          </div>
          <div className="hig-footer__socials" aria-label="Social">
            <a
              className="hig-footer__social"
              href="https://github.com"
              aria-label="GitHub"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconGithub />
            </a>
            <a className="hig-footer__social" href="mailto:hello@example.com" aria-label="Email">
              <IconMail />
            </a>
            <a className="hig-footer__social" href="/" aria-label="Website">
              <IconGlobe />
            </a>
          </div>
        </div>

        <div
          className="hig-footer__bottom"
          style={{
            paddingTop: 12,
            borderTop: 0,
            color: "hsl(var(--muted-foreground) / 0.65)",
            fontSize: 11,
          }}
        >
          <span>{t("sourcesLine")}</span>
          <span>{t("editorialLine")}</span>
        </div>
      </div>
    </footer>
  );
}
