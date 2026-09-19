// Canonical Quran metadata index — every ayah with its Juz, Hizb, Rub el-Hizb,
// Ruku, Manzil, Page, and Sajdah numbers.
//
// Built by scripts/build-index.ts from quran-data/verses/*.json. This is the
// single source of truth for divisions used by browse routes (/juz/[n],
// /hizb/[n], /ruku/[n], /manzil/[n], /page/[n]) and by the search index.
//
// SIZE: ayat.json is ~640 KB — small enough to import server-side but we
// dynamic-import it so it never enters the client bundle.

export type AyahRef = {
  s: number; // surah number (1..114)
  a: number; // ayah number within surah
  key: string; // "s:a" e.g. "2:255"
  juz: number; // 1..30
  hizb: number; // 1..60
  rub: number | null; // 1..240 (rub el-hizb)
  ruku: number; // per-surah ruku
  manzil: number; // 1..7
  page: number; // 1..604 (Madinah mushaf)
  sajdah: number | null; // 1..14 for the 14 sajdah ayat, else null
};

type IndexMeta = {
  totalAyat: number;
  juzCount: number;
  hizbCount: number;
  manzilCount: number;
  pageCount: number;
  rukuCount: number;
  sajdahCount: number;
};

let _all: AyahRef[] | null = null;
let _byJuz: Record<string, string[]> | null = null;
let _byHizb: Record<string, string[]> | null = null;
let _byRuku: Record<string, string[]> | null = null;
let _byManzil: Record<string, string[]> | null = null;
let _byPage: Record<string, string[]> | null = null;
let _meta: IndexMeta | null = null;

async function loadAll(): Promise<AyahRef[]> {
  if (_all) return _all;
  const mod = (await import("@/data/quran/index/ayat.json")) as { default: AyahRef[] };
  _all = mod.default;
  return _all;
}
async function loadByJuz(): Promise<Record<string, string[]>> {
  if (_byJuz) return _byJuz;
  const mod = (await import("@/data/quran/index/by-juz.json")) as {
    default: Record<string, string[]>;
  };
  _byJuz = mod.default;
  return _byJuz;
}
async function loadByHizb(): Promise<Record<string, string[]>> {
  if (_byHizb) return _byHizb;
  const mod = (await import("@/data/quran/index/by-hizb.json")) as {
    default: Record<string, string[]>;
  };
  _byHizb = mod.default;
  return _byHizb;
}
async function loadByRuku(): Promise<Record<string, string[]>> {
  if (_byRuku) return _byRuku;
  const mod = (await import("@/data/quran/index/by-ruku.json")) as {
    default: Record<string, string[]>;
  };
  _byRuku = mod.default;
  return _byRuku;
}
async function loadByManzil(): Promise<Record<string, string[]>> {
  if (_byManzil) return _byManzil;
  const mod = (await import("@/data/quran/index/by-manzil.json")) as {
    default: Record<string, string[]>;
  };
  _byManzil = mod.default;
  return _byManzil;
}
async function loadByPage(): Promise<Record<string, string[]>> {
  if (_byPage) return _byPage;
  const mod = (await import("@/data/quran/index/by-page.json")) as {
    default: Record<string, string[]>;
  };
  _byPage = mod.default;
  return _byPage;
}

export async function getIndexMeta(): Promise<IndexMeta> {
  if (_meta) return _meta;
  const mod = (await import("@/data/quran/index/meta.json")) as { default: IndexMeta };
  _meta = mod.default;
  return _meta;
}

// ─── Public accessors ────────────────────────────────────────────────────

export async function getAyahRef(surah: number, ayah: number): Promise<AyahRef | undefined> {
  const all = await loadAll();
  return all.find((r) => r.s === surah && r.a === ayah);
}

export async function getAyahRefByKey(key: string): Promise<AyahRef | undefined> {
  const all = await loadAll();
  return all.find((r) => r.key === key);
}

export async function ayatInJuz(juz: number): Promise<string[]> {
  const idx = await loadByJuz();
  return idx[String(juz)] ?? [];
}

export async function ayatInHizb(hizb: number): Promise<string[]> {
  const idx = await loadByHizb();
  return idx[String(hizb)] ?? [];
}

export async function ayatInManzil(manzil: number): Promise<string[]> {
  const idx = await loadByManzil();
  return idx[String(manzil)] ?? [];
}

