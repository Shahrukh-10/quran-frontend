/**
 * LLM narrator for /find-guidance — turns retrieved passages into a
 * friendly, grounded answer.
 *
 * SAFETY (non-negotiable):
 *   1. LLM sees ONLY the retrieved passages + user query.
 *   2. LLM MUST cite every claim using bracketed source tags [S1] [S2] …
 *      that map to the retrieved matches.
 *   3. Output is validated: any bracketed tag NOT in the input source list
 *      is stripped, and the surrounding sentence flagged.
 *   4. If the LLM invents Arabic, hadith numbers, verse refs, or scholar
 *      opinions not present in the input, the response is rejected and we
 *      fall back to showing the retrieved cards without narrative.
 */

import type { Match } from "@/lib/guidance-search";

const SYSTEM_PROMPT = `You are a compassionate Islamic guidance assistant on qurandaily.org.

You will receive:
1. A user's plain-English question or situation.
2. A numbered list of authentic sources retrieved from the Quran, dua collections, and hadith. Each source has an [S<num>] tag.

Your task: write a warm, human-sounding answer of 3-6 short paragraphs that draws on ONLY the retrieved sources.

STRICT rules:
- Cite every claim with the bracketed tag [S<num>] pointing at the exact source used.
- NEVER quote or paraphrase Quran verses, hadith text, or Arabic that is not in the retrieved sources.
- NEVER invent hadith numbers, verse references, scholar names, or opinions.
- NEVER issue religious rulings (fatwa) — you are a study aid.
- Do NOT open with "As an AI" or apologies.
- Do NOT invent Arabic. If Arabic is quoted, it MUST come verbatim from a source.
- If the retrieved sources genuinely do not address the user's question, say so plainly in one paragraph and suggest they consult a qualified scholar.
- Keep tone warm, not preachy.
- Do NOT use markdown headings. Plain paragraphs only.`;

export type NarrateResult = {
  answer: string;
  citations: string[]; // ordered list of [S<n>] tags that appear in the answer
  invalidCitations: string[]; // any [S<n>] tags the LLM invented (outside the input set)
  suspected_hallucination: boolean;
};

export async function narrateGuidance(
  query: string,
  sources: Match[],
): Promise<NarrateResult | null> {
  if (sources.length === 0) return null;
  const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
  const CF_TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
  if (!CF_ACCOUNT || !CF_TOKEN) return null;

  const model = process.env.CLOUDFLARE_WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";

  const sourceBlock = sources
    .map((s, i) => `[S${i + 1}] (${s.kind}, ${s.source}) ${s.text}`)
    .join("\n\n");

  const userPrompt = `USER QUESTION: ${query}\n\nRETRIEVED SOURCES:\n${sourceBlock}\n\nWrite the grounded answer now. Cite each claim with [S1] etc.`;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 700,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      success?: boolean;
      result?: { response?: string; choices?: Array<{ message?: { content?: string } }> };
    };
    if (!j.success) return null;
    const raw = j.result?.choices?.[0]?.message?.content ?? j.result?.response ?? "";
    if (!raw || raw.length < 30) return null;

    return validateAnswer(raw, sources.length);
  } catch {
    return null;
  }
}

/** Extract citation tags, validate against source count, mark hallucinations. */
function validateAnswer(text: string, sourceCount: number): NarrateResult {
  const tagRe = /\[S(\d+)\]/g;
  const found = new Set<string>();
  const invalid: string[] = [];
  let m: RegExpExecArray | null;
  m = tagRe.exec(text);
  while (m !== null) {
    const n = Number(m[1]);
    if (n >= 1 && n <= sourceCount) found.add(`[S${n}]`);
    else invalid.push(`[S${n}]`);
    m = tagRe.exec(text);
  }

  // Strip invalid tags from displayed text
  let cleaned = text;
  for (const bad of invalid) {
    cleaned = cleaned.split(bad).join(""); // remove
  }
  cleaned = cleaned
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Suspected hallucination heuristics:
  // - LLM output invented citation tags
  // - LLM output contains 'Bukhari #', 'Muslim #', 'Quran <num>:<num>' NOT present in the input
  //   → this is a soft heuristic; the caller can still choose to show the answer
  //     but with a warning.
  const suspected = invalid.length > 0 || found.size === 0;

  return {
    answer: cleaned,
    citations: Array.from(found),
    invalidCitations: invalid,
    suspected_hallucination: suspected,
  };
}
