import type { Config } from "tailwindcss";

// Design tokens — docs/DESIGN.md is the source of truth. Edit both together.
const config: Config = {
  content: ["./app/**/*.{ts,tsx,mdx}", "./components/**/*.{ts,tsx}", "./content/**/*.{mdx,md}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        arabic: ["var(--font-noto-arabic)", "Amiri", "serif"],
        quran: ["var(--font-amiri-quran)", "Amiri", "serif"],
      },
      colors: {
        // Light-mode surfaces + text. Dark-mode handled via CSS vars in globals.css.
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        "surface-elevated": "hsl(var(--surface-elevated))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        separator: "hsl(var(--separator))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          muted: "hsl(var(--accent-muted))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      transitionTimingFunction: {
        // docs/DESIGN.md — Apple-inspired spring
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionDuration: {
        micro: "200ms",
        component: "350ms",
        page: "500ms",
      },
      letterSpacing: {
        display: "-0.02em",
        title: "-0.01em",
      },
      maxWidth: {
        reading: "56rem", // ~ max-w-4xl for content
        dashboard: "72rem", // max-w-6xl
      },
    },
  },
  plugins: [],
};

export default config;
