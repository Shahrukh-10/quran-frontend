import Link from "next/link";

// Root not-found. This is only hit when a URL escapes the [locale] catch-all
// entirely (extremely rare — normally [locale]/[...rest] catches it and
// delegates to the localized 404). It still needs valid HTML structure or
// Next.js falls back to a placeholder `<html id="__next_error__">` with no
// lang attribute, which fails WCAG 3.1.1 (axe rule `html-has-lang`).

export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 1rem",
          textAlign: "center",
          background: "#fbfbfd",
          color: "#1d1d1f",
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
        }}
      >
        <p style={{ fontSize: "0.875rem", color: "#5f5f66", margin: 0 }}>404</p>
        <h1 style={{ fontSize: "2rem", fontWeight: 600, margin: "0.5rem 0 0" }}>
          Page not found
        </h1>
        <p style={{ maxWidth: "28rem", marginTop: "0.75rem", color: "#5f5f66" }}>
          The page you were looking for does not exist. It may have moved, or it may not exist yet
          — this site is being built one feature at a time.
        </p>
        <Link
          href="/"
          style={{
            marginTop: "2rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "2.75rem",
            padding: "0 1.5rem",
            borderRadius: "0.5rem",
            background: "#0b7a3e",
            color: "#ffffff",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Return home
        </Link>
      </body>
    </html>
  );
}
