# Quran content sync — how it works

This project keeps a local copy of the Quran (Arabic text, translations, tafsirs,
audio timings) so the app can render entirely from disk without hitting the live
[Quran.com Content APIs](https://api-docs.quran.com/) on every request.

## What lives where

    quran-data/
      chapters.json                     # 114 chapter metadata rows
      translations.json                 # index of ALL translations offered by quran.com (126+ rows)
      tafsirs.json                      # index of all tafsirs
      recitations.json                  # index of all reciters
      verses/{1..114}.json              # Uthmani text + Indopak + Imlaei + word-by-word
      translations/{id}/{1..114}.json   # each translation, split per surah
      tafsirs/{id}/{1..114}.json        # each tafsir, per surah
      audio-timings/{reciterId}/{1..114}.json  # per-word audio segments
      chapter-recitations/{reciterId}.json     # full-surah MP3 URLs
      sync-state.json                   # per-resource sync state (written by the sync script)

    data/quran/
      surahs.json                       # legacy chapter metadata used by lib/quran.ts
      surahs/{1..114}.json              # legacy per-surah verses (Al-Quran Cloud shape) — used by AyahCard
      index/                            # derived — rebuilt from quran-data/verses by `pnpm quran:build-index`
        ayat.json                       # every ayah's juz/hizb/ruku/manzil/page/sajdah — flat 6236-row array
        by-juz.json / by-hizb.json / by-ruku.json / by-manzil.json / by-page.json
        search.json                     # tashkeel-stripped Arabic + Sahih/Yusuf/Pickthall + transliteration
        meta.json                       # counts + build timestamp

The two data trees exist because the app was originally built against Al-Quran
Cloud, and was later augmented with the richer quran.com data. Both are kept in
sync so page components can use whichever is cheaper. Migration to a single
tree (backed by a proper database) is planned for Slice B.

## Which script does what

| Command | What it does |
|---|---|
| `pnpm quran:bootstrap` | One-command initial setup. Runs metadata → verses → translations → tafsirs → audio → build-index → verify. Idempotent. |
| `pnpm quran:sync` | Alias for `sync-quran-com.ts`. Accepts `--only=metadata\|verses\|translations\|tafsirs\|audio` and `--force`. |
| `pnpm sync:quran-com` | Same as above, kept for backwards compatibility. |
| `pnpm quran:build-index` | Rebuilds `data/quran/index/` from `quran-data/verses/`. Cheap (~5 sec), run after any verse-data change. |
| `pnpm quran:verify` | Data integrity gate — see below. Exit non-zero on failure. |
| `pnpm quran:stats` | Compact inventory of what's synced, file counts + sizes. |
| `pnpm fetch:quran` | Legacy fetcher against Al-Quran Cloud — used to populate `data/quran/surahs/`. Kept because the current AyahCard renders from there. |

## `pnpm quran:verify` — integrity gate

Runs the following checks, in order. Non-zero exit if any FAIL fires (WARN
does not fail the run):

1. `chapters.json` present with 114 rows.
2. All 114 `verses/{s}.json` files present.
3. Every chapter's row count matches its `verses_count`.
4. 6,236 total ayat. Every `verse_key` matches `\d{1,3}:\d{1,3}`. No duplicates.
5. Every ayah has non-empty `text_uthmani`.
6. Every word's `location` matches `${surah}:${ayah}:${position}` (~83,665 words).
7. Translations: every synced translation has 6,236 rows and >99% non-empty text.
8. Tafsirs: same shape check. Density < 99% is a WARN (tafsir syncs are slow;
   don't fail deploys mid-sync). Density < 50% is a FAIL.
9. Audio timings: every ayah has a segments array (>99% populated for a proper
   reciter).
10. Chapter recitations: 114 rows per reciter with valid HTTPS URLs.
11. Cross-index: `data/quran/index/ayat.json` matches `quran-data/verses/` on
    every juz/hizb/ruku/manzil/page mapping.

Add to CI:

    - name: Verify Quran data
      run: pnpm quran:verify

Add to a pre-deploy hook to gate builds on a healthy dataset.

## Sync state

Every successful sync of a resource writes to `quran-data/sync-state.json`:

    {
      "version": 1,
      "resources": {
        "metadata":                { "status": "success", "lastSyncAt": "2026-09-19T21:35:12.123Z", "contentVersion": 3 },
        "verses":                  { "status": "success", "lastSyncAt": "2026-09-19T20:47:44.891Z", "contentVersion": 1 },
        "translations:20,84,22":   { "status": "success", "lastSyncAt": "2026-09-19T20:52:03.114Z", "contentVersion": 1 },
        "tafsirs:169":             { "status": "success", "lastSyncAt": "2026-09-19T22:12:41.007Z", "contentVersion": 1 },
        "audio:7":                 { "status": "success", "lastSyncAt": "2026-09-19T21:03:12.442Z", "contentVersion": 1 }
      }
    }

Failed syncs record `{ status: "failed", lastAttemptAt, error }` on the same
resource key so the next run can decide whether to retry.

The Spring Boot backend planned for Slice B will read this file at startup and
mirror the state into its `qc_sync_state` table.

## Rate limits & retry policy

`sync-quran-com.ts` uses:

- Exponential backoff on `429` and `5xx` (1s, 2s, 4s, 8s, 16s).
- 5 retries per request, then it gives up on that one row and moves on.
- 150-250ms sleep between requests (~4-6 rps).
- The tafsir step is the slowest — Ibn Kathir Abridged fetch is 6,236 per-ayah
  requests. Expect ~25 minutes on a stable connection.

## Attribution

All content in `quran-data/` is fetched from Quran.com's public Content APIs.
Uthmani text is public domain (Tanzil / KFGQPC). Translations and tafsirs are
copyrighted works served by Quran.com under arrangements with translators; the
`/sources` page in the site credits every original author.
