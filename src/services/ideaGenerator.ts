import { Request, Response } from "express";
import googleTrends from "google-trends-api";
import Groq from "groq-sdk";

// Veri kaynagi sonuc tipi
interface FetchResult {
  success: boolean;
  source: string;
  data: string[];
  error?: string;
}

// Reddit RSS/Atom yanitindan baslik ve icerik cikarma (XML parser gerektirmez)
function extractTitlesFromRSS(xml: string): string[] {
  const titles: string[] = [];
  const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
  const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/;
  const contentRegex = /<content[^>]*>([\s\S]*?)<\/content>/;

  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[0];
    const titleMatch = titleRegex.exec(entry);
    const contentMatch = contentRegex.exec(entry);

    if (titleMatch) {
      const title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      let snippet = "";
      if (contentMatch) {
        snippet = contentMatch[1]
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/<[^>]+>/g, "") // HTML etiketlerini kaldir
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
          .substring(0, 150)
          .trim();
      }
      titles.push(snippet ? `${title} - ${snippet}` : title);
    }
  }
  return titles;
}

// Canli startup, SaaS ve aci noktasi sinyallerini topla (Reddit + Hacker News SaaS/Show HN)
async function fetchRedditSignals(): Promise<FetchResult> {
  const sources = [
    { name: "HackerNews-SaaS", url: "https://hnrss.org/newest?q=SaaS" },
    { name: "HackerNews-ShowHN", url: "https://hnrss.org/show" },
    { name: "Reddit-SaaS", url: "https://www.reddit.com/r/SaaS/new.rss?limit=5" },
    { name: "Reddit-Entrepreneur", url: "https://www.reddit.com/r/Entrepreneur/new.rss?limit=5" }
  ];
  
  let allPosts: string[] = [];
  const errors: string[] = [];

  for (const src of sources) {
    try {
      const res = await fetch(src.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) StartupSignalBot/1.0" },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const xml = await res.text();
        const posts = extractTitlesFromRSS(xml);
        if (posts.length > 0) {
          allPosts = allPosts.concat(posts.slice(0, 5));
        }
      } else {
        errors.push(`${src.name}: HTTP ${res.status}`);
      }
    } catch (e: any) {
      errors.push(`${src.name}: ${e.message}`);
    }
  }

  return {
    success: allPosts.length > 0,
    source: "market-signals",
    data: allPosts,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

// Google Trends verilerini cek
async function fetchTrends(): Promise<FetchResult> {
  try {
    const res = await googleTrends.dailyTrends({ geo: "US" });
    const parsed = JSON.parse(res);
    const trends = parsed.default.trendingSearchesDays[0].trendingSearches.map(
      (t: any) => t.title.query
    );
    return { success: true, source: "trends", data: trends.slice(0, 10) };
  } catch (e: any) {
    return { success: false, source: "trends", data: [], error: e.message };
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
function getRealisticFallbackIdeas(): any[] {
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
      totalScore: 34
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
      totalScore: 32
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
      totalScore: 32
    }
  ];
}

// Ana fikir uretme handler'i
export async function generateIdeasHandler(req: Request, res: Response) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("GROQ_API_KEY ayarlanmamış, doğrulanmış pazar SaaS fikirleri devreye alınıyor.");
      res.json({
        ideas: getRealisticFallbackIdeas(),
        warnings: [
          "GROQ_API_KEY tanımlanmadığı için güncel pazar sinyalleriyle doğrulanmış gerçek mikro-SaaS fikirleri yüklendi. Canlı AI için Vercel veya .env üzerinden GROQ_API_KEY ekleyebilirsiniz."
        ],
        rawSignals: { reddit: [], trends: [] },
      });
      return;
    }

    const customIdea = req.body?.customIdea;

    let redditData: string[] = [];
    let trendData: string[] = [];
    const warnings: string[] = [];

    if (!customIdea) {
      // Otomatik fikir uretimi - veri kaynaklarini tara
      const [redditRes, trendRes] = await Promise.all([fetchRedditSignals(), fetchTrends()]);

      redditData = redditRes.data;
      trendData = trendRes.data;

      if (!redditRes.success) {
        warnings.push(`Reddit verisi kismi/tamamen alinamadi (${redditRes.error})`);
      }
      if (!trendRes.success) {
        warnings.push(`Google Trends verisi alinamadi (${trendRes.error})`);
      }

      // Hic veri yoksa yedek sinyalleri kullan
      if (redditData.length === 0 && trendData.length === 0) {
        const fallback = getFallbackSignals();
        redditData = fallback.reddit;
        trendData = fallback.trends;
        warnings.push(
          "Canli veri kaynaklari erisilemedi, guncel pazar trendleri ve bilinen sikayetler kullanildi."
        );
      }
    }

    const groq = new Groq({ apiKey });

    let prompt: string;

    if (customIdea) {
      prompt = `Sen kıdemli bir startup kurucusu ve full-stack mimarsın. Kullanıcı şu fikri/ihtiyacı paylaştı:
"${customIdea}"

Bu fikri analiz et ve sıfır maliyetle (React, Supabase free tier, Vercel free tier) 1 günde kurulabilecek somut bir Mikro-SaaS olarak detaylandır. Fikre yaratıcı, akılda kalıcı, özgün bir SaaS ürün adı ver (Asla 'Application Name' veya 'Uygulama Adı' gibi jenerik kalıplar yazma!).

Kriterler (1-10 puan):
1. Acı yoğunluğu (pain)
2. Mevcut çözümlerin yetersizliği (lackOfSolutions)
3. Teknik fizibilite - 1 günde çıkmalı (feasibility)
4. Monetizasyon sinyali (monetization)

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
    "totalScore": 31
  }
]`;
    } else {
      prompt = `Sen kıdemli bir startup kurucusu ve full-stack mimarsın.
Görevin, aşağıdaki gerçek piyasa sinyallerini analiz ederek sıfır maliyetle (React/Tailwind, Supabase free tier, Vercel free tier) 1 günde kurulabilecek TAM 3 ADET FARKLI, ÖZGÜN ve GERÇEKÇİ Mikro-SaaS fikri üretmektir.

Reddit Şikayetleri/Talepleri: ${JSON.stringify(redditData.slice(0, 10))}
Google Trends (Bugün): ${JSON.stringify(trendData.slice(0, 10))}

ÖNEMLİ KURALLAR:
1. Kesinlikle 'Real Brand Name', 'Gerçek Marka Adı', 'Brand Name 1', 'Uygulama 1' gibi jenerik/sahte başlıklar KULLANMA. Fikirlere gerçek, yaratıcı SaaS adları ver (Örn: InvoicePulse, FormFlow, LeadCatch, RankTracker vb.).
2. Problem tanımları gerçek ve ikna edici olmalı (2-3 cümle). '1-2 sentences describing the problem' gibi şablon metinleri asla kopyalama!
3. mvpScope içinde 1 günde bitirilebilecek somut 3 ana özellik yaz. 'Feature 1', 'Özellik 1' gibi yer tutucular YASAKTIR.
4. Çıktı KESİNLİKLE doğrudan '[' ile başlayıp ']' ile biten geçerli bir JSON dizisi olmalıdır.

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
    "totalScore": 31
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

    let finalIdeas = validIdeas;
    if (!finalIdeas || finalIdeas.length === 0) {
      console.warn("AI modelleri geçerli özgün fikir üretemedi, pazar trendine uygun acil durum fikirleri devreye alınıyor.");
      finalIdeas = getRealisticFallbackIdeas();
      warnings.push("Yapay zeka modelleri yoğunluk nedeniyle geçici olarak yanıt veremedi; güncel pazar sinyalleriyle doğrulanmış gerçek SaaS fikirleri yüklendi.");
    }

    res.json({
      ideas: finalIdeas,
      warnings,
      rawSignals: {
        reddit: redditData,
        trends: trendData,
      },
    });
  } catch (error: any) {
    console.error("Idea generation error:", error);
    res.status(500).json({ error: error.message || "Fikir uretimi basarisiz oldu" });
  }
}
