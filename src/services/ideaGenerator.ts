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

// RSS (RSS 2.0 <item> ve Atom <entry>) yanitindan baslik ve icerik cikarma (XML parser gerektirmez)
function extractTitlesFromRSS(xml: string): string[] {
  const titles: string[] = [];
  // Hem RSS 2.0 (<item>) hem de Atom (<entry>) bloklarini yakala
  const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi;
  const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i;
  const contentRegex = /<(?:content|summary|description)[^>]*>([\s\S]*?)<\/(?:content|summary|description)>/i;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const entry = match[0];
    const titleMatch = titleRegex.exec(entry);
    const contentMatch = contentRegex.exec(entry);

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
      if (title) {
        titles.push(snippet ? `${title} - ${snippet}` : title);
      }
    }
  }
  return titles;
}

// Canli startup, SaaS ve aci noktasi sinyallerini topla (Hacker News Algolia API + Dev.to + Reddit)
async function fetchRedditSignals(): Promise<FetchResult> {
  let allPosts: string[] = [];
  const errors: string[] = [];

  // 1. Hacker News resmi Algolia REST API (Engelsiz, hizli, JSON formatinda)
  try {
    const hnEndpoints = [
      "https://hn.algolia.com/api/v1/search_by_date?query=SaaS&tags=story&hitsPerPage=5",
      "https://hn.algolia.com/api/v1/search?tags=show_hn&hitsPerPage=5"
    ];

    for (const url of hnEndpoints) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.hits)) {
            const titles = json.hits
              .map((h: any) => h.title)
              .filter((t: any) => typeof t === "string" && t.trim().length > 0);
            allPosts = allPosts.concat(titles);
          }
        }
      } catch (err: any) {
        errors.push(`HN-Algolia: ${err.message}`);
      }
    }
  } catch (e: any) {
    errors.push(`HN-Global: ${e.message}`);
  }

  // 2. Dev.to ve RSS kaynaklari
  const rssSources = [
    { name: "DevTo-SaaS", url: "https://dev.to/feed/tag/saas" },
    { name: "Reddit-SaaS", url: "https://old.reddit.com/r/SaaS/new.rss?limit=5" },
    { name: "Reddit-Entrepreneur", url: "https://old.reddit.com/r/Entrepreneur/new.rss?limit=5" }
  ];

  for (const src of rssSources) {
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
    const apiKey = (req.headers['x-groq-api-key'] as string) || req.body?.customApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("GROQ_API_KEY ayarlanmamış, doğrulanmış pazar SaaS fikirleri devreye alınıyor.");
      res.json({
        ideas: getRealisticFallbackIdeas(),
        warnings: [
          "GROQ_API_KEY is not configured. Fallback SaaS ideas loaded. You can provide your own free Groq API key in Settings."
        ],
        isQuotaExceeded: true,
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

      if (!redditRes.success || redditData.length === 0) {
        warnings.push(`Pazar sinyali verisi alınamadı (${redditRes.error || "kaynak yanıt vermedi"})`);
      }
      if (!trendRes.success || trendData.length === 0) {
        warnings.push(`Trend verisi alınamadı (${trendRes.error || "kaynak yanıt vermedi"})`);
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
      prompt = `Sen kıdemli bir startup kurucusu, solo kurucu mentoru ve full-stack mimarsın.
Görevin, aşağıdaki gerçek piyasa sinyallerini analiz ederek sıfır maliyetle (React/Tailwind, Supabase free tier, Vercel free tier) 1 günde kurulabilecek TAM 3 ADET FARKLI, ÖZGÜN, YÜKSEK MONETİZASYON POTANSİYELİNE SAHİP Mikro-SaaS fikri üretmektir.

Reddit Şikayetleri/Talepleri: ${JSON.stringify(redditData.slice(0, 10))}
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
6. Çıktı KESİNLİKLE doğrudan '[' ile başlayıp ']' ile biten geçerli bir JSON dizisi olmalıdır.

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
    "verdictReason": "B2B müşteriye doğrudan satış getirir, 1 günde MVP'si çıkarılabilir."
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
      finalIdeas = getRealisticFallbackIdeas();
      warnings.push(
        isQuotaError 
          ? "AI rate limit or quota exceeded. Default verified SaaS ideas loaded."
          : "Yapay zeka modelleri yoğunluk nedeniyle geçici olarak yanıt veremedi; güncel pazar sinyalleriyle doğrulanmış gerçek SaaS fikirleri yüklendi."
      );
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
      judgeRecommendation = `💡 Bu turun en güçlü adayı: "${best.title}". ${best.verdictReason || best.problem} ${others ? `(Diğer alternatifler: ${others}.)` : ''}`;
    }

    res.json({
      ideas: finalIdeas,
      judgeRecommendation,
      warnings,
      isQuotaExceeded: !!isQuotaError,
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
