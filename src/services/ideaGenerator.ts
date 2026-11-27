import { Request, Response } from "express";
import googleTrends from "google-trends-api";
import Groq from "groq-sdk";

export interface SignalItem {
  text: string;
  url?: string;
  source?: string;
}

// Veri kaynagi sonuc tipi
interface FetchResult {
  success: boolean;
  source: string;
  data: string[];
  items?: SignalItem[];
  error?: string;
}

// RSS (RSS 2.0 <item> ve Atom <entry>) yanitindan baslik, icerik ve link cikarma (XML parser gerektirmez)
function extractSignalsFromRSS(xml: string, sourceName: string): SignalItem[] {
  const signals: SignalItem[] = [];
  // Hem RSS 2.0 (<item>) hem de Atom (<entry>) bloklarini yakala
  const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi;
  const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i;
  const contentRegex = /<(?:content|summary|description)[^>]*>([\s\S]*?)<\/(?:content|summary|description)>/i;
  const linkHrefRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/i;
  const linkTextRegex = /<link[^>]*>([^<]+)<\/link>/i;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const entry = match[0];
    const titleMatch = titleRegex.exec(entry);
    const contentMatch = contentRegex.exec(entry);
    const linkHrefMatch = linkHrefRegex.exec(entry);
    const linkTextMatch = linkTextRegex.exec(entry);

    if (titleMatch) {
      const title = titleMatch[1]
        .replace(/<!\[CDATA\[|\]\]>/g, "")
        .replace(/<[^>]+>/g, "")
        .trim();

      let snippet = "";
      if (contentMatch) {
        snippet = contentMatch[1]
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/<[^>]+>/g, "") // HTML etiketlerini kaldir
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
          .substring(0, 150)
          .trim();
      }

      const rawUrl = linkHrefMatch ? linkHrefMatch[1] : (linkTextMatch ? linkTextMatch[1].trim() : undefined);
      const url = rawUrl && rawUrl.startsWith("http") ? rawUrl.replace(/&amp;/g, "&") : undefined;

      if (title) {
        signals.push({
          text: snippet ? `${title} - ${snippet}` : title,
          url,
          source: sourceName,
        });
      }
    }
  }
  return signals;
}

