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
    slug: "best-time-to-pray-tahajjud-sunnah-guide-2026",
    title: "Best Time to Pray Tahajjud: What the Sunnah Actually Teaches (2026 Guide)",
    excerpt: "The last third of the night is the most honored window for tahajjud. Here is how to calculate it and what the Sunnah actually teaches.",
    category: "prayer",
    tags: ["Tahajjud", "Night Prayer", "Sunnah", "Fiqh", "Ramadan"],
    author: "Quran Daily Editorial",
    readingMin: 11,
    wordCount: 2108,
    publishedAt: "2026-10-02",
    coverGradient: ["#0f172a", "#334155"],
    bodyHtml: [
      "<p>Most of us have heard that the last third of the night is the best time to pray tahajjud. Then the questions come. When does the last third start where I live? Is one o'clock in the morning really the sweet spot, or is three? What if I pray witr right after Isha and go to sleep? Does that still count? The confusion is not new, but phone-era prayer apps and global time zones have made it louder.</p>",
      "<p>The Sunnah is clearer than the chatter suggests. There is a window, there is a preferred part of that window, and there is honest room for different situations. This guide walks through what the authentic hadith say, how to calculate the last third of the night with a worked example, and what to do if your life does not line up with the ideal. Every ruling here is sourced. Where scholars disagree, we say so.</p>",
      "<h2>Is there one best time, or a range?</h2>",
      "<p>Tahajjud is a voluntary night prayer offered after sleeping, within the window that begins after Isha and ends at the start of Fajr. The whole window is valid. Allah says in the Qur'an, <em>\"And from the night, pray tahajjud as an additional prayer for you; it is expected that your Lord will raise you to a praised station\"</em> (<a href=\"https://quran.com/17/79\" rel=\"noopener\">Surah al-Isra 17:79</a>). The command sets the time as \"from the night,\" not a single hour.</p>",
      "<p>Within that window, the Prophet (peace be upon him) pointed to the last third of the night as the most honored portion. Abu Hurayra reported that he said, <em>\"Our Lord descends every night to the lowest heaven when the last third of the night remains, saying: Who is calling on Me so I may answer him? Who is asking Me so I may give him? Who is seeking My forgiveness so I may forgive him?\"</em> <cite>Sahih al-Bukhari #1145</cite>. The hadith is agreed upon by Bukhari and Muslim, the highest grade of authenticity.</p>",
      "<p>So the answer is both. The range is Isha to Fajr. The best part of the range is the last third. Praying earlier is still tahajjud and still rewarded, as long as you slept first. Praying in the last third carries the added weight of this hadith.</p>",
      "<h2>The three windows: when night prayer counts as tahajjud</h2>",
      "<p>Scholars often divide the night into three practical windows. Each is valid for tahajjud. The reward differs.</p>",
      "<table><thead><tr><th>Window</th><th>Approx. share of night</th><th>Status in the Sunnah</th></tr></thead><tbody><tr><td>Early night (after Isha, before midnight)</td><td>First third</td><td>Valid tahajjud if you slept first. The Prophet sometimes prayed witr early (<cite>Sunan Abi Dawud #1437</cite>, graded sahih).</td></tr><tr><td>Middle of the night</td><td>Second third</td><td>Valid and praised. The \"prayer of Dawud\" involved praying in the middle portion (<cite>Sahih al-Bukhari #1131</cite>).</td></tr><tr><td>Last third of the night</td><td>Final third before Fajr</td><td>The most honored window per <cite>Sahih al-Bukhari #1145</cite>.</td></tr></tbody></table>",
      "<p>A note on the word <em>tahajjud</em> itself. Classical scholars like Imam an-Nawawi in <em>Al-Adhkar</em> and Ibn Hajar in <em>Fath al-Bari</em> state that tahajjud specifically means night prayer offered <em>after sleep</em>. If you pray extra units right after Isha without sleeping, that is qiyam al-layl but not strictly tahajjud. Both are rewarded. The distinction matters for terminology, not for whether Allah accepts the prayer.</p>",
      "<h2>How to calculate the last third of the night (with example)</h2>",
      "<p>The night, in fiqh, runs from the start of Maghrib to the start of Fajr. Some scholars use Isha to Fajr as a simpler modern proxy. The more cautious and widely used calculation uses Maghrib to Fajr. Here is the method.</p>",
      "<ol><li>Find today's Maghrib time and tomorrow's Fajr time.</li><li>Calculate the total minutes between them.</li><li>Divide by three.</li><li>Add that one-third value to Maghrib twice. The second result is where the last third begins.</li></ol>",
      "<p><strong>Example 1 — Chicago, USA (early October).</strong> Say Maghrib is 6:30 PM and Fajr the next morning is 5:30 AM. The night is 11 hours, or 660 minutes. One third is 220 minutes, about 3 hours and 40 minutes. The last third begins at 6:30 PM plus 7 hours and 20 minutes, which is <strong>1:50 AM</strong>. From 1:50 AM to 5:30 AM is the last third.</p>",
      "<p><strong>Example 2 — Hyderabad, India (same week).</strong> Maghrib around 6:00 PM, Fajr around 4:55 AM. The night is 10 hours 55 minutes, or 655 minutes. One third is roughly 218 minutes. The last third begins at about <strong>1:38 AM</strong> and runs until 4:55 AM.</p>",
      "<p>If you prefer the Isha-to-Fajr method, use the same formula with Isha as the start. You will get a later start time for the last third, since Isha is after Maghrib. Both methods are used by respected scholars. Pick one and be consistent.</p>",
      "<blockquote class=\"pro-tip\"><strong>Pro tip:</strong> Most prayer apps now show the last third of the night automatically. On Muslim Pro, Athan, and Pillars, open the prayer times screen and look for \"Last Third\" or \"Qiyam.\" Set a one-time alarm 15 minutes before that time so you have a moment to make wudu and settle in. Avoid snooze. The Sunnah rewards the one who gets up <em>when</em> they get up, not the one who negotiates with the alarm.</blockquote>",
      "<h2>What if you can't wake up for the last third?</h2>",
      "<p>Life is uneven. Night shifts, nursing a baby, exam weeks, illness, long commutes — these are real. The Sunnah accounts for them.</p>",
      "<p>Jabir ibn Abdullah reported that the Prophet said, <em>\"Whoever fears he will not get up at the end of the night, let him pray witr at the beginning of it. Whoever is confident he will get up at the end, let him pray witr at the end, for the prayer at the end of the night is witnessed, and that is better.\"</em> <cite>Sahih Muslim #755</cite>. This is a direct permission to pray early. It is not second-best in a dismissive sense; it is second-best in a comparative sense, and still praised.</p>",
      "<p>Praying two short rak'ahs after Isha, sleeping, and intending to wake up is better than planning a long qiyam and sleeping through Fajr. Intention counts. Abu Hurayra narrated that the Prophet said whoever intended to pray at night but was overcome by sleep will have the reward written for him, and his sleep is a charity from his Lord (<cite>Sunan an-Nasa'i #1784</cite>, graded sahih by al-Albani).</p>",
      "<blockquote class=\"did-you-know\"><strong>Did you know?</strong> Aisha (may Allah be pleased with her) was asked how the Prophet prayed at night. She answered that his witr varied — <em>\"Sometimes he prayed witr in the early part of the night, and sometimes in the latter part.\"</em> <cite>Sunan Abi Dawud #1437</cite>, graded sahih. The Prophet himself did not restrict his night prayer to one slot. The last third was his most frequent and most emphasized, but not his only time.</blockquote>",
      "<h2>Tahajjud during Ramadan vs. non-Ramadan</h2>",
      "<p>In Ramadan the picture shifts. Taraweeh is prayed in congregation right after Isha and is itself a form of qiyam al-layl. Many Muslims then wonder: do I pray tahajjud separately in the last third as well?</p>",
      "<p>The majority view is that if you prayed taraweeh with the imam and completed witr with him, that night prayer counts. A hadith in <cite>Jami at-Tirmidhi #806</cite>, graded sahih, states that whoever prays with the imam until he finishes, it is written for him as if he prayed the whole night. If you want extra prayer in the last third, you may — but pray it without a second witr, since the Prophet said, <em>\"There are no two witrs in one night\"</em> <cite>Sunan Abi Dawud #1439</cite>, graded sahih.</p>",
      "<p>The common Ramadan practice in Makkah and Madinah is to pray taraweeh early in the night and then return for qiyam, often called tahajjud, in the last third. Both are the same genre of worship split across the night. Outside Ramadan, there is no congregational taraweeh. Tahajjud is individual, at home, in whatever portion of the night you can offer it.</p>",
      "<h2>What if you work night shifts?</h2>",
      "<p>This is a genuine modern question. Nurses, drivers, security staff, call-center workers, warehouse crews — millions of Muslims work overnight and sleep during the day. The classical sources did not address night shifts directly, but the principles are clear.</p>",
      "<p>Contemporary fatwa councils like AMJA (the Assembly of Muslim Jurists of America) have addressed this. Their guidance, in substance: tahajjud requires sleep before the prayer, not necessarily sleep at night. If you sleep during the day and are awake and working at night, you can still offer qiyam al-layl in any portion of the night, and the hadith of the last third still applies to that time range if you are able to pause and pray.</p>",
      "<p>Dar al-Ifta al-Misriyyah has given similar guidance for shift workers: the reward of night prayer is tied to the time of night, not to a particular sleep schedule. If your job prevents you from praying in the last third, pray what you can earlier. Allah knows your circumstance. The Prophet said, <em>\"Allah does not grow tired until you grow tired,\"</em> <cite>Sahih al-Bukhari #43</cite>.</p>",
      "<p>Practical shape for a night-shift Muslim:</p>",
      "<ul><li>Sleep in the afternoon or early evening before your shift.</li><li>Pray Isha before leaving for work, or on break.</li><li>If your break falls in the last third, pray two rak'ahs then — even that counts.</li><li>If not, pray witr before dawn and intend qiyam.</li></ul>",
      "<h2>Honest limits of this guide</h2>",
      "<p>A few things we do not claim. We do not claim that praying tahajjud at 2:00 AM is categorically better than praying at 1:30 AM — the \"last third\" is a block, not a race. We do not claim a specific number of rak'ahs is obligatory; the Prophet's practice ranged, and Aisha reported he prayed eleven rak'ahs including witr (<cite>Sahih al-Bukhari #1147</cite>). We do not claim one madhhab's calculation method is the only correct one. If your situation is unusual — chronic illness, custody of young children, severe insomnia, or a job that spans Fajr — speak to a local scholar who knows your context. A general article cannot replace that.</p>",
      "<p>What we do claim is that the hadith cited here are authentic in the sources we named, that the last-third preference is grounded in <cite>Sahih al-Bukhari #1145</cite> and parallel narrations in Muslim, and that the Sunnah is wider than one hour on a clock.</p>",
      "<h2>Frequently asked questions</h2>",
      "<h3 class=\"faq-q\">What is the exact best time to pray tahajjud?</h3>",
      "<p class=\"faq-a\">The last third of the night, calculated from Maghrib to Fajr, divided into three equal parts. The final part is the preferred window based on <cite>Sahih al-Bukhari #1145</cite>.</p>",
      "<h3 class=\"faq-q\">Can I pray tahajjud right after Isha?</h3>",
      "<p class=\"faq-a\">You can pray voluntary night prayer after Isha, but strictly speaking tahajjud is prayer offered after sleeping. If you pray right after Isha without sleeping, it is qiyam al-layl and still rewarded. If you fear you will not wake up later, the Prophet advised praying witr early (<cite>Sahih Muslim #755</cite>).</p>",
      "<h3 class=\"faq-q\">How many rak'ahs is tahajjud?</h3>",
      "<p class=\"faq-a\">There is no fixed number. Aisha reported the Prophet usually prayed eleven rak'ahs at night including witr (<cite>Sahih al-Bukhari #1147</cite>). Pray in sets of two, then end with witr (one or three rak'ahs). Two rak'ahs with focus is better than many without.</p>",
      "<h3 class=\"faq-q\">Does tahajjud have a specific intention or niyyah?</h3>",
      "<p class=\"faq-a\">Intend tahajjud or qiyam al-layl in your heart before starting. No spoken formula is required. The Prophet's opening du'a is recorded in <cite>Sahih al-Bukhari #1120</cite> and is a Sunnah to recite after the opening takbir.</p>",
      "<h3 class=\"faq-q\">Is tahajjud the same as witr?</h3>",
      "<p class=\"faq-a\">No. Witr is the odd-numbered prayer that closes night prayer and is strongly emphasized (some scholars consider it wajib). Tahajjud is the voluntary prayer before witr, offered after sleep. You can pray tahajjud and then end with witr.</p>",
      "<h3 class=\"faq-q\">What if I miss tahajjud regularly?</h3>",
      "<p class=\"faq-a\">Start small. Set an alarm 30 minutes before Fajr, pray two rak'ahs, make du'a, pray witr, and go back to sleep. The Prophet said the most beloved deeds to Allah are the most consistent, even if small (<cite>Sahih al-Bukhari #6464</cite>).</p>",
      "<h3 class=\"faq-q\">Can women pray tahajjud during menstruation?</h3>",
      "<p class=\"faq-a\">The prayer itself is not offered during menstruation, but the time is not wasted. Dhikr, du'a, listening to Qur'an recitation, and reading Islamic knowledge in the last third all carry reward. The descent of Allah's mercy in the last third (<cite>Sahih al-Bukhari #1145</cite>) is not limited to those in prayer.</p>",
      "<h3 class=\"faq-q\">Where can I learn the full method of night prayer?</h3>",
      "<p class=\"faq-a\">See our guide on <a href=\"/learn-salah\">how to pray salah</a> for the mechanics, our <a href=\"/duas\">du'a collection</a> for authentic supplications, and <a href=\"/hadith/bukhari\">Sahih al-Bukhari's Book of Tahajjud</a> for the primary sources. For more reflections, see our <a href=\"/blog\">blog archive</a> or read directly on <a href=\"https://sunnah.com/bukhari/19\" rel=\"noopener\">sunnah.com</a>.</p>",
    ],
    faqs: [
      { q: "What is the exact best time to pray tahajjud?", a: "The last third of the night, calculated from Maghrib to Fajr, divided into three equal parts. The final part is the preferred window based on Sahih al-Bukhari #1145." },
      { q: "Can I pray tahajjud right after Isha?", a: "You can pray voluntary night prayer after Isha, but strictly speaking tahajjud is prayer offered after sleeping. If you pray right after Isha without sleeping, it is qiyam al-layl and still rewarded. The Prophet advised praying witr early if you fear not waking up (Sahih Muslim #755)." },
      { q: "How many rak'ahs is tahajjud?", a: "There is no fixed number. Aisha reported the Prophet usually prayed eleven rak'ahs at night including witr (Sahih al-Bukhari #1147). Pray in sets of two, then end with witr." },
      { q: "Does tahajjud have a specific intention or niyyah?", a: "Intend tahajjud or qiyam al-layl in your heart before starting. No spoken formula is required. The Prophet's opening du'a is in Sahih al-Bukhari #1120." },
      { q: "Is tahajjud the same as witr?", a: "No. Witr is the odd-numbered prayer that closes night prayer. Tahajjud is the voluntary prayer before witr, offered after sleep. You can pray tahajjud and then end with witr." },
      { q: "What if I miss tahajjud regularly?", a: "Start small. Set an alarm 30 minutes before Fajr, pray two rak'ahs, make du'a, pray witr, and sleep again. The most beloved deeds to Allah are the most consistent, even if small (Sahih al-Bukhari #6464)." },
      { q: "Can women pray tahajjud during menstruation?", a: "The prayer itself is not offered during menstruation, but dhikr, du'a, and listening to Qur'an recitation in the last third all carry reward." },
      { q: "Where can I learn the full method of night prayer?", a: "See our guides on how to pray salah, the du'a collection, and Sahih al-Bukhari's Book of Tahajjud for primary sources." },
    ],
    relatedPaths: ["/learn-salah", "/duas", "/hadith/bukhari", "/quran"],
    externalLinks: [
      { href: "https://www.promptspace.in/blog", label: "AI prompts for Ramadan reflection", site: "PromptSpace" },
      { href: "https://toolspace.cloud/blog", label: "Privacy-first browser tools", site: "Toolspace" },
    ],
  },
  {
    slug: "dhikr-after-salah-complete-sunnah-routine",
    title: "Dhikr After Salah: The Complete Sunnah Routine (Sourced, With Count)",
    excerpt: "A sourced, honest guide to the authentic post-salah adhkar — the three tasbih, the 33-33-34 series, Ayat al-Kursi, the three Quls, and what is not actually from the Sunnah.",
    category: "prayer",
    tags: ["Dhikr", "Adhkar", "Sunnah", "Fiqh", "Salah", "Hadith"],
    author: "Quran Daily Editorial",
    readingMin: 14,
    wordCount: 2931,
    publishedAt: "2026-10-04",
    coverGradient: ["#0f172a", "#334155"],
    bodyHtml: [
      "<p>The moment after tasleem is quiet. You have just turned your face to the right and the left, and the obligation is done. The Prophet ﷺ did not stand up and walk away in that moment. He sat, and he remembered Allah in a specific, countable, teachable way. That short routine — maybe three minutes — is one of the best-documented acts of worship in the entire hadith literature.</p>",
      "<p>This piece is the authentic routine. Not a long list someone forwarded on a family WhatsApp. Not a page of du'as pulled from a pamphlet with no sources. We walk through what the Prophet ﷺ actually did after the fard prayer, with hadith numbers you can verify, grades you can check, and an honest section on what is <em>not</em> part of this Sunnah even though it often gets added. Allah said <cite>\"Indeed, prayer has been decreed upon the believers a decree of specified times\" (Surah an-Nisa 4:103)</cite>, and the believers Allah describes elsewhere are those who <cite>\"remember Allah while standing, sitting, and lying on their sides\" (Surah Al-Imran 3:191)</cite>. Dhikr after salah is where those two verses meet.</p>",
      "<h2>The core sunnah set: the hadith of the three tasbih</h2>",
      "<p>Immediately after the final tasleem, before anything else, the Prophet ﷺ began with istighfar. Thawban (رضي الله عنه) narrated the sequence directly:</p>",
      "<blockquote><p>\"When the Messenger of Allah ﷺ finished his prayer he would seek forgiveness three times, then say: <em>Allahumma anta as-salam wa minka as-salam, tabarakta ya dhal-jalali wal-ikram</em> — O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of Glory and Honour.\"</p><p><cite>Sahih Muslim 591</cite></p></blockquote>",
      "<p>So the opening is fixed. Astaghfirullah three times, then the Allahumma anta as-salam formula once. The reasoning is often missed: you have just stood before Allah in prayer. However careful you were, your mind wandered. The first thing you do after the prayer is ask forgiveness for the prayer itself. Imam an-Nawawi (d. 676 AH) opens the entire chapter on post-salah dhikr in his <em>Al-Adhkar</em> with this hadith.</p>",
      "<p>The second part — <em>Allahumma anta as-salam…</em> — is a theological statement, not a request. You are naming Allah as As-Salam, The Source of Peace, acknowledging that whatever peace exists descends from Him.</p>",
      "<h2>Then the 33-33-34 series</h2>",
      "<p>After the opening formula comes the series most Muslims know by heart. It is from the hadith of Abu Hurayrah (رضي الله عنه):</p>",
      "<blockquote><p>Some poor emigrants came to the Prophet ﷺ and said the wealthy have taken all the ranks and lasting bliss — they pray as we pray, fast as we fast, but they also give charity, which we cannot. He ﷺ replied: \"Shall I not tell you of something by which you will catch up with those who have preceded you and surpass those who come after you? No one will be better than you except he who does the same. Glorify Allah (Subhan Allah), praise Him (Alhamdulillah), and magnify Him (Allahu Akbar) thirty-three times each after every prayer.\"</p><p><cite>Sahih Muslim 595, with the version in Sahih Muslim 597 clarifying the count as 33, 33, 34 to complete one hundred, sealed with <em>La ilaha illallah wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa 'ala kulli shay'in qadir</em></cite></p></blockquote>",
      "<p>Two things are worth noting. First, the exact count in the strongest version is thirty-three Subhan Allah, thirty-three Alhamdulillah, and thirty-four Allahu Akbar — not thirty-three of each. Many practitioners say thirty-three of all three and then add the <em>La ilaha illallah</em> sealing phrase to reach one hundred; this is also narrated and valid. Nawawi notes both forms in <em>Al-Adhkar</em>.</p>",
      "<p>Second, Muslim 597 attaches an enormous promise: the person who completes this one hundred after every prayer has his sins forgiven even if they were like the foam of the sea. Three minutes. Five times a day.</p>",
      "<h2>Ayat al-Kursi after every fard salah</h2>",
      "<p>Abu Umamah al-Bahili (رضي الله عنه) narrated that the Prophet ﷺ said:</p>",
      "<blockquote><p>\"Whoever recites Ayat al-Kursi after every obligatory prayer, nothing stands between him and entering Paradise except death.\"</p><p><cite>Sunan an-Nasa'i al-Kubra 9928, also in Sahih Ibn Hibban 2395. Graded sahih by Ibn Hibban, al-Mundhiri, and Shaykh al-Albani in <em>Silsilat al-Ahadith al-Sahihah</em> 972</cite></p></blockquote>",
      "<p>This hadith is, by itself, a reason to never skip post-salah dhikr. Ayat al-Kursi (Surah al-Baqarah 2:255) is a single verse, about twenty-five seconds, and the condition attached is the most direct in the dhikr literature: nothing prevents Paradise except death. Ibn Qayyim al-Jawziyyah (d. 751 AH) treats this verse as the heaviest single ayah of the Qur'an, as the Prophet ﷺ himself described it (<cite>Sahih Muslim 810</cite>).</p>",
      "<h2>The last three surahs (al-Ikhlas, al-Falaq, an-Nas)</h2>",
      "<p>Uqbah ibn 'Amir (رضي الله عنه) narrated that the Prophet ﷺ commanded him to recite <em>al-Mu'awwidhat</em> — the surahs of seeking refuge — after every prayer:</p>",
      "<blockquote><p>\"Recite the Mu'awwidhat after every salah.\"</p><p><cite>Sunan Abu Dawud 1523, Sunan an-Nasa'i 1335. Authenticated by al-Albani</cite></p></blockquote>",
      "<p>The scholars read \"Mu'awwidhat\" as including Surah al-Ikhlas alongside al-Falaq and an-Nas — the three \"Quls\" at the end of the mushaf. In another narration, the Prophet ﷺ told Uqbah that reciting these three surahs three times each after Fajr and after Maghrib \"will suffice you against everything\" (<cite>Sunan Abu Dawud 5082, graded sahih by al-Albani</cite>).</p>",
      "<p>The practical rule most contemporary scholars teach, following Shaykh Ibn Baz and others: once each after Dhuhr, Asr, and Isha; three times each after Fajr and Maghrib. The extra repetition at the two \"edge\" prayers is deliberate — the hours when the person transitions between night and day.</p>",
      "<h2>What is NOT in the sunnah (common additions)</h2>",
      "<p>This section matters, because the authentic routine above is already complete. Anything added as if it were part of the Prophet's ﷺ practice is a quiet form of misreporting the Sunnah. These are the most common additions we see in masjids today:</p>",
      "<p><strong>Long congregational du'a led aloud by the imam immediately after fard.</strong> Ibn Taymiyyah and Ibn Baz both held that gathering the congregation to raise hands in a loud du'a after every fard was not the practice of the Prophet ﷺ or his companions. Du'a after salah is permitted — but as individual, silent, personal du'a. Hanafi and Shafi'i practice has often included brief congregational du'a; even classical scholars within those schools flagged longer versions as accretions.</p>",
      "<p><strong>Specific counts for specific needs — \"read this 70 times for wealth,\" \"this 40 times for marriage.\"</strong> These numerical formulas circulate heavily on social media. They are not in Bukhari, Muslim, Abu Dawud, Nasa'i, Tirmidhi, or Ibn Majah. They are folk wisdom, not Sunnah.</p>",
      "<p><strong>Long shared du'a lists forwarded on WhatsApp.</strong> Most are harmless praise. Some are fabricated hadith. If you cannot find a sanad for it in <em>Hisnul Muslim</em> or in Nawawi's <em>Al-Adhkar</em>, treat it as unknown rather than Sunnah.</p>",
      "<p><strong>Kissing the thumbs during the Fajr adhan or at points of post-prayer dhikr.</strong> No sound hadith for this. The practice is cultural.</p>",
      "<h2>Comparison table</h2>",
      "<table><thead><tr><th>Dhikr</th><th>Count</th><th>Applicable prayers</th><th>Grade</th><th>Source</th></tr></thead><tbody><tr><td>Astaghfirullah</td><td>3×</td><td>All 5 fard</td><td>Sahih</td><td>Sahih Muslim 591</td></tr><tr><td>Allahumma anta as-salam…</td><td>1×</td><td>All 5 fard</td><td>Sahih</td><td>Sahih Muslim 591</td></tr><tr><td>Ayat al-Kursi (2:255)</td><td>1×</td><td>All 5 fard</td><td>Sahih</td><td>Nasa'i al-Kubra 9928</td></tr><tr><td>Surah al-Ikhlas</td><td>1× (3× Fajr/Maghrib)</td><td>All 5 fard</td><td>Sahih</td><td>Abu Dawud 1523, 5082</td></tr><tr><td>Surah al-Falaq</td><td>1× (3× Fajr/Maghrib)</td><td>All 5 fard</td><td>Sahih</td><td>Abu Dawud 1523, 5082</td></tr><tr><td>Surah an-Nas</td><td>1× (3× Fajr/Maghrib)</td><td>All 5 fard</td><td>Sahih</td><td>Abu Dawud 1523, 5082</td></tr><tr><td>Subhan Allah</td><td>33×</td><td>All 5 fard</td><td>Sahih</td><td>Sahih Muslim 595, 597</td></tr><tr><td>Alhamdulillah</td><td>33×</td><td>All 5 fard</td><td>Sahih</td><td>Sahih Muslim 595, 597</td></tr><tr><td>Allahu Akbar</td><td>34× (or 33×)</td><td>All 5 fard</td><td>Sahih</td><td>Sahih Muslim 597</td></tr><tr><td>La ilaha illallah wahdah…</td><td>1×</td><td>All 5 fard</td><td>Sahih</td><td>Sahih Muslim 597</td></tr></tbody></table>",
      "<p>That is the entire routine. Ten items. Roughly three minutes if you move at a normal pace, five if you let it breathe.</p>",
      "<h2>Pro-tip callout</h2>",
      "<blockquote><p><strong>Tasbih counter apps vs fingers:</strong> The Prophet ﷺ counted on his fingers. Abdullah ibn 'Amr (رضي الله عنه) narrated: \"I saw the Messenger of Allah ﷺ counting the tasbih on his hand\" (<cite>Sunan Abu Dawud 1502, Sunan an-Nasa'i 1355, authenticated by al-Albani</cite>). Fingers are the Sunnah. Prayer beads are a later tool, permitted by the majority (Hanafi, Shafi'i, Maliki, some Hanbalis) and discouraged by some stricter Salafi scholars as a departure from the Prophetic method. A phone counter is the modern equivalent — allowed, but a step further from the Sunnah. If your fingers can do it, let them. The hadith adds a specific benefit: on the Day of Judgement, the fingers themselves will testify to what they counted.</p></blockquote>",
      "<h2>Did-you-know callout</h2>",
      "<blockquote><p><strong>The Prophet ﷺ counted on his <em>right</em> hand.</strong> Ibn Qudamah, one of the narrators in the chain of Abu Dawud 1502, specifies this detail: \"On his right hand.\" Most people, when told to count on fingers, instinctively use the hand not holding a phone. The Sunnah points the other way. Right hand, starting from the little finger and working across the joints, is the method preserved in the fiqh manuals of all four madhhabs.</p></blockquote>",
      "<h2>Different schools, same core</h2>",
      "<p>The post-salah routine is one of the rare areas of worship where all four Sunni madhhabs agree on the core almost without disagreement. Hanafi, Shafi'i, Maliki, and Hanbali manuals all teach:</p>",
      "<ul><li>Istighfar three times after tasleem</li><li>The Allahumma anta as-salam formula</li><li>The 33-33-34 (or 33-33-33 with the sealing dua) tasbih series</li><li>Ayat al-Kursi</li><li>The three Quls</li></ul>",
      "<p>Minor differences exist. Hanafis traditionally recite the formula more quietly and often transition directly into Sunnah rakats; Shafi'is sometimes include a brief congregational du'a; Malikis emphasise individual silent du'a; the Hanbali tradition closely follows the salaf's pattern. But if you walked into any traditional masjid of any of the four schools and performed the ten items in the table above, every imam present would recognise it as the Sunnah of their school. The disputes are at the edges, not in the core.</p>",
      "<h2>What if you're late or in congregation</h2>",
      "<p>Real life interferes. You come in late and finish your missed rakats while the row behind you is already deep into tasbih. You have a baby crying, a meeting in six minutes, or a congregation standing up for Sunnah before you have begun counting.</p>",
      "<p>Here is the practical hierarchy if you cannot do all of it:</p>",
      "<ol><li><strong>Minimum core (30 seconds):</strong> Astaghfirullah three times, Allahumma anta as-salam once. Do not skip this.</li><li><strong>Add Ayat al-Kursi (another 25 seconds):</strong> The hadith promise is too great to leave off.</li><li><strong>Add the 33-33-34 tasbih (90 seconds):</strong> If you can, do all one hundred. If not, do what you can — ten each is still dhikr.</li><li><strong>Add the three Quls (45 seconds):</strong> Especially after Fajr and Maghrib.</li></ol>",
      "<p>If you miss any of it, you have not sinned. These are Sunnah, not fard. But the Prophet ﷺ was consistent, and consistency — <em>istiqamah</em> — is what the two major promise-hadiths above both hinge on.</p>",
      "<p>In congregation, the imam leaves and the row stands up for Sunnah rakats before the full dhikr is done. The classical answer: perform your Sunnah rakats first, then complete the post-fard dhikr afterward, or combine the two. The congregation's pace does not override your personal routine.</p>",
      "<h2>Honest limitations</h2>",
      "<p>Two caveats worth stating. First, the exact ordering of items within the post-salah dhikr is not fixed by a single explicit hadith; the ordering above is the one most scholars have reconstructed from the combined narrations, but a different ordering is not wrong. Second, hadith grades are human judgements. We have followed the authentications of al-Albani, Ibn Hibban, and the dominant classical reception, but minority positions exist — particularly on whether the \"three times each\" count for the Quls after Fajr and Maghrib is as strongly established as the single recitation.</p>",
      "<p>If a scholar you trust locally orders the sequence differently or weighs a grade differently, follow them. We are summarising the mainstream Sunni position, not the only one.</p>",
      "<h2>Frequently asked questions</h2>",
      "<p><strong>Can I do post-salah dhikr silently?</strong> Yes. The default in all four madhhabs is quiet dhikr for the individual. The Prophet ﷺ did sometimes raise his voice — Ibn Abbas narrated that the voices raising dhikr were how he knew the prayer had ended (<cite>Sahih al-Bukhari 841</cite>) — but silent is permissible and often preferred to avoid showing off.</p>",
      "<p><strong>Do women do the same routine?</strong> Yes. There is no gender-specific difference. The hadith of Abu Hurayrah is addressed to the companions generally; the routine applies to men and women equally.</p>",
      "<p><strong>What if I am menstruating?</strong> You cannot pray fard, so there is no \"after salah\" during menses. But all these adhkar are dhikr of Allah, and dhikr is permitted at all times. Many scholars recommend keeping up the tasbih counts at prayer times during menses as a way of staying anchored in worship.</p>",
      "<p><strong>Should I do this after Sunnah prayers too?</strong> The hadiths specify \"after every obligatory prayer\" — the five fard. There is no established Sunnah of the same full routine after voluntary rakats. Shorter adhkar are fine, but the hundred-count and the Ayat al-Kursi promise are tied to the fard.</p>",
      "<p><strong>Can I combine dhikr for prayers I joined together while travelling?</strong> The scholars recommend doing one full set after each prayer rather than combining, because the hadith attaches the virtues \"after every\" prayer specifically.</p>",
      "<p><strong>Is a digital tasbih counter allowed?</strong> Yes, by majority opinion. Fingers are the Sunnah and preferred; prayer beads are permitted by most schools; a digital counter is a modern tool that fiqh councils have ruled permissible. Hierarchy: fingers &gt; beads &gt; digital counter. Pick what helps you be consistent.</p>",
      "<p><strong>What is the single most important item if I can only do one?</strong> Ayat al-Kursi, once, after each fard prayer. The hadith of Abu Umamah attaches a direct promise that no other single item carries. If you build one habit from this entire piece, build that one.</p>",
      "<p><strong>Where can I find all these adhkar in Arabic with transliteration in one place?</strong> Sa'id ibn 'Ali al-Qahtani's <em>Hisnul Muslim</em> (Fortress of the Muslim) is the standard contemporary compendium. Imam an-Nawawi's <em>Al-Adhkar</em> is the classical reference — longer, scholarly, and worth owning if you want the sanads attached to each dhikr.</p>",
      "<hr>",
      "<p><em>If this piece was useful, our companion article on <a href=\"/blog/reading-quran-on-phone-adab-ethics-2026\">reading the Quran on your phone</a> covers the related adab of digital worship. For the full Arabic text of each dhikr above, consult <a href=\"https://sunnah.com\" rel=\"noopener\">Sunnah.com</a> or Hisnul Muslim. May Allah accept the prayer and the remembrance that follows it.</em></p>",
    ],
    faqs: [
      { q: "Can I do post-salah dhikr silently?", a: "Yes. The default in all four madhhabs is quiet dhikr for the individual. The Prophet ﷺ did sometimes raise his voice — Ibn Abbas narrated that the voices raising dhikr were how he knew the prayer had ended (Sahih al-Bukhari 841) — but silent is permissible and often preferred to avoid showing off." },
      { q: "Do women do the same routine?", a: "Yes. There is no gender-specific difference. The hadith of Abu Hurayrah is addressed to the companions generally; the routine applies to men and women equally." },
      { q: "What if I am menstruating?", a: "You cannot pray fard, so there is no \"after salah\" during menses. But all these adhkar are dhikr of Allah, and dhikr is permitted at all times. Many scholars recommend keeping up the tasbih counts at prayer times during menses as a way of staying anchored in worship." },
      { q: "Should I do this after Sunnah prayers too?", a: "The hadiths specify \"after every obligatory prayer\" — the five fard. There is no established Sunnah of the same full routine after voluntary rakats. Shorter adhkar are fine, but the hundred-count and the Ayat al-Kursi promise are tied to the fard." },
      { q: "Can I combine dhikr for prayers I joined together while travelling?", a: "The scholars recommend doing one full set after each prayer rather than combining, because the hadith attaches the virtues \"after every\" prayer specifically." },
      { q: "Is a digital tasbih counter allowed?", a: "Yes, by majority opinion. Fingers are the Sunnah and preferred; prayer beads are permitted by most schools; a digital counter is a modern tool that fiqh councils have ruled permissible. Hierarchy: fingers &gt; beads &gt; digital counter. Pick what helps you be consistent." },
      { q: "What is the single most important item if I can only do one?", a: "Ayat al-Kursi, once, after each fard prayer. The hadith of Abu Umamah attaches a direct promise that no other single item carries. If you build one habit from this entire piece, build that one." },
      { q: "Where can I find all these adhkar in Arabic with transliteration in one place?", a: "Sa'id ibn 'Ali al-Qahtani's Hisnul Muslim (Fortress of the Muslim) is the standard contemporary compendium. Imam an-Nawawi's Al-Adhkar is the classical reference — longer, scholarly, and worth owning if you want the sanads attached to each dhikr." },
    ],
    relatedPaths: ["/quran", "/hadith/bukhari", "/duas", "/learn-salah"],
    externalLinks: [
      { href: "https://www.promptspace.in/blog", label: "AI prompts for Ramadan reflection", site: "PromptSpace" },
      { href: "https://toolspace.cloud/blog", label: "Privacy-first browser tools", site: "Toolspace" },
    ],
  },
  {
    slug: "how-to-pray-fajr-if-you-wake-up-late-sunnah",
    title: "How to Pray Fajr If You Wake Up Late: What the Sunnah Says (and What It Doesn't)",
    excerpt: "A sourced, honest guide to what to do when you miss Fajr — the Khaybar hadith, the makruh sunrise window, qada of the sunnah rak'ahs, and when oversleeping stops being an accident.",
    category: "prayer",
    tags: ["Fajr", "Qada", "Sleep", "Fiqh", "Sunnah"],
    author: "Quran Daily Editorial",
    readingMin: 11,
    wordCount: 2396,
    publishedAt: "2026-10-04",
    coverGradient: ["#0f172a", "#f59e0b"],
    bodyHtml: [
      "<p>You open your eyes. The room is bright. You know, before you check the clock, that something has gone wrong. Your phone lights up: past sunrise. A small, cold feeling starts in your chest. The Fajr adhan was more than an hour ago. The window closed while you were asleep.</p>",
      "<p>This is a near-universal Muslim experience, and it is the quiet shame nobody talks about on social media. Shift workers live with it. New parents live with it. Students in exam season live with it. Here is what the Sunnah actually says to do, what it carefully does not say, and where contemporary scholars have drawn the lines.</p>",
      "<p>No scare tactics, no invented hadith numbers. Just the sources, graded, and the places where the ikhtilaf (scholarly disagreement) is real.</p>",
      "<h2 id='khaybar-hadith'>The famous hadith of the sleeping companions at Khaybar</h2>",
      "<p>The best place to start is a moment on a battlefield march where the entire company, including the Messenger of Allah himself (peace be upon him), slept through Fajr.</p>",
      "<p>Returning from Khaybar, the army stopped to rest near the end of the night. The Prophet (ﷺ) assigned Bilal to watch for dawn. Bilal prayed, leaned against his camel, and fell asleep. Nobody woke until the sun was on their faces. <cite>Sahih Muslim 680</cite> narrates the scene, with parallels at <cite>Sahih Muslim 681–684</cite> and <cite>Sahih al-Bukhari 595</cite> and <cite>597</cite>.</p>",
      "<p>What matters is what he did next. He did not panic. He said: <em>there is no negligence in sleep; negligence is only in wakefulness. So when one of you forgets a prayer or sleeps through it, let him pray it when he remembers it.</em> He had the companions move away from that spot, made wudu, and prayed Fajr with them, after sunrise, exactly as he would have before.</p>",
      "<p>That hadith is the foundation of the entire fiqh of missed Fajr. If you slept through the prayer, you pray it when you wake, with the same rak'ahs, with the normal recitation, and the sin of missing it is lifted. <cite>Surah Ta-Ha 20:14</cite> — <em>and establish prayer for My remembrance</em> — is the proof-text classical scholars pair with this hadith: remembrance, not clock time, reopens the obligation.</p>",
      "<h2 id='missed-or-just-late'>Did you miss Fajr, or is it just after sunrise?</h2>",
      "<p>A distinction most people get wrong: Fajr time ends sharply at sunrise. If you woke before sunrise — even five minutes before — you are inside the window and praying on-time. After sunrise, you are praying qada (a makeup).</p>",
      "<p>One more wrinkle: the window just after sunrise. Several authentic narrations describe the first ten to fifteen minutes after the sun clears the horizon as a time when voluntary prayer is discouraged. The famous hadith refers to the sun rising <em>between the two horns of Shaytan</em> — see <cite>Sahih Muslim 832</cite> and <cite>Sahih al-Bukhari 582</cite>. Classical scholars read these texts as creating a short makruh window after sunrise.</p>",
      "<p>How does this interact with missed Fajr? The majority of the four schools hold that the makruh-time hadith does <em>not</em> apply to a prayer being made up for sleep or forgetfulness — the Khaybar hadith is explicit. <cite>Imam an-Nawawi's Al-Majmu'</cite> walks through the ikhtilaf and settles there; <cite>Ibn Qudamah's Al-Mughni</cite> gives the same conclusion from the Hanbali side.</p>",
      "<p>Honest practical answer, by the majority: pray Fajr immediately, regardless of where the sun is. Before sunrise it is on-time; after, it is qada — and the Khaybar hadith is your warrant to pray now, not wait.</p>",
      "<h2 id='three-scenarios-table'>Three scenarios, one honest table</h2>",
      "<p>Most late-Fajr situations fit one of three buckets. Here is where the mainstream fiqh lands, so you can calibrate without a 2 a.m. search spiral.</p>",
      "<table><thead><tr><th>Scenario</th><th>Status of your prayer</th><th>What to pray</th><th>Timing</th></tr></thead><tbody><tr><td>Woke before sunrise</td><td>Fajr is still on-time (adaa)</td><td>2 sunnah + 2 fard, as normal</td><td>Immediately, before the sun clears the horizon</td></tr><tr><td>Woke after sunrise but same morning</td><td>Fajr is qada (missed, now made up)</td><td>2 fard, with the sunnah also prayed by majority view (see below)</td><td>Immediately on remembering, per the Khaybar hadith</td></tr><tr><td>Woke after Dhuhr time has started</td><td>Fajr is qada; the on-time prayer now is Dhuhr</td><td>Pray Fajr first, then Dhuhr, in order (tartib)</td><td>Both immediately, in sequence</td></tr></tbody></table>",
      "<p>Two notes. The Shafi'i and Hanbali schools emphasise tartib — making up prayers in order — but relax it if time is tight for the current prayer (see <cite>Al-Mughni</cite>). The Hanafis differ on praying during the actual moment of sunrise, but no school disputes you must make up a Fajr you slept through.</p>",
      "<h2 id='two-sunnah-rakahs'>What about Fajr's two sunnah rak'ahs?</h2>",
      "<p>The two short rak'ahs before Fajr are, per <cite>Sahih Muslim 725</cite>, <em>better than the world and everything in it</em>. When Fajr itself is missed, do you make up the sunnah too, or just the fard?</p>",
      "<p>Two narrations guide the answer, and both deserve honest labelling.</p>",
      "<p>The first is <cite>Jami at-Tirmidhi 423</cite>: whoever did not pray the two rak'ah before Fajr should pray them after sunrise. Al-Tirmidhi graded the chain gharib; al-Albani later graded it sahih, and Ibn Khuzayma and Ibn Hibban both included it. The second is from Umm Salamah, in which the Prophet (ﷺ) prayed the two sunnah after the fard when a delegation had kept him from them earlier — see <cite>Sunan Abu Dawud 1273</cite>.</p>",
      "<p>From these two texts the Shafi'i and Hanbali schools recommend praying the Fajr sunnah after sunrise if it was missed with the fard. The Hanafis also permit it, after sunrise rather than immediately after the fard. Practically: if you are praying Fajr after sunrise, pray the two sunnah first, then the two fard. If you only have minutes before Dhuhr, prioritise the fard.</p>",
      "<blockquote class='pro-tip'><strong>Pro tip:</strong> The real fix for repeatedly missing Fajr is not a louder alarm — it is an earlier bedtime. Classical scholars treated staying up past Isha for anything non-essential as itself a mildly disliked act, partly for exactly this reason. If you are consistently sleeping at 1 a.m. and expecting a 5 a.m. body to cooperate, the fiqh is not the problem. The physiology is.</blockquote>",
      "<h2 id='move-to-another-spot'>A quiet detail you may not have noticed in the Khaybar story</h2>",
      "<blockquote class='did-you-know'><strong>Did you know?</strong> When the Prophet (ﷺ) and his companions woke after sunrise at Khaybar, he did not pray Fajr on the spot. He ordered everyone to mount up and move the whole camp some distance away before praying. <cite>Sahih Muslim 680</cite> records that he said <em>this is a place in which Shaytan was present with us</em>. The lesson most scholars draw is a gentle one — when a spiritual failure happens in a particular place, physically shifting your body elsewhere before you begin again is itself a form of starting fresh. For many of us that is as simple as sitting up, splashing water on your face, and praying in a different room from the one where the alarm clock won.</blockquote>",
      "<h2 id='habitual-oversleeping'>When oversleeping becomes a habit — the ikhtilaf and the honest answer</h2>",
      "<p>Everything above assumes the Khaybar case: non-negligent sleep. The ruling becomes more serious when oversleeping is habitual or the predictable consequence of a bedtime you could have moved.</p>",
      "<p>An-Nawawi in <cite>Al-Majmu'</cite> and Ibn Qudamah in <cite>Al-Mughni</cite> both affirm qada remains obligatory in every case — a Fajr owed is a Fajr owed — but they distinguish the sinless sleep of Khaybar from blameworthy neglect: setting no alarm, sleeping late by choice, treating Fajr as negotiable. The first incurs no sin; the second incurs the sin of abandoning the prayer, even if the makeup later lifts the obligation itself.</p>",
      "<p>Contemporary bodies agree. AMJA fatwas on the habitual oversleeper require the makeup, repentance for the pattern, and meaningful steps to break the cycle — multiple alarms, earlier bedtime, phone across the room, a family member waking you. Dar al-Ifta al-Misriyyah frames these wake-up measures as a form of taqwa.</p>",
      "<p>Two verses sit behind this. <cite>Surah al-Baqarah 2:238</cite> — <em>guard strictly your prayers, and the middle prayer</em> — and <cite>Surah an-Nisa 4:103</cite>, which describes prayer as having fixed times prescribed on the believers. Neither verse is quoted to shame someone who overslept once; both describe the posture a believer takes across a lifetime — the prayer has times, and we arrange a life that meets them.</p>",
      "<h2 id='mid-prayer-sunrise'>What if the sun rises while I'm actually praying Fajr?</h2>",
      "<p>The edge case: you started Fajr with the horizon dark; by the second rak'ah the sun has crossed.</p>",
      "<p>The hadith for this exact situation is <cite>Sahih Muslim 608</cite>: <em>whoever catches one rak'ah of Fajr before sunrise has caught the Fajr prayer, and whoever catches one rak'ah of Asr before sunset has caught the Asr prayer</em>. The parallel narration is in <cite>Sahih al-Bukhari 579</cite>.</p>",
      "<p>The majority — Shafi'i, Hanbali, dominant Maliki — read this as meaning that if you completed one full rak'ah (qiyam, Fatihah, ruku, both sujud) before sunrise, the whole Fajr counts as on-time even if the second rak'ah finishes after. The Hanafi school historically held a different reading, treating Fajr as invalidated by sunrise mid-prayer — a legitimate position with a long pedigree.</p>",
      "<p>In both readings the responsibility is the same: you keep praying, you do not stop mid-salah. Either you have caught Fajr (majority) or you repeat it as qada after (Hanafi). The choice belongs to the madhhab you follow, not to this article.</p>",
      "<h2 id='honest-limits'>Honest limits on what this article can tell you</h2>",
      "<p>A few things sit outside the scope of a general guide and need a scholar who knows you.</p>",
      "<p>The fine detail of making up missed prayers — years of them, cycle interruptions, a recent revert's long absence, chronic illness making sleep genuinely uncontrollable — these are not internet article questions. They are questions for a qualified scholar who knows your life. The Khaybar hadith is the foundation; the structure on top is case by case.</p>",
      "<p>On female cycle breaks specifically: scholars discuss how a woman handles a prayer whose time began before her period started, or ended while it ended. Classical answers differ by madhhab; ask a scholar from your tradition rather than take a confident paragraph here as a ruling.</p>",
      "<p>The main road is this: pray what you missed as soon as you remember, in the normal form. Keep the sunnah where the Sunnah commends it. Treat habitual oversleeping as a signal, not an identity. And if you are reading this at 7:12 a.m. with the shame of a missed Fajr still fresh — stop reading, make wudu, and go pray. The rest will wait.</p>",
      "<p><cite>Sahih al-Bukhari 597</cite> — <em>there is no negligence in sleep; negligence is only in wakefulness.</em> The Prophet (ﷺ) said this to a company that included himself. If the Messenger of Allah accepted that his own sleep was outside the circle of blame, you can accept the same about yours — and then do the next right thing.</p>",
      "<h2 id='faq'>Frequently asked questions</h2>",
      "<p>Short, sourced answers to the questions readers send us most. Anything with a specific personal circumstance belongs with a qualified scholar, not an article.</p>",
      "<h3 class='faq-q'>If I wake up ten minutes after sunrise, do I pray Fajr immediately or wait?</h3>",
      "<p class='faq-a'>Pray immediately. The Khaybar hadith in <cite>Sahih Muslim 680</cite> establishes that a missed prayer is prayed when remembered, and the majority of the four schools apply that even inside the makruh window just after sunrise, because qada for a valid excuse is excepted from the normal prohibition.</p>",
      "<h3 class='faq-q'>Do I pray the two sunnah rak'ahs if I woke up after sunrise?</h3>",
      "<p class='faq-a'>Yes, according to the majority. The hadith at <cite>Jami at-Tirmidhi 423</cite> and the Umm Salamah narration in <cite>Sunan Abu Dawud 1273</cite> are the main supports. The Hanafis prefer the sunnah be prayed after sunrise rather than immediately after the fard; the Shafi'i and Hanbali schools permit either order. If you are tight on time before Dhuhr, prioritise the two fard rak'ahs.</p>",
      "<h3 class='faq-q'>Is the sin lifted just because I slept, or do I still have to repent?</h3>",
      "<p class='faq-a'>If the sleep was non-negligent — you set an alarm, you went to bed at a reasonable hour, your body simply didn't wake — the Prophet (ﷺ) said there is no sin on you, per <cite>Sahih al-Bukhari 597</cite>. Make the prayer up and move on. If the oversleeping was a predictable result of choices you made the night before, make the prayer up, repent for the pattern, and change the pattern.</p>",
      "<h3 class='faq-q'>What if the sun rises while I'm praying Fajr?</h3>",
      "<p class='faq-a'>The majority — Shafi'i, Hanbali, dominant Maliki — hold that if you completed one full rak'ah before sunrise, the whole prayer counts as on-time, per <cite>Sahih Muslim 608</cite> and <cite>Sahih al-Bukhari 579</cite>. The Hanafi school classically treats the prayer as needing to be repeated as qada. Follow the madhhab you were taught.</p>",
      "<h3 class='faq-q'>How late is \"too late\" to still call it Fajr qada?</h3>",
      "<p class='faq-a'>There is no cutoff. A Fajr owed years ago is still owed. The classical texts, including <cite>Al-Mughni</cite>, are consistent that qada does not expire. If Dhuhr time has started, pray Fajr first and then Dhuhr in order (tartib), per the majority view on sequencing missed prayers.</p>",
      "<h3 class='faq-q'>I keep missing Fajr even with alarms. Is something wrong with me?</h3>",
      "<p class='faq-a'>Probably something is wrong with your sleep schedule, not with you. Chronic late Fajrs almost always trace back to a bedtime that is too late for the body you have. Contemporary fatwas from AMJA and others treat wake-up measures — earlier bedtime, multiple alarms, phone across the room, a family member waking you — as a required form of taqwa for the habitual oversleeper. If you have ruled out schedule and still can't wake, speak to a doctor; some sleep disorders are real and treatable.</p>",
      "<h3 class='faq-q'>Does praying Fajr after sunrise give me less reward than praying it on time?</h3>",
      "<p class='faq-a'>The scholars generally say yes — the reward of the on-time prayer is specific to the on-time prayer — but the makeup still fulfills the obligation and is itself an act of obedience that Allah accepts. The honest framing is not <em>I lost half my reward</em>; it is <em>I am still showing up, and showing up matters</em>.</p>",
      "<h3 class='faq-q'>I missed Fajr on a day I was travelling. Does travel change the rules?</h3>",
      "<p class='faq-a'>Travel does not change the obligation to make up Fajr — Fajr is two rak'ahs anyway, whether at home or travelling. The Khaybar hadith is itself a traveller's story. Pray what you missed as soon as you remember, exactly as you would at home.</p>",
    ],
    faqs: [
      { q: "If I wake up ten minutes after sunrise, do I pray Fajr immediately or wait?", a: "Pray immediately. The Khaybar hadith in Sahih Muslim 680 establishes that a missed prayer is prayed when remembered, and the majority of the four schools apply that even inside the makruh window just after sunrise, because qada for a valid excuse is excepted from the normal prohibition." },
      { q: "Do I pray the two sunnah rak'ahs if I woke up after sunrise?", a: "Yes, according to the majority. The hadith at Jami at-Tirmidhi 423 and the Umm Salamah narration in Sunan Abu Dawud 1273 are the main supports. The Hanafis prefer the sunnah be prayed after sunrise rather than immediately after the fard; the Shafi'i and Hanbali schools permit either order. If you are tight on time before Dhuhr, prioritise the two fard rak'ahs." },
      { q: "Is the sin lifted just because I slept, or do I still have to repent?", a: "If the sleep was non-negligent — you set an alarm, you went to bed at a reasonable hour, your body simply didn't wake — the Prophet said there is no sin on you, per Sahih al-Bukhari 597. Make the prayer up and move on. If the oversleeping was a predictable result of choices you made the night before, make the prayer up, repent for the pattern, and change the pattern." },
      { q: "What if the sun rises while I'm praying Fajr?", a: "The majority — Shafi'i, Hanbali, dominant Maliki — hold that if you completed one full rak'ah before sunrise, the whole prayer counts as on-time, per Sahih Muslim 608 and Sahih al-Bukhari 579. The Hanafi school classically treats the prayer as needing to be repeated as qada. Follow the madhhab you were taught." },
      { q: "How late is too late to still call it Fajr qada?", a: "There is no cutoff. A Fajr owed years ago is still owed. The classical texts, including Al-Mughni, are consistent that qada does not expire. If Dhuhr time has started, pray Fajr first and then Dhuhr in order (tartib), per the majority view on sequencing missed prayers." },
      { q: "I keep missing Fajr even with alarms. Is something wrong with me?", a: "Probably something is wrong with your sleep schedule, not with you. Chronic late Fajrs almost always trace back to a bedtime that is too late for the body you have. Contemporary fatwas from AMJA and others treat wake-up measures — earlier bedtime, multiple alarms, phone across the room, a family member waking you — as a required form of taqwa for the habitual oversleeper. If you have ruled out schedule and still can't wake, speak to a doctor; some sleep disorders are real and treatable." },
      { q: "Does praying Fajr after sunrise give me less reward than praying it on time?", a: "The scholars generally say yes — the reward of the on-time prayer is specific to the on-time prayer — but the makeup still fulfills the obligation and is itself an act of obedience that Allah accepts. The honest framing is not that you lost half your reward; it is that you are still showing up, and showing up matters." },
      { q: "I missed Fajr on a day I was travelling. Does travel change the rules?", a: "Travel does not change the obligation to make up Fajr — Fajr is two rak'ahs anyway, whether at home or travelling. The Khaybar hadith is itself a traveller's story. Pray what you missed as soon as you remember, exactly as you would at home." },
    ],
    relatedPaths: ["/quran", "/hadith/bukhari", "/duas"],
    externalLinks: [
      { href: "https://sunnah.com/muslim:680", label: "The Khaybar hadith (Sahih Muslim 680)", site: "Sunnah.com" },
      { href: "https://sunnah.com/muslim:608a", label: "Catching a rak'ah of Fajr (Sahih Muslim 608)", site: "Sunnah.com" },
    ],
  },
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
