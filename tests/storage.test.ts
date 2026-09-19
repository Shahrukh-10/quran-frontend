// storage.test.ts — regression tests for lib/storage.ts, specifically the
// "settings should apply live to every subscriber" contract. Vitest runs in
// a node environment by default in this project, so we install minimal
// window/localStorage shims here instead of pulling in jsdom.

import { beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (ev: Event) => void;

function installBrowserShims() {
  const store = new Map<string, string>();
  const listeners = new Map<string, Set<Listener>>();
  const localStorageShim = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  const windowShim = {
    localStorage: localStorageShim,
    addEventListener: (type: string, cb: Listener) => {
      const set = listeners.get(type) ?? new Set();
      set.add(cb);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, cb: Listener) => {
      listeners.get(type)?.delete(cb);
    },
    dispatchEvent: (ev: Event) => {
      const set = listeners.get(ev.type);
      if (set) for (const cb of set) cb(ev);
      return true;
    },
  };
  // Types: minimal — we only touch a handful of APIs from lib/storage.
  Object.assign(globalThis, {
    window: windowShim,
    localStorage: localStorageShim,
    CustomEvent:
      globalThis.CustomEvent ??
      class CustomEventShim<T> extends Event {
        detail: T;
        constructor(type: string, init?: { detail?: T }) {
          super(type);
          this.detail = init?.detail as T;
        }
      },
  });
}

describe("lib/storage", () => {
  beforeEach(() => {
    installBrowserShims();
    // Fresh import per suite so the module's `isBrowser()` check picks up
    // the shimmed window. Vitest caches ESM by default, so we vi.resetModules().
    vi.resetModules();
  });

  it("updateSettings persists partial patches and merges with defaults", async () => {
    const { getStore, updateSettings } = await import("../lib/storage");
    expect(getStore().settings.translation).toBe("en.sahih");
    updateSettings({ translation: "en.pickthall" });
    expect(getStore().settings.translation).toBe("en.pickthall");
    // Untouched keys keep their defaults
    expect(getStore().settings.reciter).toBe("ar.alafasy");
  });

  it("updateSettings dispatches exactly one iw:storage event per call", async () => {
    const { updateSettings } = await import("../lib/storage");
    let count = 0;
    const listener = () => {
      count += 1;
    };
    (
      globalThis as unknown as { window: { addEventListener: (t: string, cb: Listener) => void } }
    ).window.addEventListener("iw:storage", listener);
    updateSettings({ translation: "en.yusufali" });
    expect(count).toBe(1);
    updateSettings({ fontSize: "xl" });
    expect(count).toBe(2);
  });

  it("languageMode default is 'arabic-and-translation' and updates apply", async () => {
    const { getStore, updateSettings } = await import("../lib/storage");
    expect(getStore().settings.languageMode).toBe("arabic-and-translation");
    updateSettings({ languageMode: "translation-only" });
    expect(getStore().settings.languageMode).toBe("translation-only");
  });

  it("toggleAyahBookmark round-trips and fires iw:storage", async () => {
    const { toggleAyahBookmark, isAyahBookmarked } = await import("../lib/storage");
    let events = 0;
    (
      globalThis as unknown as { window: { addEventListener: (t: string, cb: Listener) => void } }
    ).window.addEventListener("iw:storage", () => {
      events += 1;
    });
    expect(isAyahBookmarked(2, 1)).toBe(false);
    expect(toggleAyahBookmark(2, 1)).toBe(true);
    expect(isAyahBookmarked(2, 1)).toBe(true);
    expect(toggleAyahBookmark(2, 1)).toBe(false);
    expect(events).toBe(2);
  });
});

describe("lib/storage — Slice C (notes, collections, streak, plans, pins)", () => {
  beforeEach(() => {
    installBrowserShims();
    vi.resetModules();
  });

  it("setNote / getNote round-trips text, createdAt, updatedAt; empty text deletes", async () => {
    const { setNote, getNote } = await import("../lib/storage");
    const before = Date.now();
    setNote("2:255", "Ayat al-Kursi — pillar of tawhid.");
    const n = getNote("2:255");
    expect(n).not.toBeNull();
    expect(n?.text).toBe("Ayat al-Kursi — pillar of tawhid.");
    expect(n?.createdAt).toBeGreaterThanOrEqual(before);
    expect(n?.updatedAt).toBeGreaterThanOrEqual(n?.createdAt ?? 0);

    // Deletion on empty string
    setNote("2:255", "");
    expect(getNote("2:255")).toBeNull();
  });

  it("collection lifecycle: create, add, remove, verify", async () => {
    const { createCollection, addToCollection, removeFromCollection, getCollection } = await import(
      "../lib/storage"
    );
    const id = createCollection("Patience");
    expect(getCollection(id)?.name).toBe("Patience");
    expect(addToCollection(id, "2:153")).toBe(true);
    expect(getCollection(id)?.ayahKeys).toEqual(["2:153"]);
    // idempotent add
    expect(addToCollection(id, "2:153")).toBe(false);
    expect(removeFromCollection(id, "2:153")).toBe(true);
    expect(getCollection(id)?.ayahKeys).toEqual([]);
  });

  it("recordReadingActivity increments streak on consecutive days and resets on gap", async () => {
    const { recordReadingActivity, getStreak } = await import("../lib/storage");
    recordReadingActivity("2026-09-19");
    expect(getStreak().current).toBe(1);
    recordReadingActivity("2026-09-20");
    expect(getStreak().current).toBe(2);
    expect(getStreak().longest).toBe(2);

    // Gap of 2 days breaks the streak
    recordReadingActivity("2026-09-22");
    expect(getStreak().current).toBe(1);
    // longest is retained
    expect(getStreak().longest).toBe(2);

    // Idempotent — same date twice is a no-op
    recordReadingActivity("2026-09-22");
    expect(getStreak().current).toBe(1);
    expect(getStreak().activityDates).toEqual(["2026-09-19", "2026-09-20", "2026-09-22"]);
  });

  it("pinAyah enforces max of 5", async () => {
    const { pinAyah, getPinnedAyat } = await import("../lib/storage");
    expect(pinAyah("1:1")).toBe(true);
    expect(pinAyah("1:2")).toBe(true);
    expect(pinAyah("1:3")).toBe(true);
    expect(pinAyah("1:4")).toBe(true);
    expect(pinAyah("1:5")).toBe(true);
    // 6th must be rejected
    expect(pinAyah("1:6")).toBe(false);
    expect(getPinnedAyat()).toHaveLength(5);
    // Newest at front
    expect(getPinnedAyat()[0]).toBe("1:5");
    // Duplicate pin returns false
    expect(pinAyah("1:3")).toBe(false);
  });
});
