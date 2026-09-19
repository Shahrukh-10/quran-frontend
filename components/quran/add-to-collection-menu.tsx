"use client";
import { useEffect, useState } from "react";
import { getAllCollections, createCollection, addToCollection } from "@/lib/storage";

type Coll = { id: string; name: string; ayahKeys: string[] };

export function AddToCollectionMenu({ verseKey, className }: { verseKey: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cols, setCols] = useState<Coll[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setMounted(true);
    setCols(getAllCollections() as Coll[]);
    const onChange = () => setCols(getAllCollections() as Coll[]);
    window.addEventListener("iw:storage", onChange);
    return () => window.removeEventListener("iw:storage", onChange);
  }, []);

  if (!mounted) return null;

  return (
    <details className={className} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="focus-ring cursor-pointer text-sm text-accent hover:underline">Save</summary>
      <div className="mt-2 rounded-2xl border border-separator bg-surface p-3 shadow-lg">
        {cols.length === 0 && <p className="text-xs text-muted-foreground">No collections yet.</p>}
        <ul className="space-y-1">
          {cols.map((c) => (
            <li key={c.id}>
              <button onClick={() => { addToCollection(c.id, verseKey); setOpen(false); }} className="focus-ring w-full text-left text-sm px-2 py-1 rounded hover:bg-muted">
                {c.name} <span className="text-xs text-muted-foreground">({c.ayahKeys.length})</span>
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); const n = newName.trim(); if (n) { const id = createCollection(n); addToCollection(id, verseKey); setNewName(""); setOpen(false); } }} className="mt-2 pt-2 border-t border-separator flex gap-1">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="+ new collection" className="focus-ring flex-1 text-xs px-2 py-1 rounded border border-separator bg-background" />
          <button type="submit" disabled={!newName.trim()} className="text-xs text-accent disabled:opacity-50">Add</button>
        </form>
      </div>
    </details>
  );
}
