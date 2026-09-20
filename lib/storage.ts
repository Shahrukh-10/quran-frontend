// Typed wrapper around localStorage. Namespaced under a single root key so we can
// export/delete everything at once (see feature #105-106 in docs/PLAN.md).
// SSR-safe: every helper no-ops on the server. Never throw on quota errors —
// swallow and return the fallback so worship UX never breaks because of storage.

const ROOT_KEY = "iw.v1";

export type Store = {
  bookmarks: Array<{ surah: number; ayah: number; addedAt: number }>;
  lastRead: { surah: number; ayah: number; at: number } | null;
  duaBookmarks: string[]; // slugs
  prayerTracker: Record<
    string,
    Partial<Record<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha", "onTime" | "late">>
  >;
  fastingLog: Record<string, boolean>; // ISO date → completed
  dhikrCounts: Record<string, number>;
  settings: {
    reciter: string;
    translation: string;
    // What to render on the ayah reader: both, Arabic only, or translation
    // only. Controlled by the segmented "language mode" control on the
    // surah page. See components/quran/ayah-card.tsx for rendering logic.
    languageMode: "arabic-and-translation" | "arabic-only" | "translation-only";
    showTransliteration: boolean;
    calcMethod: string;
    madhab: "shafi" | "hanafi";
    theme: "system" | "light" | "dark";
    fontSize: "sm" | "md" | "lg" | "xl";
    dyslexiaMode: boolean;
    lowBandwidth: boolean;
    calendar: "hijri" | "gregorian";
  };
  // Slice C — notes attached to specific ayat, keyed by verseKey "s:a".
  notes: Record<string, { text: string; createdAt: number; updatedAt: number }>;
  // Slice C — user-curated collections of ayat.
  collections: Array<{
    id: string;
    name: string;
    ayahKeys: string[]; // ordered list of "s:a"
    createdAt: number;
    pinned: boolean;
  }>;
  // Slice C — long-form reading goal (finish Quran by targetDate).
  readingGoal: {
    targetDate: string; // ISO date (YYYY-MM-DD)
    startedAt: number;
    pace: "juz-per-day" | "hizb-per-day" | "custom";
    customAyatPerDay?: number;
  } | null;
  // Slice C — reading streak tracker.
  streak: {
    current: number;
    longest: number;
    lastActivityDate: string; // YYYY-MM-DD (empty string if none)
    activityDates: string[]; // YYYY-MM-DD, sorted asc, deduplicated
  };
  // Slice C — user progress against structured learning plans.
  learningPlans: Array<{
    planId: string;
    startedAt: number;
    currentDay: number; // 1-indexed
    completedDays: number[];
  }>;
  // Slice C — up to 5 pinned ayat, newest at front.
  pinnedAyat: string[];
  // V2 memorization tool — SM-2 spaced-repetition cards keyed by "s:a".
  // See lib/memorize.ts for the algorithm; this store just persists the data.
  memorization: Record<string, import("./memorize").MemoCard>;
};

const defaultStore: Store = {
  bookmarks: [],
  lastRead: null,
  duaBookmarks: [],
  prayerTracker: {},
  fastingLog: {},
  dhikrCounts: {},
  settings: {
    reciter: "ar.alafasy",
    translation: "en.sahih",
    languageMode: "arabic-and-translation",
    showTransliteration: true,
    calcMethod: "MWL",
    madhab: "shafi",
    theme: "system",
    fontSize: "md",
    dyslexiaMode: false,
    lowBandwidth: false,
    calendar: "gregorian",
  },
  notes: {},
  collections: [],
  readingGoal: null,
  streak: {
    current: 0,
    longest: 0,
    lastActivityDate: "",
    activityDates: [],
  },
  learningPlans: [],
  pinnedAyat: [],
  memorization: {},
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): Store {
  if (!isBrowser()) return defaultStore;
  try {
    const raw = window.localStorage.getItem(ROOT_KEY);
    if (!raw) return defaultStore;
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      ...defaultStore,
      ...parsed,
      settings: { ...defaultStore.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return defaultStore;
  }
}

export function writeAll(next: Store): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ROOT_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("iw:storage"));
  } catch {
    /* quota / private mode / corrupt — never throw */
  }
}