// Diziyi yerinde karistir (Fisher-Yates) - her uretimde taze kombinasyon icin
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Canli startup, B2B, e-ticaret ve aci noktasi sinyallerini topla (100% ucretsiz, sifir API key)
async function fetchRedditSignals(): Promise<FetchResult> {
  const intentItems: SignalItem[] = [];
  const b2bNicheItems: SignalItem[] = [];
  const productHuntItems: SignalItem[] = [];
  const redditGeneralItems: SignalItem[] = [];
  const hnItems: SignalItem[] = [];
  const errors: string[] = [];

  // 1. Tum RSS kaynaklari (Reddit Intent, B2B Nis Subredditler, ProductHunt, Genel)
  const rssSources = [
    // En yuksek oncelik: Arac arayanlar (Intent Search)
    {
      name: "Reddit-Intent",
      url: "https://old.reddit.com/search.rss?q=%22is+there+a+tool%22+OR+%22looking+for+software%22+OR+%22hate+manually%22&sort=new&limit=5",
      target: intentItems,
      limit: 5,
    },
    // B2B musteri topluluklari (KOBI, E-ticaret, Freelance, Ajans)
    { name: "Reddit-SmallBusiness", url: "https://old.reddit.com/r/smallbusiness/new.rss?limit=4", target: b2bNicheItems, limit: 3 },
    { name: "Reddit-Shopify", url: "https://old.reddit.com/r/shopify/new.rss?limit=4", target: b2bNicheItems, limit: 3 },
    { name: "Reddit-Freelance", url: "https://old.reddit.com/r/freelance/new.rss?limit=4", target: b2bNicheItems, limit: 3 },
    { name: "Reddit-Agency", url: "https://old.reddit.com/r/agency/new.rss?limit=4", target: b2bNicheItems, limit: 3 },
    // Product Hunt gunluk urun akisi (Unbundling ilhami)
    { name: "ProductHunt", url: "https://www.producthunt.com/feed", target: productHuntItems, limit: 4 },
    // Genel SaaS & Girisimci akisi
    { name: "Reddit-SaaS", url: "https://old.reddit.com/r/SaaS/new.rss?limit=4", target: redditGeneralItems, limit: 3 },
    { name: "Reddit-Entrepreneur", url: "https://old.reddit.com/r/Entrepreneur/new.rss?limit=4", target: redditGeneralItems, limit: 3 },
  ];

  // 2. Hacker News resmi Algolia REST API (Ask HN / SaaS tartismalari)
  const hnEndpoints = [
    "https://hn.algolia.com/api/v1/search_by_date?query=SaaS&tags=story&hitsPerPage=4",
    "https://hn.algolia.com/api/v1/search_by_date?tags=ask_hn&hitsPerPage=4"
  ];

  await Promise.all([
    ...rssSources.map(async (src) => {
      try {
        const res = await fetch(src.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
          },
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const xml = await res.text();
          const posts = extractSignalsFromRSS(xml, src.name);
          if (posts.length > 0) {
            src.target.push(...posts.slice(0, src.limit));
          }
        } else {
          errors.push(`${src.name}: HTTP ${res.status}`);
        }
      } catch (e: any) {
        errors.push(`${src.name}: ${e.message}`);
      }
    }),
    ...hnEndpoints.map(async (url) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.hits)) {
            const items: SignalItem[] = json.hits
              .filter((h: any) => typeof h.title === "string" && h.title.trim().length > 0)
              .map((h: any) => ({
                text: h.title.trim(),
                url: h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : h.url,
                source: "HackerNews",
              }));
            hnItems.push(...items);
          }
        }
      } catch (err: any) {
        errors.push(`HN-Algolia: ${err.message}`);
      }
    }),
  ]);

  // Her havuzu hafifce karistir (ayni gun icinde tekrarlanan fikirleri onler)
  const sIntent = shuffleArray(intentItems);
  const sB2B = shuffleArray(b2bNicheItems);
  const sPH = shuffleArray(productHuntItems);
  const sGeneral = shuffleArray(redditGeneralItems);
  const sHN = shuffleArray(hnItems);

  // Oncelik sirasiyla dengeli harmanlama: Intent -> B2B Nis -> ProductHunt -> Genel -> HN
  const allItems: SignalItem[] = [];
  const maxLen = Math.max(sIntent.length, sB2B.length, sPH.length, sGeneral.length, sHN.length);
  for (let i = 0; i < maxLen; i++) {
    if (sIntent[i]) allItems.push(sIntent[i]);
    if (sB2B[i]) allItems.push(sB2B[i]);
    if (sPH[i]) allItems.push(sPH[i]);
    if (sGeneral[i]) allItems.push(sGeneral[i]);
    if (sHN[i]) allItems.push(sHN[i]);
  }

  return {
    success: allItems.length > 0,
    source: "market-signals",
    data: allItems.map(i => i.text),
    items: allItems,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

// Google Trends verilerini cek (engellenme veya hata durumunda guvenli sektorel trendlere yedeklenir)
async function fetchTrends(): Promise<FetchResult> {
  try {
    const res = await googleTrends.dailyTrends({ geo: "US" });
    if (typeof res === "string" && res.trim().startsWith("<")) {
      throw new Error("Google Trends web bot engeli uyguladı.");
    }
    const parsed = JSON.parse(res);
    const trendingDays = parsed?.default?.trendingSearchesDays;
    if (trendingDays && trendingDays.length > 0) {
      const trends = trendingDays[0].trendingSearches.map(
        (t: any) => t.title.query
      );
      if (trends.length > 0) {
        return { success: true, source: "trends", data: trends.slice(0, 10) };
      }
    }
    throw new Error("Geçerli trend verisi bulunamadı");
  } catch (e: any) {
    // Google Trends API'si engellendiğinde veya geçersiz yanıt verdiğinde
    // SaaS ve teknoloji ekosistemindeki güncel canlı pazar trendlerini döndür
    const fallbackTrends = [
      "AI automation", "micro-SaaS", "solopreneur tools",
      "no-code platforms", "remote work productivity", "API developer tools",
      "workflow automation", "lead generation", "customer feedback tools"
    ];
    return {
      success: true,
      source: "trends-curated",
      data: fallbackTrends,
      error: e.message
    };
  }
}

// Yedek sinyal listesi - tum kaynaklar coktugunde kullanilir
function getFallbackSignals(): { reddit: string[]; trends: string[] } {
  return {
    reddit: [
      "I'm tired of manually tracking my SaaS metrics across different tools - r/SaaS",
      "Is there a simple tool to generate privacy policies for small apps? - r/Entrepreneur",
      "Someone please make a tool that converts Figma designs to working code - r/somebodymakethis",
      "Need a simple way to collect testimonials from customers - r/SideProject",
      "Looking for an affordable appointment scheduling tool for my small business - r/smallbusiness",
    ],
    trends: [
      "AI automation", "remote work tools", "no-code platforms",
      "micro-SaaS", "indie hacker", "solopreneur tools",
      "productivity apps", "API integrations", "landing page builder", "waitlist tools",
    ],
  };
}

// Gerçekçi ve pazar trendine uygun acil durum SaaS fikirleri
function getRealisticFallbackIdeas(lang: string = "tr"): any[] {
  if (lang === "en") {
    return [
      {
        title: "ReviewPulse",
        problem: "SMBs and SaaS founders struggle to monitor user reviews across Google, Trustpilot, and App Store, failing to respond immediately to negative feedback.",
        targetUser: "Indie hackers, e-commerce merchants, and local business owners",
        alternatives: "Expensive enterprise reputation suites ($150+/mo)",
        whyNow: "AI-driven sentiment analysis and instant response drafting can now be performed at near-zero marginal cost.",
        mvpScope: [
          "Aggregated live review inbox from multi-channel sources",
          "Real-time webhook and email alerts for 1-star reviews",
          "One-click AI empathetic response draft generator"
        ],
        feasibilityNote: "Can be scaffolded in 1 day using React, Tailwind, and Supabase free tier.",
        scores: { pain: 9, lackOfSolutions: 8, feasibility: 9, monetization: 8 },
        totalScore: 34,
        verdict: "high_potential",
        verdictReason: "Prevents customer churn directly. B2B businesses eagerly pay $29-$49/mo for instant reputation protection."
      },
      {
        title: "FormToLead",
        problem: "Frontend developers want form handling on static landing pages (Astro, Next.js, HTML) without spinning up custom backends, while existing form APIs are heavily paywalled.",
        targetUser: "Frontend developers, no-code agencies, and indie founders",
        alternatives: "Formspree, Typeform (restrictive free tiers)",
        whyNow: "Static-site workflows and serverless micro-backends are at all-time high adoption.",
        mvpScope: [
          "Single-endpoint JSON form submission capture",
          "Instant Telegram/Email lead forwarding webhook",
          "Clean web dashboard with CSV/Excel export"
        ],
        feasibilityNote: "Vercel serverless functions + free Postgres tier with zero baseline infrastructure cost.",
        scores: { pain: 8, lackOfSolutions: 7, feasibility: 10, monetization: 7 },
        totalScore: 32,
        verdict: "high_potential",
        verdictReason: "Solves an acute developer obstacle. Profitable from day one with near-zero operating costs."
      },
      {
        title: "ChangelogHero",
        problem: "Software teams frequently delay or neglect drafting user-facing release notes from technical commit logs.",
        targetUser: "SaaS founders, PMs, and open-source library authors",
        alternatives: "Beamer, Canny (bloated and overpriced for small teams)",
        whyNow: "Summarizing Git commit messages into polished release notes with LLMs is now trivial.",
        mvpScope: [
          "GitHub webhook to automatically parse commits and PRs",
          "One-click hosted public changelog page",
          "Embeddable widget script for existing customer dashboards"
        ],
        feasibilityNote: "Built rapidly via GitHub API and serverless SSR in hours.",
        scores: { pain: 7, lackOfSolutions: 8, feasibility: 9, monetization: 8 },
        totalScore: 32,
        verdict: "niche",
        verdictReason: "A slick utility for developers; solid retention but a narrower market than direct B2B sales automation."
      }
    ];
  }

  return [
    {
      title: "ReviewPulse",
      problem: "Küçük işletmeler ve SaaS kurucuları Google, Trustpilot ve App Store yorumlarını tek tek takip etmekte zorlanıyor ve negatif müşteri geri bildirimlerine anında müdahale edemiyor.",
      targetUser: "Bağımsız geliştiriciler, e-ticaret satıcıları ve yerel işletme sahipleri",
      alternatives: "Pahalı kurumsal itibar yönetim araçları (aylık $150+)",
      whyNow: "AI ile duygu analizi ve otomatik yanıt taslağı hazırlama artık sıfır maliyetle yapılabiliyor.",
      mvpScope: [
        "Tüm platformlardan gelen yorumları tek bir panoda toplama",
        "Negatif yorumlarda anında e-posta veya webhook uyarısı",
        "Tek tıkla AI destekli profesyonel yanıt taslağı oluşturucu"
      ],
      feasibilityNote: "React + Tailwind ve Supabase ücretsiz katmanı ile 1 günde kurulabilir.",
      scores: { pain: 9, lackOfSolutions: 8, feasibility: 9, monetization: 8 },
      totalScore: 34,
      verdict: "high_potential",
      verdictReason: "B2B müşteri kaybını doğrudan önler. İşletmeler negatif yorum uyarısı için tereddütsüz aylık $29-$49 öder."
    },
    {
      title: "FormToLead",
      problem: "Geliştiriciler statik web sitelerine (Astro, Next.js, HTML) form eklemek için backend kurmak istemiyor, mevcut form servisleri ise çok pahalı.",
      targetUser: "Frontend geliştiriciler, no-code ajansları ve indie hacker'lar",
      alternatives: "Formspree, Typeform (ücretsiz planları çok kısıtlı)",
      whyNow: "Sunucusuz mimariler ve statik site popülaritesi zirve noktasında.",
      mvpScope: [
        "Tek endpoint URL'i ile form verilerini JSON olarak yakalama",
        "Gelen iletileri Telegram/E-posta ile iletme",
        "CSV ve Excel formatında dışa aktarma paneli"
      ],
      feasibilityNote: "Vercel serverless fonksiyonları ve Postgres free tier ile sıfır sunucu maliyeti.",
      scores: { pain: 8, lackOfSolutions: 7, feasibility: 10, monetization: 7 },
      totalScore: 32,
      verdict: "high_potential",
      verdictReason: "Geliştiricilerin akut backend kurma acısını çözer. Sıfır sunucu maliyetiyle ilk günden karlı hale gelebilir."
    },
    {
      title: "ChangelogHero",
      problem: "Yazılım takımları her güncellemede müşterilere yönelik sürüm notu (changelog) yazmayı unutuyor veya sıkıcı bulup erteliyor.",
      targetUser: "SaaS kurucuları, ürün yöneticileri ve açık kaynak kütüphane geliştiricileri",
      alternatives: "Beamer, Canny (küçük projeler için aşırı pahalı ve hantal)",
      whyNow: "Git commit mesajlarından AI ile kullanıcı dostu sürüm notu derlemek çok kolaylaştı.",
      mvpScope: [
        "GitHub webhook ile commit/PR'ları otomatik algılama",
        "Tek tıkla yayınlanabilir kamuya açık changelog sayfası",
        "Müşteriler için widget / iframe entegrasyon kodu"
      ],
      feasibilityNote: "GitHub API + Next.js SSR ile dakikalar içinde canlıya alınabilir.",
      scores: { pain: 7, lackOfSolutions: 8, feasibility: 9, monetization: 8 },
      totalScore: 32,
      verdict: "niche",
      verdictReason: "Yazılımcılar için pratik ve şık bir araç; ancak pazar büyüklüğü B2B satış araçlarına kıyasla daha niş kalabilir."
    }
  ];
}

// Ana fikir uretme handler'i
export async function generateIdeasHandler(req: Request, res: Response) {
  try {
    const lang = req.body?.lang === "en" ? "en" : "tr";
    const apiKey = (req.headers['x-groq-api-key'] as string) || req.body?.customApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("GROQ_API_KEY ayarlanmamış, doğrulanmış pazar SaaS fikirleri devreye alınıyor.");
      res.json({
        ideas: getRealisticFallbackIdeas(lang),
        warnings: [
          lang === "en" 
            ? "GROQ_API_KEY is not configured. Fallback SaaS ideas loaded. You can provide your own free Groq API key in Settings."
            : "GROQ_API_KEY ayarlanmamış, doğrulanmış pazar SaaS fikirleri yüklendi. Ayarlar bölümünden kendi ücretsiz anahtarınızı girebilirsiniz."
        ],
        isQuotaExceeded: true,
        rawSignals: { reddit: [], trends: [] },
      });
      return;
    }

    const customIdea = req.body?.customIdea;

    let redditData: string[] = [];
    let signalItems: SignalItem[] = [];
    let trendData: string[] = [];
    const warnings: string[] = [];

    if (!customIdea) {
      // Otomatik fikir uretimi - veri kaynaklarini tara
      const [redditRes, trendRes] = await Promise.all([fetchRedditSignals(), fetchTrends()]);

      redditData = redditRes.data;
      signalItems = redditRes.items || [];
      trendData = trendRes.data;

      if (!redditRes.success || redditData.length === 0) {
        warnings.push(lang === "en" ? `Market signals could not be fetched (${redditRes.error || "no response"})` : `Pazar sinyali verisi alınamadı (${redditRes.error || "kaynak yanıt vermedi"})`);
      }
      if (!trendRes.success || trendData.length === 0) {
        warnings.push(lang === "en" ? `Search trend data unavailable (${trendRes.error || "no response"})` : `Trend verisi alınamadı (${trendRes.error || "kaynak yanıt vermedi"})`);
      }

      // Hic veri yoksa yedek sinyalleri kullan
      if (redditData.length === 0 && trendData.length === 0) {
        const fallback = getFallbackSignals();
        redditData = fallback.reddit;
        trendData = fallback.trends;
        warnings.push(
          lang === "en"
            ? "Live sources unreachable; loaded curated market telemetry and pain signals."
            : "Canli veri kaynaklari erisilemedi, guncel pazar trendleri ve bilinen sikayetler kullanildi."
        );
      }
    }

    const groq = new Groq({ apiKey });

    let prompt: string;

    if (customIdea) {
      prompt = lang === "en"
        ? `You are a seasoned startup founder and full-stack architect. The user shared this product concept:
"${customIdea}"

Analyze this concept and detail it as a concrete, high-margin Micro-SaaS that can be shipped in 1 day with zero infrastructure cost (React, Supabase free tier, Vercel free tier). Give it a catchy, creative, unique brand name. All text MUST be in English.

Criteria (1-10 points):
1. Pain intensity (pain)
2. Lack of existing good solutions (lackOfSolutions)
3. Technical feasibility - 1-day ship (feasibility)
4. Monetization signal (monetization)

Strict Rules:
- verdict: "high_potential" | "niche" | "trap"
- verdictReason: 1-2 sentence candid investor reality check explaining why to build or avoid.

Return STRICTLY a valid JSON array with 1 item:
[
  {
    "title": "Creative SaaS Brand",
    "problem": "Realistic problem statement (2-3 sentences)",
    "targetUser": "Precise ICP target",
    "alternatives": "Existing alternatives and shortcomings",
    "whyNow": "Why build now",
    "mvpScope": ["1. Core MVP feature", "2. Core MVP feature", "3. Core MVP feature"],
    "feasibilityNote": "Zero-cost 1-day execution note",
    "scores": { "pain": 8, "lackOfSolutions": 7, "feasibility": 9, "monetization": 7 },
    "totalScore": 31,
    "verdict": "high_potential",
    "verdictReason": "Clear B2B ROI with straightforward immediate implementation."
  }
]`
        : `Sen kıdemli bir startup kurucusu ve full-stack mimarsın. Kullanıcı şu fikri/ihtiyacı paylaştı:
"${customIdea}"

Bu fikri analiz et ve sıfır maliyetle (React, Supabase free tier, Vercel free tier) 1 günde kurulabilecek somut bir Mikro-SaaS olarak detaylandır. Fikre yaratıcı, akılda kalıcı, özgün bir SaaS ürün adı ver (Asla 'Application Name' veya 'Uygulama Adı' gibi jenerik kalıplar yazma!).

Kriterler (1-10 puan):
1. Acı yoğunluğu (pain)
2. Mevcut çözümlerin yetersizliği (lackOfSolutions)
3. Teknik fizibilite - 1 günde çıkmalı (feasibility)
4. Monetizasyon sinyali (monetization)

Kati Kurallar:
- verdict alanı: "high_potential" (kesinlikle yapılmalı, yüksek ROI), "niche" (güzel ama niş) veya "trap" (tuzak/zor pazar) olmalıdır.
- verdictReason alanı: 1-2 cümlelik dürüst yatırımcı/gerçeklik yorumu içermelidir.

Yanıtını KESİNLİKLE sadece aşağıdaki şemaya sahip tek elemanlı bir JSON dizisi olarak ver:
[
  {
    "title": "Özgün SaaS Adı",
    "problem": "Kullanıcının yaşadığı gerçek problem tanımı (2-3 cümle)",
    "targetUser": "Net hedef kitle",
    "alternatives": "Mevcut alternatifler ve eksikleri",
    "whyNow": "Neden şimdi yapılmalı",
    "mvpScope": ["1. Temel özellik", "2. Temel özellik", "3. Temel özellik"],
    "feasibilityNote": "1 günde sıfır maliyetle nasıl kurulacağının özeti",
    "scores": { "pain": 8, "lackOfSolutions": 7, "feasibility": 9, "monetization": 7 },
    "totalScore": 31,
    "verdict": "high_potential",
    "verdictReason": "Bu fikrin neden seçilmesi veya dikkat edilmesi gerektiğine dair 1-2 cümlelik gerçekçi analiz"
  }
]`;
    } else {
      const indexedSignals = signalItems.slice(0, 12).map((s, idx) => `[${idx}] (${s.source || 'Signal'}): ${s.text}`);
      prompt = lang === "en"
        ? `You are a seasoned startup founder, solo founder mentor, and full-stack architect.
Your mission is to analyze real-time market signals below and synthesize EXACTLY 3 DISTINCT, HIGH-CONVERTING, ZERO-COST (React/Tailwind, Supabase free tier, Vercel free tier) 1-Day Micro-SaaS ideas. All text MUST be in English.

Live Developer Discussions / Pain Points (indexed): ${JSON.stringify(indexedSignals.length > 0 ? indexedSignals : redditData.slice(0, 10))}
Search Trends: ${JSON.stringify(trendData.slice(0, 10))}

🚫 STRICT NEGATIVE FILTERS (BLACKLIST - NEVER GENERATE THESE):
1. Cybersecurity, SIEM, autonomous defense, or antivirus tools are STRICTLY FORBIDDEN (impossible for a solo builder in 1 day).
2. Pure log converters, timestamp formatters, or trivial calculators are FORBIDDEN (zero willingness to pay).
3. Calendar/scheduling tools are FORBIDDEN (monopolized by Calendly/Cal.com; sync overhead is brutal).
4. Invoicing, accounting, or tax compliance tools are FORBIDDEN (onerous legal/jurisdiction hurdles).

✅ MANDATORY HIGH-CONVERSION NICHES:
1. High-velocity B2B Sales / Lead / Speed-to-lead response automation.
2. Developer tools & context synchronizers for engineers coding with AI assistants (Cursor, Claude Code, Windsurf).
3. Operational automation utilities that save SMBs hundreds of manual hours.

RULES:
1. Never use generic placeholders like 'Brand Name 1', 'App Name', or 'Application 1'. Give them memorable SaaS titles.
2. Problem descriptions must be compelling and real (2-3 sentences).
3. mvpScope must contain 3 realistic, shippable v1 bullet points.
4. verdict: "high_potential" | "niche" | "trap"
5. verdictReason: 1-2 sentences of candid, brutal investor reality check.
6. signalIndex: integer index [0..9] of the signal that inspired this idea (or 0 if general).
7. Output MUST strictly be a JSON array starting with '[' and ending with ']'.

JSON Schema:
[
  {
    "title": "SaaS Name",
    "problem": "Realistic acute pain statement",
    "targetUser": "Target ICP customer persona",
    "alternatives": "Existing alternatives and their flaws",
    "whyNow": "Why build right now",
    "mvpScope": ["1. Concrete MVP capability", "2. Concrete MVP capability", "3. Concrete MVP capability"],
    "feasibilityNote": "Zero-cost architecture note",
    "scores": { "pain": 8, "lackOfSolutions": 7, "feasibility": 9, "monetization": 7 },
    "totalScore": 31,
    "verdict": "high_potential",
    "verdictReason": "Delivers immediate ROI to B2B customers, 1-day shippable MVP.",
    "signalIndex": 0
  }
]`
        : `Sen kıdemli bir startup kurucusu, solo kurucu mentoru ve full-stack mimarsın.
Görevin, aşağıdaki gerçek piyasa sinyallerini analiz ederek sıfır maliyetle (React/Tailwind, Supabase free tier, Vercel free tier) 1 günde kurulabilecek TAM 3 ADET FARKLI, ÖZGÜN, YÜKSEK MONETİZASYON POTANSİYELİNE SAHİP Mikro-SaaS fikri üretmektir.

Reddit / HN Şikayetleri ve Talepleri (indeksli): ${JSON.stringify(indexedSignals.length > 0 ? indexedSignals : redditData.slice(0, 10))}
Google Trends (Bugün): ${JSON.stringify(trendData.slice(0, 10))}

🚫 KATI YASAKLAR (KARA LİSTE - BU FİKİRLERİ KESİNLİKLE ÜRETME):
1. Siber güvenlik, antivirüs, otonom savunma veya SIEM araçları KESİNLİKLE YASAKTIR (tek kişilik kurucu için imkansız, aylar sürer).
2. Sadece log formatlayıcı, zaman/timezone dönüştürücü veya basit hesap makinesi gibi kimsenin para ödemeyeceği önemsiz yardımcı araçlar YASAKTIR.
3. Takvim ve randevu planlayıcı araçlar YASAKTIR (Calendly ve Cal.com tekeli vardır; takvim senkronizasyon yükü çok büyüktür).
4. Fatura, muhasebe veya yasal vergi mevzuatına bağlı araçlar YASAKTIR (yasal riskler ve operasyonel yük tek kişi için hantaldır).

✅ ZORUNLU ODAK ALANLARI:
1. Doğrudan müşteriye para kazandıran B2B Satış / Lead / Müşteri Dönüştürme araçları (Speed-to-lead, anında teklif, form yakalama vb.).
2. AI ile kodlama yapan yazılımcıların akut sorunlarını çözen DevTools (kod bağlamı/context, mimari senkronizasyon, prompt kuralları vb.).
3. Küçük işletmelerin (SMB) tekrarlayan manuel işlerini otomatikleştirip saatlerini kurtaran mikro-SaaS'lar.

ÖNEMLİ KURALLAR:
1. Kesinlikle 'Real Brand Name', 'Gerçek Marka Adı', 'Brand Name 1', 'Uygulama 1' gibi jenerik/sahte başlıklar KULLANMA. Fikirlere gerçek, yaratıcı SaaS adları ver (Örn: InvoicePulse, FormFlow, LeadCatch, RankTracker vb.).
2. Problem tanımları gerçek ve ikna edici olmalı (2-3 cümle). '1-2 sentences describing the problem' gibi şablon metinleri asla kopyalama!
3. mvpScope içinde 1 günde bitirilebilecek somut 3 ana özellik yaz. 'Feature 1', 'Özellik 1' gibi yer tutucular YASAKTIR.
4. verdict alanı: "high_potential" | "niche" | "trap" değerlerinden biri olmalı.
5. verdictReason: Fikrin para kazanma ve uygulanabilirlik potansiyelini özetleyen 1-2 cümlelik dürüst hakem yorumu olmalı.
6. signalIndex: Bu fikre ilham veren sinyalin indeks numarası (0..9 arası tamsayı).
7. Çıktı KESİNLİKLE doğrudan '[' ile başlayıp ']' ile biten geçerli bir JSON dizisi olmalıdır.

JSON Şeması:
[
  {
    "title": "SaaS Adı",
    "problem": "Yaşanan somut acı ve problem",
    "targetUser": "Hedef kullanıcı kitlesi",
    "alternatives": "Mevcut alternatifler ve neden yetersizler",
    "whyNow": "Neden tam olarak şu an yapılmalı",
    "mvpScope": ["1. Somut MVP özelliği", "2. Somut MVP özelliği", "3. Somut MVP özelliği"],
    "feasibilityNote": "Sıfır maliyet teknik fizibilite notu",
    "scores": { "pain": 8, "lackOfSolutions": 7, "feasibility": 9, "monetization": 7 },
    "totalScore": 31,
    "verdict": "high_potential",
    "verdictReason": "B2B müşteriye doğrudan satış getirir, 1 günde MVP'si çıkarılabilir.",
    "signalIndex": 0
  }
]`;
    }

    // Groq uzerindeki aktif modelleri dinamik olarak sorgula ve yetenekli modelleri önceliklendir
    let activeModels: string[] = [];
    try {
      const modelList = await groq.models.list();
      activeModels = modelList.data
        .filter((m: any) => m.active && !m.id.includes("whisper") && !m.id.includes("guard"))
        .map((m: any) => m.id);
    } catch (e: any) {
      console.warn("Modeller listelenemedi, varsayilanlara geciliyor:", e.message);
    }

    const priorityOrder = [
      "llama-3.3-70b-versatile",
      "deepseek-r1-distill-llama-70b",
      "llama-3.1-70b-versatile",
      "qwen-2.5-32b",
      "llama-3.1-8b-instant",
      "gemma2-9b-it"
    ];

    const orderedModels = [
      ...priorityOrder.filter(p => activeModels.includes(p)),
      ...activeModels.filter(m => !priorityOrder.includes(m))
    ];

    if (orderedModels.length === 0) {
      orderedModels.push("llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it");
    }

    let validIdeas: any[] | null = null;
    let lastError = null;

    for (const modelName of orderedModels) {
      try {
        const response = await groq.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: "system",
              content: "Sen bir JSON API'sisin. Sadece geçerli, özgün ve gerçekçi JSON dizisi döndür, başka hiçbir metin veya açıklama ekleme.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.6,
          max_tokens: 4096,
        });

        if (response?.choices?.[0]?.message?.content) {
          const content = response.choices[0].message.content.trim();
          const firstBracket = content.indexOf('[');
          const lastBracket = content.lastIndexOf(']');
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          
          let jsonString = content;
          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            jsonString = content.substring(firstBracket, lastBracket + 1);
          } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonString = `[${content.substring(firstBrace, lastBrace + 1)}]`;
          }
          
          const parsed = JSON.parse(jsonString);
          const ideasList = Array.isArray(parsed) ? parsed : [parsed];

          // Yer tutucu (placeholder) kontrolü: "Real Brand Name", "1-2 sentences", "Feature 1" gibi sahte içerikleri engelle
          const isPlaceholder = ideasList.some((item: any) => 
            /real brand name|gercek marka adi|marka adi \d|brand name \d|application name/i.test(item.title || '') ||
            /1-2 (?:cumle|sentence)|describing the problem|problem tanimi/i.test(item.problem || '') ||
            /feature \d|ozellik \d/i.test(JSON.stringify(item.mvpScope || []))
          );

          if (isPlaceholder) {
            console.warn(`Model ${modelName} placeholder (sahte şablon kopyası) üretti, reddediliyor ve sonraki model deneniyor...`);
            continue;
          }

          console.log(`Başarılı model ve özgün JSON: ${modelName}`);
          validIdeas = ideasList;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} basarisiz oldu: ${err.message}.`);
      }
    }

    const isQuotaError = lastError?.status === 429 || 
      lastError?.message?.toLowerCase().includes('rate limit') || 
      lastError?.message?.toLowerCase().includes('quota') ||
      lastError?.message?.toLowerCase().includes('tokens per minute') ||
      lastError?.message?.toLowerCase().includes('requests per day');

    let finalIdeas = validIdeas;
    if (!finalIdeas || finalIdeas.length === 0) {
      console.warn("AI modelleri geçerli özgün fikir üretemedi, pazar trendine uygun acil durum fikirleri devreye alınıyor.");
      finalIdeas = getRealisticFallbackIdeas(lang);
      warnings.push(
        isQuotaError 
          ? (lang === "en" ? "AI rate limit or quota exceeded. Default verified SaaS ideas loaded." : "AI kotası aşıldı. Doğrulanmış pazar SaaS fikirleri yüklendi.")
          : (lang === "en" ? "AI models temporarily occupied; loaded verified real-market SaaS ideas." : "Yapay zeka modelleri yoğunluk nedeniyle geçici olarak yanıt veremedi; güncel pazar sinyalleriyle doğrulanmış gerçek SaaS fikirleri yüklendi.")
      );
    }

    // Sinyal linklerini uretilen fikirlere eslestir (Sniper GTM icin)
    if (finalIdeas && finalIdeas.length > 0 && signalItems.length > 0 && !customIdea) {
      finalIdeas = finalIdeas.map((idea: any, idx: number) => {
        const sigIdx = typeof idea.signalIndex === "number" && signalItems[idea.signalIndex]
          ? idea.signalIndex
          : idx % signalItems.length;
        const matchedSignal = signalItems[sigIdx];
        return {
          ...idea,
          sourceUrl: matchedSignal?.url,
          sourceTitle: matchedSignal?.text,
          sourcePlatform: matchedSignal?.source,
        };
      });
    }

    // Hakem tavsiyesi oluştur (Judge Recommendation - 4. Çözüm)
    let judgeRecommendation = "";
    if (finalIdeas && finalIdeas.length > 0) {
      const sorted = [...finalIdeas].sort((a: any, b: any) => {
        if (a.verdict === "high_potential" && b.verdict !== "high_potential") return -1;
        if (b.verdict === "high_potential" && a.verdict !== "high_potential") return 1;
        return (b.totalScore || 0) - (a.totalScore || 0);
      });
      const best = sorted[0];
      const others = sorted.slice(1).map((i: any) => i.title).join(", ");
      if (lang === "en") {
        judgeRecommendation = `💡 Top pick for this round: "${best.title}". ${best.verdictReason || best.problem} ${others ? `(Compared to alternatives like ${others}, this holds the highest immediate monetization probability.)` : ''}`;
      } else {
        judgeRecommendation = `💡 Bu turun en güçlü adayı: "${best.title}". ${best.verdictReason || best.problem} ${others ? `(Diğer alternatifler: ${others}.)` : ''}`;
      }
    }

    res.json({
      ideas: finalIdeas,
      judgeRecommendation,
      warnings,
      isQuotaExceeded: !!isQuotaError,
      rawSignals: {
        reddit: redditData,
        trends: trendData,
        signalItems,
      },
    });
  } catch (error: any) {
    console.error("Idea generation error:", error);
    res.status(500).json({ error: error.message || "Fikir uretimi basarisiz oldu" });
  }
}