export async function ayatInPage(page: number): Promise<string[]> {
  const idx = await loadByPage();
  return idx[String(page)] ?? [];
}

// Ruku is a GLOBAL division in the Madinah mushaf: 558 rukus across the whole
// Quran (not per-surah). URL is /quran/ruku/{n} with n in 1..558.
export async function ayatInRuku(ruku: number): Promise<string[]> {
  const idx = await loadByRuku();
  return idx[String(ruku)] ?? [];
}

// All 30 juz, with a display-friendly summary of which surah:ayah each starts on.
export type JuzSummary = {
  juz: number;
  firstKey: string;
  lastKey: string;
  ayahCount: number;
  surahs: number[]; // unique surah numbers touched by this juz
};

export async function summarizeJuz(): Promise<JuzSummary[]> {
  const all = await loadAll();
  const bucket = new Map<number, AyahRef[]>();
  for (const r of all) {
    const arr = bucket.get(r.juz) ?? [];
    arr.push(r);
    bucket.set(r.juz, arr);
  }
  const summaries: JuzSummary[] = [];
  for (const [juz, rows] of [...bucket.entries()].sort((a, b) => a[0] - b[0])) {
    const first = rows[0];
    const last = rows[rows.length - 1];
    if (!first || !last) continue;
    summaries.push({
      juz,
      firstKey: first.key,
      lastKey: last.key,
      ayahCount: rows.length,
      surahs: [...new Set(rows.map((r) => r.s))],
    });
  }
  return summaries;
}

export async function summarizeHizb(): Promise<
  Array<{ hizb: number; firstKey: string; lastKey: string; ayahCount: number; juz: number }>
> {
  const all = await loadAll();
  const bucket = new Map<number, AyahRef[]>();
  for (const r of all) {
    const arr = bucket.get(r.hizb) ?? [];
    arr.push(r);
    bucket.set(r.hizb, arr);
  }
  const out: Array<{
    hizb: number;
    firstKey: string;
    lastKey: string;
    ayahCount: number;
    juz: number;
  }> = [];
  for (const [hizb, rows] of [...bucket.entries()].sort((a, b) => a[0] - b[0])) {
    const first = rows[0];
    const last = rows[rows.length - 1];
    if (!first || !last) continue;
    out.push({
      hizb,
      firstKey: first.key,
      lastKey: last.key,
      ayahCount: rows.length,
      juz: first.juz,
    });
  }
  return out;
}

export async function summarizeManzil(): Promise<
  Array<{ manzil: number; firstKey: string; lastKey: string; ayahCount: number }>
> {
  const all = await loadAll();
  const bucket = new Map<number, AyahRef[]>();
  for (const r of all) {
    const arr = bucket.get(r.manzil) ?? [];
    arr.push(r);
    bucket.set(r.manzil, arr);
  }
  const out: Array<{ manzil: number; firstKey: string; lastKey: string; ayahCount: number }> = [];
  for (const [manzil, rows] of [...bucket.entries()].sort((a, b) => a[0] - b[0])) {
    const first = rows[0];
    const last = rows[rows.length - 1];
    if (!first || !last) continue;
    out.push({
      manzil,
      firstKey: first.key,
      lastKey: last.key,
      ayahCount: rows.length,
    });
  }
  return out;
}

export async function summarizePages(): Promise<
  Array<{ page: number; firstKey: string; lastKey: string; ayahCount: number }>
> {
  const all = await loadAll();
  const bucket = new Map<number, AyahRef[]>();
  for (const r of all) {
    const arr = bucket.get(r.page) ?? [];
    arr.push(r);
    bucket.set(r.page, arr);
  }
  const out: Array<{ page: number; firstKey: string; lastKey: string; ayahCount: number }> = [];
  for (const [page, rows] of [...bucket.entries()].sort((a, b) => a[0] - b[0])) {
    const first = rows[0];
    const last = rows[rows.length - 1];
    if (!first || !last) continue;
    out.push({
      page,
      firstKey: first.key,
      lastKey: last.key,
      ayahCount: rows.length,
    });
  }
  return out;
}

// All sajdah ayat (there are 14 in the mushaf).
export async function sajdahAyat(): Promise<AyahRef[]> {
  const all = await loadAll();
  return all.filter((r) => r.sajdah != null);
}
