// Text sanitizers for hadith content. The upstream Fawaz Ahmed hadith dataset
// (the source of every hadith Arabic on this site) contains a large amount of
// bidirectional-formatting cruft that was originally used to force RTL rendering
// in text-based tools like Word / older browsers. In a modern browser with a
// proper `dir="rtl"` container, these marks:
//
//   U+200E LEFT-TO-RIGHT MARK
//   U+200F RIGHT-TO-LEFT MARK
//   U+202A..U+202E EMBEDDING/OVERRIDE MARKS
//   U+2066..U+2069 ISOLATE MARKS
//
// serve no purpose. Worse, several Arabic web fonts render an orphan U+200F
// (which we found appearing 46× inside a SINGLE Bukhari hadith and in 7553/7589
// of Bukhari) as a small visible mark — the "black dot" the user reported.
//
// The dataset also wraps quoted narrations with the awkward pattern
//   ‏"‏  the-quote  ‏"‏‏.‏
// which after RLM-strip becomes
//   "  the-quote  ".
// with wonky spacing. We collapse that into elegant Arabic guillemets « … ».
//
// Everything here is idempotent: applying twice equals applying once.

/**
 * Strip bidirectional formatting marks and normalize narrator-quote punctuation
 * in a raw hadith Arabic string. Safe for any Arabic text; no-op on empty.
 */
export function cleanHadithArabic(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw;

  // 1. Strip all bidi-format controls (RLM/LRM/isolates/embeddings/overrides).
  //    This is the fix for the visible black-dot glyph on ~99.5% of Bukhari.
  s = s.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");

  // 2. Collapse "  double-quote whitespace  " sequences left behind after
  //    RLM strip. Fawaz's data wrapped narrator-quotes as "‏"‏ ... ‏"‏"; once
  //    the RLM chars are gone we're left with `" ... ".` with awkward spacing.
  //    Trim spaces adjacent to ASCII/curly double quotes on the RTL side.
  s = s.replace(/\s*"\s*/g, ' "');
  // Merge accidental double-quote-then-period into "period-inside-quote"
  s = s.replace(/"\s*\./g, '."');

  // 3. Elegant Arabic guillemets. Only apply when quotes are BALANCED (even
  //    count) so we don't accidentally mismatch open/close on a partial
  //    string. Even parity = pair them; odd parity = leave ASCII quotes.
  const quoteCount = (s.match(/"/g) || []).length;
  if (quoteCount > 0 && quoteCount % 2 === 0) {
    let open = true;
    s = s.replace(/"/g, () => {
      const ch = open ? "«" : "»";
      open = !open;
      return ch;
    });
    // The guillemets flank the quote *content*, not the punctuation. Move
    // any period that ended up inside the closer to just after it.
    s = s.replace(/\.»/g, "».");
  }

  // 4. Normalize whitespace: collapse >2 spaces, trim orphans around commas,
  //    strip leading/trailing whitespace.
  s = s.replace(/\s{2,}/g, " ").replace(/\s+،/g, "،").trim();

  return s;
}

/**
 * Apply cleanHadithArabic to every element in a hadith list/detail payload
 * coming back from the backend. Server-side use only (the browser gets the
 * already-cleaned strings once ISR revalidates).
 */
export function cleanHadithPayload<
  T extends { arabic?: string | null; hadiths?: Array<{ arabic?: string | null }> },
>(payload: T | undefined): T | undefined {
  if (!payload) return payload;
  if (typeof payload.arabic === "string") {
    payload.arabic = cleanHadithArabic(payload.arabic);
  }
  if (Array.isArray(payload.hadiths)) {
    for (const h of payload.hadiths) {
      if (typeof h.arabic === "string") {
        h.arabic = cleanHadithArabic(h.arabic);
      }
    }
  }
  return payload;
}
