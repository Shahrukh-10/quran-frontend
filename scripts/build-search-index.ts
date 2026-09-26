/**
 * Build-time global search index generator.
 *
 * Scans every content source we ship (duas, surahs, 99 names, hadith seed,
 * sunnah, salah tutorials, seerah, reading plans, and static pages) and emits
 * a flat JSON list of searchable documents to `public/search-index.json`.
 *
 * The client (components/global-search/*) loads this JSON on-demand and feeds
 * it to MiniSearch — no server, no external index, no API cost.
 *
 * Invocation: `pnpm build:search-index` (added to package.json) or run via
 * `tsx scripts/build-search-index.ts`. Also runs in `prebuild` so production
 * builds always have a fresh index.
 *
 * IMPORTANT — authenticity rule: EVERY document must have a resolvable `href`
 * that goes to an existing page on our site. We NEVER fabricate destinations.
 * If a source doesn't have a real page yet, skip it.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

type SearchDoc = {
  id: string;
  /** One of: dua | surah | ayah | name | hadith | sunnah | page | plan | tutorial */
  kind: string;
  title: string;
  /** Short subtitle / english meaning / transliteration */
  subtitle?: string;
  /** Full-text body used for match — kept short (~200 chars) to keep the
   *  index small. Longer bodies are still fine but blow up bundle size. */
  body: string;
  /** Optional Arabic text (searchable — MiniSearch handles UTF-8 fine). */
  arabic?: string;
  /** URL on THIS site — must exist. Never external. */
  href: string;
  /** Optional source citation shown in results (e.g. "Bukhari 1", "Q 13:28"). */
  source?: string;
  /** Rank hint — higher = more prominent (used to break ties). */
  weight?: number;
};

const docs: SearchDoc[] = [];

/* ------------------------------------------------------------------ */
/* Duas — data/duas/duas.json                                          */
/* ------------------------------------------------------------------ */
try {
  const duas = JSON.parse(readFileSync(join(repoRoot, "data/duas/duas.json"), "utf8")) as {
    duas: Array<{
      slug: string;
      category: string;
      title: { en: string; id?: string };
      arabic: string;
      transliteration?: string;
      translation: { en: string; id?: string };
      when?: { en?: string };
      source?: string;
      grading?: string;
    }>;
    categories: Array<{ slug: string; title: { en: string }; description: { en: string } }>;
  };

  for (const d of duas.duas) {
    docs.push({
      id: `dua:${d.category}/${d.slug}`,
      kind: "dua",
      title: d.title.en,
      subtitle: d.translation.en?.slice(0, 100),
      body: [d.title.en, d.transliteration, d.translation.en, d.when?.en, d.source, d.grading]
        .filter(Boolean)
        .join(" · "),
      arabic: d.arabic,
      href: `/duas/${d.category}/${d.slug}`,
      source: d.source,
      weight: 5,
    });
  }
  for (const c of duas.categories) {
    docs.push({
      id: `dua-category:${c.slug}`,
      kind: "dua-category",
      title: `${c.title.en} duas`,
      subtitle: c.description.en?.slice(0, 100),
      body: `${c.title.en} ${c.description.en}`,
      href: `/duas/${c.slug}`,
      weight: 3,
    });
  }
  console.log(`  duas: ${duas.duas.length} + ${duas.categories.length} categories`);
} catch (err) {
  console.warn("  duas: skipped", (err as Error).message);
}

