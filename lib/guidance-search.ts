/**
 * RAG-based Islamic Q&A retrieval — semantic search over Quran + duas + hadith.
 *
 * SAFETY MODEL (non-negotiable):
 *   1. Content shown to users comes 100% from the pre-embedded corpus
 *      (data/guidance/corpus.json). Nothing is generated at runtime.
 *   2. The LLM narrator (when enabled) may ONLY quote citations that appear
 *      in the retrieved set — the response validator strips any citation
 *      the LLM invents.
 *   3. All embeddings + retrieval are deterministic — the same query returns
 *      the same top-K passages every time.
 *
 * ARCHITECTURE:
 *   - Corpus lives in data/guidance/corpus.json (built by
 *     scripts/build-guidance-corpus.mjs). Loaded once at server start.
 *   - Query embedding is one Workers AI call (@cf/baai/bge-base-en-v1.5, 768
 *     dims). Falls back to keyword match if Workers AI is unavailable.
 *   - Cosine similarity across ~6,300 vectors takes ~10ms in Node.
 */

import fs from "node:fs";
import path from "node:path";

export type CorpusKind = "ayah" | "dua" | "hadith";

export type CorpusEntry = {
  id: string;
  kind: CorpusKind;
  ref: string;
  title: string;
  text: string;
  arabic?: string;
  source: string;
  href: string;
  vector: number[];
};

export type Match = Omit<CorpusEntry, "vector"> & { score: number };

let CORPUS: CorpusEntry[] | null = null;

function loadCorpus(): CorpusEntry[] {
  if (CORPUS) return CORPUS;
  const p = path.join(process.cwd(), "data/guidance/corpus.json");
  if (!fs.existsSync(p)) {
    console.warn("[guidance] corpus.json not found — run scripts/build-guidance-corpus.mjs");
    CORPUS = [];
    return CORPUS;
  }
  const start = Date.now();
  const parsed = JSON.parse(fs.readFileSync(p, "utf8")) as CorpusEntry[];
  CORPUS = parsed;
  console.log(
    `[guidance] loaded ${parsed.length} entries in ${Date.now() - start}ms (${(
      fs.statSync(p).size / 1024 / 1024
    ).toFixed(1)} MB)`,
  );
  return CORPUS;
}

/** Cosine similarity between two vectors. Both vectors are already unit-normed
 *  by bge (bge-base-en-v1.5 outputs L2-normalized embeddings). */
function cosine(a: number[], b: number[]): number {
  let s = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i];
    const bv = b[i];
    if (av !== undefined && bv !== undefined) s += av * bv;
  }
  return s;
}

/** Embed a query via Cloudflare Workers AI. */
export async function embedQuery(text: string): Promise<number[] | null> {
  const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
  const CF_TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
  if (!CF_ACCOUNT || !CF_TOKEN) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[guidance] missing CLOUDFLARE_* env — cannot embed query");
    }
    return null;
  }
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/baai/bge-base-en-v1.5`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: [text.slice(0, 512)] }),
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[guidance] embed HTTP ${res.status}`);
      }
      return null;
    }
    const j = (await res.json()) as {
      success?: boolean;
      result?: { data?: number[][] };
    };
    if (!j.success || !j.result?.data?.[0]) return null;
    return j.result.data[0];
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[guidance] embed failed:", (err as Error).message);
    }
    return null;
  }
}

/** Search: embed query, then top-K per corpus kind by cosine similarity.
 *  Falls back to keyword-substring match if embedding fails. */
export async function guidanceSearch(
  query: string,
  perKind = 3,
): Promise<{ ayah: Match[]; dua: Match[]; hadith: Match[]; mode: "semantic" | "keyword" }> {
  const q = query.trim();
  if (!q) return { ayah: [], dua: [], hadith: [], mode: "keyword" };

  const corpus = loadCorpus();
  if (corpus.length === 0) return { ayah: [], dua: [], hadith: [], mode: "keyword" };

  const queryVec = await embedQuery(q);
  if (queryVec) {
    // Semantic search
    const scored = corpus.map((c) => ({ ...c, score: cosine(queryVec, c.vector) }));
    return {
      ayah: pickTopK(scored, "ayah", perKind),
      dua: pickTopK(scored, "dua", perKind),
      hadith: pickTopK(scored, "hadith", perKind),
      mode: "semantic",
    };
  }

  // Keyword fallback
  const tokens = q
    .toLowerCase()
    .split(/[\s,.:;!?()[\]"'/\\-]+/)
    .filter((t) => t.length >= 3);
  const scoreKeyword = (entry: CorpusEntry): number => {
    const hay = `${entry.title} ${entry.text}`.toLowerCase();
    let s = 0;
    for (const t of tokens) if (hay.includes(t)) s += 1;
    return s;
  };
  const scored = corpus.map((c) => ({ ...c, score: scoreKeyword(c) })).filter((c) => c.score > 0);
  return {
    ayah: pickTopK(scored, "ayah", perKind),
    dua: pickTopK(scored, "dua", perKind),
    hadith: pickTopK(scored, "hadith", perKind),
    mode: "keyword",
  };
}

function pickTopK(
  scored: Array<CorpusEntry & { score: number }>,
  kind: CorpusKind,
  k: number,
): Match[] {
  return scored
    .filter((c) => c.kind === kind)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ vector, ...rest }) => rest);
}
