// Arabic text rendering helpers.
//
// The Uthmani text from quran-data/verses/*.json (Quran.com Foundation API's
// `text_uthmani` field) carries authentic mushaf diacritics. A few of these
// are technically correct per the Madinah Mushaf spec but render as visually
// heavy solid dots in the KFGQPC v18 font we ship, which readers find noisy
// compared to quran.com/recitequran.com — those sites use a proprietary
// per-word glyph font (code_v1) that hides these marks.
//
// We can't ship 604 page-fonts, so we take the pragmatic middle ground:
// strip the noisiest orthographic marks at RENDER time only. The source JSON
// stays fully authentic — if we ever switch to code_v1 later, we just stop
// calling this function.
//
// Marks removed:
//   U+06DF ARABIC SMALL HIGH ROUNDED ZERO — the "silent letter" dot that
//     shows above a silent waw/alif (e.g. أُو۟لَـٰٓئِكَ). Every printed mushaf
//     shows it, but quran.com/recitequran.com hide it visually.
//
// Imlaei normalisation (safety net):
//   U+0671 ARABIC LETTER ALEF WASLA (ٱ) → U+0627 ARABIC LETTER ALEF (ا).
//     The site serves South-Asian readers (India / Pakistan / Bangladesh /
//     Turkey / North Africa) whose local mushafs use plain alef; ٱ is a
//     Saudi Madinah-Mushaf feature that reads as "wrong" to them. The
//     authoritative orthography on this site is Imlaei. Data pipelines
//     SHOULD provide Imlaei in `ayah.arabic`, but if a page falls back to
//     `ayah.uthmani` (which has ٱ) this ensures the visible glyph is still
//     the plain alef every reader expects.
//
// Marks KEPT (they carry pronunciation info):
//   U+0670 dagger alif, U+0653 maddah, U+0654/5 hamza above/below,
//   U+0640 tatweel (letter-stretch), all fatha/kasra/damma/sukun/shadda/tanwin.

const STRIP_RE = /[\u06DF]/g;
const WASLA_RE = /\u0671/g;

/** Clean an Arabic string for display — see file-level comment. */
export function cleanArabicForDisplay(input: string): string {
  if (!input) return input;
  return input.replace(STRIP_RE, "").replace(WASLA_RE, "\u0627");
}