/* ------------------------------------------------------------------ */
/* Surahs — data/quran/surahs.json (114 metadata entries)              */
/* ------------------------------------------------------------------ */
try {
  const surahs = JSON.parse(
    readFileSync(join(repoRoot, "data/quran/surahs.json"), "utf8"),
  ) as Array<{
    number: number;
    name: string;
    slug: string;
    arabicName: string;
    englishTranslation: string;
    revelation: string;
    ayahCount: number;
  }>;
  for (const s of surahs) {
    // Search aliases — some users type "yasin" for "Ya-Sin", "albaqarah" for
    // "Al-Baqarah". Add both the hyphen-stripped and space-stripped forms
    // to the body so a prefix search finds them.
    const nameFlat = s.name.replace(/[-\s]/g, "").toLowerCase();
    const nameSpaced = s.name.replace(/[-]/g, " ");
    docs.push({
      id: `surah:${s.number}`,
      kind: "surah",
      title: `Surah ${s.number} — ${s.name}`,
      subtitle: `${s.englishTranslation} · ${s.ayahCount} ayat · ${s.revelation}`,
      body: `Surah ${s.number} ${s.name} ${nameFlat} ${nameSpaced} ${s.englishTranslation} ${s.arabicName}`,
      arabic: s.arabicName,
      href: `/quran/${s.slug}`,
      weight: 8, // surahs rank high
    });
  }
  console.log(`  surahs: ${surahs.length}`);
} catch (err) {
  console.warn("  surahs: skipped", (err as Error).message);
}

/* ------------------------------------------------------------------ */
/* 99 Names of Allah — data/names.json                                 */
/* ------------------------------------------------------------------ */
try {
  const names = JSON.parse(readFileSync(join(repoRoot, "data/names.json"), "utf8")) as Array<{
    order: number;
    slug: string;
    arabic: string;
    transliteration: string;
    meaning: { en: string };
    reflection?: { en: string };
  }>;
  for (const n of names) {
    docs.push({
      id: `name:${n.order}`,
      kind: "name",
      title: `${n.transliteration} — ${n.meaning.en}`,
      subtitle: `Name ${n.order} of 99`,
      body: `${n.transliteration} ${n.meaning.en} ${n.reflection?.en ?? ""}`,
      arabic: n.arabic,
      href: `/names-of-allah#${n.slug}`,
      source: `99 Names of Allah #${n.order}`,
      weight: 4,
    });
  }
  console.log(`  names: ${names.length}`);
} catch (err) {
  console.warn("  names: skipped", (err as Error).message);
}

/* ------------------------------------------------------------------ */
/* Hadith seed — data/hadith/seed.json                                 */
/* ------------------------------------------------------------------ */
try {
  const seed = JSON.parse(readFileSync(join(repoRoot, "data/hadith/seed.json"), "utf8")) as {
    hadiths: Array<{
      book: string;
      number: number;
      arabic: string;
      translation: { en: string };
      grading?: string;
    }>;
  };
  for (const h of seed.hadiths) {
    docs.push({
      id: `hadith:${h.book}/${h.number}`,
      kind: "hadith",
      title: `${h.book === "bukhari" ? "Sahih al-Bukhari" : h.book} ${h.number}`,
      subtitle: h.translation.en?.slice(0, 100),
      body: `${h.translation.en} ${h.grading ?? ""}`,
      arabic: h.arabic,
      href: `/hadith/${h.book}/${h.number}`,
      source: `${h.book} ${h.number}${h.grading ? ` (${h.grading})` : ""}`,
      weight: 5,
    });
  }
  console.log(`  hadith seed: ${seed.hadiths.length}`);
} catch (err) {
  console.warn("  hadith: skipped", (err as Error).message);
}

/* ------------------------------------------------------------------ */
/* Sunnah of the day — data/sunnah/daily.json                          */
/* ------------------------------------------------------------------ */
try {
  const sunnah = JSON.parse(readFileSync(join(repoRoot, "data/sunnah/daily.json"), "utf8")) as {
    sunnahs?: Array<{
      slug?: string;
      title?: { en: string };
      description?: { en: string };
      source?: string;
    }>;
  };
  if (Array.isArray(sunnah.sunnahs)) {
    for (const s of sunnah.sunnahs) {
      if (!s.slug || !s.title?.en) continue;
      docs.push({
        id: `sunnah:${s.slug}`,
        kind: "sunnah",
        title: s.title.en,
        subtitle: s.description?.en?.slice(0, 100),
        body: `${s.title.en} ${s.description?.en ?? ""} ${s.source ?? ""}`,
        // Sunnah of the day lives at /sunnah (single page listing all)
        href: `/sunnah#${s.slug}`,
        source: s.source,
        weight: 3,
      });
    }
    console.log(`  sunnah: ${sunnah.sunnahs.length}`);
  }
} catch (err) {
  console.warn("  sunnah: skipped", (err as Error).message);
}

