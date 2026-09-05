import { useState } from 'react';
import { 
  Lightbulb, Loader2, Target, Zap, Clock, Code, DollarSign, 
  CheckCircle2, AlertTriangle, FileText, ArrowRight, ArrowLeft, 
  Layers, Hammer, Eye, Play, Sparkles, Check
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

export default function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rawSignals, setRawSignals] = useState<RawSignals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [customIdea, setCustomIdea] = useState('');

  // Aşama 2 Durumları
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [spec, setSpec] = useState<AppSpec | null>(null);
  const [specLoading, setSpecLoading] = useState(false);
  const [buildLoading, setBuildLoading] = useState(false);
  const [builtCode, setBuiltCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'spec'>('spec');
  const [buildStep, setBuildStep] = useState<number>(0);

  const generateIdeas = async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    setRawSignals(null);
    setShowRaw(false);
    setSelectedIdea(null);
    setSpec(null);
    setBuiltCode(null);
    
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
    setActiveTab('spec');
    setSpecLoading(true);
    setError(null);
    setBuildStep(1);

    try {
      const res = await fetch('/api/generate-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Spec üretilemedi');
      setSpec(data.spec);
      setBuildStep(2);
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
    setBuildStep(3);

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
      setBuildStep(4);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBuildLoading(false);
    }
  };

  // Kodun canlı iframe önizlemesi için HTML üretimi
  const getPreviewHtml = (code: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>body { font-family: system-ui, -apple-system, sans-serif; }</style>
        </head>
        <body class="bg-neutral-50 p-4">
          <div id="root"></div>
          <script type="text/babel">
            ${code.replace(/export\s+default\s+function\s+App/g, 'function App')}
            ReactDOM.createRoot(document.getElementById('root')).render(<App />);
          </script>
        </body>
      </html>
    `;
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-24">
      <div className="max-w-6xl mx-auto px-6 py-10">
        
        {/* Üst Bar / Durum Adımları */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-900 text-white rounded-xl shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Idea-to-App Pipeline</h1>
              <p className="text-xs text-neutral-500 font-medium">Sıfır Maliyet Otomasyonu (Groq AI & Vercel)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={`px-3 py-1.5 rounded-full ${!selectedIdea ? 'bg-neutral-900 text-white' : 'bg-green-100 text-green-800'}`}>
              1. Fikir Motoru {selectedIdea && <Check className="w-3 h-3 inline ml-1" />}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
            <span className={`px-3 py-1.5 rounded-full ${selectedIdea && !builtCode ? 'bg-neutral-900 text-white' : builtCode ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-500'}`}>
              2. Spec Motoru {builtCode && <Check className="w-3 h-3 inline ml-1" />}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
            <span className={`px-3 py-1.5 rounded-full ${builtCode ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-500'}`}>
              3. Canlı Uygulama
            </span>
          </div>
        </div>

        {/* Hata Bildirimi */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 max-w-2xl mx-auto text-center font-medium shadow-sm">
            <AlertTriangle className="w-5 h-5 inline mr-2 -mt-1" />
            {error}
          </div>
        )}

        {/* ========================================================================= */}
        {/* AŞAMA 2: SEÇİLEN UYGULAMA İNŞA STÜDYOSU (SPEC & CANLI APP) */}
        {/* ========================================================================= */}
        {selectedIdea ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedIdea(null)}
                  className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                  title="Fikirlere geri dön"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-neutral-900">{selectedIdea.title}</h2>
                    <span className="text-xs px-2.5 py-0.5 bg-neutral-100 text-neutral-700 rounded-full font-bold border border-neutral-200">
                      {selectedIdea.totalScore}/40 Puan
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-0.5">{selectedIdea.problem}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {spec && !builtCode && (
                  <button
                    onClick={handleBuildApp}
                    disabled={buildLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50 text-sm"
                  >
                    {buildLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
                    {buildLoading ? 'Uygulama İnşa Ediliyor...' : 'Uygulamayı İnşa Et (Build)'}
                  </button>
                )}
                {builtCode && (
                  <button
                    onClick={handleBuildApp}
                    disabled={buildLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-800 rounded-xl font-medium hover:bg-neutral-200 transition-colors text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Tekrar Derle
                  </button>
                )}
              </div>
            </div>

            {/* Spec Yükleniyor Durumu */}
            {specLoading && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-900 mb-3" />
                <h3 className="text-lg font-bold text-neutral-900">Aşama 2: SPEC.md Çıkarılıyor...</h3>
                <p className="text-sm text-neutral-500 max-w-md mx-auto mt-1">
                  "Önce spec, sonra kod" disiplinine uygun olarak veri modeli, kullanıcı akışları ve kapsam dışı maddeler hazırlanıyor.
                </p>
              </div>
            )}

            {/* Spec ve Önizleme Sekmeleri */}
            {spec && (
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('spec')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        activeTab === 'spec' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      <Layers className="w-4 h-4" /> 1. Şartname (SPEC.md)
                    </button>
                    {builtCode && (
                      <button
                        onClick={() => setActiveTab('preview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          activeTab === 'preview' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        <Eye className="w-4 h-4 text-green-600" /> 2. Canlı Çalışan Uygulama
                      </button>
                    )}
                    {builtCode && (
                      <button
                        onClick={() => setActiveTab('code')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          activeTab === 'code' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        <Code className="w-4 h-4" /> 3. Kaynak Kod
                      </button>
                    )}
                  </div>

                  {activeTab === 'preview' && (
                    <span className="text-xs px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Canlı İn-Memory MVP
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {/* TAB 1: SPEC */}
                  {activeTab === 'spec' && (
                    <div className="space-y-6">
                      <div className="border-b border-neutral-100 pb-4">
                        <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">Slogan & Vizyon</span>
                        <h3 className="text-xl font-bold text-neutral-900 mt-1">{spec.tagline}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                          <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-neutral-700" /> Kullanıcı Akışları (Adım Adım)
                          </h4>
                          <ul className="space-y-2 text-sm text-neutral-700">
                            {spec.userFlows.map((flow, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="font-semibold text-neutral-400 text-xs mt-0.5">•</span>
                                <span>{flow}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                          <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                            <Code className="w-4 h-4 text-neutral-700" /> Veri Modeli (Supabase / In-Memory)
                          </h4>
                          <div className="space-y-2">
                            {spec.dataModel.map((model, idx) => (
                              <div key={idx} className="bg-white p-2.5 rounded-lg border border-neutral-200 text-xs">
                                <span className="font-mono font-bold text-neutral-900">tablo: {model.table}</span>
                                <p className="text-neutral-500 mt-0.5">{model.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                          <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-neutral-700" /> Sayfa ve Ekran Listesi
                          </h4>
                          <ul className="space-y-1.5 text-sm text-neutral-700">
                            {spec.screens.map((screen, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                                {screen}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                          <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2 text-red-700">
                            <AlertTriangle className="w-4 h-4 text-red-600" /> Kapsam Dışı Bırakılanlar (v1 Sınırı)
                          </h4>
                          <ul className="space-y-1.5 text-sm text-neutral-600">
                            {spec.outOfScope.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-400 font-bold text-xs mt-0.5">✕</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {!builtCode && (
                        <div className="pt-4 flex justify-end">
                          <button
                            onClick={handleBuildApp}
                            disabled={buildLoading}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50 text-sm"
                          >
                            {buildLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            {buildLoading ? 'Uygulama İnşa Ediliyor (10-15 sn)...' : 'Bu Spec ile Uygulamayı Canlı İnşa Et'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CANLI ÖNİZLEME (IFRAME SANDBOX) */}
                  {activeTab === 'preview' && builtCode && (
                    <div className="space-y-3">
                      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-inner h-[650px]">
                        <iframe
                          title="App Sandbox"
                          srcDoc={getPreviewHtml(builtCode)}
                          className="w-full h-full border-0"
                          sandbox="allow-scripts allow-modals allow-forms"
                        />
                      </div>
                      <p className="text-xs text-neutral-400 text-center">
                        Bu uygulama az önce oluşturulan şartnameye (`SPEC.md`) uygun olarak sıfırdan derlenmiş çalışan canlı bir MVP'dir.
                      </p>
                    </div>
                  )}

                  {/* TAB 3: KAYNAK KOD */}
                  {activeTab === 'code' && builtCode && (
                    <div className="relative">
                      <pre className="bg-neutral-900 text-neutral-100 p-5 rounded-xl text-xs font-mono overflow-x-auto max-h-[600px]">
                        <code>{builtCode}</code>
                      </pre>
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
                Reddit ve Pazar trendlerini tarar, sıfır maliyetle 1 günde kurulabilecek mikro-SaaS fırsatlarını tespit eder.
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
                {loading && !customIdea.trim() ? 'Sinyaller Analiz Ediliyor...' : 'Yeni Fikirler Üret (3 Adet)'}
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
                        Reddit Sinyalleri ({rawSignals.reddit.length})
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
      </div>
    </div>
  );
}
