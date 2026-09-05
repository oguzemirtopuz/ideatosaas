import { Request, Response } from "express";
import Groq from "groq-sdk";

// Aşama 2: Spec Üretici Handler
export async function generateSpecHandler(req: Request, res: Response) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GROQ_API_KEY bulunamadı." });
      return;
    }

    const { idea } = req.body;
    if (!idea || !idea.title) {
      res.status(400).json({ error: "Geçerli bir fikir nesnesi gerekli." });
      return;
    }

    const groq = new Groq({ apiKey });

    // Aktif modelleri al
    let activeModels: string[] = [];
    try {
      const modelList = await groq.models.list();
      activeModels = modelList.data
        .filter((m: any) => m.active && !m.id.includes("whisper") && !m.id.includes("guard"))
        .map((m: any) => m.id);
    } catch (e: any) {
      activeModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];
    }

    const prompt = `Sen kıdemli bir full-stack mimar ve ürün yöneticisisin. 
Aşağıda seçilen mikro-SaaS fikri için "Aşama 2: SPEC-FIRST" disiplinine uygun eksiksiz bir teknik şartname (SPEC) hazırla.
Stack kuralı: Next.js/React, Tailwind CSS, Supabase (Postgres & Auth), Vercel free tier, sıfır maliyet.

Seçilen Fikir:
Başlık: ${idea.title}
Problem: ${idea.problem}
Hedef Kitle: ${idea.targetUser}
MVP Kapsamı: ${JSON.stringify(idea.mvpScope)}

Aşağıdaki JSON formatında yanıt ver (Markdown veya ek metin kullanma):
{
  "title": "${idea.title}",
  "tagline": "Etkileyici ve kısa bir ürün sloganı",
  "userFlows": [
    "1. Adım: Kullanıcı kayıt/giriş yapar ve karşılama ekranını görür",
    "2. Adım: İlk verisini (örneğin kayıt/takip verisi) girer",
    "3. Adım: Dashboard üzerinden grafik ve durum özetini inceler",
    "4. Adım: Rapor alır veya veri günceller"
  ],
  "dataModel": [
    { "table": "users", "description": "Kullanıcı profilleri ve kimlik bilgileri" },
    { "table": "records", "description": "Uygulamanın ana veri kayıtları ve zaman damgası" }
  ],
  "screens": [
    "1. Giriş ve Karşılama Paneli",
    "2. Veri Ekleme / İşlem Formu",
    "3. Ana Dashboard & İstatistik/Grafik Ekranı"
  ],
  "outOfScope": [
    "Karmaşık takım izinleri ve çoklu şirket yönetimi (v2'ye bırakıldı)",
    "Özel mobil native bildirimler (PWA ile çözülecek)",
    "Ücretli üçüncü parti kurumsal API entegrasyonları"
  ],
  "buildChecklist": [
    "Adım 1: Temel Arayüz İskeleti ve Navigasyon",
    "Adım 2: Form ve Canlı Veri Giriş Mekanizması",
    "Adım 3: İstatistikler ve Görselleştirme/Grafik",
    "Adım 4: Veri Dışa Aktarma ve Doğrulama"
  ]
}`;

    let response = null;
    for (const modelName of activeModels) {
      try {
        response = await groq.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: "Sen bir JSON API'sisin. Sadece geçerli JSON nesnesi döndür." },
            { role: "user", content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 3500
        });
        if (response?.choices?.[0]?.message?.content) {
          const content = response.choices[0].message.content.trim();
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            JSON.parse(content.substring(firstBrace, lastBrace + 1));
            break;
          }
        }
      } catch (err) {
        // sonraki modeli dene
      }
    }

    if (!response || !response.choices?.[0]?.message?.content) {
      throw new Error("Spec oluşturulamadı.");
    }

    const content = response.choices[0].message.content.trim();
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    const spec = JSON.parse(content.substring(firstBrace, lastBrace + 1));

    res.json({ spec });
  } catch (error: any) {
    console.error("Spec generation error:", error);
    res.status(500).json({ error: error.message || "Spec oluşturulamadı" });
  }
}

