// GET /api/ayah/[surah]/[ayah] — JSON endpoint returning a single ayah.
// Consumed by /compare (client component) and future client widgets that
// need to hydrate ayah content without a full surah bundle. Server-only
// route handler; reads the same per-surah JSON files as lib/quran.ts.
//
// Quran text is fixed for all time — response is safe to cache forever.
// Validates params strictly: 404 for out-of-range surah or ayah numbers.

import { getSurahByNumber, loadAyah } from "@/lib/quran";
import { NextResponse } from "next/server";

// Force static behaviour where possible — this handler has no side effects.
export const dynamic = "force-static";
export const revalidate = false;

type Params = { surah: string; ayah: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { surah: surahStr, ayah: ayahStr } = await params;

  const surah = Number.parseInt(surahStr, 10);
  const ayah = Number.parseInt(ayahStr, 10);

  if (!Number.isInteger(surah) || surah < 1 || surah > 114) {
    return NextResponse.json({ error: "Invalid surah" }, { status: 404 });
  }
  if (!Number.isInteger(ayah) || ayah < 1) {
    return NextResponse.json({ error: "Invalid ayah" }, { status: 404 });
  }

  const meta = getSurahByNumber(surah);
  if (!meta) {
    return NextResponse.json({ error: "Surah not found" }, { status: 404 });
  }
  if (ayah > meta.ayahCount) {
    return NextResponse.json({ error: "Ayah out of range" }, { status: 404 });
  }

  const data = await loadAyah(surah, ayah);
  if (!data) {
    // Data file for this surah may not have been fetched yet (only seeded
    // surahs ship in-repo — see lib/quran.ts SEEDED_SURAHS). Return 404 so
    // callers can render a friendly stub.
    return NextResponse.json({ error: "Ayah content unavailable" }, { status: 404 });
  }

  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
