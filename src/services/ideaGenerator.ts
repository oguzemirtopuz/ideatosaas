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

// Reddit verilerini cek (once RSS, fallback olarak JSON)
async function fetchRedditSignals(): Promise<FetchResult> {
  const subreddits = ["SaaS", "Entrepreneur", "somebodymakethis", "SideProject", "smallbusiness"];
  let allPosts: string[] = [];
  const errors: string[] = [];

  for (const sub of subreddits) {
    // Once RSS dene (rate-limit'e daha az takilir)
    try {
      const rssRes = await fetch(`https://www.reddit.com/r/${sub}/new.rss?limit=5`, {
        headers: { "User-Agent": "IdeaPipelineBot/1.0 (RSS Reader)" },
        signal: AbortSignal.timeout(8000),
      });

      if (rssRes.ok) {
        const xml = await rssRes.text();
        const posts = extractTitlesFromRSS(xml);
        if (posts.length > 0) {
          allPosts = allPosts.concat(posts.slice(0, 5));
          continue; // Bu subreddit basarili, sonrakine gec
        }
      }
    } catch (_e) {
      // RSS basarisiz, JSON'a dus
    }

    // RSS basarisiz olduysa JSON dene
    try {
      const jsonRes = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=5`, {
        headers: { "User-Agent": "IdeaPipelineBot/1.0" },
        signal: AbortSignal.timeout(8000),
      });

      if (jsonRes.ok) {
        const json = await jsonRes.json();
        if (json?.data?.children) {
          const posts = json.data.children.map(
            (c: any) => `${c.data.title} - ${c.data.selftext?.substring(0, 150) || ""}`
          );
          allPosts = allPosts.concat(posts);
        }
      } else {
        errors.push(`r/${sub}: HTTP ${jsonRes.status}`);
      }
    } catch (e: any) {
      errors.push(`r/${sub}: ${e.message}`);
    }
  }

  return {
    success: allPosts.length > 0,
    source: "reddit",
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

// Ana fikir uretme handler'i
export async function generateIdeasHandler(req: Request, res: Response) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: "GROQ_API_KEY ayarlanmamis. Vercel Dashboard > Settings > Environment Variables bolumunden ekleyin.",
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
      prompt = `Sen kidemli bir full-stack muhendis ve urun stratejistisin. Kullanici su fikri/ihtiyaci paylasti:

"${customIdea}"

Bu fikri analiz et ve sifir maliyetle (Next.js/Vite, Supabase free tier, Vercel free tier) 1 gunde kurulabilecek bir mikro-SaaS / arac olarak detaylandir.

Su kriterlere gore 10 uzerinden puanla:
1. Aci yogunlugu (pain)
2. Mevcut cozumlerin yetersizligi (lackOfSolutions)
3. Teknik fizibilite - 1 gunde cikmali (feasibility)
4. Monetizasyon sinyali (monetization)

Yanitini KESINLIKLE asagidaki JSON formatinda ver, disinda hicbir metin veya markdown kullanma:
[
  {
    "title": "Uygulama Adi",
    "problem": "1-2 cumle ile problem tanimi",
    "targetUser": "Hedef kullanici",
    "alternatives": "Mevcut alternatifler ve neden yetersizler",
    "whyNow": "Neden simdi yapilmali",
    "mvpScope": ["Ozellik 1", "Ozellik 2", "Ozellik 3"],
    "feasibilityNote": "Fizibilite notu",
    "scores": { "pain": 8, "lackOfSolutions": 7, "feasibility": 9, "monetization": 7 },
    "totalScore": 31
  }
]`;
    } else {
      prompt = `Sen kidemli bir full-stack muhendis ve urun stratejistisin. Gorevin, ASAGIDAKI GERCEK PIYASA SINYALLERINI temel alarak sifir maliyetle (Next.js/Vite, Supabase free tier, Vercel free tier) 1 gunde kurulabilecek tam 3 adet mikro-SaaS / arac fikri uretmek. Fikirleri kendi kafandan degil, kesinlikle bu sinyallere dayanarak uretmelisin.

Reddit Sikayetleri/Fikirleri: ${JSON.stringify(redditData)}
Google Trends (Bugun): ${JSON.stringify(trendData)}

Her fikri su kriterlere gore 10 uzerinden puanla:
1. Aci yogunlugu (pain)
2. Mevcut cozumlerin yetersizligi (lackOfSolutions)
3. Teknik fizibilite - 1 gunde cikmali (feasibility)
4. Monetizasyon sinyali (monetization)

Yanitini KESINLIKLE asagidaki JSON formatinda ver, disinda hicbir metin veya markdown kullanma:
[
  {
    "title": "Uygulama Adi",
    "problem": "1-2 cumle ile problem tanimi",
    "targetUser": "Hedef kullanici",
    "alternatives": "Mevcut alternatifler ve neden yetersizler",
    "whyNow": "Neden simdi yapilmali (Trend veya talep sinyali)",
    "mvpScope": ["Ozellik 1", "Ozellik 2", "Ozellik 3"],
    "feasibilityNote": "Fizibilite notu",
    "scores": { "pain": 8, "lackOfSolutions": 7, "feasibility": 9, "monetization": 7 },
    "totalScore": 31
  }
]`;
    }

    const candidateModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama3-70b-8192",
      "llama3-8b-8192",
      "mixtral-8x7b-32768"
    ];

    let response = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        response = await groq.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: "system",
              content: "Sen bir JSON API'sisin. Sadece gecerli JSON dizisi dondur, baska hicbir metin veya aciklama ekleme.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        });
        if (response?.choices?.[0]?.message?.content) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} basarisiz oldu: ${err.message}. Sonraki deneniyor...`);
      }
    }

    if (!response || !response.choices?.[0]?.message?.content) {
      throw new Error(`Tum Groq modelleri basarisiz oldu: ${lastError?.message || "Bilinmeyen hata"}`);
    }

    const rawText = response.choices[0].message.content;
    const cleanedText = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const ideas = JSON.parse(cleanedText);

    res.json({
      ideas: Array.isArray(ideas) ? ideas : [ideas],
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
