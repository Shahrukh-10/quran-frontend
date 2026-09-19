"use client";
import { Link } from "@/i18n/routing";
import { useEffect, useMemo, useState } from "react";
import { getAllNotes, setNote } from "@/lib/storage";
import { getSurahByNumber } from "@/lib/quran";

type Note = { verseKey: string; text: string; createdAt: number; updatedAt: number };

export default function NotesPage() {
  const [mounted, setMounted] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    setNotes(getAllNotes());
    const onChange = () => setNotes(getAllNotes());
    window.addEventListener("iw:storage", onChange);
    return () => window.removeEventListener("iw:storage", onChange);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter((n) => n.text.toLowerCase().includes(q) || n.verseKey.includes(q));
  }, [notes, query]);

  if (!mounted) return <main className="mx-auto max-w-reading px-4 py-12"><p className="text-muted-foreground text-center">Loading your notes…</p></main>;

  return (
    <main className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <header>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Your notes</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">Notes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Personal reflections on ayat you've studied.</p>
      </header>

      {notes.length > 0 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your notes…"
          className="focus-ring mt-8 w-full rounded-lg border border-separator bg-background px-3 h-11 text-sm"
        />
      )}

      {notes.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-separator bg-surface p-8 text-center">
          <p className="text-muted-foreground">You haven't written any notes yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">Open any ayah in <Link href="/quran" className="text-accent hover:underline">Study Mode</Link> and add a personal reflection.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground text-center">No notes match "{query}".</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {filtered.map((n) => {
            const [sStr, aStr] = n.verseKey.split(":");
            const s = Number.parseInt(sStr ?? "0", 10);
            const a = Number.parseInt(aStr ?? "0", 10);
            const surah = getSurahByNumber(s);
            return (
              <li key={n.verseKey} className="rounded-2xl border border-separator bg-surface p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <Link href={`/study/${s}-${a}?tab=notes` as "/study/[verseKey]"} className="text-sm font-semibold text-accent hover:underline">
                    {surah?.name ?? `Surah ${s}`} · {n.verseKey}
                  </Link>
                  <span className="text-xs text-muted-foreground">{new Date(n.updatedAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {n.text.length > 200 ? `${n.text.slice(0, 200)}…` : n.text}
                </p>
                <div className="mt-3 flex gap-3">
                  <Link href={`/study/${s}-${a}?tab=notes` as "/study/[verseKey]"} className="text-xs text-accent hover:underline">Open in Study Mode</Link>
                  <button onClick={() => { if (confirm("Delete this note?")) setNote(n.verseKey, ""); }} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
