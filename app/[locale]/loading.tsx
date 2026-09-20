// Top-level loading UI for every route under [locale]/*. Rendered
// instantly during a route transition (Next 15 App Router streams this
// while the server component + data resolves). Without this file the
// user stares at the OLD page during a transition, which is the #1
// cause of "app feels slow to navigate".
//
// Uses a top progress bar + subtle skeleton for the main content area.
// No layout shift: reserves the same header height as the real layout.

export default function Loading() {
  return (
    <>
      {/* Top progress bar — animates a gradient sweep across the viewport.
          Fixed position so it appears even while the layout is streaming. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 9999,
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--accent) / 0.9) 50%, transparent 100%)",
          backgroundSize: "50% 100%",
          animation: "nav-progress 1.1s linear infinite",
        }}
      />
      <style
        // eslint-disable-next-line react/no-unknown-property
        dangerouslySetInnerHTML={{
          __html: `@keyframes nav-progress {
            0% { background-position: -100% 0; }
            100% { background-position: 200% 0; }
          }`,
        }}
      />
      {/* Skeleton block — matches the .container container--narrow layout so
          there's no visible width shift when the real content mounts. */}
      <div
        aria-busy="true"
        aria-live="polite"
        style={{
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
          padding: "48px 20px",
        }}
      >
        <div
          style={{
            height: 32,
            width: "60%",
            background: "hsl(var(--muted) / 0.5)",
            borderRadius: 8,
            marginBottom: 16,
          }}
        />
        <div
          style={{
            height: 14,
            width: "90%",
            background: "hsl(var(--muted) / 0.35)",
            borderRadius: 6,
            marginBottom: 8,
          }}
        />
        <div
          style={{
            height: 14,
            width: "80%",
            background: "hsl(var(--muted) / 0.35)",
            borderRadius: 6,
            marginBottom: 24,
          }}
        />
        <div
          style={{
            height: 180,
            width: "100%",
            background: "hsl(var(--muted) / 0.25)",
            borderRadius: 16,
          }}
        />
      </div>
    </>
  );
}
