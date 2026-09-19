"use client";
// Client-side notes editor for Study Mode. State + effects + localStorage → must be client.
// Auto-saves with 800ms debounce; deletes the note when text is emptied.

import { getNote, setNote } from "@/lib/storage";
import { useEffect, useRef, useState } from "react";

type Props = { verseKey: string };

export function NoteEditor({ verseKey }: Props) {
  const [text, setText] = useState<string>("");
  const [saved, setSaved] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedRef = useRef<string>("");

  // Read the note on mount, and sync across tabs via the iw:storage event.
  useEffect(() => {
    const load = () => {
      const n = getNote(verseKey);
      const t = n?.text ?? "";
      setText(t);
      lastPersistedRef.current = t;
      setHydrated(true);
    };
    load();
    const onStorage = () => load();
    window.addEventListener("iw:storage", onStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("iw:storage", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, [verseKey]);

  // Debounced auto-save. Empty string triggers deletion via setNote's own contract.
  useEffect(() => {
    if (!hydrated) return;
    const trimmed = text.trim();
    if (trimmed === lastPersistedRef.current) return;
    const handle = setTimeout(() => {
      setNote(verseKey, trimmed);
      lastPersistedRef.current = trimmed;
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    }, 800);
    return () => clearTimeout(handle);
  }, [text, verseKey, hydrated]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const chars = text.length;

  return (
    <div className="note-editor mt-2 flex flex-col gap-2" data-testid="note-editor">
      <textarea
        aria-label="Your personal note for this ayah"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a personal note about this ayah — reflections, questions, cross-references. Saved locally on this device only."
        className="w-full resize-y rounded-md border border-border bg-background/60 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{chars} characters</span>
        <span
          aria-live="polite"
          className={`transition-opacity duration-500 ${saved ? "opacity-100" : "opacity-0"}`}
        >
          Saved ✓
        </span>
      </div>
    </div>
  );
}
