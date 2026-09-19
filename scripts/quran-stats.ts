// scripts/quran-stats.ts
//
// Prints a compact inventory of the local Quran cache so you can see what's
// synced without shelling into the filesystem.
//
// Usage: pnpm quran:stats

import { existsSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const QDATA = join(ROOT, "quran-data");
const INDEX = join(ROOT, "data", "quran", "index");

function fmt(n: number): string {
  return n.toLocaleString();
}
function human(bytes: number): string {
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 ? 2 : 1)} ${u[i]}`;
}

async function dirSize(path: string): Promise<{ files: number; bytes: number }> {
  if (!existsSync(path)) return { files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  const stack = [path];
  while (stack.length) {
    const cur = stack.pop()!;
    const entries = await readdir(cur, { withFileTypes: true });
    for (const e of entries) {
      const full = join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) {
        files++;
        bytes += statSync(full).size;
      }
    }
  }
  return { files, bytes };
}

async function subdirCount(path: string, pattern = /^\d+$/): Promise<string[]> {
  if (!existsSync(path)) return [];
  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() && pattern.test(e.name)).map((e) => e.name);
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Local Quran cache inventory");
  console.log(`Path: ${QDATA}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const rows: Array<[string, string]> = [];

  const chaptersPath = join(QDATA, "chapters.json");
  rows.push([
    "chapters.json",
    existsSync(chaptersPath) ? `${human(statSync(chaptersPath).size)}` : "missing",
  ]);

  const verses = await dirSize(join(QDATA, "verses"));
  rows.push(["verses/", `${verses.files} files, ${human(verses.bytes)}`]);

  const tIds = await subdirCount(join(QDATA, "translations"));
  const tSize = await dirSize(join(QDATA, "translations"));
  rows.push([
    "translations/",
    `${tIds.length} resources [${tIds.join(", ") || "—"}] · ${tSize.files} files · ${human(tSize.bytes)}`,
  ]);

  const tafIds = await subdirCount(join(QDATA, "tafsirs"));
  const tafSize = await dirSize(join(QDATA, "tafsirs"));
  rows.push([
    "tafsirs/",
    `${tafIds.length} resources [${tafIds.join(", ") || "—"}] · ${tafSize.files} files · ${human(tafSize.bytes)}`,
  ]);

  const aIds = await subdirCount(join(QDATA, "audio-timings"));
  const aSize = await dirSize(join(QDATA, "audio-timings"));
  rows.push([
    "audio-timings/",
    `${aIds.length} reciters [${aIds.join(", ") || "—"}] · ${aSize.files} files · ${human(aSize.bytes)}`,
  ]);

  const crSize = await dirSize(join(QDATA, "chapter-recitations"));
  rows.push(["chapter-recitations/", `${crSize.files} files · ${human(crSize.bytes)}`]);

  const iSize = await dirSize(INDEX);
  rows.push(["data/quran/index/", `${iSize.files} files · ${human(iSize.bytes)}`]);

  // Sync state
  const syncStatePath = join(QDATA, "sync-state.json");
  rows.push([
    "sync-state.json",
    existsSync(syncStatePath)
      ? `${human(statSync(syncStatePath).size)} — last mtime ${new Date(statSync(syncStatePath).mtime).toISOString()}`
      : "missing (first sync not run yet)",
  ]);

  const width = Math.max(...rows.map(([k]) => k.length));
  for (const [k, v] of rows) {
    console.log(`  ${k.padEnd(width)}  ${v}`);
  }

  const total = await dirSize(QDATA);
  const indexT = await dirSize(INDEX);
  console.log("───────────────────────────────────────────────────────────");
  console.log(
    `Total: ${fmt(total.files + indexT.files)} files, ${human(total.bytes + indexT.bytes)}`,
  );
  console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("stats failed:", err);
  process.exit(1);
});
