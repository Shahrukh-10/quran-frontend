import fs from "node:fs";
import { guidanceSearch } from "../lib/guidance-search.ts";
const envFile = fs.readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
  if (m && !line.startsWith("#")) process.env[m[1]] = m[2];
}

const queries = [
  "I am traveling next week",
  "I feel very alone",
  "My father has cancer",
  "I want to memorize Quran",
];
for (const q of queries) {
  console.log(`\n=== ${q} ===`);
  const r = await guidanceSearch(q, 3);
  console.log("mode:", r.mode);
  for (const kind of ["ayah", "hadith", "dua"]) {
    console.log(`--- ${kind} ---`);
    for (const m of r[kind]) {
      console.log(`  [${m.score.toFixed(3)}] ${m.source}: ${m.text.slice(0, 80)}...`);
    }
  }
}
