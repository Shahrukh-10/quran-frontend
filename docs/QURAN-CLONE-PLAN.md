# Quran.com Clone — Architecture & Roadmap

**Date drafted:** 20 Sept 2026
**Target codebase:** `/Users/i741781/Documents/personalProject/help` (Next 15, App Router, TS, next-intl, PWA scaffold)
**Data source:** Quran Foundation Content APIs v4 (`https://api.quran.com/api/v4/`) — no auth required for open endpoints, free, public. Audio CDN: `https://audio.qurancdn.com/`. User-review greenlit.

Guiding principle: **build one slice properly, then the next.** Not "add every feature shallowly."

---

## Part 1 — What quran.com actually offers (audit)

Grouped by user-facing feature, with API endpoints identified where relevant.

### A. Reading

1. **Chapter (surah) reader** — 114 surahs; verse-by-verse mode.
   API: `GET /verses/by_chapter/{id}?words=true&translations=...&fields=text_uthmani`
2. **Mushaf / book-page reader** — 604 pages of the King Fahd Complex Madinah mushaf, one page at a time, real page-flip UX. Uses the KFGQPC Uthmanic Hafs font so a page renders identically to the printed book.
   API: `GET /verses/by_page/{n}?words=true`
   Font: `KFGQPC-HAFS.ttf` (public domain, distributed on quran-com/quran-com-font repo).
3. **Juz / Hizb / Ruku / Manzil navigation** — 30 juz, 60 hizb, 240 ruku, 7 manzil.
   API: `GET /verses/by_juz/{n}`, `by_hizb/{n}`, etc.
4. **Script switcher** — Uthmani (default), IndoPak (South Asian), Imlaei (simplified), Tajweed-coloured.
   API: `text_uthmani`, `text_indopak`, `text_imlaei`, `text_uthmani_tajweed` fields on verses.
5. **Font settings** — size, spacing, translation font, Arabic font.
6. **Deep-linkable ayah URLs** — `/2:255`, `/al-baqarah/255`, `/page/42`.
7. **Ayah context menu** — copy with citation, share, play, bookmark, note, "reflect" (community).
8. **Sajda marker** — highlight the 15 sajdah verses.
9. **Chapter info** — pre-chapter intro (place of revelation, verse count, thematic summary, when to recite).
   API: `GET /chapters/{id}/info?language=en`

### B. Word-by-word study

10. **Clickable Arabic words** — click a word to see: transliteration + English meaning + morphology (root, form, part of speech) + audio pronunciation.
    API: request `words=true&word_fields=transliteration,translation,text_uthmani,audio_url,location,char_type_name` in any verses endpoint.
    Word audio: `https://audio.qurancdn.com/wbw/{sura}_{ayah}_{word}.mp3` (padded)
11. **Root browser** — every unique Arabic root, list of all verses using it. This one is complex — Quran.com uses their own morphology dataset. Deferred.

### C. Audio

12. **12 reciters** available via API (list from `/resources/recitations?language=en`):
    - AbdulBaset AbdulSamad (Murattal + Mujawwad)
    - Abdur-Rahman as-Sudais
    - Abu Bakr al-Shatri
    - Hani ar-Rifai
    - Mahmoud Khalil Al-Husary (Standard + Muallim)
    - Mishari Rashid al-`Afasy
    - Mohamed Siddiq al-Minshawi (Murattal + Mujawwad)
    - Sa`ud ash-Shuraym
    - Mohamed al-Tablawi
13. **Full-surah audio playback** — one MP3 for the whole surah.
    API: `GET /chapter_recitations/{recitation_id}/{chapter_id}` → returns `audio_url`.
14. **Ayah-by-ayah audio** — each ayah is a separate audio segment.
    API: `GET /recitations/{recitation_id}/by_ayah/{verse_key}` → returns audio segment + word-level timestamps.
15. **Word-synced highlighting** — as the reciter says each word, that word is visually highlighted. Requires `segments` array from the ayah-audio endpoint: `[[word_index, start_ms, end_ms], ...]`. Sync via `requestAnimationFrame` + `<audio>.currentTime`.
16. **Playback controls** — play/pause, next/prev ayah, playback speed, repeat, sticky bottom audio bar (like Spotify).
17. **Repeat / loop for hifz** — repeat one ayah N times, repeat a range, delay between repeats, gradually build up (start 1x → 5x). Deferred.

