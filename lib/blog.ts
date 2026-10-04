// Blog post registry — single source of truth for the /blog listing,
// /blog/[slug] detail pages, sitemap shard, and related-posts widget.
//
// Every entry MUST cite classical or verifiable sources in the body when it
// asserts a religious fact (Quran ayah, hadith, scholarly opinion). No fake
// author bylines — posts ship under "Quran Daily Editorial".
//
// Adding a new post:
//   1. Add the entry below
//   2. Create app/[locale]/blog/[slug]/page.tsx (or use the dynamic detail
//      route which reads `bodyHtml` off this entry)
//   3. Rebuild — the sitemap shard picks it up automatically

export type BlogCategory =
  | "quran-study"
  | "hadith"
  | "prayer"
  | "islamic-history"
  | "digital-fiqh"
  | "editorial";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  tags: string[];
  author: string;
  readingMin: number;
  wordCount: number;
  publishedAt: string; // ISO date (YYYY-MM-DD)
  updatedAt?: string;
  coverGradient: [string, string]; // hero fallback if no image
  coverImage?: string; // absolute URL preferred, else /public path
  // Structured body — an array of HTML strings, rendered by the detail page.
  // Every string must be a complete HTML block (starts with <). No markdown.
  bodyHtml: string[];
  // FAQ Q/A pairs for FAQPage JSON-LD
  faqs?: Array<{ q: string; a: string }>;
  // Internal-link targets displayed in the "Related on Quran Daily" strip
  relatedPaths?: string[];
  // External hub links displayed in the "Read next" strip (cross-site).
  externalLinks?: Array<{ href: string; label: string; site: string }>;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "reading-quran-on-phone-adab-ethics-2026",
    title: "Reading the Quran on Your Phone: Adab & Ethics in 2026",
    excerpt:
      "A sourced, honest guide to the fiqh and adab of reading the Quran on your phone in 2026 — wudu, bathrooms, notifications, and what contemporary scholars actually say.",
    category: "digital-fiqh",
    tags: ["Adab", "Digital Quran", "Fiqh", "Ethics", "Ramadan"],
    author: "Quran Daily Editorial",
    readingMin: 10,
    wordCount: 2050,
    publishedAt: "2026-09-30",
    coverGradient: ["#14532d", "#22c55e"],
    bodyHtml: [
      "<p>Almost every Muslim under forty now reads the Quran the same way they read everything else — on a screen that also holds their messages, their bank, and their group chats. That single fact reshapes a thousand-year-old set of adab (etiquette) around how we handle the Book. The classical fiqh manuals never anticipated a mushaf that could sit in your pocket next to a photo album. So what should a thoughtful reader actually do?</p>",
      "<p>This piece is the first article on the Quran Daily blog, and we want to set the tone plainly: we quote scholars where we can, we say <em>we don't know</em> where we can't, and we treat the reader as an adult capable of weighing evidence. No inflated certainty, no invented hadith numbers, no scare tactics. What follows is a careful summary of where the mainstream contemporary fiqh has landed on reading the Quran through a phone — and the practical adab that makes that reading feel like worship rather than another tab.</p>",
      "<h2 id='is-it-permissible'>Is it permissible to read the Quran on a phone at all?</h2>",
      "<p>Yes. This is not a live controversy. Every major contemporary fiqh council that has spoken on the matter — including the Assembly of Muslim Jurists of America (AMJA), the European Council for Fatwa and Research (ECFR), and Dar al-Ifta al-Misriyyah in Egypt — has affirmed that reading the Quran from a phone, tablet, or computer is permissible and, in many cases, praiseworthy because it lowers the barrier to daily recitation.</p>",
      "<p>The reasoning is straightforward. What the classical scholars ruled on was the physical <em>mushaf</em> — the bound, written copy of the Quran. A phone displaying the Quran is not a mushaf; it is a device that, moments earlier, was displaying something else entirely and, moments later, may display something else again. The text on the screen is a rendering, not an inscription. This distinction is what most contemporary rulings turn on.</p>",
      "<blockquote class='pro-tip'><strong>Pro tip:</strong> If a scholar you trust locally holds a stricter view, follow them. Fiqh is a living conversation, not a settled database. This article summarises the dominant contemporary position, not the only one.</blockquote>",
      "<h2 id='wudu-and-the-phone'>Do you need wudu to touch the Quran on a phone?</h2>",
      "<p>This is the single most-asked question about digital Quran, and the honest answer has two parts.</p>",
      "<p><strong>The majority contemporary position:</strong> wudu is not required to touch a phone or tablet that is displaying the Quran, because — again — the device is not a mushaf. You can scroll, tap, and hold the phone without ritual purity. AMJA, ECFR, and Dar al-Ifta have all issued rulings along these lines over the past decade, and they represent the mainstream view followed by most Muslims globally today.</p>",
      "<p><strong>The cautious personal practice:</strong> many pious individuals still prefer to be in wudu when they recite the Quran, whether from a phone or from memory. This is not because the phone becomes a mushaf, but because wudu is itself a recommended state for engaging with Allah's speech. That is a matter of personal ihsan (spiritual excellence), not of obligation.</p>",
      "<p>Classical scholars including Imam an-Nawawi discussed at length the etiquettes of Quran recitation more broadly — being in a state of purity, facing the qibla when practical, reciting slowly — and those adab remain valuable regardless of medium. You can browse the general hadith library on our site if you want to read the primary source texts on recitation etiquette; start with the <a href='/hadith/bukhari'>Sahih al-Bukhari</a> chapter on the virtues of the Quran.</p>",
      "<h2 id='phone-in-the-bathroom'>What about carrying the phone into the bathroom?</h2>",
      "<p>This is where digital life gets genuinely awkward. A physical mushaf must never be taken into a bathroom — that is settled across every school of fiqh. But a phone with a Quran app <em>closed</em> is not a mushaf; it is a phone. The overwhelming contemporary position is that you do not need to leave your phone outside the bathroom simply because a Quran app is installed on it.</p>",
      "<p>Where scholars express caution is if the Quran app is <em>actively displaying</em> Quranic text on the screen when you enter the bathroom. The recommended adab is to close the app, or at least navigate away from the Quran view, before entering. This is closer to an etiquette of respect than a strict prohibition, but it is widely encouraged.</p>",
      "<blockquote class='did-you-know'><strong>Did you know?</strong> Many Quran apps now include a setting that automatically dims or hides the Arabic text when the phone's ambient light sensor detects it has been placed face-down or pocketed. Small design choices, real adab implications.</blockquote>",
      "<h2 id='the-comparison-table'>Physical mushaf vs. phone Quran vs. PDF Quran</h2>",
      "<p>None of these is objectively better. Each fits a different moment in your day. Here is an honest comparison of the tradeoffs on the dimensions that matter most:</p>",
      "<table><thead><tr><th>Dimension</th><th>Physical mushaf</th><th>Phone Quran app</th><th>PDF Quran</th></tr></thead><tbody><tr><td>Wudu required to touch</td><td>Yes (majority position)</td><td>No (majority contemporary view)</td><td>No (same reasoning as app)</td></tr><tr><td>Respect adab weight</td><td>Highest — physical object</td><td>Contextual — depends on use</td><td>Contextual — depends on use</td></tr><tr><td>Portability</td><td>Moderate</td><td>Excellent</td><td>Excellent (offline)</td></tr><tr><td>Distraction risk</td><td>None</td><td>High — notifications</td><td>Low if opened in a reader</td></tr><tr><td>Arabic-plus-translation</td><td>Depends on edition</td><td>Almost always both</td><td>Depends on file</td></tr></tbody></table>",
      "<p>The physical mushaf still holds a place no app fully replaces — its weight, its silence, the way it doesn't buzz. But a phone is what most people actually have on them at Fajr, at work, on the train. Meeting the Quran where you are is not a compromise; it is a gift of the era.</p>",
      "<h2 id='focus-and-notifications'>Focus, notifications, and the fragile state of recitation</h2>",
      "<p>The single largest practical problem with reading Quran on a phone is not fiqh — it is attention. A recitation broken every two minutes by a WhatsApp preview is not a recitation; it is scrolling with Arabic in the background.</p>",
      "<p>Concrete adab for the phone era:</p>",
      "<ul><li>Turn on Do Not Disturb, or use your phone's Focus mode, before opening the Quran app. Every major operating system now supports scheduled Focus profiles — set one for Fajr and one for after Maghrib.</li><li>If you can, use airplane mode for the duration of your daily recitation. Ten minutes offline will not collapse your life.</li><li>Silence group chats specifically. Family and work chats are the most frequent interruption.</li><li>Consider a dedicated old phone or tablet with no SIM card as your Quran-only device if you can afford it.</li></ul>",
      "<blockquote class='pro-tip'><strong>Pro tip:</strong> The classical adab of facing the qibla, sitting with dignity, and reciting slowly (<em>tartil</em>) all translate directly to phone reading. Sit down. Don't recite while walking through a supermarket. The medium changed; the posture doesn't have to.</blockquote>",
      "<p>A few practical questions come up so often they deserve direct answers, even without a classical precedent. <strong>Is reading Quran from a bright screen at Fajr disliked?</strong> No — there is no fiqh basis for that. The concern is medical, not religious: bright blue-tinted screens at 5am can disrupt sleep patterns if you go back to bed. Use your phone's night mode or reduce brightness. That is a health choice, not a spiritual one.</p>",
      "<p><strong>What if my phone dies mid-recitation?</strong> Nothing. Pick up where you left off later. Recitation is not invalidated by a battery.</p>",
      "<p><strong>Can I recite along with an audio reciter through headphones?</strong> Yes — this is one of the great gifts of the phone era. Reciting along with a qari you trust is a well-established method of improving tajweed. Just be aware of your surroundings if you are outdoors.</p>",
      "<h2 id='backing-up-bookmarks'>Backing up your bookmarks, du'a lists, and reflection notes</h2>",
      "<p>If you take your Quran life digital, you eventually accumulate things worth keeping: verses you highlighted during a hard year, du'a lists your grandmother sent you, notes from a khutbah. All of it lives inside apps that could disappear tomorrow.</p>",
      "<p>Two practical suggestions:</p>",
      "<ul><li>Export your bookmarks to plain text or markdown at least once a year. Every serious Quran app supports export in some form; if yours doesn't, that is a reason to switch.</li><li>For du'a collections you want to keep long-term, consider printing them or generating a PDF you can save offline. You can <a href='https://toolspace.cloud/pdf/create'>create a PDF of your favourite duas</a> from plain text in about thirty seconds — a small act of preservation.</li></ul>",
      "<p>The same principle applies to reflection journals. Ink and paper still outlast every cloud service ever built. If you want privacy-first browser tools for exporting, converting, and organising these files without uploading them to a stranger's server, <a href='https://toolspace.cloud/blog'>Toolspace privacy-first browser tools</a> is worth a look — everything runs locally in your browser.</p>",
      "<h2 id='ai-for-reflection'>Using AI for reflection — after recitation, not during</h2>",
      "<p>A newer question: is it appropriate to ask an AI model about a verse you just read? The honest answer is that it depends on what you are asking for, and when.</p>",
      "<p><strong>What is appropriate:</strong> asking an AI for historical context, linguistic analysis of an Arabic root, or a summary of what classical mufassirs have said about a verse — treated as a research starting point, then verified against actual tafsir like Ibn Kathir or al-Tabari. AI is a decent index into scholarship; it is not scholarship itself.</p>",
      "<p><strong>What is not appropriate:</strong> asking AI to <em>rule</em> on a fiqh question, to write khutbahs, or to replace the slow work of sitting with a verse. And absolutely not <em>during</em> recitation. The whole point of tartil is to let a verse land on you before you rush to explain it away.</p>",
      "<p>For readers who want to think carefully about how AI fits into a spiritual life, the <a href='https://www.promptspace.in/blog'>PromptSpace blog on AI-assisted reflection</a> has a few honest pieces on using large language models as thinking partners without letting them replace your own reflection. If you want structured prompts specifically for journaling or study, their <a href='https://www.promptspace.in/'>AI prompt library</a> includes several Ramadan and reflection templates worth adapting.</p>",
      "<p>The core rule is the one Muslims have always held: the Quran comes first, the reader comes second, and every tool — pen, printing press, phone, model — is judged by whether it helps or hinders that encounter.</p>",
      "<p><strong>A closing note on humility.</strong> Everything above is a summary of positions held by living scholars and contemporary fiqh councils. Fiqh is not physics; reasonable, learned people disagree, and the disagreement is itself part of the tradition. If your local imam or a scholar you trust holds a different view, follow them — not because they are infallible, but because a living teacher is worth more than an article on the internet.</p>",
      "<p>What we can say with confidence: the Quran is meant to be read. If reading it on your phone is what actually gets you reading it every day, that is not a compromise on adab. That <em>is</em> adab, in 2026.</p>",
      "<p><cite>Sahih al-Bukhari #1</cite> — actions are judged by intentions. What you intend when you open the app matters more than which device you opened it on.</p>",
      "<h2 id='faq'>Frequently asked questions</h2>",
      "<p>Short answers to the questions we get most often. For anything with a specific personal circumstance, please consult a qualified scholar rather than an article.</p>",
      "<h3 class='faq-q'>Do I need wudu to read Quran on my phone?</h3>",
      "<p class='faq-a'>The majority contemporary position from AMJA, ECFR, and Dar al-Ifta al-Misriyyah is that wudu is not required, because a phone is not a mushaf. Many people still prefer to be in wudu as personal adab, which is praiseworthy but not obligatory.</p>",
      "<h3 class='faq-q'>Can I take my phone into the bathroom if a Quran app is installed?</h3>",
      "<p class='faq-a'>Yes. The Quran app being installed does not turn your phone into a mushaf. The recommended adab is to close the app or navigate away from the Arabic text before entering, out of respect.</p>",
      "<h3 class='faq-q'>Is reading Quran from a phone as rewarding as reading from a physical mushaf?</h3>",
      "<p class='faq-a'>Scholars generally hold that the reward is for the recitation itself, not the medium. Some encourage the physical mushaf where practical, but no mainstream contemporary scholar teaches that phone recitation earns less reward.</p>",
      "<h3 class='faq-q'>Can I recite Quran silently from my phone while on public transport?</h3>",
      "<p class='faq-a'>Yes. Silent recitation in a state of relative calm is well-established. Avoid places where you cannot maintain basic focus and respect, but a quiet commute is fine.</p>",
      "<h3 class='faq-q'>What if I get a message notification during recitation — is my recitation invalidated?</h3>",
      "<p class='faq-a'>No, recitation is not invalidated by interruption. But it is a strong reason to use Do Not Disturb or Focus mode so that the interruption doesn't happen at all.</p>",
      "<h3 class='faq-q'>Can I read Quran on my phone during menstruation?</h3>",
      "<p class='faq-a'>There is genuine scholarly disagreement here that predates phones. Some scholars, particularly in the Maliki school and among contemporary jurists like Sheikh Yusuf al-Qaradawi, permit recitation during menstruation. Others hold the more restrictive classical position. This is exactly the kind of question to bring to a scholar you trust in person.</p>",
      "<h3 class='faq-q'>Is it okay to use AI or ChatGPT to explain a verse to me?</h3>",
      "<p class='faq-a'>As a starting point for research, yes — treated as an index, not an authority. For fiqh rulings or definitive tafsir, always go to qualified scholars and classical works. AI can help you find sources; it cannot replace them.</p>",
      "<h3 class='faq-q'>Should I back up my bookmarks and du'a lists?</h3>",
      "<p class='faq-a'>Yes. Apps change, accounts get lost, phones die. Export your highlights and du'a collections to plain text or PDF at least once a year. Treat your spiritual notes with the same care you give family photos.</p>",
      "<h3 class='faq-q'>Which Quran app should I use?</h3>",
      "<p class='faq-a'>We are biased — Quran Daily is what we built and what we use. But any app that offers offline access, honest translation attribution, and a distraction-free reading view is a good choice. Avoid apps with intrusive ads inside the recitation view.</p>",
    ],
    faqs: [
      {
        q: "Do I need wudu to read Quran on my phone?",
        a: "The majority contemporary position from AMJA, ECFR, and Dar al-Ifta al-Misriyyah is that wudu is not required, because a phone is not a mushaf. Many people still prefer to be in wudu as personal adab, which is praiseworthy but not obligatory.",
      },
      {
        q: "Can I take my phone into the bathroom if a Quran app is installed?",
        a: "Yes. The Quran app being installed does not turn your phone into a mushaf. The recommended adab is to close the app or navigate away from the Arabic text before entering, out of respect.",
      },
      {
        q: "Is reading Quran from a phone as rewarding as reading from a physical mushaf?",
        a: "Scholars generally hold that the reward is for the recitation itself, not the medium. Some encourage the physical mushaf where practical, but no mainstream contemporary scholar teaches that phone recitation earns less reward.",
      },
      {
        q: "Can I recite Quran silently from my phone while on public transport?",
        a: "Yes. Silent recitation in a state of relative calm is well-established. Avoid places where you cannot maintain basic focus and respect, but a quiet commute is fine.",
      },
      {
        q: "What if I get a message notification during recitation — is my recitation invalidated?",
        a: "No, recitation is not invalidated by interruption. But it is a strong reason to use Do Not Disturb or Focus mode so that the interruption doesn't happen at all.",
      },
      {
        q: "Can I read Quran on my phone during menstruation?",
        a: "There is genuine scholarly disagreement here that predates phones. Some scholars, particularly in the Maliki school and among contemporary jurists like Sheikh Yusuf al-Qaradawi, permit recitation during menstruation. Others hold the more restrictive classical position. This is exactly the kind of question to bring to a scholar you trust in person.",
      },
      {
        q: "Is it okay to use AI or ChatGPT to explain a verse to me?",
        a: "As a starting point for research, yes — treated as an index, not an authority. For fiqh rulings or definitive tafsir, always go to qualified scholars and classical works. AI can help you find sources; it cannot replace them.",
      },
      {
        q: "Should I back up my bookmarks and du'a lists?",
        a: "Yes. Apps change, accounts get lost, phones die. Export your highlights and du'a collections to plain text or PDF at least once a year. Treat your spiritual notes with the same care you give family photos.",
      },
      {
        q: "Which Quran app should I use?",
        a: "We are biased — Quran Daily is what we built and what we use. But any app that offers offline access, honest translation attribution, and a distraction-free reading view is a good choice. Avoid apps with intrusive ads inside the recitation view.",
      },
    ],
    relatedPaths: ["/quran", "/hadith/bukhari", "/duas"],
    externalLinks: [
      {
        href: "https://www.promptspace.in/blog",
        label: "AI prompts for Ramadan reflection",
        site: "PromptSpace",
      },
      {
        href: "https://toolspace.cloud/blog",
        label: "Privacy-first browser tools",
        site: "Toolspace",
      },
    ],
  },
];

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const post = getPostBySlug(slug);
  if (!post) return [];
  const others = BLOG_POSTS.filter((p) => p.slug !== slug);
  // Prefer posts sharing at least one tag; fall back to same category.
  const tagMatches = others.filter((p) => p.tags.some((t) => post.tags.includes(t)));
  const categoryMatches = others.filter(
    (p) => p.category === post.category && !tagMatches.includes(p),
  );
  return [...tagMatches, ...categoryMatches, ...others].slice(0, limit);
}

