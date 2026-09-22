import { locales } from "@/i18n/config";
import { getSurahBySlug, loadAyah } from "@/lib/quran";
import { ImageResponse } from "next/og";

// Dynamic per-ayah share card. When a user shares /quran/al-baqarah/255
// to WhatsApp, iMessage, Twitter, Discord etc., the platform fetches
// /quran/al-baqarah/255/opengraph-image and renders THIS PNG in the
// link preview — surah name + verse reference + English translation,
// styled to match the site.
//
// About Arabic on the card:
// satori (the engine behind next/og) has a known limitation with modern
// Arabic OpenType fonts (`lookupType: 5 - substFormat: 3 is not yet
// supported`). Since we can't reliably render the full ayah in Arabic
// on the card, we lean on the translation — which satori handles well —
// and use a single stylized ﷲ + the surah's Arabic name (short,
// isolated glyphs that satori CAN render) as visual accent.
//
// A generic homepage card lives at app/opengraph-image.tsx as the fallback.

export const alt = "Ayah share card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  const params: Array<{ locale: string; surah: string; ayah: string }> = [];
  const seeded = [1, 36, 55, 67, 112, 113, 114];
  const { getAllSurahs } = await import("@/lib/quran");
  const surahs = getAllSurahs();
  for (const locale of locales) {
    for (const n of seeded) {
      const s = surahs.find((x) => x.number === n);
      if (!s) continue;
      for (let a = 1; a <= s.ayahCount; a++) {
        params.push({ locale, surah: s.slug, ayah: String(a) });
      }
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; surah: string; ayah: string }> };

// Inter font, fetched once and cached per lambda cold-start.
// Google Fonts CSS2 API returns stable versioned URLs — rediscover with
//   curl -H 'User-Agent: Mozilla/5.0' 'https://fonts.googleapis.com/css2?family=Inter'
let fontCache: { inter: ArrayBuffer; interBold: ArrayBuffer } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const INTER_REG =
    "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf";
  const INTER_BOLD =
    "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf";
  const [regRes, boldRes] = await Promise.all([
    fetch(INTER_REG, { headers: { "User-Agent": "Mozilla/5.0" } }),
    fetch(INTER_BOLD, { headers: { "User-Agent": "Mozilla/5.0" } }),
  ]);
  if (!regRes.ok || !boldRes.ok) {
    throw new Error(
      `Font fetch failed: Inter regular ${regRes.status}, Inter bold ${boldRes.status}. Refresh URLs via Google Fonts CSS2 API.`,
    );
  }
  fontCache = {
    inter: await regRes.arrayBuffer(),
    interBold: await boldRes.arrayBuffer(),
  };
  return fontCache;
}

export default async function Image({ params }: Props) {
  const { locale, surah, ayah } = await params;
  const s = getSurahBySlug(surah);
  const ayahNum = Number.parseInt(ayah, 10);

  const fonts = await loadFonts();
  const fontConfig = [
    { name: "Inter", data: fonts.inter, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: fonts.interBold, weight: 700 as const, style: "normal" as const },
  ];

  if (!s || !Number.isInteger(ayahNum)) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a1a3f",
          color: "#ffffff",
          fontSize: 48,
          fontWeight: 600,
          fontFamily: "Inter",
        }}
      >
        Quran Daily
      </div>,
      { width: 1200, height: 630, fonts: fontConfig },
    );
  }

  const data = await loadAyah(s.number, ayahNum);
  const translationKey = locale === "id" ? "id.indonesian" : "en.sahih";
  const translation = data?.translations?.[translationKey] ?? data?.translations?.["en.sahih"] ?? "";
  const transClamped = clamp(translation, 340);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        backgroundColor: "#0a1a3f",
        backgroundImage:
          "radial-gradient(1200px 630px at 15% 20%, rgba(11,122,62,0.35), transparent 60%), radial-gradient(900px 500px at 90% 100%, rgba(29,78,216,0.28), transparent 55%)",
        color: "#ffffff",
        fontFamily: "Inter",
      }}
    >
      {/* Top row: brand + verse-reference chip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundImage: "linear-gradient(135deg,#5ac8fa,#007aff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            IW
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.9 }}>Quran Daily</div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 500,
            padding: "10px 22px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.24)",
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        >
          {s.number}:{ayahNum}
        </div>
      </div>

      {/* Middle: surah name + translation */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          flex: 1,
          justifyContent: "center",
          maxWidth: 1040,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              opacity: 0.72,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Surah {s.number} · Verse {ayahNum}
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: -1,
              lineHeight: 1.05,
            }}
          >
            {s.name}
          </div>
          <div style={{ fontSize: 26, opacity: 0.75, fontStyle: "italic" }}>
            {s.englishTranslation}
          </div>
        </div>

        {transClamped ? (
          <div
            style={{
              marginTop: 6,
              fontSize: 30,
              lineHeight: 1.4,
              opacity: 0.92,
              fontStyle: "italic",
              display: "flex",
            }}
          >
            &ldquo;{transClamped}&rdquo;
          </div>
        ) : null}
      </div>

      {/* Bottom row: source + read-on badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            opacity: 0.7,
          }}
        >
          <div style={{ display: "flex" }}>
            {s.revelation === "meccan" ? "Meccan" : "Medinan"} · {s.ayahCount} ayat
          </div>
          <div style={{ display: "flex" }}>Read on islamic.website</div>
        </div>
    </div>,
    { ...size, fonts: fontConfig },
  );
}

function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}
