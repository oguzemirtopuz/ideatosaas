import { Request, Response } from "express";
import Groq from "groq-sdk";

// Aşama 4 & 5: Pazarlama Test Motoru ve Karar Motoru Servisi
export async function generateMarketingAndDecisionHandler(req: Request, res: Response) {
  try {
    const { idea, spec } = req.body;
    const lang = req.body?.lang === "en" ? "en" : "tr";
    if (!idea || !spec) {
      res.status(400).json({ error: lang === "en" ? "Idea and Spec objects required." : "Fikir ve Spec nesnesi gerekli." });
      return;
    }

    const apiKey = (req.headers['x-groq-api-key'] as string) || req.body?.customApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("GROQ_API_KEY bulunamadı, akıllı yedek pazarlama stratejisi üretiliyor.");
      const fallbackResult = lang === "en" ? {
        channel: "Reddit Ads (r/SaaS, r/Entrepreneur, r/SideProject)",
        adCopy: {
          headline: `${idea.title} - ${idea.problem.substring(0, 50)}... Solved!`,
          body: `Engineered for ${idea.targetUser} with zero infrastructure overhead. Start saving hours today.`,
          callToAction: "Try For Free"
        },
        setupChecklist: [
          "Step 1: Deploy landing page on Vercel / Netlify",
          "Step 2: Setup Reddit / Twitter Ads conversion pixel",
          "Step 3: Run 3-day $30 micro-budget validation experiment"
        ],
        simulation: {
          testBudget: 30,
          visitors: 380,
          conversions: 32,
          cac: 0.93,
          decision: "PROCEED",
          decisionNote: "CAC $0.93 is well within target range ($0.50 - $1.00). Keep scaling acquisition!"
        }
      } : {
        channel: "Reddit Ads (r/SaaS, r/Entrepreneur, r/SideProject)",
        adCopy: {
          headline: `${idea.title} - ${idea.problem.substring(0, 50)}... Artık Kolay!`,
          body: `${idea.targetUser} için sıfır maliyetle geliştirildi. Hemen deneyin ve zaman kazanın.`,
          callToAction: "Ücretsiz Başla"
        },
        setupChecklist: [
          "1. Adım: Vercel / Netlify üzerinde landing page'i yayınla",
          "2. Adım: Reddit Ads veya Twitter Ads hesabı aç ve dönüşüm pikseli ekle",
          "3. Adım: 30$ bütçeli 3 günlük mikro test başlat"
        ],
        simulation: {
          testBudget: 30,
          visitors: 380,
          conversions: 32,
          cac: 0.93,
          decision: "DEVAM ET",
          decisionNote: "CAC $0.93 ile $0.50 - $1.00 hedef aralığında! Büyümeyi sürdürün."
        }
      };
      res.json({ result: fallbackResult, isQuotaExceeded: true });
      return;
    }

    const groq = new Groq({ apiKey });

    let activeModels: string[] = [];
    try {
      const modelList = await groq.models.list();
      activeModels = modelList.data
        .filter((m: any) => m.active && !m.id.includes("whisper") && !m.id.includes("guard"))
        .map((m: any) => m.id);
    } catch (e) {
      activeModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    }

    const priorityModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      ...activeModels.filter(m => !["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama-3.1-8b-instant"].includes(m))
    ];

    const prompt = lang === "en" ? `You are a principal growth hacker and product marketing lead.
Design a high-converting go-to-market test and CAC unit economics decision engine for the micro-SaaS below. All text must be in English.

Product Context:
Title: ${idea.title}
Problem: ${idea.problem}
Target User: ${idea.targetUser}
Tagline: ${spec.tagline || ""}

RULES:
1. Select the highest-leverage acquisition channel (Reddit Ads, X/Twitter Ads, or Google Search Ads).
2. Design a lean $30 micro-budget experiment.
3. Decision rule: CAC <= $1.00 -> "PROCEED", CAC > $1.00 -> "PIVOT".

Respond STRICTLY with valid JSON (no markdown or prose):
{
  "channel": "Reddit Ads (r/SaaS, r/startups)",
  "adCopy": {
    "headline": "High-Converting Punchy Ad Headline",
    "body": "Compelling 2-sentence hook targeted directly to ICP.",
    "callToAction": "Try Free Today"
  },
  "setupChecklist": [
    "Step 1: Embed free telemetry and conversion tracking",
    "Step 2: Configure Reddit / Twitter ad campaign pixel",
    "Step 3: Launch 3-day $10/day validation experiment"
  ],
  "simulation": {
    "testBudget": 30,
    "visitors": 450,
    "conversions": 35,
    "cac": 0.86,
    "decision": "PROCEED",
    "decisionNote": "Calculated CAC is $0.86, beating our $1.00 viability ceiling. Proceed with scaling!"
  }
}` : `Sen kıdemli bir büyüme pazarlamacısı (Growth Hacker) ve ürün yöneticisisin.
Aşağıdaki mikro-SaaS için "AŞAMA 4: MARKETING TEST MOTORU" ve "AŞAMA 5: KARAR MOTORU" stratejisini hazırla.

Ürün Bilgileri:
Başlık: ${idea.title}
Problem: ${idea.problem}
Hedef Kitle: ${idea.targetUser}
Slogan: ${spec.tagline || ""}

KURALLAR & HEDEFLER:
1. Reklam kanalı: Hedef kitleye en uygun olanı seç (Reddit Ads, X/Twitter Ads veya Google Search Ads).
2. Düşük bütçeli test: Maksimum 20$ - 50$ test bütçesi.
3. CAC eşik kuralı: 
   - CAC $0.50 - $1.00 aralığındaysa "DEVAM ET, BÜTÇEYİ ARTIR"
   - CAC $1.00 üzerindeyse "DURDUR, SIRADAKİ FİKRE GEÇ"
4. Gerçekçi simülasyon rakamları üret (Harcanan bütçe, tıklama, edinim/kayıt sayısı, hesaplanan CAC).

KESİNLİKLE AŞAĞIDAKİ JSON FORMATINDA DÖN (Markdown veya açıklama ekleme):
{
  "channel": "Reddit Ads (r/SaaS, r/startups)",
  "adCopy": {
    "headline": "Çarpıcı Reklam Başlığı",
    "body": "Hedef kitleyi yakalayan 2 cümlelik reklam metni",
    "callToAction": "Hemen Ücretsiz Dene"
  },
  "setupChecklist": [
    "1. Adım: Landing page'e ücretsiz Vercel Analytics veya Umami scripti ekle",
    "2. Adım: Reddit Ads / Google Ads hesabı aç ve dönüşüm pikselini tanımla",
    "3. Adım: Günlük 10$ bütçe ile 3 günlük test kampanyasını başlat"
  ],
  "simulation": {
    "testBudget": 30,
    "visitors": 450,
    "conversions": 35,
    "cac": 0.86,
    "decision": "DEVAM ET",
    "decisionNote": "Hesaplanan CAC 0.86$ ile $1.00 sınırının altında, birim ekonomi karlı. İlerleyin!"
  }
}`;

    let parsedResult = null;
    let lastError: any = null;
    for (const modelName of priorityModels) {
      try {
        const response = await groq.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: "Sen bir JSON API'sisin. Sadece geçerli JSON nesnesi döndür." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 3000
        });
        if (response?.choices?.[0]?.message?.content) {
          const content = response.choices[0].message.content.trim();
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            parsedResult = JSON.parse(content.substring(firstBrace, lastBrace + 1));
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!parsedResult) {
      // Acil durum akıllı yedek pazarlama stratejisi
      parsedResult = {
        channel: "Reddit Ads (r/SaaS, r/Entrepreneur, r/SideProject)",
        adCopy: {
          headline: `${idea.title} - ${idea.problem.substring(0, 50)}... Artık Kolay!`,
          body: `${idea.targetUser} için sıfır maliyetle geliştirildi. Hemen deneyin ve zaman kazanın.`,
          callToAction: "Ücretsiz Başla"
        },
        setupChecklist: [
          "1. Adım: Vercel / Netlify üzerinde landing page'i yayınla",
          "2. Adım: Reddit Ads veya Twitter Ads hesabı aç ve dönüşüm pikseli ekle",
          "3. Adım: 30$ bütçeli 3 günlük mikro test başlat"
        ],
        simulation: {
          testBudget: 30,
          visitors: 380,
          conversions: 32,
          cac: 0.93,
          decision: "DEVAM ET",
          decisionNote: "CAC $0.93 ile $0.50 - $1.00 hedef aralığında! Büyümeyi sürdürün."
        }
      };
    }

    const isQuotaError = !parsedResult && (
      lastError?.status === 429 || 
      lastError?.message?.toLowerCase().includes('rate limit') || 
      lastError?.message?.toLowerCase().includes('quota')
    );

    res.json({ result: parsedResult, isQuotaExceeded: !!isQuotaError });
  } catch (error: any) {
    console.error("Marketing & Decision error:", error);
    res.status(500).json({ error: error.message || "Pazarlama analizi başarısız oldu" });
  }
}
