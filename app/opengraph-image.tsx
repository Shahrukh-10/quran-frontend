import { ImageResponse } from "next/og";

// Dynamic default Open Graph card — used when a page doesn't override og:image.
// Rendered as a 1200×630 PNG on demand at /opengraph-image. Style is
// dark-first (matches theme_color) with a subtle gradient and the site
// name in Inter. Kept intentionally simple — no external fonts, no
// runtime data — so it's cheap on any runtime.
//
// Runtime is intentionally NOT declared: Next.js picks node in dev and
// on Cloudflare Pages it runs on the edge. Declaring `edge` here causes
// the dev server to hang on first hit in Next 15.5.x (empty reply from
// server); the default resolves cleanly.
export const alt = "Quran Daily — Quran, hadith, duas, prayer times, Qibla, Salah tutorials";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        // satori (next/og) doesn't accept a hex fallback after gradients in a
        // shorthand `background`. Split into `backgroundColor` + `backgroundImage`.
        backgroundColor: "#0a1a3f",
        backgroundImage:
          "radial-gradient(1200px 630px at 15% 20%, rgba(11,122,62,0.35), transparent 60%), radial-gradient(900px 500px at 90% 100%, rgba(29,78,216,0.28), transparent 55%)",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, Inter, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            backgroundImage: "linear-gradient(135deg,#5ac8fa,#007aff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 700,
          }}
        >
          ﷲ
        </div>
        <div
          style={{
            fontSize: 34,
            letterSpacing: -0.5,
            fontWeight: 600,
            opacity: 0.92,
          }}
        >
          Quran Daily
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 78,
            lineHeight: 1.05,
            fontWeight: 700,
            letterSpacing: -1.5,
          }}
        >
          Quran, duas, prayer times.
        </div>
        <div
          style={{
            fontSize: 30,
            lineHeight: 1.35,
            maxWidth: 900,
            opacity: 0.82,
          }}
        >
          Every ayah, dua, and hadith cites its source. No ads. No tracking. No login required.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 22,
          opacity: 0.72,
        }}
      >
        <div style={{ display: "flex", gap: 24 }}>
          <span>Quran</span>
          <span>·</span>
          <span>Duas</span>
          <span>·</span>
          <span>Prayer times</span>
          <span>·</span>
          <span>Qibla</span>
          <span>·</span>
          <span>Salah tutorials</span>
        </div>
        <div style={{ opacity: 0.7 }}>Free · Sourced · Offline-first</div>
      </div>
    </div>,
    { ...size },
  );
}
