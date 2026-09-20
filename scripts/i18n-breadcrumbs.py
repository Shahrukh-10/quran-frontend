#!/usr/bin/env python3
"""One-shot script to add localized BreadcrumbSchema names across app/[locale]/*.

For every file that renders <BreadcrumbSchema items={[...]}/> with hardcoded
English strings we recognise, replace name: "Foo" -> name: bc("foo") and inject
the required imports + bc initializer.

Idempotent: skips files where bc() call already exists.
Only edits files whose default export is an async function (so we can await).
"""
from __future__ import annotations
import re
from pathlib import Path

ROOT = Path("app/[locale]")

# Mapping: english-name-in-source -> breadcrumb key from lib/breadcrumbs.ts
NAME_TO_KEY = {
    "Home": "home",
    "Quran": "quran",
    "Duas": "duas",
    "Prayer times": "prayerTimes",
    "Qibla": "qibla",
    "Learn Salah": "learnSalah",
    "Learn": "learn",
    "Islamic calendar": "calendar",
    "Tools": "tools",
    "Search": "search",
    "Study Mode": "study",
    "Muṣḥaf reader": "mushaf",
    "Read (PDF)": "readPdf",
    "Word by word": "wordByWord",
    "Browse": "browse",
    "Learning Plans": "learningPlans",
    # Skipped intentionally: Sunrise/Fajr/Dhuhr/Asr/Maghrib/Isha (prayer time labels
    # inside FaqSchema, not breadcrumbs); city names, surah names, translator names,
    # dataset source names ("Tanzil", "Sunnah.com", ...).
}

BREADCRUMB_IMPORT = 'import { breadcrumbs } from "@/lib/breadcrumbs";'
BC_INIT_RE = re.compile(r"\bconst\s+bc\s*=\s*await\s+breadcrumbs\(")

# Regex to find the BreadcrumbSchema items block and rewrite name entries.
NAME_ENTRY_RE = re.compile(r'name:\s*"([^"]+)"')

# Only touch files with a locale param and setRequestLocale (they're server async pages).
LOCALE_SETUP_RE = re.compile(
    r"(\bsetRequestLocale\(\s*locale\s*\)\s*;\s*)", re.MULTILINE
)


def files_with_breadcrumb():
    for p in ROOT.rglob("*.tsx"):
        text = p.read_text()
        if "BreadcrumbSchema" in text:
            yield p, text


def add_import(source: str) -> str:
    if BREADCRUMB_IMPORT in source:
        return source
    # Find last import line, insert after it.
    lines = source.splitlines(keepends=True)
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("import ") or line.startswith('import "'):
            last_import_idx = i
    if last_import_idx == -1:
        return BREADCRUMB_IMPORT + "\n" + source
    lines.insert(last_import_idx + 1, BREADCRUMB_IMPORT + "\n")
    return "".join(lines)


def add_bc_init(source: str) -> str | None:
    if BC_INIT_RE.search(source):
        return source  # already has it
    match = LOCALE_SETUP_RE.search(source)
    if not match:
        return None  # not a server page we can safely modify
    idx = match.end()
    return source[:idx] + "\n  const bc = await breadcrumbs(locale);" + source[idx:]


def transform_breadcrumb_items(source: str) -> tuple[str, list[str]]:
    """Rewrite name: "English" -> name: bc("key") inside BreadcrumbSchema blocks.

    Also handles the special surrounding <BreadcrumbSchema items={[...]}/>
    by finding blocks starting with `<BreadcrumbSchema` and rewriting only
    `name:` entries inside them.
    """
    # Find each <BreadcrumbSchema ... /> block (may span multiple lines).
    result_parts: list[str] = []
    replaced_keys: list[str] = []
    pos = 0
    while True:
        start = source.find("<BreadcrumbSchema", pos)
        if start == -1:
            result_parts.append(source[pos:])
            break
        result_parts.append(source[pos:start])
        # Find the matching closing "/>" or "</BreadcrumbSchema>"
        # Simplest: find first "/>" after start.
        end = source.find("/>", start)
        if end == -1:
            # unusual; append remainder and quit
            result_parts.append(source[start:])
            break
        block = source[start : end + 2]

        def repl(m: re.Match) -> str:
            english = m.group(1)
            key = NAME_TO_KEY.get(english)
            if key is None:
                return m.group(0)  # leave untouched (data-driven names)
            replaced_keys.append(key)
            return f'name: bc("{key}")'

        new_block = NAME_ENTRY_RE.sub(repl, block)
        result_parts.append(new_block)
        pos = end + 2
    return "".join(result_parts), replaced_keys


def process(path: Path, source: str) -> tuple[str, list[str]] | None:
    new_source, replaced = transform_breadcrumb_items(source)
    if not replaced:
        return None  # nothing recognizable, leave alone
    if BREADCRUMB_IMPORT not in new_source:
        new_source = add_import(new_source)
    bc_added = add_bc_init(new_source)
    if bc_added is None:
        # Can't safely inject bc initializer (no setRequestLocale) — revert.
        return None
    return bc_added, replaced


def main():
    changed = 0
    for path, source in files_with_breadcrumb():
        result = process(path, source)
        if result is None:
            continue
        new_source, keys = result
        if new_source == source:
            continue
        path.write_text(new_source)
        changed += 1
        print(f"  patched {path} — {len(keys)} names: {keys}")
    print(f"\nTOTAL: {changed} files patched")


if __name__ == "__main__":
    main()