// Converts an internal path like "/quran" or "/hadith/bukhari" into a
// human-readable card label for the "Read next" strip on the blog detail
// page. Previously the UI showed the raw path ("/quran") under a hard-coded
// "Quran Daily" kicker, which read as broken.
export function describeInternalPath(path: string): {
  kicker: string;
  title: string;
  desc?: string;
} {
  const normalized = path.replace(/\/$/, "") || "/";

  // Exact matches first — the most-linked destinations.
  const EXACT: Record<string, { kicker: string; title: string; desc: string }> = {
    "/": { kicker: "Home", title: "Quran Daily", desc: "The home page — Quran, hadith, duas, prayer times." },
    "/quran": { kicker: "Read", title: "The Quran", desc: "All 114 surahs with translations and tafsir." },
    "/hadith": { kicker: "Read", title: "Hadith library", desc: "Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah." },
    "/hadith/bukhari": { kicker: "Hadith", title: "Sahih al-Bukhari", desc: "All 7,500+ hadiths with English translation." },
    "/hadith/muslim": { kicker: "Hadith", title: "Sahih Muslim", desc: "The second most-authentic hadith collection." },
    "/hadith/abudawud": { kicker: "Hadith", title: "Sunan Abi Dawud", desc: "Primary source on fiqh and practice." },
    "/hadith/tirmidhi": { kicker: "Hadith", title: "Jami' at-Tirmidhi", desc: "Hadith with scholarly gradings." },
    "/duas": { kicker: "Practice", title: "Duas", desc: "Sourced supplications for every situation." },
    "/learn-salah": { kicker: "Practice", title: "Learn Salah", desc: "Step-by-step Salah tutorials for every prayer." },
    "/qibla": { kicker: "Tools", title: "Qibla direction", desc: "Live compass + true-north correction." },
    "/prayer-times": { kicker: "Practice", title: "Prayer times", desc: "City-accurate prayer times with your calc method." },
    "/calendar": { kicker: "Tools", title: "Hijri calendar", desc: "Current Hijri date and major Islamic observances." },
    "/mushaf": { kicker: "Read", title: "Mushaf view", desc: "Page-by-page Quran in Uthmanic script." },
    "/names-of-allah": { kicker: "Learn", title: "99 Names of Allah", desc: "Each name with meaning, usage, and reflection." },
    "/seerah": { kicker: "Learn", title: "Seerah", desc: "The life of the Prophet ﷺ in sourced events." },
    "/blog": { kicker: "Blog", title: "Quran Daily blog", desc: "Essays, explainers, and digital-fiqh writing." },
  };
  if (EXACT[normalized]) return EXACT[normalized];

  // Prefix patterns — e.g. "/quran/al-fatihah", "/names-of-allah/al-rahman".
  const segments = normalized.split("/").filter(Boolean);
  const titleCase = (s: string) =>
    s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (segments[0] === "quran" && segments[1]) {
    const label = titleCase(segments[1]);
    if (segments[2]) {
      return { kicker: "Ayah", title: `${label} · verse ${segments[2]}`, desc: "Open this verse with translation and tafsir." };
    }
    return { kicker: "Surah", title: label, desc: "Read the full surah with translation and tafsir." };
  }
  if (segments[0] === "hadith" && segments[1]) {
    const book = titleCase(segments[1]);
    if (segments[2]) {
      return { kicker: "Hadith", title: `${book} · #${segments[2]}`, desc: "Read the full hadith with Arabic and translation." };
    }
    return { kicker: "Hadith book", title: book, desc: "Browse the full collection." };
  }
  if (segments[0] === "duas" && segments[1]) {
    const last = segments[segments.length - 1] ?? segments[1];
    const slug = titleCase(last);
    return { kicker: "Dua", title: slug, desc: "Sourced supplication with Arabic, transliteration, and translation." };
  }
  if (segments[0] === "learn-salah" && segments[1]) {
    return { kicker: "Learn Salah", title: titleCase(segments[1]), desc: "Step-by-step tutorial for this prayer." };
  }
  if (segments[0] === "names-of-allah" && segments[1]) {
    return { kicker: "99 Names", title: titleCase(segments[1]), desc: "Meaning, usage, and reflections on this name." };
  }
  if (segments[0] === "prayer-times" && segments[1]) {
    return { kicker: "Prayer times", title: titleCase(segments[1]), desc: "Accurate daily prayer times for this city." };
  }
  if (segments[0] === "blog" && segments[1]) {
    // Internal blog cross-link — try to resolve the title from the registry.
    const target = BLOG_POSTS.find((p) => p.slug === segments[1]);
    if (target) {
      return { kicker: "Blog", title: target.title, desc: target.excerpt.slice(0, 120) };
    }
    return { kicker: "Blog", title: titleCase(segments[1]) };
  }

  // Fallback — unknown path. Keep it honest.
  const last = segments[segments.length - 1];
  const label = last ? titleCase(last) : "Quran Daily";
  return { kicker: "Quran Daily", title: label };
}