// React kodunu temizleme ve import/export kalıntılarını arındırma fonksiyonu
export function sanitizeReactCode(code: string): string {
  if (!code) return "";

  let cleaned = code
    // Markdown bloklarını kaldır
    .replace(/^```[a-zA-Z]*\n/gm, "")
    .replace(/\n```$/gm, "")
    .trim();

  // 1. React importlarını React global nesnesine bağla
  cleaned = cleaned.replace(
    /import\s+React\s*,\s*\{([^}]+)\}\s+from\s+['"][^'"]+['"];?/g,
    "const { $1 } = React;"
  );
  cleaned = cleaned.replace(
    /import\s*\{([^}]+)\}\s+from\s+['"]react['"];?/g,
    "const { $1 } = React;"
  );
  cleaned = cleaned.replace(
    /import\s+React\s+from\s+['"]react['"];?/g,
    "/* React global */"
  );
  cleaned = cleaned.replace(
    /import\s+\*\s+as\s+React\s+from\s+['"]react['"];?/g,
    "/* React global */"
  );

  // 2. Lucide veya ikon kütüphanesi importlarını Proxy'ye bağla
  cleaned = cleaned.replace(
    /import\s*\{([^}]+)\}\s+from\s+['"](?:lucide-react|react-icons[^'"]*)['"];?/g,
    "const { $1 } = (window.LucideIcons || {});"
  );

  // 3. Çok satırlı veya tek satırlı kalan TÜM importları yok et
  cleaned = cleaned.replace(
    /\bimport\s+[\s\S]*?from\s*['"`][^'"`]+['"`]\s*;?/g,
    ""
  );
  cleaned = cleaned.replace(
    /\bimport\s*['"`][^'"`]+['"`]\s*;?/g,
    ""
  );
  cleaned = cleaned.replace(
    /^\s*import\b.*$/gm,
    ""
  );

  // 4. Export ifadelerini App bileşenini hedefleyecek şekilde dönüştür
  cleaned = cleaned.replace(
    /export\s+default\s+function\s*(\w*)/g,
    "function App"
  );
  cleaned = cleaned.replace(
    /export\s+default\s+class\s*(\w*)/g,
    "class App"
  );
  cleaned = cleaned.replace(
    /export\s+default\s+([A-Za-z0-9_$]+)\s*;?/g,
    "var App = $1;"
  );
  cleaned = cleaned.replace(
    /export\s+default\s+[\s\S]*?;?/g,
    ""
  );
  cleaned = cleaned.replace(
    /export\s+{[^}]+};?/g,
    ""
  );
  cleaned = cleaned.replace(
    /export\s+(const|let|var|function|class)/g,
    "$1"
  );

  // 5. Eğer App adında bir bileşen yoksa, büyük harfle başlayan bileşeni App olarak ata
  if (!/(?:function|const|var|let|class)\s+App\b/.test(cleaned)) {
    const compMatch = cleaned.match(/(?:function|class)\s+([A-Z][a-zA-Z0-9_]*)/);
    if (compMatch && compMatch[1]) {
      cleaned += `\nvar App = ${compMatch[1]};`;
    }
  }

  return cleaned.trim();
}

// Aşama 2: Canlı Çalışan Uygulama Kodu Üretici Handler
export async function buildAppHandler(req: Request, res: Response) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GROQ_API_KEY bulunamadı." });
      return;
    }

    const { idea, spec } = req.body;
    if (!idea || !spec) {
      res.status(400).json({ error: "Fikir ve Spec verisi gerekli." });
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
      activeModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];
    }

    // Kod üretimi için en zeki modelleri önceliklendir (Llama 3.3 70B veya Llama 3.1 8B)
    const priorityModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      ...activeModels.filter(m => m !== "llama-3.3-70b-versatile" && m !== "llama-3.1-8b-instant")
    ];

    const prompt = `GÖREV: Aşağıdaki şartnameye göre "${idea.title}" mikro-SaaS uygulaması için TEK DOSYALIK, TAM ÇALIŞAN bir React fonksiyon bileşeni yaz.

Şartname Özeti:
Başlık: ${idea.title}
Problem: ${idea.problem}
Akışlar: ${JSON.stringify(spec.userFlows)}
Ekranlar: ${JSON.stringify(spec.screens)}

KESİN KURALLAR:
1. SADECE ÇALIŞAN KODU VER. Kesinlikle hiçbir sohbet, açıklama veya Türkçe metin YAZMA.
2. Kod "function App() {" ile başlamalı ve SÜSLÜ PARANTEZ İLE KUSURSUZCA KAPANMALIDIR (KOD ASLA YARIDA KESİLMEMELİ).
3. ASLA import veya export yazma. React hook'ları (useState, useEffect, useMemo, useRef) doğrudan mevcuttur.
4. Harici ikon kütüphaneleri (lucide-react vb.) IMPORT ETME. İkonlar için emojiler (✨, 🚀, ⚡, 📊, ⚙️, 🔍, 💡, 🎯 vb.) veya SVG kullan.
5. Kompakt, temiz, hatasız Tailwind CSS kullan. Gereksiz uzun tekrarlardan kaçınarak bileşeni tam ve eksiksiz bitir.`;

    let response = null;
    for (const modelName of priorityModels) {
      try {
        response = await groq.chat.completions.create({
          model: modelName,
          messages: [
            { 
              role: "system", 
              content: "Sen bir derleyicisin. Çıktın SADECE çalışan, bitmiş, tam kapatılmış JavaScript/JSX kodu olmalıdır. Asla import/export yazma. Kod asla yarıda kesilmemelidir." 
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 4500
        });
        if (response?.choices?.[0]?.message?.content) {
          const raw = response.choices[0].message.content;
          if (raw.includes("App") && raw.trim().endsWith("}")) {
            break;
          }
        }
      } catch (err: any) {
        console.error(`Groq build error with ${modelName}:`, err?.message || err);
      }
    }

    if (!response || !response.choices?.[0]?.message?.content) {
      throw new Error("Uygulama kodu üretilemedi.");
    }

    let rawCode = response.choices[0].message.content.trim();
    
    // Markdown kod blokları varsa içini al
    const codeBlockMatch = rawCode.match(/```(?:jsx|tsx|javascript|typescript|js)?([\s\S]*?)```/);
    if (codeBlockMatch) {
      rawCode = codeBlockMatch[1].trim();
    }

    // Kodun başındaki gereksiz açıklamaları at ve sanitize et
    const sanitized = sanitizeReactCode(rawCode);
    res.json({ code: sanitized });
  } catch (error: any) {
    console.error("App build error:", error);
    res.status(500).json({ error: error.message || "Uygulama inşası başarısız oldu" });
  }
}

