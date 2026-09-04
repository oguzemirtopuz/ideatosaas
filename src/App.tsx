import { useState } from 'react';
import { Lightbulb, Loader2, Target, Zap, Clock, Code, DollarSign, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

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

export default function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rawSignals, setRawSignals] = useState<RawSignals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const generateIdeas = async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    setRawSignals(null);
    setShowRaw(false);
    
    try {
      const response = await fetch('/api/generate-ideas', { method: 'POST' });
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

  const handleContinue = (idea: Idea) => {
    alert(`"${idea.title}" seçildi. Aşama 2 (Spec + Build Motoru) için hazır.\nBu aşama şu an için Agent tarafından devam ettirilmelidir.`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-neutral-900 text-white rounded-2xl mb-4 shadow-sm">
            <Zap className="w-6 h-6" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
            Fikir Motoru
          </h1>
          <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
            Reddit ve Google Trends verilerini tarar, mikro-SaaS fırsatlarını tespit eder ve 1 günde kurulabilecek MVP'ler önerir.
          </p>
          
          <button 
            onClick={generateIdeas}
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Lightbulb className="w-5 h-5" />
            )}
            {loading ? 'Sinyaller Analiz Ediliyor...' : 'Yeni Fikirler Üret'}
          </button>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 max-w-2xl mx-auto text-center font-medium">
            <AlertTriangle className="w-5 h-5 inline mr-2 -mt-1" />
            {error}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-4 rounded-xl mb-8 max-w-3xl mx-auto">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Eksik Veri Kaynağı Uyarısı
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {rawSignals && ideas.length > 0 && (
          <div className="mb-10 max-w-4xl mx-auto">
            <button 
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors mx-auto bg-white border border-neutral-200 px-4 py-2 rounded-full shadow-sm"
            >
              <FileText className="w-4 h-4" />
              {showRaw ? 'Ham Sinyalleri Gizle' : 'Kullanılan Ham Sinyalleri Gör'}
            </button>
            
            {showRaw && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm h-64 overflow-y-auto">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-400 mb-3 sticky top-0 bg-white pb-2 border-b border-neutral-100">
                    Reddit Sinyalleri ({rawSignals.reddit.length})
                  </h4>
                  {rawSignals.reddit.length > 0 ? (
                    <ul className="space-y-3 text-sm text-neutral-700">
                      {rawSignals.reddit.map((r, i) => (
                        <li key={i} className="pb-3 border-b border-neutral-50 last:border-0 last:pb-0">{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">Veri çekilemedi.</p>
                  )}
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm h-64 overflow-y-auto">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-400 mb-3 sticky top-0 bg-white pb-2 border-b border-neutral-100">
                    Google Trends ({rawSignals.trends.length})
                  </h4>
                  {rawSignals.trends.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {rawSignals.trends.map((t, i) => (
                        <span key={i} className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-md text-sm border border-neutral-200">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">Veri çekilemedi.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {ideas.map((idea, idx) => (
            <div key={idx} className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-neutral-900 leading-tight">
                  {idea.title}
                </h3>
                <div className="flex items-center justify-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-200 shrink-0 ml-3">
                  {idea.totalScore}/40
                </div>
              </div>
              
              <div className="space-y-5 flex-1">
                <div>
                  <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Problem</h4>
                  <p className="text-sm text-neutral-700 leading-relaxed">{idea.problem}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Hedef
                    </h4>
                    <p className="text-sm text-neutral-700">{idea.targetUser}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Neden Şimdi
                    </h4>
                    <p className="text-sm text-neutral-700">{idea.whyNow}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Code className="w-3 h-3" /> MVP Kapsamı (v1)
                  </h4>
                  <ul className="space-y-1.5">
                    {idea.mvpScope.map((scope, i) => (
                      <li key={i} className="text-sm text-neutral-700 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{scope}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-neutral-100">
                  <div className="grid grid-cols-4 gap-2 text-center mb-3">
                    <div className="bg-neutral-50 p-2 rounded-lg">
                      <div className="text-xs text-neutral-500 mb-1">Acı</div>
                      <div className="font-semibold text-neutral-900">{idea.scores.pain}</div>
                    </div>
                    <div className="bg-neutral-50 p-2 rounded-lg">
                      <div className="text-xs text-neutral-500 mb-1">Boşluk</div>
                      <div className="font-semibold text-neutral-900">{idea.scores.lackOfSolutions}</div>
                    </div>
                    <div className="bg-neutral-50 p-2 rounded-lg">
                      <div className="text-xs text-neutral-500 mb-1">Hız</div>
                      <div className="font-semibold text-neutral-900">{idea.scores.feasibility}</div>
                    </div>
                    <div className="bg-neutral-50 p-2 rounded-lg">
                      <div className="text-xs text-neutral-500 mb-1"><DollarSign className="w-3 h-3 inline" /></div>
                      <div className="font-semibold text-neutral-900">{idea.scores.monetization}</div>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 italic text-center">
                    {idea.feasibilityNote}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100">
                <button 
                  onClick={() => handleContinue(idea)}
                  className="w-full py-2.5 bg-neutral-100 text-neutral-900 font-medium rounded-xl hover:bg-neutral-200 transition-colors text-sm"
                >
                  Bununla Devam Et (Aşama 2)
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