/* ------------------------------------------------------------------ */
/* Salah tutorials — data/salah/tutorials.json                         */
/* ------------------------------------------------------------------ */
try {
  const salah = JSON.parse(readFileSync(join(repoRoot, "data/salah/tutorials.json"), "utf8")) as
    | Array<{ slug: string; title: { en: string }; summary?: { en: string } }>
    | { tutorials?: Array<{ slug: string; title: { en: string }; summary?: { en: string } }> };
  const list = Array.isArray(salah) ? salah : (salah.tutorials ?? []);
  for (const t of list) {
    docs.push({
      id: `salah:${t.slug}`,
      kind: "tutorial",
      title: t.title.en,
      subtitle: t.summary?.en?.slice(0, 100),
      body: `${t.title.en} ${t.summary?.en ?? ""} how to pray salah`,
      href: `/learn-salah/${t.slug}`,
      weight: 4,
    });
  }
  console.log(`  salah tutorials: ${list.length}`);
} catch (err) {
  console.warn("  salah: skipped", (err as Error).message);
}

/* ------------------------------------------------------------------ */
/* Reading plans — data/plans/index.json + individual plans            */
/* ------------------------------------------------------------------ */
try {
  const idx = JSON.parse(readFileSync(join(repoRoot, "data/plans/index.json"), "utf8")) as
    | Array<{ id: string; name: string; totalDays?: number; tags?: string[] }>
    | { plans?: Array<{ slug: string; title: { en: string }; description?: { en: string } }> };
  if (Array.isArray(idx)) {
    for (const p of idx) {
      docs.push({
        id: `plan:${p.id}`,
        kind: "plan",
        title: p.name,
        subtitle: p.totalDays ? `${p.totalDays}-day reading plan` : "Reading plan",
        body: `${p.name} reading plan ${(p.tags ?? []).join(" ")}`,
        href: `/plans/${p.id}`,
        weight: 3,
      });
    }
    console.log(`  reading plans: ${idx.length}`);
  } else if (Array.isArray(idx.plans)) {
    for (const p of idx.plans) {
      docs.push({
        id: `plan:${p.slug}`,
        kind: "plan",
        title: p.title.en,
        subtitle: p.description?.en?.slice(0, 100),
        body: `${p.title.en} ${p.description?.en ?? ""} reading plan`,
        href: `/plans/${p.slug}`,
        weight: 3,
      });
    }
    console.log(`  reading plans: ${idx.plans.length}`);
  }
} catch (err) {
  console.warn("  plans: skipped", (err as Error).message);
}