### D. Translations & tafsir

18. **126 translations across 40+ languages** — Sahih International, Yusuf Ali, Pickthall, Muhsin Khan, Abdul Haleem, Bridges', Taqi Usmani, Mufti Muhammad Shafi Maariful Quran, Maududi (Tafhim), Urdu (multiple), Bahasa Indonesia, Bahasa Melayu, French, German, Turkish, Russian, Persian, Bengali, Tamil, Malayalam, Kannada, Telugu, Chinese, Japanese, Korean, Spanish, Portuguese, and many more.
    API: `GET /resources/translations?language=en` for the list.
    Request one or more in verse queries: `translations=131,20,22` (comma-sep IDs).
19. **Multiple simultaneous translations** — user can stack 2–3 side by side.
20. **Tafsir texts** — Ibn Kathir (Abridged), Al-Jalalayn, Al-Tabari, Al-Sa'di, Al-Qurtubi, Ma'ariful Quran (Urdu), Tafhim-ul-Quran (Maududi), Kashani, Tafsir Fathul Majid, and more. ~15 available.
    API: `GET /resources/tafsirs?language=en`. Fetch: `GET /tafsirs/{tafsir_id}/by_ayah/{verse_key}`.
21. **Footnotes** — translations often include numbered footnotes with a hover/tap glossary.
    API: `GET /foot_notes/{id}` when a translation returns a footnote reference.

### E. Search

22. **Global search** — free-text query over Arabic text, transliteration, all translations, and tafsir corpus.
    API: `GET /search?q=mercy&size=20&page=0&language=en`
23. **Filters** — restrict to a translation, a language, a surah, a juz.
24. **Highlighted results** — search term bolded in the returned snippet (API returns HTML `<em>` tags in `highlighted` field).
25. **Suggestions / autocomplete** — semantic + keyword. quran.com uses Meilisearch on backend; we get suggestions via `GET /search/suggest?q=...`.

### F. Personal / social

26. **Bookmarks** — save an ayah for later.
27. **Notes** — private notes attached to an ayah.
28. **Reading progress + streaks + goals** — daily target (minutes or ayahs), streak counter, weekly graph.
29. **Recently visited** — last read chapter/ayah.
30. **QuranReflect** — community reflections per ayah, likes, comments, follow scholars.
    (Requires OAuth user session; out of scope for a v1 clone.)
31. **Ayah share cards** — generate a shareable image (Twitter/Instagram-friendly) of an ayah with Arabic + translation + attribution.

### G. Reading experience

32. **Dark / light / sepia / night themes** — you already have dark/light.
33. **Reading mode** — hide chrome, focus on text.
34. **Bookmark bar** — quick-access to bookmarked ayahs.
35. **Continue where you left off** — persistent last-read position per user (localStorage for anonymous).
36. **Keyboard shortcuts** — `j`/`k` next/prev ayah, `space` play/pause, `t` toggle translations.
37. **A11y** — ARIA labels on every ayah, screen-reader-friendly Arabic + translation, focus trap in reader.

### H. Meta

38. **Chapter list page** — grid of 114 chapters with name, translation, verse count, place of revelation.
39. **About / donate / developers pages** — Quran.com is a nonprofit; they have developer docs, API, GitHub.
40. **PWA offline** — download entire Quran text for offline use. You already scaffold a service worker.
41. **i18n site chrome** — quran.com UI in 30+ languages. You already have `next-intl` and multiple locales configured.

---

## Part 2 — What our app currently has vs. gap analysis

