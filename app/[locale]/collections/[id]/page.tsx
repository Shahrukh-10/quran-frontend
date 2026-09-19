"use client";
import { Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCollection, removeFromCollection } from "@/lib/storage";

type Ayah = { surah: number; ayah: number; arabic: string; translations: Record<string, string> };
type Coll = { id: string; name: string; ayahKeys: string[]; createdAt: number; pinned: boolean };

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [mounted, setMounted] = useState(false);
  const [coll, setColl] = useState<Coll | undefined>(undefined);
  const [ayat, setAyat] = useState<Ayah[]>([]);

  useEffect(() => {
    setMounted(true);
    const c = getCollection(id) as Coll | undefined;
    setColl(c);
    if (c) {
      Promise.all(c.ayahKeys.map(async (k) => {
        const [s, a] = k.split(":").map(Number);
        const res = await fetch(`/api/ayah/${s}/${a}`);
        if (res.ok) return res.json() as Promise<Ayah>;
        return null;
      })).then((rows) => setAyat(rows.filter((r): r is Ayah => r !== null)));
    }
  }, [id]);

  if (!mounted) return <main className="mx-auto max-w-reading px-4 py-12"><p className="text-muted-foreground text-center">Loading…</p></main>;
  if (!coll) return (
    <main className="mx-auto max-w-reading px-4 py-12 text-center">
      <h1 className="text-2xl font-bold">Collection not found</h1>
      <Link href="/collections" className="mt-4 inline-block text-accent hover:underline">← Back to collections</Link>
    </main>
  );

  return (
    <main className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/collections" className="text-sm text-accent hover:underline">← All collections</Link>
      <h1 className="mt-4 text-3xl font-bold tracking-display">{coll.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{coll.ayahKeys.length} ayat</p>
      <ol className="mt-8 space-y-4">
        {coll.ayahKeys.map((k) => {
          const a = ayat.find((x) => `${x.surah}:${x.ayah}` === k);
          return (
            <li key={k} className="rounded-2xl border border-separator bg-surface p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-accent">{k}</span>
                <button onClick={() => removeFromCollection(id, k)} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
              {a ? (
                <>
                  <p lang="ar" dir="rtl" className="mt-3 font-quran text-2xl leading-loose text-right">{a.arabic}</p>
                  <p className="mt-3 text-sm leading-relaxed">{a.translations["en.sahih"] ?? Object.values(a.translations)[0]}</p>
                </>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Loading ayah…</p>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
