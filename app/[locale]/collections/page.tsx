"use client";
import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import {
  getAllCollections,
  createCollection,
  renameCollection,
  deleteCollection,
  togglePinCollection,
} from "@/lib/storage";

type Coll = { id: string; name: string; ayahKeys: string[]; createdAt: number; pinned: boolean };

export default function CollectionsPage() {
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
  if (!mounted) return <main className="mx-auto max-w-reading px-4 py-12"><p className="text-muted-foreground text-center">Loading collections…</p></main>;

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createCollection(name);
    setNewName("");
  };

  return (
    <main className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <header>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Save & organize</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">Collections</h1>
        <p className="mt-2 text-sm text-muted-foreground">Group ayat by theme or project.</p>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="mt-8 flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection name"
          className="focus-ring flex-1 rounded-lg border border-separator bg-background px-3 h-11 text-sm"
        />
        <button type="submit" disabled={!newName.trim()} className="focus-ring h-11 rounded-lg bg-accent px-5 text-sm font-semibold text-[hsl(var(--accent-foreground))] hover:bg-accent/90 disabled:opacity-50">Create</button>
      </form>

      {cols.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground text-center">No collections yet. When reading, tap the &apos;Save&apos; menu on any ayah.</p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {cols.map((c) => (
            <li key={c.id} className="rounded-2xl border border-separator bg-surface p-5">
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/collections/${c.id}` as "/collections/[id]"} className="font-semibold tracking-title hover:text-accent">{c.name}{c.pinned && <span className="ml-2 text-xs text-accent">★ pinned</span>}</Link>
                <span className="text-xs text-muted-foreground">{c.ayahKeys.length} ayat</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Created {new Date(c.createdAt).toLocaleDateString()}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => togglePinCollection(c.id)} className="focus-ring text-xs text-accent hover:underline">{c.pinned ? "Unpin" : "Pin"}</button>
                <button onClick={() => { const name = prompt("Rename to", c.name); if (name) renameCollection(c.id, name); }} className="focus-ring text-xs text-muted-foreground hover:text-foreground hover:underline">Rename</button>
                <button onClick={() => { if (confirm(`Delete '${c.name}'?`)) deleteCollection(c.id); }} className="focus-ring text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