| Feature | Quran.com | Our app | Gap |
|---|---|---|---|
| Home page | ✓ | ✓ (with typography bg, glass ui) | none |
| Chapter list | ✓ | ✓ (`app/[locale]/quran/page.tsx`) | needs polish |
| Chapter reader | ✓ (mushaf + verse-by-verse) | placeholder (`[surah]/page.tsx` exists, thin) | **major build** |
| Ayah page | ✓ (deep-link, share card) | placeholder (`[ayah]/page.tsx` exists) | **major build** |
| Word-by-word | ✓ | ✗ | **new feature** |
| Audio reciters | ✓ (12) | ✗ | **new feature** |
| Word-synced audio | ✓ | ✗ | **new feature (complex)** |
| Translations picker | ✓ (126) | ✗ | **new feature** |
| Tafsir picker | ✓ (~15) | ✗ | **new feature** |
| Search | ✓ | ✗ | **new feature** |
| Bookmarks | ✓ (auth'd) | localStorage only | different scope |
| Notes | ✓ (auth'd) | ✗ | **new feature** |
| Reading progress / streaks | ✓ | ✗ | **new feature** |
| Prayer times | ✗ | ✓ (adhan lib, offline) | we're ahead |
| Duas library | limited | ✓ (35 duas, sourced) | we're ahead |
| Qibla | ✗ | ✓ | we're ahead |
| 99 Names | ✗ | ✓ | we're ahead |
| Learn salah | ✗ | ✓ | we're ahead |
| Islamic calendar / Hijri | ✗ | ✓ | we're ahead |
| Mushaf page view | ✓ (604 pages) | placeholder | **major build** |
| Ayah share cards | ✓ | ✗ | **new feature** |
| PWA offline | ✓ | ✓ (scaffold) | wire up |
| i18n site chrome | ✓ | ✓ (en, id) | expand langs |

**Verdict:** Our app is genuinely competitive on the "surrounding tools" (prayer times, duas, qibla, salah, calendar) where quran.com has nothing. The reading experience is where we're way behind, and that's what "clone quran.com" really means.

---

## Part 3 — Architecture proposal

### 3.1 Data layer — `lib/quran-api.ts`

Single thin wrapper around `https://api.quran.com/api/v4/`. All calls go through it so we can add caching, rate-limit handling, retries in one place.

```ts
// Zero-auth needed for v4 open Content APIs (verified via curl).
const BASE = "https://api.quran.com/api/v4";

export async function getChapter(id: number): Promise<Chapter>;
export async function getChapterInfo(id: number, lang: string): Promise<ChapterInfo>;
export async function getVersesByChapter(id: number, opts?: VerseOpts): Promise<VersePage>;
export async function getVerseByKey(key: string, opts?: VerseOpts): Promise<Verse>;
export async function getVersesByPage(n: number, opts?: VerseOpts): Promise<VersePage>;
export async function listTranslations(lang: string): Promise<Translation[]>;
export async function listTafsirs(lang: string): Promise<Tafsir[]>;
export async function listRecitations(): Promise<Recitation[]>;
export async function getAyahRecitation(recId: number, verseKey: string): Promise<AudioSegment>;
export async function getChapterRecitation(recId: number, chapterId: number): Promise<AudioFile>;
export async function search(q: string, opts?: SearchOpts): Promise<SearchResult>;
```

Caching strategy:
- **Static, versioned resources** (chapter list, translation list, reciter list): fetch at build time, ship as JSON in `data/quran/*.json`. Regenerate via `scripts/sync-quran-metadata.ts` monthly.
- **Verses**: cache aggressively — a verse's text never changes. Use Next 15's `fetch` with `revalidate: 604800` (1 week) for SSR pages, and IndexedDB on the client for offline PWA.
- **Audio files**: served directly from `audio.qurancdn.com` — the browser caches naturally. Add to service worker cache for offline surahs.

Failure modes:
- If Quran API is down → serve a small local fallback (Sahih International + Al-Fatihah + a few short surahs bundled locally so the app doesn't fully die).
- Show a toast: "Quran.com API unavailable; showing cached copy."

### 3.2 Route structure

```
app/[locale]/quran/
├── page.tsx                   # chapter list (has this)
├── [surah]/
│   ├── page.tsx               # verse-by-verse reader for surah — REWRITE
│   ├── [ayah]/
│   │   └── page.tsx           # single-ayah deep-link page — REWRITE
│   └── page/[n]/page.tsx      # mushaf page view (page 1–604 within surah) — NEW
├── search/page.tsx            # global search — NEW
├── juz/[n]/page.tsx           # by-juz reader — NEW
├── page/[n]/page.tsx          # mushaf page 1–604 — NEW
└── reciters/page.tsx          # reciter directory — NEW

components/quran/
├── verse-view.tsx             # single verse row (Arabic + translations + actions)
├── word-tooltip.tsx           # word-by-word popup with morphology
├── audio-player.tsx           # sticky bottom bar
├── audio-word-sync.tsx        # highlights word as audio plays
├── translation-picker.tsx     # multiselect for translations
├── tafsir-panel.tsx           # side panel showing selected tafsir
├── search-box.tsx             # global search input
├── search-results.tsx         # results list with highlighting
├── ayah-actions.tsx           # copy/share/bookmark/play menu
└── ayah-share-card.tsx        # canvas-generated share image
```

### 3.3 State (client)

- **Zustand** or plain React context for: current audio state, selected translations, selected reciter, font size, current playing verse.
- **localStorage** (via existing `lib/storage.ts`) for: bookmarks, notes, last-read position, preferences.
- **IndexedDB** (via `idb-keyval`) for: offline surah cache, per-user note text (avoids the 5MB localStorage cap).

### 3.4 Audio-sync algorithm (word highlighting)

This is the trickiest UX. Pseudocode:

```ts
// When user clicks play on an ayah:
const seg = await getAyahRecitation(reciterId, verseKey);
// seg.segments = [[wordIdx, startMs, endMs], ...]
audio.src = seg.audio_url;
audio.play();

// Every animation frame while playing:
function tick() {
  const t = audio.currentTime * 1000; // seconds → ms
  const active = seg.segments.find(([_, s, e]) => t >= s && t <= e);
  setActiveWord(active ? active[0] : -1);
  if (!audio.paused) requestAnimationFrame(tick);
}
```

Cross-surah continuous playback: on `audio.ended`, fetch next ayah's segment and swap src.

### 3.5 Search architecture

Quran API v1 search is server-side Elasticsearch — we just proxy. Wrap in `useDebouncedValue(400ms)` on the input. Show snippets with `highlighted` HTML (sanitize with DOMPurify).

### 3.6 Offline / PWA plan

Service worker (already scaffolded in `components/pwa/service-worker-register.tsx`) — extend to:
1. On install, cache the app shell + Sahih International + word-by-word data for all 6,236 verses (~4MB gzipped).
2. On demand: user can hit a "Download for offline" button on any surah/reciter → downloads all audio MP3s for that surah into cache.

### 3.7 Type safety

Generate types from the OpenAPI spec at `https://api-docs.quran.com/openapi/content_apis_versioned/4.0.0/openapi.json` using `openapi-typescript`. Store in `lib/generated/quran-api-types.ts`. This makes autocomplete & compile-time checks work across every API call.

---

## Part 4 — Proposed build sequence

Six phases, each **shippable on its own**. After each, refresh in Brave and you can review before I proceed.

### Phase 1 — Verse-by-verse reader (core reading experience)
**Duration estimate:** 1 focused session (~3–5 hours of my compute time, likely 1–3 sessions of yours)
**Deliverables:**
- `lib/quran-api.ts` wrapper with 6 core endpoints
- `data/quran/chapters.json` (114 chapters, prebuilt via a sync script)
- Rewritten `/quran/[surah]/page.tsx`:
  - Header: chapter name (Arabic + English), place of revelation, verse count, "Chapter info" toggle
  - Verse-by-verse list: Arabic (Uthmani) + up to 3 translations
  - Ayah number badge, sajdah marker, copy/share button per ayah
  - Translation picker (top-right dropdown, remembers choice in localStorage)
  - Font size + line-height controls
  - Uses the KFGQPC Uthmanic font locally hosted from `public/fonts/`
- Rewritten `/quran/[surah]/[ayah]/page.tsx`:
  - Full-width single-ayah deep-link page with SEO (JSON-LD, canonical, OG)
  - Same features as the surah reader but focused on one ayah
- Deep-link URL shortcut: `/quran/2:255` redirects to `/quran/al-baqarah/255`

### Phase 2 — Audio playback + word-synced highlighting
**Duration estimate:** 1 session
**Deliverables:**
- Reciter picker (`/quran/reciters` page + a dropdown in the reader)
- Sticky bottom audio bar (play/pause, next/prev ayah, seek, speed, current reciter, current verse)
- Per-ayah play button that jumps into continuous playback
- Word-by-word visual highlight synced to audio (`getAyahRecitation` + `requestAnimationFrame`)
- Hifz repeat mode (repeat N times, delay between)

### Phase 3 — Mushaf / book-page view
**Duration estimate:** 1 session
**Deliverables:**
- Bundle the KFGQPC Uthmanic Hafs font (~5MB, one-time)
- `/quran/page/[n]/page.tsx` — renders 604 pages exactly like the physical Madinah mushaf
- Page-turn animation (left/right, keyboard arrows)
- "Read as book" toggle from any surah view
- Prev/next page navigation

### Phase 4 — Tafsir + word-by-word study
**Duration estimate:** 1 session
**Deliverables:**
- Tafsir side panel per ayah (Ibn Kathir, Jalalayn, Sa'di available — user picks)
- Word tooltip on hover/tap — transliteration, English gloss, morphology, "play this word" audio
- Root browser deferred to a later phase

### Phase 5 — Search
**Duration estimate:** 1 session
**Deliverables:**
- Global search bar in the header (accessible via `/`)
- Search results page with highlighted snippets
- Filters (translation, surah, juz)
- Keyboard-driven navigation of results

### Phase 6 — Personal features
**Duration estimate:** 1 session
**Deliverables:**
- Bookmarks (localStorage + IndexedDB)
- Ayah notes (IndexedDB with per-ayah key)
- Reading progress: ayahs read today, streak counter, weekly bar chart
- "Continue reading" card on home page (uses last-read position)
- Ayah share cards (canvas → PNG, "Save image" and "Copy to clipboard")

### Deferred / future
- QuranReflect community (needs OAuth flow with Quran Foundation — big feature)
- Root-word browser (needs morphology dataset — external)
- Additional translations beyond the top 5 English ones bundled offline
- Additional Arabic scripts (IndoPak, Tajweed-coloured)

---

## Part 5 — Risks & open questions

1. **API rate limits.** Quran API doesn't advertise a hard limit for open v4 endpoints, but if we get 429'd in production we need caching + a fallback. Mitigation: aggressive caching, static build-time fetches for chapter metadata.
2. **Font licensing.** KFGQPC font is publicly redistributed on GitHub; the tajweed-coloured font may not be. Verify before bundling.
3. **Audio bandwidth.** A full surah of Al-Fatihah audio is ~200KB but Al-Baqarah is ~40MB per reciter. Don't preload; stream on demand only.
4. **Offline scope.** Bundling all 6,236 verses + Sahih International = ~4MB. Bundling all 12 reciters' audio = ~800MB. Only bundle text; audio is opt-in per surah.
5. **Layout on RTL/LTR mix.** Every ayah renders Arabic RTL + English LTR side by side. `dir="rtl"` scoping matters — one wrong element and the whole page breaks.
6. **Copyright.** Translations are all copyrighted works. Quran API serves them under agreements Quran.com has with translators. We're allowed to call the API and display; we cannot bundle the text and redistribute. So translations must **always** come from the live API (or be permitted-license translations only for offline bundling — Sahih International is the safest bet).
7. **Audio timing accuracy.** Not all reciters have word-level timestamps. Fallback to ayah-level highlight only when segments missing.
8. **iOS Safari audio autoplay.** iOS blocks audio autoplay until a user gesture. Our audio bar needs a first-play interaction; can't auto-resume across ayahs on iOS without an initial user tap. Chrome/Android don't have this limit.

---

## Part 6 — What I need from you before I start Phase 1

1. **Confirm the phase order** — reader → audio → mushaf → tafsir → search → personal. Or a different order?
2. **Locales scope** — do you want translations to auto-adapt to the user's `next-intl` locale (English translation for `/en`, Bahasa for `/id`, Urdu for `/ur`, etc.), or a manual language picker in the reader?
3. **Translation defaults** — which translations should be the top-3 offered by default? My recommendation: Sahih International (ID 20), Yusuf Ali (ID 22), Taqi Usmani (ID 84) for English. Confirm or override.
4. **Reciter default** — my recommendation: Mishari Al-Afasy (ID 7), globally the most-listened. Confirm or override.
5. **Font choice** — Uthmani via KFGQPC (matches Madinah mushaf), IndoPak via NooreHuda (matches South Asian mushafs), or both selectable? My recommendation: Uthmani default, IndoPak selectable.
6. **API failure UX** — if quran.com is down: show blank + toast, OR show a bundled minimal Quran (Al-Fatihah + Ya-Sin + Al-Mulk + last juz + Sahih International) with a warning. My recommendation: bundle a minimal fallback.

---

## Estimated total build time

Six phases × ~1 session each = **6 focused sessions** to reach feature parity with quran.com's core reading experience. Plus roughly 2 more sessions to polish, add PWA offline, and ship the deferred items.

That's realistic. "Clone all features" in one turn is not.
