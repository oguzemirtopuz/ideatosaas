import { Request, Response } from "express";
import googleTrends from "google-trends-api";
import { GoogleGenAI } from "@google/genai";

interface FetchResult {
  success: boolean;
  source: string;
  data: string[];
  error?: string;
  isRateLimit?: boolean;
}

async function fetchRedditSignals(): Promise<FetchResult> {
  const subreddits = ['SaaS', 'Entrepreneur', 'somebodymakethis'];
  let posts: string[] = [];
  for (const sub of subreddits) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=5`, {
         headers: { 'User-Agent': 'IdeaPipelineBot/1.0' }
      });
      if (res.status === 429) {
         return { success: false, source: 'reddit', data: posts, error: `Rate limit aşıldı (429) r/${sub} üzerinde`, isRateLimit: true };
      }
      if (!res.ok) {
         return { success: false, source: 'reddit', data: posts, error: `HTTP Hatası ${res.status} r/${sub} üzerinde` };
      }
      const json = await res.json();
      if (json && json.data && json.data.children) {
        const subPosts = json.data.children.map((c: any) => `${c.data.title} - ${c.data.selftext?.substring(0, 150)}...`);
        posts = posts.concat(subPosts);
      }
    } catch (e: any) {
      return { success: false, source: 'reddit', data: posts, error: e.message };
    }
  }
  return { success: true, source: 'reddit', data: posts };
}

async function fetchTrends(): Promise<FetchResult> {
   try {
     const res = await googleTrends.dailyTrends({ geo: 'US' });
     const parsed = JSON.parse(res);
     const trends = parsed.default.trendingSearchesDays[0].trendingSearches.map((t: any) => t.title.query);
     return { success: true, source: 'trends', data: trends.slice(0, 10) };
   } catch (e: any) {
     return { success: false, source: 'trends', data: [], error: e.message };
   }
}

export async function generateIdeasHandler(req: Request, res: Response) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not set. Please configure it in the Secrets panel." });
      return;
    }

    const [redditRes, trendRes] = await Promise.all([
      fetchRedditSignals(),
      fetchTrends()
    ]);

    const warnings: string[] = [];
    if (!redditRes.success) {
       warnings.push(`Reddit verisi tam olarak alınamadı (${redditRes.isRateLimit ? 'Rate Limit 429' : redditRes.error}). ${trendRes.success ? 'Sadece Trend verileri ve elde edilebilen kısıtlı Reddit verisi kullanıldı.' : ''}`);
    }
    if (!trendRes.success) {
       warnings.push(`Google Trends verisi alınamadı (${trendRes.error}). ${redditRes.success ? 'Fikirler sadece Reddit verisiyle üretildi.' : ''}`);
    }
    
    // Stop entirely if absolutely no data was fetched to prevent hallucinations
    if (redditRes.data.length === 0 && trendRes.data.length === 0) {
       res.status(500).json({ error: "Hiçbir veri kaynağından sinyal alınamadı (API'ler çöktü veya limitler aşıldı). Jenerik fikir üretimi engellendi." });
       return;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Sen kıdemli bir full-stack mühendis ve ürün stratejistisin. Görevin, AŞAĞIDAKİ GERÇEK PİYASA SİNYALLERİNİ temel alarak sıfır maliyetle (Next.js, Supabase, Vercel free tier) 1 günde kurulabilecek tam 3 adet mikro-SaaS / araç fikri üretmek. Fikirleri kendi kafandan değil, kesinlikle bu sinyallere dayanarak üretmelisin.

    Reddit Şikayetleri/Fikirleri: ${JSON.stringify(redditRes.data)}
    Google Trends (Bugün): ${JSON.stringify(trendRes.data)}
    
    Her fikri şu kriterlere göre 10 üzerinden puanla:
    1. Acı yoğunluğu
    2. Mevcut çözümlerin yetersizliği
    3. Teknik fizibilite (1 günde çıkmalı)
    4. Monetizasyon sinyali
    
    Çıktı FORMATI KESİNLİKLE AŞAĞIDAKİ GİBİ BİR JSON DİZİSİ OLMALIDIR, DIŞINDA HİÇBİR METİN VEYA MARKDOWN (örneğin \`\`\`json) KULLANMA:
    [
      {
        "title": "Uygulama Adı",
        "problem": "1-2 cümle ile problem tanımı",
        "targetUser": "Hedef kullanıcı",
        "alternatives": "Mevcut alternatifler ve neden yetersizler",
        "whyNow": "Neden şimdi yapılmalı (Trend veya talep sinyali)",
        "mvpScope": ["Özellik 1", "Özellik 2", "Özellik 3"],
        "feasibilityNote": "Fizibilite notu",
        "scores": {
          "pain": 8,
          "lackOfSolutions": 7,
          "feasibility": 9,
          "monetization": 7
        },
        "totalScore": 31
      }
    ]`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    const rawText = response.text || "[]";
    const cleanedText = rawText.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    const ideas = JSON.parse(cleanedText);

    res.json({ 
      ideas, 
      warnings, 
      rawSignals: { 
        reddit: redditRes.data, 
        trends: trendRes.data 
      } 
    });
  } catch (error: any) {
    console.error("Idea generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate ideas" });
  }
}
