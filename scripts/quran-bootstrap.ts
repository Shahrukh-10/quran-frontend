// scripts/quran-bootstrap.ts
//
// One-command initial setup for the Quran cache. Runs the full pipeline:
//   1. sync metadata (chapters, translations index, tafsirs index, reciters index)
//   2. sync verses (Uthmani + words for all 114 surahs)
//   3. sync default translations (Sahih Intl / Yusuf Ali / Taqi Usmani)
//   4. sync default tafsir (Ibn Kathir abridged)
//   5. sync default reciter (Al-Afasy) audio timings + chapter recitations
//   6. build the local search + division index
//   7. verify data integrity
//
// Safe to re-run — every step skips work that's already on disk unless you
// pass --force.
//
// Usage:
//   pnpm quran:bootstrap
//   pnpm quran:bootstrap --force        # re-fetch every resource from scratch
//   pnpm quran:bootstrap --skip-tafsir  # skip the slow tafsir step

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const force = args.includes("--force");
const skipTafsir = args.includes("--skip-tafsir");
const skipAudio = args.includes("--skip-audio");

async function run(script: string, scriptArgs: string[] = []): Promise<void> {
  const forceFlag = force ? ["--force"] : [];
  const all = [script, ...scriptArgs, ...forceFlag];
  console.log(`\n▶ tsx ${all.join(" ")}`);
  return new Promise((resolve, reject) => {
    const p = spawn("tsx", all, { stdio: "inherit", cwd: ROOT });
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with ${code}`));
    });
    p.on("error", reject);
  });
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Quran cache bootstrap");
  console.log(`Root: ${ROOT}`);
  console.log(`force: ${force} · skipTafsir: ${skipTafsir} · skipAudio: ${skipAudio}`);
  console.log("═══════════════════════════════════════════════════════════");

  // Step 1-2: metadata + verses (fast, ~2 min)
  await run("scripts/sync-quran-com.ts", ["--only=metadata"]);
  await run("scripts/sync-quran-com.ts", ["--only=verses"]);

  // Step 3: translations (~4 min for 3 translations)
  await run("scripts/sync-quran-com.ts", ["--only=translations"]);

  // Step 4: tafsirs (~25 min for Ibn Kathir — heaviest step)
  if (!skipTafsir) {
    await run("scripts/sync-quran-com.ts", ["--only=tafsirs"]);
  } else {
    console.log("\n⏭  Skipping tafsir sync (--skip-tafsir)");
  }

  // Step 5: audio timings + chapter recitations (~3 min)
  if (!skipAudio) {
    await run("scripts/sync-quran-com.ts", ["--only=audio"]);
  } else {
    console.log("\n⏭  Skipping audio sync (--skip-audio)");
  }

  // Step 6: build local index (~5 sec)
  await run("scripts/build-index.ts");

  // Step 7: verify
  await run("scripts/quran-verify.ts");

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ Bootstrap complete.");
  console.log("   Run `pnpm quran:stats` for an inventory of what's synced.");
  console.log("   Run `pnpm quran:verify` any time to re-check integrity.");
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("\n❌ Bootstrap failed:", err.message);
  process.exit(1);
});

// Silence "unused" TS complaint on rare Node versions that never call this.
void existsSync;
