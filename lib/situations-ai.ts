/**
 * Cloudflare Workers AI ranker for the /find-guidance BETA feature.
 *
 * SAFETY MODEL (non-negotiable):
 *   1. The LLM NEVER generates hadith, Quran verses, or translations. It sees
 *      only situation IDs + short human-written descriptions.
 *   2. The LLM's only allowed output is a JSON array of IDs from the fixed set
 *      we send. Any ID it invents that isn't in our curated graph is discarded.
 *   3. If the LLM call fails, times out, or returns garbage, we fall back to
 *      the deterministic keyword search — no user-facing error.
 *   4. Content shown to users still comes 100% from the hand-curated
 *      situations.json + duas.json + Quran verses. The LLM is a router, not a
 *      speaker.
 *
 * Uses the free tier (10,000 neurons/day). @cf/meta/llama-3.1-8b-instruct is
 * fast (~500ms P50) and cheap on neurons. If daily quota is exhausted the
 * fallback keyword ranker takes over transparently.
 */

import { type Situation, getAllSituations } from "@/lib/situations";

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
const CF_MODEL = process.env.CLOUDFLARE_WORKERS_AI_MODEL ?? "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_PROMPT = `You are a routing assistant for an Islamic guidance web site.

You are given:
- A user's problem/situation in plain English.
- A fixed list of curated "situation" cards, each with an ID and short description.

Your ONLY task is to select the up-to-5 most relevant situation IDs from the list.

Rules (strict):
- You MUST output ONLY a JSON array of situation IDs, e.g. ["anxiety-grief","fear-danger"].
- You MUST NOT invent new IDs. Every ID in your output must exist in the list I give you.
- You MUST NOT write any hadith, Quran verse, translation, dua, or Arabic text.
- You MUST NOT add explanations, apologies, greetings, or any prose. Only the JSON array.
- Return AT MOST 5 IDs, ordered from most relevant to least relevant.
- If NO situation is a plausible match, return an empty array [].`;

type RankInput = { query: string; situations: Situation[] };

function buildUserPrompt({ query, situations }: RankInput): string {
  const cards = situations.map((s) => {
    // Give the LLM a compact human-readable summary (first 5 labels — those
    // are the highest-signal keywords).
    const summary = s.labels.slice(0, 5).join(", ");
    return `- ${s.id}: ${summary}`;
  });
  return [
    `USER SITUATION: ${query}`,
    ``,
    `AVAILABLE SITUATION IDs (pick from these — do not invent any):`,
    ...cards,
    ``,
    `Return a JSON array of the most relevant IDs (up to 5).`,
  ].join("\n");
}

function extractIdArray(text: string): string[] {
  if (!text) return [];
  // The model sometimes wraps the JSON in prose. Extract the first [..] block.
  const m = text.match(/\[[\s\S]*?\]/);
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

/** Rank situations for a user query using Cloudflare Workers AI.
 *
 *  Returns an ordered list of Situation objects. If anything goes wrong
 *  (missing env, network fail, malformed response, empty response), returns
 *  `null` so the caller can fall back to the deterministic keyword ranker.
 *  The caller must handle `null`.
 */
export async function rankSituationsWithAI(query: string, limit = 5): Promise<Situation[] | null> {
  if (!CF_ACCOUNT || !CF_TOKEN) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[situations-ai] missing CLOUDFLARE_* env — skipping LLM");
    }
    return null;
  }

  const situations = getAllSituations() as Situation[];
  if (situations.length === 0) return null;

  const body = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt({ query, situations }) },
    ],
    // Small budget — we're asking for a short JSON array
    max_tokens: 128,
    temperature: 0.2,
  };

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${CF_MODEL}`;

  let raw: string;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // Fail fast — if CF is slow, fall back to keyword ranking
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[situations-ai] HTTP ${res.status}`, await res.text());
      }
      return null;
    }
    const json = (await res.json()) as {
      result?: {
        response?: string;
        choices?: Array<{ message?: { content?: string } }>;
      };
      success?: boolean;
      errors?: unknown;
    };
    if (!json.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[situations-ai] not-success", json.errors);
      }
      return null;
    }
    raw = json.result?.choices?.[0]?.message?.content ?? json.result?.response ?? "";
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[situations-ai] fetch failed:", (err as Error).message);
    }
    return null;
  }

  const ids = extractIdArray(raw);
  if (ids.length === 0) return null;

  // Guard: whitelist against real situation IDs. Discard any hallucinated ID.
  const known = new Map(situations.map((s) => [s.id, s] as const));
  const ranked: Situation[] = [];
  for (const id of ids) {
    const s = known.get(id);
    if (s && !ranked.includes(s)) {
      ranked.push(s);
      if (ranked.length >= limit) break;
    }
  }
  if (ranked.length === 0) return null;
  return ranked;
}