// AI Chat: Kullanıcı İstemi ile Kodu Canlı Güncelleme Handler'ı
export async function modifyAppWithPromptHandler(req: Request, res: Response) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GROQ_API_KEY bulunamadı." });
      return;
    }

    const { currentCode, userPrompt, ideaTitle } = req.body;
    if (!currentCode || !userPrompt) {
      res.status(400).json({ error: "Mevcut kod ve kullanıcı isteği gerekli." });
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
      activeModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];
    }

    const priorityModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      ...activeModels.filter(m => m !== "llama-3.3-70b-versatile" && m !== "llama-3.1-8b-instant")
    ];

    const prompt = `Sen uzman bir React yazılımcısısın.
GÖREV: Aşağıdaki "${ideaTitle || 'Uygulama'}" mikro-SaaS React kodunu, kullanıcının isteğine göre güncelle ve YENİ ÇALIŞAN KODU VER.

Kullanıcının İsteği:
"${userPrompt}"

Mevcut Kod:
\`\`\`jsx
${currentCode}
\`\`\`

KESİN KURALLAR:
1. SADECE JavaScript/JSX kodunu ver. Kodun önüne veya arkasına hiçbir açıklama yazma.
2. Kod "function App() {" ile başlamalı ve eksiksiz süslü parantez ile kapanmalıdır.
3. ASLA import veya export yazma. React hook'ları (useState, useEffect, useMemo, useRef) doğrudan mevcuttur.
4. Harici ikon kütüphaneleri (lucide-react vb.) IMPORT ETME. İkonlar için emojiler veya SVG kullan.
5. Tailwind CSS sınıflarını kullan.`;

    let response = null;
    for (const modelName of priorityModels) {
      try {
        response = await groq.chat.completions.create({
          model: modelName,
          messages: [
            { 
              role: "system", 
              content: "Sen sadece çalışan temiz JavaScript/JSX kodu üreten bir derleyicisin. Açıklama metni asla ekleme. Asla import veya export yazma." 
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4500
        });
        if (response?.choices?.[0]?.message?.content) {
          const raw = response.choices[0].message.content;
          if (raw.includes("App")) {
            break;
          }
        }
      } catch (err: any) {
        console.error(`Groq modify error with ${modelName}:`, err?.message || err);
      }
    }

    if (!response || !response.choices?.[0]?.message?.content) {
      throw new Error("Kod güncellenemedi.");
    }

    let rawCode = response.choices[0].message.content.trim();
    const codeBlockMatch = rawCode.match(/```(?:jsx|tsx|javascript|typescript|js)?([\s\S]*?)```/);
    if (codeBlockMatch) {
      rawCode = codeBlockMatch[1].trim();
    }

    const sanitized = sanitizeReactCode(rawCode);
    res.json({ updatedCode: sanitized });
  } catch (error: any) {
    console.error("Modify app error:", error);
    res.status(500).json({ error: error.message || "Kod güncellenemedi" });
  }
}

