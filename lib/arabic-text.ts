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
// Marks KEPT (they carry pronunciation info):
//   U+0670 dagger alif, U+0653 maddah, U+0654/5 hamza above/below,
//   U+0640 tatweel (letter-stretch), all fatha/kasra/damma/sukun/shadda/tanwin.

const STRIP_RE = /[\u06DF]/g;

/** Clean an Arabic string for display — see file-level comment. */
export function cleanArabicForDisplay(input: string): string {
  if (!input) return input;
  return input.replace(STRIP_RE, "");
}
