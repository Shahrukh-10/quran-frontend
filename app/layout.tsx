import type { ReactNode } from "react";

// Root layout runs for every request. All real UI lives under app/[locale]/layout.tsx.
// This layout stays minimal so the locale-aware layout can own <html> and <body>.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
