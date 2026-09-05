import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Lightbulb, Loader2, Target, Zap, Clock, Code, DollarSign, 
  CheckCircle2, AlertTriangle, FileText, ArrowRight, ArrowLeft, 
  Layers, Hammer, Eye, Play, Sparkles, Check, Download, ExternalLink,
  TrendingUp, BarChart3, Users, Archive, Send, MessageSquare, 
  UserCheck, History, Trash2, FolderGit2
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
  const [activeTab, setActiveTab] = useState<'spec' | 'preview' | 'code' | 'deploy' | 'marketing'>('spec');

  // AI Canlı Refine Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [modifyingCode, setModifyingCode] = useState<boolean>(false);

  // Aşama 4 & 5: Pazarlama ve Karar Motoru
  const [marketingData, setMarketingData] = useState<MarketingDecision | null>(null);
  const [marketingLoading, setMarketingLoading] = useState(false);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputEmail.trim()) {
      localStorage.setItem('saas_builder_user', inputEmail.trim());
      setUserEmail(inputEmail.trim());
      setShowAuthModal(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('saas_builder_user');
    setUserEmail('');
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
      const body = customIdea.trim() ? { customIdea: customIdea.trim() } : undefined;
      const response = await fetch('/api/generate-ideas', { 
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json();
      
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea })
      });
      const data = await res.json();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: selectedIdea, spec })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uygulama kodu üretilemedi');
      setBuiltCode(data.code);
      setActiveTab('preview');
      setChatMessages([
        {
          sender: 'ai',
          text: `"${selectedIdea.title}" uygulamasını şartnameye göre inşa ettim! Beğenmediğin bir yer veya eklemek istediğin bir özellik varsa bana yazabilirsin.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBuildLoading(false);
    }
  };

  // AI Canlı Kod Düzenleme (Chat Refine)
  const handleSendPromptModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !builtCode || modifyingCode) return;

    const userText = chatInput.trim();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCode: builtCode,
          userPrompt: userText,
          ideaTitle: selectedIdea?.title
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kod güncellenemedi');

      setBuiltCode(data.updatedCode);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: selectedIdea, spec })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pazarlama testi üretilemedi');
      setMarketingData(data.result);
      setActiveTab('marketing');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMarketingLoading(false);
    }
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
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-proje-paketi.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("ZIP oluşturulurken hata: " + err.message);
    }
  };

  const downloadStandaloneProject = () => {
    if (!builtCode || !selectedIdea) return;
    const htmlContent = getPreviewHtml(builtCode);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedIdea.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-app.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Geçmiş projeyi geri yükleme
  const restoreProject = (p: SavedProject) => {
    setSelectedIdea(p.idea);
    setSpec(p.spec);
    setBuiltCode(p.code);
    setChatMessages(p.chatHistory || []);
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

  // Canlı Iframe Önizleme Kodu
  const getPreviewHtml = (code: string) => {
    // Satır satır temizlik yaparak herhangi bir import/export ifadesini kesinlikle yok et
    const lines = code.split('\n');
    const cleanLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
        return '';
      }
      if (trimmed.startsWith('export default function')) {
        return line.replace(/export\s+default\s+function\s*(\w*)/, 'function App');
      }
      if (trimmed.startsWith('export default')) {
        return '';
      }
      if (trimmed.startsWith('export ')) {
        return line.replace(/^export\s+/, '');
      }
      return line;
    });

    const cleanCode = cleanLines.join('\n');
    const codeJson = JSON.stringify(cleanCode);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"></script>
          <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>body { font-family: system-ui, -apple-system, sans-serif; margin: 0; }</style>
        </head>
        <body class="bg-neutral-50 p-4">
          <div id="root"></div>
          <div id="error-box" style="display:none; color:#b91c1c; background:#fef2f2; border:1px solid #fecaca; padding:16px; border-radius:12px; font-family:monospace; font-size:12px; white-space:pre-wrap;"></div>
          <script>
            window.addEventListener('load', function() {
              try {
                var codeToRun = ${codeJson};
                if (!window.Babel) {
                  throw new Error('Babel derleyicisi yüklenemedi.');
                }
                var transformed = window.Babel.transform(
                  "const { useState, useEffect, useMemo, useRef } = React;\\n" + codeToRun + "\\nif (typeof App !== 'undefined') { ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App)); }",
                  { presets: ['react'] }
                ).code;
                
                new Function(transformed)();
              } catch (err) {
                var errBox = document.getElementById('error-box');
                if (errBox) {
                  errBox.style.display = 'block';
                  errBox.innerText = 'Çalışma/Derleme Hatası: ' + err.message;
                }
              }
            });
          </script>
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

            {/* Kullanıcı Giriş / Hesap */}
            {userEmail ? (
              <div className="flex items-center gap-2 bg-white border border-neutral-200 px-3 py-1.5 rounded-lg shadow-sm text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="font-semibold text-neutral-800">{userEmail}</span>
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
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Hesap Oluştur / Giriş
              </button>
            )}
          </div>
        </div>

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
                      <div className="lg:col-span-2 border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-inner h-[650px]">
                        <iframe
                          title="App Sandbox"
                          srcDoc={getPreviewHtml(builtCode)}
                          className="w-full h-full border-0"
                          sandbox="allow-scripts allow-modals allow-forms"
                        />
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
                                className={`p-3 rounded-xl max-w-[88%] leading-relaxed ${
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

        {/* MODAL 1: HESAP OLUŞTURMA / GİRİŞ */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200">
              <h3 className="text-lg font-bold text-neutral-900 mb-1">Hesap / Profil</h3>
              <p className="text-xs text-neutral-500 mb-4">
                Projeleriniz ve AI sohbet geçmişiniz bu e-posta profiline otomatik kaydedilir.
              </p>
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="eposta@ornek.com"
                  required
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <div className="flex items-center gap-2 pt-1">
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
                    Kaydet & Giriş
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
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-neutral-400 hover:text-neutral-900 text-sm font-bold p-1"
                >
                  ✕
                </button>
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

      </div>
    </div>
  );
}
