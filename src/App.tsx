import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Lightbulb, Loader2, Target, Zap, Clock, Code, DollarSign, 
  CheckCircle2, AlertTriangle, FileText, ArrowRight, ArrowLeft, 
  Layers, Hammer, Eye, Play, Sparkles, Check, Download, ExternalLink,
  TrendingUp, BarChart3, Users, DollarSign as CashIcon, Archive
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

export default function App() {
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

  // Aşama 4 & 5: Pazarlama ve Karar Motoru
  const [marketingData, setMarketingData] = useState<MarketingDecision | null>(null);
  const [marketingLoading, setMarketingLoading] = useState(false);

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBuildLoading(false);
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

  // Sayfa ilk açıldığında otomatik olarak 3 fikri aramaya başla
  useEffect(() => {
    generateIdeas();
  }, []);

  // Aşama 3: Tek Tıkla Tam ZIP Paketi İndirme
  const downloadZipArchive = async () => {
    if (!builtCode || !selectedIdea || !spec) return;
    try {
      const zip = new JSZip();
      const slug = selectedIdea.title.toLowerCase().replace(/[^a-z0-9]/g, '-');

      // 1. SPEC.md dosyasını ekle
      const specMd = `# ${spec.title}\n\n> ${spec.tagline}\n\n## Kullanıcı Akışları\n${spec.userFlows.map(f => `- ${f}`).join('\n')}\n\n## Veri Modeli\n${spec.dataModel.map(m => `- **${m.table}**: ${m.description}`).join('\n')}\n\n## Ekranlar\n${spec.screens.map(s => `- ${s}`).join('\n')}\n\n## Kapsam Dışı\n${spec.outOfScope.map(o => `- ${o}`).join('\n')}`;
      zip.file("SPEC.md", specMd);

      // 2. Çalışan HTML uygulamasını ekle
      const htmlContent = getPreviewHtml(builtCode);
      zip.file("index.html", htmlContent);

      // 3. Kaynak React dosyasını ekle
      zip.file("App.jsx", builtCode);

      // 4. README.md ekle
      const readme = `# ${selectedIdea.title}\n\n${selectedIdea.problem}\n\n## Nasıl Çalıştırılır?\n1. \`index.html\` dosyasına çift tıklayarak doğrudan tarayıcınızda açabilirsiniz.\n2. Veya Vercel / Netlify üzerine bu klasörü sürükleyip anında canlıya alabilirsiniz.`;
      zip.file("README.md", readme);

      // ZIP oluştur ve indir
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

  // Aşama 3: Tek Tıkla Bağımsız HTML/React Dosyası İndirme
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

  // Kodun canlı iframe önizlemesi için HTML üretimi
  const getPreviewHtml = (code: string) => {
    let cleanCode = code
      .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
      .replace(/export\s+default\s+function\s*(\w*)/g, 'function App')
      .replace(/export\s+default\s+\w+;?/g, '');

    const codeJson = JSON.stringify(cleanCode);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.10/babel.min.js"></script>
          <style>body { font-family: system-ui, -apple-system, sans-serif; }</style>
        </head>
        <body class="bg-neutral-50 p-4">
          <div id="root"></div>
          <div id="error-box" style="display:none; color:#b91c1c; background:#fef2f2; border:1px solid #fecaca; padding:16px; border-radius:12px; font-family:monospace; font-size:12px; white-space:pre-wrap;"></div>
          <script>
            try {
              const codeToRun = ${codeJson};
              const transformed = Babel.transform(
                "const { useState, useEffect, useMemo, useRef } = React;\\n" + codeToRun + "\\nif (typeof App !== 'undefined') { ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App)); }",
                { presets: ['react'] }
              ).code;
              
              new Function(transformed)();
            } catch (err) {
              const errBox = document.getElementById('error-box');
              errBox.style.display = 'block';
              errBox.innerText = 'Çalışma Hatası: ' + err.message;
            }
          </script>
        </body>
      </html>
    `;
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-24">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Üst Başlık & 5 Aşamalı Durum Barı */}
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

          {/* 5 Aşama İlerleme Göstergesi */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold pb-1">
            <span className={`px-2.5 py-1 rounded-full whitespace-nowrap ${!selectedIdea ? 'bg-neutral-900 text-white' : 'bg-green-100 text-green-800'}`}>
              1. Fikir {selectedIdea && <Check className="w-3 h-3 inline ml-0.5" />}
            </span>
            <ArrowRight className="w-3 h-3 text-neutral-300 shrink-0" />
            <span className={`px-2.5 py-1 rounded-full whitespace-nowrap ${selectedIdea && !builtCode ? 'bg-neutral-900 text-white' : builtCode ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-500'}`}>
              2. Spec {builtCode && <Check className="w-3 h-3 inline ml-0.5" />}
            </span>
            <ArrowRight className="w-3 h-3 text-neutral-300 shrink-0" />
            <span className={`px-2.5 py-1 rounded-full whitespace-nowrap ${builtCode && !marketingData ? 'bg-neutral-900 text-white' : marketingData ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-500'}`}>
              3. Build & Deploy {builtCode && <Check className="w-3 h-3 inline ml-0.5" />}
            </span>
            <ArrowRight className="w-3 h-3 text-neutral-300 shrink-0" />
            <span className={`px-2.5 py-1 rounded-full whitespace-nowrap ${marketingData ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-500'}`}>
              4. Marketing & 5. Karar
            </span>
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
                    {marketingLoading ? 'Analiz Ediliyor...' : 'Aşama 4 & 5: Reklam & CAC Kararını Çalıştır'}
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
                        <Eye className="w-3.5 h-3.5 text-green-600" /> 2. Canlı Uygulama
                      </button>
                    )}
                    {builtCode && (
                      <button
                        onClick={() => setActiveTab('deploy')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          activeTab === 'deploy' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" /> 3. Deploy & Dışa Aktar
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

                  {/* TAB 2: CANLI ÖNİZLEME */}
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
                          Üretilen bu çalışan mikro-SaaS uygulamasını ister tek bir bağımsız dosya olarak indirin, ister Vercel / Netlify'a yükleyin.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-xl flex flex-col justify-between space-y-4">
                          <div>
                            <h4 className="font-bold text-sm text-neutral-900 mb-1 flex items-center gap-2">
                              <Archive className="w-4 h-4 text-neutral-700" /> Tam ZIP Paketi İndir
                            </h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                              İçinde \`SPEC.md\`, \`index.html\`, \`App.jsx\` ve \`README.md\` dosyalarını barındıran tam proje ZIP arşivini indirin.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <button
                              onClick={downloadZipArchive}
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
