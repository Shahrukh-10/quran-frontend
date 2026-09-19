import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-title">Page not found</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The page you were looking for does not exist. It may have moved, or it may not exist yet —
        this site is being built one feature at a time.
      </p>
      <Link
        href="/"
        className="focus-ring mt-8 inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] font-medium transition-colors duration-micro ease-spring hover:opacity-90"
      >
        Return home
      </Link>
    </div>
  );
}