export function getStore(): Store {
  return readAll();
}

export function updateSettings(patch: Partial<Store["settings"]>): void {
  const s = readAll();
  writeAll({ ...s, settings: { ...s.settings, ...patch } });
}

export function toggleAyahBookmark(surah: number, ayah: number): boolean {
  const s = readAll();
  const idx = s.bookmarks.findIndex((b) => b.surah === surah && b.ayah === ayah);
  if (idx >= 0) {
    s.bookmarks.splice(idx, 1);
    writeAll(s);
    return false;
  }
  s.bookmarks.push({ surah, ayah, addedAt: Date.now() });
  writeAll(s);
  return true;
}

export function isAyahBookmarked(surah: number, ayah: number): boolean {
  return readAll().bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
}

export function setLastRead(surah: number, ayah: number): void {
  const s = readAll();
  s.lastRead = { surah, ayah, at: Date.now() };
  writeAll(s);
}

export function toggleDuaBookmark(slug: string): boolean {
  const s = readAll();
  const has = s.duaBookmarks.includes(slug);
  s.duaBookmarks = has ? s.duaBookmarks.filter((x) => x !== slug) : [...s.duaBookmarks, slug];
  writeAll(s);
  return !has;
}

export function logPrayer(
  isoDate: string,
  prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha",
  status: "onTime" | "late",
): void {
  const s = readAll();
  s.prayerTracker[isoDate] = { ...(s.prayerTracker[isoDate] ?? {}), [prayer]: status };
  writeAll(s);
}

export function logFast(isoDate: string, done: boolean): void {
  const s = readAll();
  s.fastingLog[isoDate] = done;
  writeAll(s);
}

export function bumpDhikr(key: string, by = 1): number {
  const s = readAll();
  const next = (s.dhikrCounts[key] ?? 0) + by;
  s.dhikrCounts[key] = next;
  writeAll(s);
  return next;
}

export function resetDhikr(key: string): void {
  const s = readAll();
  s.dhikrCounts[key] = 0;
  writeAll(s);
}

// Full export/delete for feature #105-106 (data ownership).
export function exportAll(): Store {
  return readAll();
}

