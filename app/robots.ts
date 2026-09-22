import { siteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

// Comprehensive robots.txt for maximum discovery by:
//   - Traditional search engines (Google, Bing, DuckDuckGo, Yandex, Baidu, Naver)
//   - AI answer engines (ChatGPT, Perplexity, Claude, Gemini, You.com, Meta AI, Copilot)
//   - Ecosystem-specific crawlers (Apple, Amazon, Cohere, ByteDance, Anthropic training)
//
// Strategy:
//   1. Default policy for all bots (allow /, deny sensitive paths)
//   2. Explicit "welcome" entries for every major named AI crawler — some AI
//      crawlers only obey their own name, ignoring User-agent: *
//   3. Deny known bad bots (aggressive scrapers with no signal, image leeches)
//   4. Sitemap + host declarations
//
// AI-crawler naming reference:
//   - https://darkvisitors.com/agents
//   - https://github.com/ai-robots-txt/ai.robots.txt
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/search",
    "/compare",
    "/account",
    "/settings",
    "/notes",
    "/goals",
    "/plans",
    "/memorize",
    "/iqamah/submit",
    "/api/",
    "/*?page=",
    "/*?_rsc=",
    "/*?q=",
  ];

  return {
    rules: [
      // Default policy - allow all crawlers by default (open religious knowledge)
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },

      // ─── Traditional search engines ────────────────────────────────
      { userAgent: "Googlebot",       allow: "/", disallow },
      { userAgent: "Googlebot-Image", allow: "/", disallow },
      { userAgent: "Googlebot-News",  allow: "/", disallow },
      { userAgent: "Google-InspectionTool", allow: "/", disallow },
      { userAgent: "Bingbot",         allow: "/", disallow },
      { userAgent: "DuckDuckBot",     allow: "/", disallow },
      { userAgent: "YandexBot",       allow: "/", disallow },
      { userAgent: "Baiduspider",     allow: "/", disallow },
      { userAgent: "Yeti",            allow: "/", disallow }, // Naver
      { userAgent: "Applebot",        allow: "/", disallow },

      // ─── AI answer engines & LLM training crawlers ─────────────────
      // OpenAI
      { userAgent: "GPTBot",          allow: "/", disallow },
      { userAgent: "OAI-SearchBot",   allow: "/", disallow }, // ChatGPT Search
      { userAgent: "ChatGPT-User",    allow: "/", disallow }, // ChatGPT Actions
      // Anthropic
      { userAgent: "ClaudeBot",       allow: "/", disallow },
      { userAgent: "Claude-Web",      allow: "/", disallow },
      { userAgent: "anthropic-ai",    allow: "/", disallow },
      { userAgent: "Claude-SearchBot", allow: "/", disallow },
      // Google Gemini / Vertex
      { userAgent: "Google-Extended", allow: "/", disallow }, // Bard / Gemini training
      { userAgent: "GoogleOther",     allow: "/", disallow },
      { userAgent: "Google-CloudVertexBot", allow: "/", disallow },
      // Perplexity
      { userAgent: "PerplexityBot",   allow: "/", disallow },
      { userAgent: "Perplexity-User", allow: "/", disallow },
      // Meta / Facebook
      { userAgent: "Meta-ExternalAgent", allow: "/", disallow },
      { userAgent: "Meta-ExternalFetcher", allow: "/", disallow },
      { userAgent: "FacebookBot",     allow: "/", disallow },
      { userAgent: "facebookexternalhit", allow: "/", disallow }, // OG previews
      // Microsoft Copilot / Bing chat
      { userAgent: "CCBot",           allow: "/", disallow }, // Common Crawl (feeds many LLMs)
      // Amazon
      { userAgent: "Amazonbot",       allow: "/", disallow },
      // Cohere
      { userAgent: "cohere-ai",       allow: "/", disallow },
      { userAgent: "cohere-training-data-crawler", allow: "/", disallow },
      // Apple Intelligence
      { userAgent: "Applebot-Extended", allow: "/", disallow },
      // You.com
      { userAgent: "YouBot",          allow: "/", disallow },
      // Mistral / xAI / Diffbot / others
      { userAgent: "MistralAI-User",  allow: "/", disallow },
      { userAgent: "Diffbot",         allow: "/", disallow },
      { userAgent: "AwarioRssBot",    allow: "/", disallow },
      { userAgent: "AwarioSmartBot",  allow: "/", disallow },
      { userAgent: "DataForSeoBot",   allow: "/", disallow },
      { userAgent: "PetalBot",        allow: "/", disallow }, // Huawei
      // ByteDance (TikTok search / Doubao)
      { userAgent: "Bytespider",      allow: "/", disallow },
      { userAgent: "ByteDance",       allow: "/", disallow },
      // Zhipu / Kimi / Chinese LLMs
      { userAgent: "ChatGLM-Spider",  allow: "/", disallow },
      // Timpi / Kagi / DDG-derived
      { userAgent: "Kagibot",         allow: "/", disallow },
      { userAgent: "Timpibot",        allow: "/", disallow },
      // Social media / share-preview
      { userAgent: "Twitterbot",      allow: "/", disallow },
      { userAgent: "LinkedInBot",     allow: "/", disallow },
      { userAgent: "TelegramBot",     allow: "/", disallow },
      { userAgent: "WhatsApp",        allow: "/", disallow },
      { userAgent: "Slackbot",        allow: "/", disallow },
      { userAgent: "Discordbot",      allow: "/", disallow },
      // Islamic-content-aware indexers (help SEO in Arabic/Muslim-world search)
      { userAgent: "IslamicFinderBot", allow: "/", disallow },
    ],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl("/").replace(/\/$/, ""),
  };
}