/* ------------------------------------------------------------------ */
/* Static feature pages — hard-coded manifest                          */
/* Every entry here MUST correspond to an existing route.              */
/* ------------------------------------------------------------------ */
const STATIC_PAGES: Array<Omit<SearchDoc, "id" | "kind">> = [
  {
    title: "Quran",
    subtitle: "All 114 surahs",
    body: "quran mushaf reader read online",
    href: "/quran",
    weight: 9,
  },
  {
    title: "Duas",
    subtitle: "Authentic supplications",
    body: "duas supplications prayers authentic hisn al muslim",
    href: "/duas",
    weight: 8,
  },
  {
    title: "Hadith",
    subtitle: "Six canonical collections",
    body: "hadith bukhari muslim tirmidhi abu dawud nasai ibn majah kutub as-sittah",
    href: "/hadith",
    weight: 8,
  },
  {
    title: "Prayer times",
    subtitle: "For any city worldwide",
    body: "prayer times salah namaz fajr dhuhr asr maghrib isha",
    href: "/prayer-times",
    weight: 8,
  },
  {
    title: "Qibla direction",
    subtitle: "Direction to Makkah",
    body: "qibla direction makkah kaaba compass",
    href: "/qibla",
    weight: 6,
  },
  {
    title: "Learn Salah",
    subtitle: "Step-by-step guide",
    body: "learn how to pray salah namaz tutorial for beginners new muslims",
    href: "/learn-salah",
    weight: 7,
  },
  {
    title: "99 Names of Allah",
    subtitle: "Asma ul Husna",
    body: "asma ul husna 99 names of allah meanings",
    href: "/names-of-allah",
    weight: 6,
  },
  {
    title: "Hijri calendar",
    subtitle: "Islamic date & months",
    body: "hijri islamic calendar ramadan dhul-hijjah muharram",
    href: "/calendar",
    weight: 5,
  },
  {
    title: "Tasbih counter",
    subtitle: "Digital dhikr counter",
    body: "tasbih dhikr counter subhanallah alhamdulillah",
    href: "/tools/tasbih",
    weight: 4,
  },
  {
    title: "Zakat calculator",
    subtitle: "Compute zakat",
    body: "zakat calculator nisab gold silver",
    href: "/tools/zakat",
    weight: 4,
  },
  {
    title: "Adhkar",
    subtitle: "Morning & evening remembrances",
    body: "adhkar morning evening remembrance dhikr",
    href: "/tools/adhkar",
    weight: 5,
  },
  {
    title: "Prayer tracker",
    subtitle: "Track daily salah",
    body: "prayer tracker salah namaz habit",
    href: "/tools/prayer-tracker",
    weight: 4,
  },
  {
    title: "Ramadan",
    subtitle: "Fasting guide & duas",
    body: "ramadan fasting iftar suhoor taraweeh laylat al-qadr",
    href: "/ramadan",
    weight: 6,
  },
  {
    title: "Hajj & Umrah",
    subtitle: "Pilgrimage guide",
    body: "hajj umrah pilgrimage makkah madinah tawaf sa'i arafat",
    href: "/hajj",
    weight: 6,
  },
  {
    title: "Seerah",
    subtitle: "Life of the Prophet ﷺ",
    body: "seerah life of prophet muhammad biography",
    href: "/seerah",
    weight: 6,
  },
  {
    title: "New Muslims",
    subtitle: "Guide for reverts",
    body: "new muslims reverts converts guide first steps shahada",
    href: "/reverts",
    weight: 5,
  },
  {
    title: "Memorize Quran",
    subtitle: "Spaced-repetition hifz",
    body: "memorize quran hifz spaced repetition juz amma",
    href: "/memorize",
    weight: 5,
  },
  {
    title: "Iqamah",
    subtitle: "Post-adhan prayer duas",
    body: "iqamah after adhan dua prayer",
    href: "/iqamah",
    weight: 4,
  },
  {
    title: "Quran PDF download",
    subtitle: "Read the full mushaf as PDF",
    body: "quran pdf download read offline mushaf uthmani indopak tanzil kfgqpc",
    href: "/quran/download",
    weight: 7,
  },
];
for (const p of STATIC_PAGES) {
  docs.push({
    id: `page:${p.href}`,
    kind: "page",
    ...p,
  });
}
console.log(`  static pages: ${STATIC_PAGES.length}`);

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */
const outPath = join(repoRoot, "public/search-index.json");
writeFileSync(outPath, JSON.stringify(docs));
console.log(`\n✓ wrote ${docs.length} documents → ${outPath}`);
console.log(`  size: ${(readFileSync(outPath).length / 1024).toFixed(1)} KB`);