export function deleteAll(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ROOT_KEY);
    window.dispatchEvent(new CustomEvent("iw:storage"));
  } catch {
    /* swallow */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Slice C — notes, collections, reading goal, streak, plans, pinned ayat.
// All mutators go through readAll/writeAll so the `iw:storage` event fires.
// ─────────────────────────────────────────────────────────────────────────────

type Note = { text: string; createdAt: number; updatedAt: number };
type Collection = Store["collections"][number];
type UserPlan = Store["learningPlans"][number];

const MAX_PINNED = 5;

// ── Notes ────────────────────────────────────────────────────────────────────

export function setNote(verseKey: string, text: string): void {
  const s = readAll();
  if (text === "") {
    if (s.notes[verseKey]) {
      const { [verseKey]: _drop, ...rest } = s.notes;
      s.notes = rest;
      writeAll(s);
    }
    return;
  }
  const now = Date.now();
  const existing = s.notes[verseKey];
  s.notes = {
    ...s.notes,
    [verseKey]: {
      text,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
  writeAll(s);
}

export function getNote(verseKey: string): Note | null {
  return readAll().notes[verseKey] ?? null;
}

export function getAllNotes(): Array<{ verseKey: string } & Note> {
  const notes = readAll().notes;
  return Object.entries(notes)
    .map(([verseKey, n]) => ({ verseKey, ...n }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// ── Collections ──────────────────────────────────────────────────────────────

function makeCollectionId(): string {
  return `col_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createCollection(name: string): string {
  const s = readAll();
  const id = makeCollectionId();
  s.collections = [
    ...s.collections,
    { id, name, ayahKeys: [], createdAt: Date.now(), pinned: false },
  ];
  writeAll(s);
  return id;
}

export function renameCollection(id: string, name: string): boolean {
  const s = readAll();
  const idx = s.collections.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  s.collections = s.collections.map((c, i) => (i === idx ? { ...c, name } : c));
  writeAll(s);
  return true;
}

export function deleteCollection(id: string): boolean {
  const s = readAll();
  const next = s.collections.filter((c) => c.id !== id);
  if (next.length === s.collections.length) return false;
  s.collections = next;
  writeAll(s);
  return true;
}

export function togglePinCollection(id: string): boolean {
  const s = readAll();
  const idx = s.collections.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  s.collections = s.collections.map((c, i) => (i === idx ? { ...c, pinned: !c.pinned } : c));
  writeAll(s);
  return true;
}

export function addToCollection(collectionId: string, verseKey: string): boolean {
  const s = readAll();
  const idx = s.collections.findIndex((c) => c.id === collectionId);
  if (idx < 0) return false;
  const col = s.collections[idx];
  if (!col) return false;
  if (col.ayahKeys.includes(verseKey)) return false;
  s.collections = s.collections.map((c, i) =>
    i === idx ? { ...c, ayahKeys: [...c.ayahKeys, verseKey] } : c,
  );
  writeAll(s);
  return true;
}

export function removeFromCollection(collectionId: string, verseKey: string): boolean {
  const s = readAll();
  const idx = s.collections.findIndex((c) => c.id === collectionId);
  if (idx < 0) return false;
  const col = s.collections[idx];
  if (!col) return false;
  if (!col.ayahKeys.includes(verseKey)) return false;
  s.collections = s.collections.map((c, i) =>
    i === idx ? { ...c, ayahKeys: c.ayahKeys.filter((k) => k !== verseKey) } : c,
  );
  writeAll(s);
  return true;
}

export function reorderCollection(collectionId: string, orderedKeys: string[]): boolean {
  const s = readAll();
  const idx = s.collections.findIndex((c) => c.id === collectionId);
  if (idx < 0) return false;
  const col = s.collections[idx];
  if (!col) return false;
  if (col.ayahKeys.length !== orderedKeys.length) return false;
  const a = [...col.ayahKeys].sort();
  const b = [...orderedKeys].sort();
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  s.collections = s.collections.map((c, i) =>
    i === idx ? { ...c, ayahKeys: [...orderedKeys] } : c,
  );
  writeAll(s);
  return true;
}

export function getCollection(id: string): Collection | undefined {
  return readAll().collections.find((c) => c.id === id);
}

export function getAllCollections(): Collection[] {
  const list = [...readAll().collections];
  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
  return list;
}

// ── Reading goal ─────────────────────────────────────────────────────────────

export function setReadingGoal(goal: Store["readingGoal"]): void {
  const s = readAll();
  s.readingGoal = goal;
  writeAll(s);
}

export function getReadingGoal(): Store["readingGoal"] {
  return readAll().readingGoal;
}

// ── Streak ───────────────────────────────────────────────────────────────────

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  // Parse YYYY-MM-DD as UTC midnight — safe because we only compute a diff.
  const [ay = 1970, am = 1, ad = 1] = a.split("-").map((n) => Number.parseInt(n, 10));
  const [by = 1970, bm = 1, bd = 1] = b.split("-").map((n) => Number.parseInt(n, 10));
  const ta = Date.UTC(ay, am - 1, ad);
  const tb = Date.UTC(by, bm - 1, bd);
  return Math.round((tb - ta) / 86_400_000);
}

export function recordReadingActivity(date?: string): void {
  const s = readAll();
  const d = date ?? todayLocalISO();
  const last = s.streak.lastActivityDate;

  if (last === d) return; // idempotent

  let nextCurrent: number;
  if (!last) {
    nextCurrent = 1;
  } else {
    const diff = daysBetween(last, d);
    if (diff === 1) nextCurrent = s.streak.current + 1;
    else if (diff === 0) return; // same day (defensive; already handled above)
    else nextCurrent = 1; // gap (or backdated entry) resets streak
  }

  const activityDates = s.streak.activityDates.includes(d)
    ? s.streak.activityDates
    : [...s.streak.activityDates, d].sort();

  s.streak = {
    current: nextCurrent,
    longest: Math.max(s.streak.longest, nextCurrent),
    lastActivityDate: d,
    activityDates,
  };
  writeAll(s);
}

export function getStreak(): Store["streak"] {
  return readAll().streak;
}

// ── Learning plans ───────────────────────────────────────────────────────────

export function startPlan(planId: string): void {
  const s = readAll();
  if (s.learningPlans.some((p) => p.planId === planId)) return;
  s.learningPlans = [
    ...s.learningPlans,
    { planId, startedAt: Date.now(), currentDay: 1, completedDays: [] },
  ];
  writeAll(s);
}

export function markPlanDayComplete(planId: string, day: number): void {
  const s = readAll();
  const idx = s.learningPlans.findIndex((p) => p.planId === planId);
  if (idx < 0) return;
  const plan = s.learningPlans[idx];
  if (!plan) return;
  const completedDays = plan.completedDays.includes(day)
    ? plan.completedDays
    : [...plan.completedDays, day].sort((a, b) => a - b);
  const currentDay = day === plan.currentDay ? plan.currentDay + 1 : plan.currentDay;
  s.learningPlans = s.learningPlans.map((p, i) =>
    i === idx ? { ...p, completedDays, currentDay } : p,
  );
  writeAll(s);
}

export function getUserPlan(planId: string): UserPlan | undefined {
  return readAll().learningPlans.find((p) => p.planId === planId);
}

export function getAllUserPlans(): UserPlan[] {
  return readAll().learningPlans;
}

// ── Pinned ayat ──────────────────────────────────────────────────────────────

export function pinAyah(verseKey: string): boolean {
  const s = readAll();
  if (s.pinnedAyat.includes(verseKey)) return false;
  if (s.pinnedAyat.length >= MAX_PINNED) return false;
  s.pinnedAyat = [verseKey, ...s.pinnedAyat];
  writeAll(s);
  return true;
}

export function unpinAyah(verseKey: string): boolean {
  const s = readAll();
  if (!s.pinnedAyat.includes(verseKey)) return false;
  s.pinnedAyat = s.pinnedAyat.filter((k) => k !== verseKey);
  writeAll(s);
  return true;
}

export function getPinnedAyat(): string[] {
  return readAll().pinnedAyat;
}

// ---------- Memorization (V2) ----------

import { createCard, rateCard, type MemoCard, type Rating } from "./memorize";

/** Add an ayah to the memorization deck. No-op if already present. Returns the (possibly existing) card. */
export function addMemoCard(verseKey: string): MemoCard {
  const s = readAll();
  const existing = s.memorization[verseKey];
  if (existing) return existing;
  const card = createCard(verseKey);
  s.memorization[verseKey] = card;
  writeAll(s);
  return card;
}

/** Remove an ayah from the memorization deck. */
export function removeMemoCard(verseKey: string): boolean {
  const s = readAll();
  if (!(verseKey in s.memorization)) return false;
  delete s.memorization[verseKey];
  writeAll(s);
  return true;
}

/** Apply a rating and persist the updated card. Returns the new card. */
export function reviewMemoCard(verseKey: string, rating: Rating): MemoCard | null {
  const s = readAll();
  const card = s.memorization[verseKey];
  if (!card) return null;
  const next = rateCard(card, rating);
  s.memorization[verseKey] = next;
  writeAll(s);
  return next;
}

/** Snapshot of all cards. Returns a stable array. */
export function getAllMemoCards(): MemoCard[] {
  return Object.values(readAll().memorization);
}

/** True if the given ayah is in the deck. */
export function isMemorizing(verseKey: string): boolean {
  return verseKey in readAll().memorization;
}
