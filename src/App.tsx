import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Lightbulb, Loader2, Target, Zap, Clock, Code, DollarSign, 
  CheckCircle2, AlertTriangle, FileText, ArrowRight, ArrowLeft, 
  Layers, Hammer, Eye, Play, Sparkles, Check, Download, ExternalLink,
  TrendingUp, BarChart3, Users, Archive, Send, MessageSquare, 
  UserCheck, History, Trash2, FolderGit2, RefreshCw, Key, Settings, Copy,
  Sun, Moon
} from 'lucide-react';

interface IdeaScore {
  pain: number;
  lackOfSolutions: number;
  feasibility: number;
  monetization: number;
}

interface Idea {
  title: string;
  problem: string;
  targetUser: string;
  alternatives: string;
  whyNow: string;
  mvpScope: string[];
  feasibilityNote: string;
  scores: IdeaScore;
  totalScore: number;
}

interface RawSignals {
  reddit: string[];
  trends: string[];
}

interface AppSpec {
  title: string;
  tagline: string;
  userFlows: string[];
  dataModel: { table: string; description: string }[];
  screens: string[];
  outOfScope: string[];
  buildChecklist: string[];
}

interface MarketingDecision {
  channel: string;
  adCopy: {
    headline: string;
    body: string;
    callToAction: string;
  };
  setupChecklist: string[];
  simulation: {
    testBudget: number;
    visitors: number;
    conversions: number;
    cac: number;
    decision: string;
    decisionNote: string;
  };
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface SavedProject {
  id: string;
  createdAt: string;
  idea: Idea;
  spec: AppSpec;
  code: string;
  chatHistory: ChatMessage[];
}

export default function App() {
  // Kullanıcı ve Oturum Yönetimi
  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('saas_builder_user') || '';
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [inputEmail, setInputEmail] = useState<string>('');

  // Özel Groq API Anahtarı ve Kota Uyarısı
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('user_custom_groq_api_key') || '';
  });
  const [inputApiKey, setInputApiKey] = useState<string>('');
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

  // Tema Yönetimi (Açık / Koyu Mod)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('saas_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('saas_theme', theme);
    } catch {}
  }, [theme]);

  // Proje Geçmişi
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
    try {
      const saved = localStorage.getItem('saas_builder_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Aşama 1: Fikir Motoru
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rawSignals, setRawSignals] = useState<RawSignals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [customIdea, setCustomIdea] = useState('');

  // Aşama 2: Spec & Build
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [spec, setSpec] = useState<AppSpec | null>(null);
  const [specLoading, setSpecLoading] = useState(false);
  const [buildLoading, setBuildLoading] = useState(false);
  const [builtCode, setBuiltCode] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'spec' | 'preview' | 'code' | 'deploy' | 'marketing'>('spec');

  // AI Canlı Refine Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [modifyingCode, setModifyingCode] = useState<boolean>(false);

  // Aşama 4 & 5: Pazarlama ve Karar Motoru
  const [marketingData, setMarketingData] = useState<MarketingDecision | null>(null);
  const [marketingLoading, setMarketingLoading] = useState(false);

  // Sekme Başlığı ve Favicon Zorlama (Önbellek aşımı)
  useEffect(() => {
    document.title = 'Idea to Saas';
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = '/favicon.svg?v=2';
  }, []);

  // İlk Açılışta Otomatik 3 Fikir Getir
  useEffect(() => {
    generateIdeas();
  }, []);

  // Projeyi otomatik kaydet
  useEffect(() => {
    if (selectedIdea && spec && builtCode) {
      setSavedProjects(prev => {
        const existingIndex = prev.findIndex(p => p.idea.title === selectedIdea.title);
        const updatedProject: SavedProject = {
          id: existingIndex !== -1 ? prev[existingIndex].id : Date.now().toString(),
          createdAt: existingIndex !== -1 ? prev[existingIndex].createdAt : new Date().toLocaleString('tr-TR'),
          idea: selectedIdea,
          spec,
          code: builtCode,
          chatHistory: chatMessages
        };

        let newProjects: SavedProject[];
        if (existingIndex !== -1) {
          newProjects = [...prev];
          newProjects[existingIndex] = updatedProject;
        } else {
          newProjects = [updatedProject, ...prev];
        }
        localStorage.setItem('saas_builder_projects', JSON.stringify(newProjects));
        return newProjects;
      });
    }
  }, [builtCode, chatMessages]);

  const getEffectiveApiKey = (): string => {
    return customApiKey.trim() || (typeof window !== 'undefined' ? localStorage.getItem('user_custom_groq_api_key')?.trim() : '') || '';
  };

  const getApiHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const key = getEffectiveApiKey();
    if (key) {
      headers['x-groq-api-key'] = key;
    }
    return headers;
  };

  const checkQuotaExceeded = (data: any, status?: number) => {
    const currentKey = getEffectiveApiKey();
    if (status === 429 || data?.isQuotaExceeded) {
      if (currentKey) {
        setQuotaWarning(
          "Girilen özel Groq API anahtarınızda kota veya yetki sorunu oluştu. Lütfen anahtarınızı Hesap & API Ayarları bölümünden kontrol edin."
        );
      } else {
        setQuotaWarning(
          "Sistemin varsayılan ücretsiz AI kotası doldu. Kesintisiz kullanım için Hesap & API Ayarları bölümünden kendi ücretsiz Groq anahtarınızı girebilirsiniz."
        );
      }
    } else if (data && !data.isQuotaExceeded && status !== 429) {
      setQuotaWarning(null);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputEmail.trim()) {
      localStorage.setItem('saas_builder_user', inputEmail.trim());
      setUserEmail(inputEmail.trim());
    }
    const trimmedKey = inputApiKey.trim();
    if (trimmedKey) {
      localStorage.setItem('user_custom_groq_api_key', trimmedKey);
      setCustomApiKey(trimmedKey);
      setQuotaWarning(null);
    } else {
      localStorage.removeItem('user_custom_groq_api_key');
      setCustomApiKey('');
    }
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('saas_builder_user');
    localStorage.removeItem('user_custom_groq_api_key');
    setUserEmail('');
    setCustomApiKey('');
    setInputApiKey('');
  };

  const generateIdeas = async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    setRawSignals(null);
    setShowRaw(false);
    setSelectedIdea(null);
    setSpec(null);
    setBuiltCode(null);
    setMarketingData(null);
    setChatMessages([]);
    
    try {
      const effectiveKey = getEffectiveApiKey();
      const body = {
        customIdea: customIdea.trim() || undefined,
        customApiKey: effectiveKey || undefined
      };
      const response = await fetch('/api/generate-ideas', { 
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(body)
      });
      const data = await response.json();
      checkQuotaExceeded(data, response.status);
      
      if (!response.ok) {
        throw new Error(data.error || 'Fikirler üretilemedi');
      }
      
      if (data.ideas && Array.isArray(data.ideas)) {
        setIdeas(data.ideas);
        if (data.warnings) setWarnings(data.warnings);
        if (data.rawSignals) setRawSignals(data.rawSignals);
      } else {
        throw new Error('Geçersiz veri formatı');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Aşama 2: Spec Üretimini Başlat
  const handleSelectIdea = async (idea: Idea) => {
    setSelectedIdea(idea);
    setSpec(null);
    setBuiltCode(null);
    setMarketingData(null);
    setChatMessages([]);
    setActiveTab('spec');
    setSpecLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-spec', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ idea, customApiKey: getEffectiveApiKey() || undefined })
      });
      const data = await res.json();
      checkQuotaExceeded(data, res.status);
      if (!res.ok) throw new Error(data.error || 'Spec üretilemedi');
      setSpec(data.spec);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSpecLoading(false);
    }
  };

  // Aşama 2: Kodu İnşa Et (Build)
  const handleBuildApp = async () => {
    if (!selectedIdea || !spec) return;
    setBuildLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/build-app', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ idea: selectedIdea, spec, customApiKey: getEffectiveApiKey() || undefined })
      });
      const data = await res.json();
      checkQuotaExceeded(data, res.status);
      if (!res.ok) throw new Error(data.error || 'Uygulama kodu üretilemedi');
      setBuiltCode(data.code);
      setActiveTab('preview');
      
      // v1 sınırında bırakılan maddeleri AI karşılama mesajına dahil et
      let initialAiText = `"${selectedIdea.title}" uygulamasını şartnameye göre inşa ettim! 🚀\n\n`;
      if (spec.outOfScope && spec.outOfScope.length > 0) {
        initialAiText += `v1 sınırında şu özellikleri kapsam dışı bırakmıştık, istersen şimdi yapabilirim:\n` +
          spec.outOfScope.map((item: string) => `• ${item}`).join('\n') +
          `\n\nBunlardan birini eklemek veya arayüzde değiştirmek istediğin başka bir yer varsa bana yazabilirsin!`;
      } else {
        initialAiText += `Beğenmediğin bir yer veya eklemek istediğin bir özellik varsa bana yazabilirsin.`;
      }

      setChatMessages([
        {
          sender: 'ai',
          text: initialAiText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBuildLoading(false);
    }
  };

  // AI Canlı Kod Düzenleme (Chat Refine) — directText parametresi v1 chip'leri için otomatik gönderimde kullanılır
  const handleSendPromptModification = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const userText = (directText || chatInput).trim();
    if (!userText || !builtCode || modifyingCode) return;

    setChatInput('');
    const userMsg: ChatMessage = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setModifyingCode(true);

    try {
      const res = await fetch('/api/modify-app', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          currentCode: builtCode,
          userPrompt: userText,
          ideaTitle: selectedIdea?.title,
          customApiKey: getEffectiveApiKey() || undefined
        })
      });
      const data = await res.json();
      checkQuotaExceeded(data, res.status);
      if (!res.ok) throw new Error(data.error || 'Kod güncellenemedi');

      // Kota aşımı veya API key eksikliğinde dürüst bilgilendirme
      if (data.isQuotaExceeded) {
        const quotaMsg: ChatMessage = {
          sender: 'ai',
          text: `⚠️ Şu anda AI motoru kullanılamıyor (API anahtarı eksik veya kota doldu). Değişiklik yapabilmem için lütfen Hesap & API Ayarları bölümünden ücretsiz bir Groq API anahtarı girin.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, quotaMsg]);
        return;
      }

      // Kodun gerçekten değişip değişmediğini kontrol et
      const newCode = data.updatedCode;
      const codeActuallyChanged = newCode !== builtCode;

      if (!codeActuallyChanged) {
        const aiMsg: ChatMessage = {
          sender: 'ai',
          text: `İsteğini inceledim ancak mevcut kod üzerinde anlamlı bir değişiklik yapılamadı. Lütfen daha spesifik bir istek deneyin (örn: "Başlığı kırmızı yap", "Yeni bir buton ekle").`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, aiMsg]);
        return;
      }

      // 🛡️ GÜVENLİK AĞI: Yeni kodu uygulamadan önce Babel ile derlemeyi dene
      // Eğer bozuk JSX/syntax varsa eski kodu koru ve kullanıcıyı bilgilendir
      let codeIsValid = true;
      let validationError = '';
      try {
        const sanitized = sanitizeReactCode(newCode);
        // @ts-ignore — Babel global olarak yüklenmeyebilir, o durumda basit kontrol yap
        if (typeof (window as any).Babel !== 'undefined') {
          (window as any).Babel.transform(sanitized, {
            presets: ['react'],
            filename: 'validate.tsx'
          });
        } else {
          // Babel yoksa basit syntax kontrolleri
          const openBraces = (sanitized.match(/\{/g) || []).length;
          const closeBraces = (sanitized.match(/\}/g) || []).length;
          const openParens = (sanitized.match(/\(/g) || []).length;
          const closeParens = (sanitized.match(/\)/g) || []).length;
          if (Math.abs(openBraces - closeBraces) > 3 || Math.abs(openParens - closeParens) > 3) {
            codeIsValid = false;
            validationError = 'Parantez veya süslü parantez dengesizliği tespit edildi.';
          }
        }
      } catch (babelErr: any) {
        codeIsValid = false;
        validationError = babelErr?.message || 'Bilinmeyen sözdizimi hatası';
      }

      if (!codeIsValid) {
        // Eski kodu koru, kullanıcıya bozuk kodu uygulamadığımızı bildir
        const errorMsg: ChatMessage = {
          sender: 'ai',
          text: `⚠️ AI'ın ürettiği yeni kodda sözdizimi hatası tespit edildi, uygulamanızı korumak için eski kod korundu.\n\n🔍 Hata: ${validationError}\n\n💡 Lütfen daha spesifik bir istek deneyin (örn: "Rengi mavi yap", "Yeni tablo ekle").`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, errorMsg]);
        return;
      }

      // Kod geçerli — güvenle uygula
      setBuiltCode(newCode);
      setPreviewKey(prev => prev + 1);

      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: `İsteğin doğrultusunda kodu güncelledim ve canlı uygulamaya yansıttım! 🚀`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        sender: 'ai',
        text: `Üzgünüm, güncelleme sırasında bir hata oluştu: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setModifyingCode(false);
    }
  };

  // Aşama 4 & 5: Pazarlama ve Karar Testini Çalıştır
  const handleRunMarketingTest = async () => {
    if (!selectedIdea || !spec) return;
    setMarketingLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-marketing-decision', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ idea: selectedIdea, spec, customApiKey: getEffectiveApiKey() || undefined })
      });
      const data = await res.json();
      checkQuotaExceeded(data, res.status);
      if (!res.ok) throw new Error(data.error || 'Pazarlama testi üretilemedi');
      setMarketingData(data.result);
      setActiveTab('marketing');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMarketingLoading(false);
    }
  };

  // Dosyayı kullanıcının seçeceği konuma kaydetme (veya desteklenmeyen tarayıcılarda klasik indirme)
  const saveBlobWithPicker = async (blob: Blob, defaultFilename: string, mimeType: string, extension: string) => {
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [
            {
              description: `${extension.toUpperCase().replace('.', '')} Dosyası`,
              accept: { [mimeType]: [extension] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Kullanıcı indirmeyi iptal etti
          return;
        }
        console.warn('showSaveFilePicker başarısız, klasik indirmeye geçiliyor:', err);
      }
    }

    // Klasik indirme (File System Access API desteklenmeyen tarayıcılar için yedek)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Aşama 3: Tek Tıkla Tam ZIP Paketi İndirme
  const downloadZipArchive = async (targetIdea = selectedIdea, targetSpec = spec, targetCode = builtCode) => {
    if (!targetCode || !targetIdea || !targetSpec) return;
    try {
      const zip = new JSZip();
      const slug = targetIdea.title.toLowerCase().replace(/[^a-z0-9]/g, '-');

      const specMd = `# ${targetSpec.title}\n\n> ${targetSpec.tagline}\n\n## Kullanıcı Akışları\n${targetSpec.userFlows.map(f => `- ${f}`).join('\n')}\n\n## Veri Modeli\n${targetSpec.dataModel.map(m => `- **${m.table}**: ${m.description}`).join('\n')}\n\n## Ekranlar\n${targetSpec.screens.map(s => `- ${s}`).join('\n')}\n\n## Kapsam Dışı\n${targetSpec.outOfScope.map(o => `- ${o}`).join('\n')}`;
      zip.file("SPEC.md", specMd);

      const htmlContent = getPreviewHtml(targetCode);
      zip.file("index.html", htmlContent);
      zip.file("App.jsx", targetCode);

      const readme = `# ${targetIdea.title}\n\n${targetIdea.problem}\n\n## Nasıl Çalıştırılır?\n1. \`index.html\` dosyasına çift tıklayarak doğrudan tarayıcınızda açabilirsiniz.\n2. Veya Vercel / Netlify üzerine bu klasörü sürükleyip anında canlıya alabilirsiniz.`;
      zip.file("README.md", readme);

      const content = await zip.generateAsync({ type: "blob" });
      await saveBlobWithPicker(content, `${slug}-proje-paketi.zip`, 'application/zip', '.zip');
    } catch (err: any) {
      alert("ZIP oluşturulurken hata: " + err.message);
    }
  };

  const downloadStandaloneProject = async () => {
    if (!builtCode || !selectedIdea) return;
    const htmlContent = getPreviewHtml(builtCode);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const slug = selectedIdea.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await saveBlobWithPicker(blob, `${slug}-app.html`, 'text/html', '.html');
  };

  // Geçmiş projeyi geri yükleme
  const restoreProject = (p: SavedProject) => {
    setSelectedIdea(p.idea);
    setSpec(p.spec);
    setBuiltCode(p.code);
    
    // Eğer geçmişte chat mesajı yoksa v1 sınırını içeren bilgilendirme mesajı oluştur
    if (!p.chatHistory || p.chatHistory.length === 0) {
      let initialAiText = `"${p.idea.title}" projesini geri yükledim! 🚀\n\n`;
      if (p.spec?.outOfScope && p.spec.outOfScope.length > 0) {
        initialAiText += `v1 sınırında şu özellikleri kapsam dışı bırakmıştık, istersen şimdi yapabilirim:\n` +
          p.spec.outOfScope.map((item: string) => `• ${item}`).join('\n') +
          `\n\nBunlardan birini eklemek veya değiştirmek istediğin başka bir yer varsa bana yazabilirsin!`;
      } else {
        initialAiText += `Beğenmediğin bir yer veya eklemek istediğin bir özellik varsa bana yazabilirsin.`;
      }
      setChatMessages([{
        sender: 'ai',
        text: initialAiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } else {
      setChatMessages(p.chatHistory);
    }

    setActiveTab('preview');
    setShowHistoryModal(false);
  };

  // Proje geçmişinden silme
  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedProjects.filter(p => p.id !== id);
    setSavedProjects(filtered);
    localStorage.setItem('saas_builder_projects', JSON.stringify(filtered));
  };

  // Tüm kayıtlı projelerin başlık ve açıklamalarını panoya kopyalama
  const copyAllProjectsSummary = () => {
    if (savedProjects.length === 0) return;
    const text = savedProjects.map((p, i) => 
      `${i + 1}. ${p.idea.title} (Puan: ${p.idea.totalScore}/40)\nProblem: ${p.idea.problem}\nHedef Kitle: ${p.idea.targetUser || 'Belirtilmemiş'}\nKayıt Tarihi: ${p.createdAt}`
    ).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    alert(`${savedProjects.length} adet projenin başlıkları ve açıklamaları panoya kopyalandı!`);
  };

  // React kodunu temizleme ve import/export kalıntılarını arındırma fonksiyonu
  const sanitizeReactCode = (code: string): string => {
    if (!code) return "";

    let cleaned = code
      // Markdown bloklarını kaldır
      .replace(/^```[a-zA-Z]*\n/gm, "")
      .replace(/\n```$/gm, "")
      .trim();

    // 1. React importlarını tamamen temizle (hook'lar ve React global olarak iframe'de zaten mevcut)
    cleaned = cleaned.replace(
      /import\s+React\s*,\s*\{[^}]*\}\s+from\s+['"][^'"]+['"];?/g,
      "/* React global */"
    );
    cleaned = cleaned.replace(
      /import\s*\{[^}]*\}\s+from\s+['"]react['"];?/g,
      "/* React global */"
    );
    cleaned = cleaned.replace(
      /import\s+React\s+from\s+['"]react['"];?/g,
      "/* React global */"
    );
    cleaned = cleaned.replace(
      /import\s+\*\s+as\s+React\s+from\s+['"]react['"];?/g,
      "/* React global */"
    );
    cleaned = cleaned.replace(
      /import\s+['"]react['"];?/g,
      "/* React global */"
    );

    // 2. Lucide ve diğer ikon kütüphanelerini window.LucideIcons Proxy'sine bağla
    cleaned = cleaned.replace(
      /import\s*\{([^}]+)\}\s+from\s+['"](?:lucide-react|react-icons[^'"]*|@heroicons[^'"]*)['"];?/g,
      "const { $1 } = (window.LucideIcons || {});"
    );
    cleaned = cleaned.replace(
      /import\s+(?:\*\s+as\s+)?([A-Za-z0-9_$]+)\s+from\s+['"](?:lucide-react|react-icons[^'"]*|@heroicons[^'"]*)['"];?/g,
      "const $1 = (window.LucideIcons || {});"
    );

    // 3. Dinamik import() çağrılarını sahte Promise ile değiştir
    cleaned = cleaned.replace(
      /\bimport\s*\([^)]*\)/g,
      "Promise.resolve({})"
    );

    // 4. Kalan TÜM statik importları (tek satırlı, çok satırlı, from olan/olmayan, CSS vb.) yok et
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

    // 5. KESİN GÜVENLİK AĞI: Kodda kalan kaçak herhangi bir import ifadesini etkisizleştir
    cleaned = cleaned.replace(
      /\bimport\b[^;\n]*;?/g,
      "/* import removed */"
    );

    // 6. Export ifadelerini App bileşenini hedefleyecek şekilde dönüştür
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

    // 7. Eğer App adında bir bileşen yoksa, büyük harfle başlayan bileşeni App olarak ata
    if (!/(?:function|const|var|let|class)\s+App\b/.test(cleaned)) {
      const compMatch = cleaned.match(/(?:function|class)\s+([A-Z][a-zA-Z0-9_]*)/);
      if (compMatch && compMatch[1]) {
        cleaned += `\nvar App = ${compMatch[1]};`;
      }
    }

    // 8. Düzensiz React.createElement props düzeltmeleri (onClick()=> veya onClick(e)=> -> onClick: () =>)
    cleaned = cleaned.replace(
      /([,{]\s*)([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*=>/g,
      "$1$2: ($3) =>"
    );

    // 9. Düzensiz JSX attribute formatlarını düzelt (onClick={() => ...} -> onClick: () => ...)
    cleaned = cleaned.replace(
      /([,{]\s*)([a-zA-Z0-9_$]+)\s*=\s*\{(?=\s*\()/g,
      "$1$2: "
    );

    // NOT: Önceden burada karakter-sayımına dayalı bir "otomatik parantez/süslü
    // dengeleme" adımı vardı. String, JSX metni, yorum veya regex literal
    // içindeki ( ) { } karakterlerini de saydığı için geçerli kodu bozup
    // sessizce syntax hatasına yol açıyordu (örn. "Invalid regular expression:
    // missing /"). Gerçek bir parser olmadan güvenli şekilde yapılamayacağı
    // için kaldırıldı — kod gerçekten bozuksa artık Babel kendi net hatasını
    // verecek ve bu zaten aşağıdaki catch bloğunda kullanıcıya gösteriliyor.

    return cleaned.trim();
  };

  // Canlı Iframe Önizleme Kodu
  const getPreviewHtml = (code: string) => {
    const S_END = '</' + 'script>';
    const cleanCode = sanitizeReactCode(code);
    // Kullanıcı kodunu güvenli JSON olarak ayrı bir veri bloğuna koyuyoruz
    const safeCodeJson = JSON.stringify(cleanCode)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Live App Sandbox</title>
          
          <!-- 1. ADIM: İLK VE ANINDA ÇALIŞAN HATA YAKALAYICI VE GÜVENLİK ZAMANLAYICISI -->
          <script>
            (function() {
              window.__step = function(msg) {
                var el = document.getElementById('loading-step-text');
                if (el) el.innerText = msg;
              };

              window.showError = function(msg, source) {
                if (window.__safetyTimer) clearTimeout(window.__safetyTimer);
                var loader = document.getElementById('loading-state');
                if (loader) loader.style.display = 'none';
                var errBox = document.getElementById('error-box');
                if (errBox) {
                  errBox.style.display = 'block';
                  errBox.innerHTML = '<div style="font-weight:700; font-size:13px; margin-bottom:8px; color:#991b1b; display:flex; align-items:center; gap:6px;">' +
                    '<span>⚠️</span><span>Uygulama Çalıştırma Hatası</span></div>' +
                    '<div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:11px; background:#fff; border:1px solid #fecaca; padding:10px; border-radius:8px; overflow-x:auto;">' +
                    String(msg).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
                    (source ? '<div style="color:#b91c1c; font-size:11px; margin-top:8px;">Kaynak: ' + String(source).replace(/</g, '&lt;') + '</div>' : '') +
                    '<div style="margin-top:14px; display:flex; gap:8px;">' +
                    '<button onclick="location.reload()" style="padding:6px 14px; background:#171717; color:#fff; border:none; border-radius:8px; font-size:11px; font-weight:600; cursor:pointer;">Yeniden Başlat</button>' +
                    '</div>';
                }
              };

              window.onerror = function(message, source, lineno, colno, error) {
                if (window.__CurrentApp) return;
                window.showError(message || (error && error.message) || 'Bilinmeyen script hatası', source ? source + ':' + lineno : '');
              };

              window.onunhandledrejection = function(e) {
                if (window.__CurrentApp) return;
                window.showError(e.reason ? (e.reason.message || String(e.reason)) : 'Bilinmeyen asenkron hata');
              };

              // Güvenlik kilidi: 12 saniye içinde render edilmezse kullanıcıyı bilgilendir
              window.__safetyTimer = setTimeout(function() {
                var loader = document.getElementById('loading-state');
                if (loader && loader.style.display !== 'none') {
                  window.showError('Uygulama zamanında başlatılamadı. Kütüphaneler veya derleme beklenenden uzun sürdü. Lütfen "Yeniden Başlat" butonuna tıklayın.');
                }
              }, 12000);
            })();
          ${S_END}

          <script src="https://cdn.tailwindcss.com">${S_END}
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; min-height: 100vh; background-color: #fafafa; }
            #loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 350px; color: #525252; font-size: 13px; gap: 12px; }
            .spinner { width: 30px; height: 30px; border: 3px solid #e5e5e5; border-top-color: #171717; border-radius: 50%; animation: spin 0.8s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
            #loading-step-text { font-size: 11px; color: #737373; font-weight: 400; }
            #error-box { display:none; color:#991b1b; background:#fef2f2; border:1px solid #fecaca; padding:18px; border-radius:14px; margin:20px; line-height:1.5; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          </style>
        </head>
        <body class="bg-neutral-50 p-4">
          <div id="loading-state">
            <div class="spinner"></div>
            <span class="font-semibold text-neutral-800">Uygulama derleniyor ve başlatılıyor...</span>
            <span id="loading-step-text">Gerekli kütüphaneler hazırlanıyor...</span>
          </div>
          <div id="root"></div>
          <div id="error-box"></div>

          <!-- Kullanıcı kodu güvenli JSON veri bloğu -->
          <script type="application/json" id="user-code-data">${safeCodeJson}${S_END}

          <!-- Çekirdek Yükleyici ve Çalıştırıcı -->
          <script>
            (function() {
              // Harici ikonlar ve mock servisler
              window.LucideIcons = new Proxy({}, {
                get: function(target, prop) {
                  return function LucideFallback(props) {
                    if (!window.React) return null;
                    return window.React.createElement('span', {
                      className: 'inline-flex items-center justify-center ' + ((props && props.className) || ''),
                      style: { display: 'inline-flex', verticalAlign: 'middle', fontSize: '1.1em' }
                    }, '✦');
                  };
                }
              });

              window.supabase = {
                auth: {
                  getUser: async function() { return { data: { user: { id: 'demo-user-1', email: 'demo@saas.com' } }, error: null }; },
                  getSession: async function() { return { data: { session: {} }, error: null }; },
                  signInWithPassword: async function() { return { data: { user: { id: 'demo-user-1' } }, error: null }; },
                  signUp: async function() { return { data: { user: { id: 'demo-user-1' } }, error: null }; },
                  signOut: async function() { return { error: null }; },
                  deleteUser: async function() { return { error: null }; },
                  onAuthStateChange: function() { return { data: { subscription: { unsubscribe: function() {} } } }; }
                },
                from: function(tableName) {
                  var chain = {
                    select: function() { return chain; },
                    insert: function() { return chain; },
                    update: function() { return chain; },
                    delete: function() { return chain; },
                    eq: function() { return chain; },
                    neq: function() { return chain; },
                    gt: function() { return chain; },
                    lt: function() { return chain; },
                    order: function() { return chain; },
                    limit: function() { return chain; },
                    single: function() { return Promise.resolve({ data: {}, error: null }); },
                    then: function(onSuccess, onError) {
                      return Promise.resolve({ data: [], error: null }).then(onSuccess, onError);
                    }
                  };
                  return chain;
                }
              };
              window.createClient = function() { return window.supabase; };

              // Scriptleri dinamik, sıra duyarlı ve fallback destekli yükleyen fonksiyon
              function loadScriptSequential(urls, name) {
                return new Promise(function(resolve, reject) {
                  var idx = 0;
                  function tryLoad() {
                    if (idx >= urls.length) {
                      reject(new Error(name + ' kütüphanesi hiçbir kaynaktan yüklenemedi.'));
                      return;
                    }
                    var url = urls[idx++];
                    var s = document.createElement('script');
                    s.src = url;
                    s.onload = function() { resolve(); };
                    s.onerror = function() {
                      console.warn(name + ' ' + url + ' üzerinden yüklenemedi, alternatif deneniyor...');
                      s.remove();
                      tryLoad();
                    };
                    document.head.appendChild(s);
                  }
                  tryLoad();
                });
              }

              async function launchApp() {
                try {
                  // 1. React Motoru
                  if (!window.React) {
                    window.__step('React motoru yükleniyor...');
                    await loadScriptSequential([
                      '/vendor/react.production.min.js',
                      'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
                      'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js',
                      'https://unpkg.com/react@18.2.0/umd/react.production.min.js'
                    ], 'React');
                  }

                  // 2. React DOM Motoru
                  if (!window.ReactDOM) {
                    window.__step('React DOM motoru yükleniyor...');
                    await loadScriptSequential([
                      '/vendor/react-dom.production.min.js',
                      'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
                      'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js',
                      'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js'
                    ], 'ReactDOM');
                  }

                  // 3. Babel Standalone Derleyici
                  if (!window.Babel) {
                    window.__step('Babel derleyici hazırlanıyor...');
                    await loadScriptSequential([
                      '/vendor/babel.min.js',
                      'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.9/babel.min.js',
                      'https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.9/babel.min.js',
                      'https://unpkg.com/@babel/standalone@7.26.9/babel.min.js'
                    ], 'Babel');
                  }

                  window.__step('Uygulama kodu derleniyor ve bağlanıyor...');

                  // Kullanıcı kodunu güvenli JSON bloğundan al
                  var codeDataEl = document.getElementById('user-code-data');
                  if (!codeDataEl) {
                    window.showError('Kullanıcı kodu veri bloğu bulunamadı.');
                    return;
                  }
                  var rawCode = JSON.parse(codeDataEl.textContent || '""');

                  // React Error Boundary
                  var ErrorBoundary = (function() {
                    function EB(props) {
                      React.Component.call(this, props);
                      this.state = { hasError: false, error: null };
                    }
                    EB.prototype = Object.create(React.Component.prototype);
                    EB.prototype.constructor = EB;
                    EB.getDerivedStateFromError = function(err) {
                      return { hasError: true, error: err };
                    };
                    EB.prototype.componentDidCatch = function(err, info) {
                      console.error("Bileşen Çalışma Hatası:", err, info);
                    };
                    EB.prototype.render = function() {
                      if (this.state.hasError) {
                        return React.createElement('div', {
                          className: 'p-6 bg-red-50 border border-red-200 rounded-xl text-red-900 font-sans m-3'
                        }, [
                          React.createElement('h3', { className: 'font-bold text-sm text-red-900 mb-1', key: 'title' }, 'Bileşen Çalışma Hatası:'),
                          React.createElement('pre', { className: 'text-xs text-red-700 whitespace-pre-wrap font-mono mt-2', key: 'msg' }, this.state.error ? (this.state.error.message || String(this.state.error)) : 'Bilinmeyen hata'),
                          React.createElement('button', {
                            key: 'btn',
                            className: 'mt-3 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium cursor-pointer',
                            onClick: function() { location.reload(); }
                          }, 'Yeniden Yükle')
                        ]);
                      }
                      return this.props.children;
                    };
                    return EB;
                  })();

                  // React hook'larını window seviyesinde hazırla
                  window.useState = React.useState;
                  window.useEffect = React.useEffect;
                  window.useMemo = React.useMemo;
                  window.useRef = React.useRef;
                  window.useCallback = React.useCallback;
                  window.useContext = React.useContext;
                  window.useReducer = React.useReducer;
                  window.useId = React.useId;

                  // Kod içindeki mükerrer const { useState } = React bildirimlerini temizle
                  rawCode = rawCode.replace(/(?:const|let|var)\s*\{[^}]*\}\s*=\s*React;?/g, '/* React hooks global */');

                  // Kod içindeki tüm PascalCase ikon veya alt bileşenleri yakala
                  var detectedIcons = Array.from(new Set(rawCode.match(/<([A-Z][a-zA-Z0-9_]*)/g) || []))
                    .map(function(t) { return t.slice(1); })
                    .filter(function(t) { return !['App', 'Main', 'React', 'Fragment', 'ErrorBoundary'].includes(t); });

                  var iconDeclarations = detectedIcons.map(function(name) {
                    return "if (typeof " + name + " === 'undefined') { var " + name + " = window.LucideIcons['" + name + "']; }";
                  }).join(String.fromCharCode(10));

                  window.__CurrentApp = null;

                  var codeToTransform = [
                    "var useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef, useCallback = React.useCallback;",
                    iconDeclarations,
                    rawCode,
                    "var _candidate = null;",
                    "if (typeof App !== 'undefined') { _candidate = App; }",
                    "else if (typeof Main !== 'undefined') { _candidate = Main; }",
                    "else if (typeof SaaSApp !== 'undefined') { _candidate = SaaSApp; }",
                    "else if (typeof Dashboard !== 'undefined') { _candidate = Dashboard; }",
                    "else if (typeof Application !== 'undefined') { _candidate = Application; }",
                    "window.__CurrentApp = _candidate;"
                  ].join(String.fromCharCode(10));

                  var transformed = window.Babel.transform(
                    codeToTransform,
                    { 
                      filename: 'app.tsx',
                      presets: ['typescript', ['react', { runtime: 'classic' }]] 
                    }
                  ).code;

                  // Ekstra güvenlik: derlenmiş kodda kalmış olabilecek tüm import satırlarını güvenle arındır
                  transformed = transformed
                    .split(String.fromCharCode(10))
                    .filter(function(line) {
                      var trimmed = line.trim();
                      return !trimmed.startsWith('import ') && !trimmed.startsWith('import{') && !trimmed.startsWith('import"') && !trimmed.startsWith("import'");
                    })
                    .join(String.fromCharCode(10));

                  new Function(transformed)();
                  var ResolvedApp = window.__CurrentApp;

                  // Başarıyla bitti, güvenlik sayacını durdur ve loader'ı gizle
                  if (window.__safetyTimer) clearTimeout(window.__safetyTimer);
                  var loader = document.getElementById('loading-state');
                  if (loader) loader.style.display = 'none';

                  if (ResolvedApp) {
                    var rootEl = document.getElementById('root');
                    var root = ReactDOM.createRoot(rootEl);
                    root.render(React.createElement(ErrorBoundary, null, React.createElement(ResolvedApp)));
                  } else {
                    window.showError('Ana bileşen (App) tanımlanamadı. Lütfen AI asistanından kodu yenilemesini isteyin.');
                  }
                } catch (err) {
                  console.error("Sandbox derleme/çalıştırma hatası:", err);
                  window.showError(err.message || String(err));
                }
              }

              // Başlat
              launchApp();
            })();
          ${S_END}
        </body>
      </html>
    `;
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-24">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Üst Başlık, Kullanıcı Profili ve Proje Geçmişi */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-neutral-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-900 text-white rounded-xl shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Idea-to-App Pipeline</h1>
              <p className="text-xs text-neutral-500 font-medium">Uçtan Uca Sıfır Maliyet Otomasyonu</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Proje Geçmişi Butonu */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
            >
              <History className="w-3.5 h-3.5 text-neutral-600" />
              Kayıtlı Projeler ({savedProjects.length})
            </button>

            {/* Kullanıcı Giriş / Hesap ve Ayarlar */}
            {userEmail ? (
              <div className="flex items-center gap-2 bg-white border border-neutral-200 px-3 py-1.5 rounded-lg shadow-sm text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="font-semibold text-neutral-800">{userEmail}</span>
                {customApiKey ? (
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded border border-indigo-200 flex items-center gap-1" title="Özel Groq API Anahtarı Aktif">
                    <Key className="w-2.5 h-2.5" /> Key
                  </span>
                ) : null}
                <button
                  onClick={() => {
                    setInputEmail(userEmail);
                    setInputApiKey(customApiKey);
                    setShowAuthModal(true);
                  }}
                  className="text-neutral-500 hover:text-neutral-900 ml-1 p-0.5 rounded"
                  title="Hesap & API Ayarları"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="text-neutral-400 hover:text-red-600 ml-1 text-[11px]"
                  title="Çıkış Yap"
                >
                  Çıkış
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setInputEmail(userEmail);
                  setInputApiKey(customApiKey);
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Hesap & API Ayarları
              </button>
            )}
          </div>
        </div>

        {/* İngilizce Kota ve Rate Limit Uyarısı */}
        {quotaWarning && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl mb-6 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{quotaWarning}</span>
            </div>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <button 
                onClick={() => {
                  setInputEmail(userEmail);
                  setInputApiKey(customApiKey);
                  setShowAuthModal(true);
                }}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Key className="w-3 h-3" /> Account Settings
              </button>
              <button 
                onClick={() => setQuotaWarning(null)}
                className="text-amber-600 hover:text-amber-900 text-xs px-1 font-bold"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Hata Bildirimi */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 max-w-2xl mx-auto text-center font-medium shadow-sm text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2 -mt-1" />
            {error}
          </div>
        )}

        {/* ========================================================================= */}
        {/* AŞAMA 2, 3, 4, 5: ÇALIŞMA STÜDYOSU */}
        {/* ========================================================================= */}
        {selectedIdea ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedIdea(null)}
                  className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                  title="Fikirlere geri dön"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-neutral-900">{selectedIdea.title}</h2>
                    <span className="text-xs px-2.5 py-0.5 bg-neutral-100 text-neutral-700 rounded-full font-bold border border-neutral-200">
                      {selectedIdea.totalScore}/40 Puan
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">{selectedIdea.problem}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {spec && !builtCode && (
                  <button
                    onClick={handleBuildApp}
                    disabled={buildLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50 text-xs"
                  >
                    {buildLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hammer className="w-3.5 h-3.5" />}
                    {buildLoading ? 'İnşa Ediliyor...' : 'Uygulamayı İnşa Et (Build)'}
                  </button>
                )}
                {builtCode && (
                  <button
                    onClick={handleRunMarketingTest}
                    disabled={marketingLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-xs shadow-sm disabled:opacity-50"
                  >
                    {marketingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    {marketingLoading ? 'Analiz Ediliyor...' : 'Reklam & CAC Kararını Çalıştır'}
                  </button>
                )}
              </div>
            </div>

            {/* Spec Yükleniyor */}
            {specLoading && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-900 mb-3" />
                <h3 className="text-lg font-bold text-neutral-900">Aşama 2: SPEC.md Çıkarılıyor...</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
                  "Önce spec, sonra kod" disiplinine uygun olarak veri modeli, akışlar ve kapsam sınırları hazırlanıyor.
                </p>
              </div>
            )}

            {/* Çalışma Stüdyosu Sekmeleri */}
            {spec && (
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-2.5 bg-neutral-50/50 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveTab('spec')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        activeTab === 'spec' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" /> 1. Şartname (SPEC.md)
                    </button>
                    {builtCode && (
                      <button
                        onClick={() => setActiveTab('preview')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          activeTab === 'preview' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5 text-green-600" /> 2. Canlı Uygulama & AI Chat
                      </button>
                    )}
                    {builtCode && (
                      <button
                        onClick={() => setActiveTab('deploy')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          activeTab === 'deploy' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" /> 3. Deploy & ZIP İndir
                      </button>
                    )}
                    {builtCode && (
                      <button
                        onClick={() => setActiveTab('code')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          activeTab === 'code' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" /> 4. Kaynak Kod
                      </button>
                    )}
                    {marketingData && (
                      <button
                        onClick={() => setActiveTab('marketing')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          activeTab === 'marketing' ? 'bg-white text-indigo-700 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600" /> 5. Marketing & Karar (CAC)
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {/* TAB 1: SPEC */}
                  {activeTab === 'spec' && (
                    <div className="space-y-6">
                      <div className="border-b border-neutral-100 pb-3">
                        <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider">Slogan & Vizyon</span>
                        <h3 className="text-lg font-bold text-neutral-900 mt-0.5">{spec.tagline}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                          <h4 className="text-xs font-bold text-neutral-900 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-700" /> Kullanıcı Akışları (Adım Adım)
                          </h4>
                          <ul className="space-y-1.5 text-xs text-neutral-700">
                            {spec.userFlows.map((flow, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="font-semibold text-neutral-400 text-[11px]">•</span>
                                <span>{flow}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                          <h4 className="text-xs font-bold text-neutral-900 mb-2 flex items-center gap-2">
                            <Code className="w-3.5 h-3.5 text-neutral-700" /> Veri Modeli (Supabase / In-Memory)
                          </h4>
                          <div className="space-y-1.5">
                            {spec.dataModel.map((model, idx) => (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-neutral-200 text-[11px]">
                                <span className="font-mono font-bold text-neutral-900">tablo: {model.table}</span>
                                <p className="text-neutral-500 mt-0.5">{model.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                          <h4 className="text-xs font-bold text-neutral-900 mb-2 flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-neutral-700" /> Sayfa ve Ekran Listesi
                          </h4>
                          <ul className="space-y-1 text-xs text-neutral-700">
                            {spec.screens.map((screen, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                                {screen}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                          <h4 className="text-xs font-bold text-neutral-900 mb-2 flex items-center gap-2 text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Kapsam Dışı Bırakılanlar (v1 Sınırı)
                          </h4>
                          <ul className="space-y-1 text-xs text-neutral-600">
                            {spec.outOfScope.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-400 font-bold text-[10px]">✕</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {!builtCode && (
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={handleBuildApp}
                            disabled={buildLoading}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50 text-xs"
                          >
                            {buildLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                            {buildLoading ? 'Uygulama İnşa Ediliyor...' : 'Bu Spec ile Uygulamayı Canlı İnşa Et'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CANLI ÖNİZLEME & AI CHAT REFACTOR PANELİ */}
                  {activeTab === 'preview' && builtCode && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Sol: Canlı Uygulama Iframe */}
                      <div className="lg:col-span-2 border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-inner h-[650px] flex flex-col">
                        <div className="px-4 py-2.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-semibold text-neutral-800">Canlı Önizleme (React 18 Sandbox)</span>
                          </div>
                          <button
                            onClick={() => setPreviewKey(k => k + 1)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors shadow-xs cursor-pointer"
                            title="Önizlemeyi sıfırla ve yeniden yükle"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Yeniden Başlat</span>
                          </button>
                        </div>
                        <div className="flex-1 w-full h-full relative">
                          <iframe
                            key={`preview-${previewKey}-${builtCode.length}-${(builtCode.slice(0, 10) + builtCode.slice(-10)).replace(/[^a-zA-Z0-9]/g, '')}`}
                            title="App Sandbox"
                            srcDoc={getPreviewHtml(builtCode)}
                            className="w-full h-full border-0 absolute inset-0"
                            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                          />
                        </div>
                      </div>

                      {/* Sağ: Canlı AI Asistan / Değişiklik İste Chat Paneli */}
                      <div className="flex flex-col h-[650px] bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-3.5 border-b border-neutral-200 bg-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-bold text-neutral-900">AI Değişiklik Asistanı</h4>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold">Canlı Refactor</span>
                        </div>

                        {/* Mesaj Listesi */}
                        <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
                          {chatMessages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`p-3 rounded-xl max-w-[88%] leading-relaxed whitespace-pre-line ${
                                  msg.sender === 'user'
                                    ? 'bg-neutral-900 text-white rounded-br-none'
                                    : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-none shadow-xs'
                                }`}
                              >
                                {msg.text}
                              </div>
                              <span className="text-[9px] text-neutral-400 mt-1 px-1">{msg.timestamp}</span>
                            </div>
                          ))}
                          {modifyingCode && (
                            <div className="flex items-center gap-2 bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-600 text-xs shadow-xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                              <span>Kod güncelleniyor ve canlıya yansıtılıyor...</span>
                            </div>
                          )}
                        </div>

                        {/* İstem Girişi Formu */}
                        {/* v1 Sınırında Kapsam Dışı Bırakılanlar - Hızlı İsteme Ekleme Çipleri */}
                        {spec?.outOfScope && spec.outOfScope.length > 0 && (
                          <div className="px-3.5 py-2.5 border-t border-neutral-200/80 bg-neutral-100/70">
                            <div className="text-[10px] text-neutral-500 font-semibold mb-1.5 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-600" />
                              <span>v1 Sınırı Hızlı Ekle:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {spec.outOfScope.map((item, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSendPromptModification(undefined, 'v1 sınırında bıraktığımız şu özelliği uygulamaya ekle: ' + item)}
                                  disabled={modifyingCode}
                                  className="text-[10px] px-2.5 py-1 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-colors text-left truncate max-w-full cursor-pointer shadow-2xs font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={'Tıkla ve otomatik uygula: ' + item}
                                >
                                  <span className="text-indigo-600 font-bold">+</span>
                                  <span>{item}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleSendPromptModification} className="p-3 border-t border-neutral-200 bg-white">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Örn: Arka planı koyu yap, yeni buton ekle..."
                              disabled={modifyingCode}
                              className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                            />
                            <button
                              type="submit"
                              disabled={modifyingCode || !chatInput.trim()}
                              className="p-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-40 transition-colors shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: AŞAMA 3 - DEPLOY & DIŞA AKTAR */}
                  {activeTab === 'deploy' && builtCode && (
                    <div className="max-w-2xl mx-auto space-y-6 py-4">
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-green-50 text-green-700 rounded-2xl flex items-center justify-center mx-auto border border-green-200">
                          <ExternalLink className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900">Aşama 3: Deploy & Dışa Aktarma</h3>
                        <p className="text-xs text-neutral-500">
                          Üretilen bu çalışan mikro-SaaS uygulamasını ister tek bir bağımsız dosya veya tam ZIP olarak indirin, ister Vercel / Netlify'a yükleyin.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-xl flex flex-col justify-between space-y-4">
                          <div>
                            <h4 className="font-bold text-sm text-neutral-900 mb-1 flex items-center gap-2">
                              <Archive className="w-4 h-4 text-neutral-700" /> Tam ZIP Paketi İndir
                            </h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                              İçinde `SPEC.md`, `index.html`, `App.jsx` ve `README.md` dosyalarını barındıran tam proje ZIP arşivini indirin.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <button
                              onClick={() => downloadZipArchive()}
                              className="w-full py-2.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Archive className="w-3.5 h-3.5" /> Tüm Projeyi ZIP Olarak İndir
                            </button>
                            <button
                              onClick={downloadStandaloneProject}
                              className="w-full py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" /> Sadece HTML Dosyası İndir
                            </button>
                          </div>
                        </div>

                        <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-xl flex flex-col justify-between space-y-4">
                          <div>
                            <h4 className="font-bold text-sm text-neutral-900 mb-1 flex items-center gap-2">
                              <Zap className="w-4 h-4 text-neutral-700" /> Canlı Vercel Deploy Checklist
                            </h4>
                            <ul className="text-xs text-neutral-600 space-y-1 mt-2">
                              <li className="flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-green-600" /> Sıfır maliyet (Free Tier)
                              </li>
                              <li className="flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-green-600" /> Otomatik SSL & Subdomain
                              </li>
                              <li className="flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-green-600" /> Supabase bağlantı hazır
                              </li>
                            </ul>
                          </div>
                          <button
                            onClick={() => window.open('https://vercel.com/new', '_blank')}
                            className="w-full py-2.5 bg-white border border-neutral-200 text-neutral-900 rounded-lg text-xs font-semibold hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            Vercel'de Yeni Proje Aç <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: KAYNAK KOD */}
                  {activeTab === 'code' && builtCode && (
                    <div className="relative">
                      <pre className="bg-neutral-900 text-neutral-100 p-5 rounded-xl text-xs font-mono overflow-x-auto max-h-[600px]">
                        <code>{builtCode}</code>
                      </pre>
                    </div>
                  )}

                  {/* TAB 5: AŞAMA 4 & 5 - MARKETING & KARAR MOTORU (CAC) */}
                  {activeTab === 'marketing' && marketingData && (
                    <div className="space-y-6 py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* AŞAMA 4: REKLAM KAMPANYASI */}
                        <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                            <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                              <Users className="w-4 h-4 text-indigo-600" /> Aşama 4: Reklam Stratejisi
                            </h4>
                            <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold border border-indigo-200">
                              {marketingData.channel}
                            </span>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="bg-white p-3.5 rounded-xl border border-neutral-200">
                              <span className="text-[10px] uppercase font-bold text-neutral-400">Reklam Başlığı</span>
                              <p className="font-semibold text-neutral-900 mt-0.5">{marketingData.adCopy.headline}</p>
                              
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block mt-2">Reklam Metni</span>
                              <p className="text-neutral-600 mt-0.5">{marketingData.adCopy.body}</p>

                              <span className="text-[10px] uppercase font-bold text-neutral-400 block mt-2">Harekete Geçirici Mesaj (CTA)</span>
                              <span className="inline-block mt-1 px-3 py-1 bg-neutral-900 text-white rounded text-[11px] font-bold">
                                {marketingData.adCopy.callToAction}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1.5">Kurulum Checklist'i</span>
                              <ul className="space-y-1.5 text-neutral-700">
                                {marketingData.setupChecklist.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-neutral-100">
                                    <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* AŞAMA 5: KARAR MOTORU & CAC EŞİK KONTROLÜ */}
                        <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                            <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-green-600" /> Aşama 5: Karar Motoru (CAC)
                            </h4>
                            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
                              marketingData.simulation.decision === 'DEVAM ET' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {marketingData.simulation.decision}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-white p-3 rounded-xl border border-neutral-200">
                              <span className="text-[10px] text-neutral-500 font-medium">Test Bütçesi</span>
                              <div className="text-base font-bold text-neutral-900">${marketingData.simulation.testBudget}</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-neutral-200">
                              <span className="text-[10px] text-neutral-500 font-medium">Ziyaretçi</span>
                              <div className="text-base font-bold text-neutral-900">{marketingData.simulation.visitors}</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-neutral-200">
                              <span className="text-[10px] text-neutral-500 font-medium">Dönüşüm / Kayıt</span>
                              <div className="text-base font-bold text-neutral-900">{marketingData.simulation.conversions}</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-neutral-200">
                              <span className="text-[10px] text-neutral-500 font-medium">Hesaplanan CAC</span>
                              <div className={`text-base font-bold ${marketingData.simulation.cac <= 1 ? 'text-green-600' : 'text-red-600'}`}>
                                ${marketingData.simulation.cac}
                              </div>
                            </div>
                          </div>

                          <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                            marketingData.simulation.decision === 'DEVAM ET' 
                              ? 'bg-green-50 border-green-200 text-green-900' 
                              : 'bg-red-50 border-red-200 text-red-900'
                          }`}>
                            <span className="font-bold block mb-1">
                              {marketingData.simulation.decision === 'DEVAM ET' ? '🚀 Otomatik Karar: BÜTÇEYİ ARTIR' : '🛑 Otomatik Karar: DURDUR'}
                            </span>
                            {marketingData.simulation.decisionNote}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* AŞAMA 1: FİKİR MOTORU DASHBOARD */
          /* ========================================================================= */
          <div>
            <header className="mb-10 text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-tight text-neutral-900">
                Fikir Motoru
              </h2>
              <p className="text-base text-neutral-500 max-w-2xl mx-auto">
                Canlı startup sinyallerini tarar, sıfır maliyetle 1 günde kurulabilecek mikro-SaaS fırsatlarını tespit eder.
              </p>
              
              <button 
                onClick={() => { setCustomIdea(''); generateIdeas(); }}
                disabled={loading}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
              >
                {loading && !customIdea.trim() ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
                {loading && !customIdea.trim() ? 'Sinyaller Taranıyor...' : 'Yeni Fikirler Üret (3 Adet)'}
              </button>

              <div className="mt-6 max-w-2xl mx-auto">
                <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm text-left">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    veya kendi fikrini yaz (Fikir to App)
                  </h3>
                  <textarea
                    value={customIdea}
                    onChange={(e) => setCustomIdea(e.target.value)}
                    placeholder="Örn: Küçük işletmeler için randevu takip aracı veya hayvan kilo takip uygulaması..."
                    className="w-full h-20 px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
                    disabled={loading}
                  />
                  <button
                    onClick={generateIdeas}
                    disabled={loading || !customIdea.trim()}
                    className="mt-2.5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 text-neutral-900 rounded-xl font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                  >
                    {loading && customIdea.trim() ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {loading && customIdea.trim() ? 'Fikir Analiz Ediliyor...' : 'Bu Fikri Analiz Et'}
                  </button>
                </div>
              </div>
            </header>

            {warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3.5 rounded-xl mb-8 max-w-3xl mx-auto">
                <h4 className="font-bold text-sm mb-1.5 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Eksik Veri Kaynağı Uyarısı
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {rawSignals && ideas.length > 0 && (
              <div className="mb-8 max-w-4xl mx-auto">
                <button 
                  onClick={() => setShowRaw(!showRaw)}
                  className="flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors mx-auto bg-white border border-neutral-200 px-3.5 py-1.5 rounded-full shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {showRaw ? 'Ham Sinyalleri Gizle' : 'Kullanılan Ham Sinyalleri Gör'}
                </button>
                
                {showRaw && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                    <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-sm h-52 overflow-y-auto">
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-neutral-400 mb-2 sticky top-0 bg-white pb-1 border-b border-neutral-100">
                        Canlı Piyasa Sinyalleri ({rawSignals.reddit.length})
                      </h4>
                      <ul className="space-y-2 text-xs text-neutral-700">
                        {rawSignals.reddit.map((r, i) => (
                          <li key={i} className="pb-2 border-b border-neutral-50 last:border-0">{r}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-sm h-52 overflow-y-auto">
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-neutral-400 mb-2 sticky top-0 bg-white pb-1 border-b border-neutral-100">
                        Pazar Trendleri ({rawSignals.trends.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {rawSignals.trends.map((t, i) => (
                          <span key={i} className="bg-neutral-100 text-neutral-700 px-2.5 py-0.5 rounded text-xs border border-neutral-200">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fikir Kartları Listesi */}
            <div className={`grid gap-6 ${ideas.length === 1 ? 'max-w-xl mx-auto' : 'grid-cols-1 lg:grid-cols-3'}`}>
              {ideas.map((idea, idx) => (
                <div key={idx} className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-neutral-900 leading-tight">
                      {idea.title}
                    </h3>
                    <div className="flex items-center justify-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 shrink-0 ml-3">
                      {idea.totalScore}/40
                    </div>
                  </div>
                  
                  <div className="space-y-4 flex-1">
                    <div>
                      <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Problem</h4>
                      <p className="text-sm text-neutral-700 leading-relaxed">{idea.problem}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <h4 className="font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Hedef
                        </h4>
                        <p className="text-neutral-700">{idea.targetUser}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Neden Şimdi
                        </h4>
                        <p className="text-neutral-700">{idea.whyNow}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Code className="w-3 h-3" /> MVP Kapsamı (v1)
                      </h4>
                      <ul className="space-y-1">
                        {idea.mvpScope.map((scope, i) => (
                          <li key={i} className="text-xs text-neutral-700 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                            <span>{scope}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-neutral-100">
                      <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
                        <div className="bg-neutral-50 p-1.5 rounded-lg">
                          <div className="text-[10px] text-neutral-500 mb-0.5">Acı</div>
                          <div className="font-bold text-xs text-neutral-900">{idea.scores.pain}</div>
                        </div>
                        <div className="bg-neutral-50 p-1.5 rounded-lg">
                          <div className="text-[10px] text-neutral-500 mb-0.5">Boşluk</div>
                          <div className="font-bold text-xs text-neutral-900">{idea.scores.lackOfSolutions}</div>
                        </div>
                        <div className="bg-neutral-50 p-1.5 rounded-lg">
                          <div className="text-[10px] text-neutral-500 mb-0.5">Hız</div>
                          <div className="font-bold text-xs text-neutral-900">{idea.scores.feasibility}</div>
                        </div>
                        <div className="bg-neutral-50 p-1.5 rounded-lg">
                          <div className="text-[10px] text-neutral-500 mb-0.5"><DollarSign className="w-2.5 h-2.5 inline" /></div>
                          <div className="font-bold text-xs text-neutral-900">{idea.scores.monetization}</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-neutral-500 italic text-center">
                        {idea.feasibilityNote}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-100">
                    <button 
                      onClick={() => handleSelectIdea(idea)}
                      className="w-full py-2.5 bg-neutral-900 text-white font-medium rounded-xl hover:bg-neutral-800 transition-colors text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      Bununla Devam Et (Aşama 2) <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL 1: HESAP & API AYARLARI */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-neutral-900">Hesap & API Ayarları</h3>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="text-neutral-400 hover:text-neutral-900 text-xs p-1"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-neutral-500 mb-4">
                Projeleriniz ve geçmişiniz e-posta profilinize kaydedilir.
              </p>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    E-posta Profili
                  </label>
                  <input
                    type="email"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="eposta@ornek.com (İsteğe bağlı)"
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div className="space-y-1.5 pt-1 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-neutral-700 flex items-center gap-1">
                      <Key className="w-3 h-3 text-indigo-600" />
                      Özel Groq API Anahtarı
                    </label>
                    <a 
                      href="https://console.groq.com/keys" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[10px] text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Ücretsiz Al <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={inputApiKey}
                    onChange={(e) => setInputApiKey(e.target.value)}
                    placeholder={customApiKey ? "••••••••••••••••" : "gsk_..."}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                  <p className="text-[10.5px] text-neutral-400 leading-normal">
                    İsteğe bağlıdır. Boş bırakırsanız sistemin varsayılan ücretsiz kotası kullanılır. Kendi ücretsiz anahtarınızı girerek kesintisiz ve yüksek limitli üretim yapabilirsiniz.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 py-2 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800"
                  >
                    Ayarları Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: KAYITLI PROJELER VE SOHBET GEÇMİŞİ */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-neutral-200 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Kayıtlı Projeler & Geçmiş</h3>
                  <p className="text-xs text-neutral-500">Önceki ürettiğiniz uygulamalar, AI sohbetleri ve ZIP exportları.</p>
                </div>
                <div className="flex items-center gap-2">
                  {savedProjects.length > 0 && (
                    <button
                      onClick={copyAllProjectsSummary}
                      className="px-2.5 py-1 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5 shadow-xs"
                      title="Tüm projelerin başlık ve açıklamalarını kopyala"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Tümünü Metin Olarak Kopyala</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="text-neutral-400 hover:text-neutral-900 text-sm font-bold p-1 ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {savedProjects.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400 text-xs">
                    Henüz kaydedilmiş bir proje bulunmuyor. Yeni bir fikir inşa ettiğinizde burada listelenecektir.
                  </div>
                ) : (
                  savedProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => restoreProject(p)}
                      className="bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200 p-4 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-neutral-900">{p.idea.title}</h4>
                          <span className="text-[10px] px-2 py-0.5 bg-white border border-neutral-200 rounded-full font-bold text-neutral-600">
                            {p.idea.totalScore}/40 Puan
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-1">{p.idea.problem}</p>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-3 pt-1">
                          <span>📅 {p.createdAt}</span>
                          <span>💬 {p.chatHistory?.length || 0} AI Sohbet Mesajı</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadZipArchive(p.idea, p.spec, p.code);
                          }}
                          className="p-2 bg-white border border-neutral-200 hover:bg-neutral-200/80 rounded-lg text-neutral-700 text-xs font-semibold shadow-xs"
                          title="ZIP İndir"
                        >
                          <Archive className="w-3.5 h-3.5 text-neutral-700" />
                        </button>
                        <button
                          onClick={(e) => deleteProject(p.id, e)}
                          className="p-2 bg-white border border-neutral-200 hover:bg-red-50 hover:text-red-600 rounded-lg text-neutral-400 text-xs shadow-xs"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sol Altta Sabit Dark / Light Mod Değiştirici (Floating Theme Toggle) */}
        <div className="fixed bottom-5 left-5 z-50 select-none">
          <div className={`flex flex-col items-center gap-1.5 px-3.5 py-2 rounded-2xl shadow-xl backdrop-blur-md border transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-[#181824]/90 border-neutral-700/80 text-neutral-300 shadow-black/50'
              : 'bg-white/95 border-neutral-200/90 text-neutral-600 shadow-neutral-300/50'
          }`}>
            <div className="flex items-center gap-2.5">
              <Sun className={`w-4 h-4 transition-all duration-300 ${
                theme === 'light' ? 'text-amber-500 scale-110' : 'text-neutral-500 opacity-60'
              }`} />
              
              {/* Switch Track */}
              <button
                type="button"
                role="switch"
                aria-checked={theme === 'dark'}
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 focus:outline-none ${
                  theme === 'dark' ? 'bg-indigo-600' : 'bg-neutral-300'
                }`}
                title={theme === 'dark' ? "Açık Moda Geç (Light Mode)" : "Koyu Moda Geç (Dark Mode)"}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>

              <Moon className={`w-4 h-4 transition-all duration-300 ${
                theme === 'dark' ? 'text-indigo-400 scale-110' : 'text-neutral-500 opacity-60'
              }`} />
            </div>

            <span className="text-[9px] font-bold tracking-wider uppercase opacity-75">
              AÇIK | KOYU
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
