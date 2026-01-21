import React, { useState, useEffect } from 'react';
import { AppState, NutritionData, CameraResult, Language, HistoryEntry } from './types';
import { translations } from './translations';
import { analyzeMeal } from './services/geminiService';
import { CameraView } from './components/CameraView';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { Processing } from './components/Processing';
import { ResultView } from './components/ResultView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { Paywall } from './components/Paywall';
import { Camera as CameraIcon, History as HistoryIcon, Settings as SettingsIcon, AlertCircle, Star } from 'lucide-react';

const HISTORY_LIMIT = 50;
const FREE_LIMIT = 2;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const onboarded = localStorage.getItem('nutriscan_v1_onboarded');
    return onboarded ? 'CAMERA' : 'ONBOARDING';
  });
  
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('nutri_lang') as Language) || 'pt';
  });
  
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('nutri_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [scanCount, setScanCount] = useState<number>(() => {
    const count = localStorage.getItem('nutri_scan_count');
    return count ? parseInt(count, 10) : 0;
  });

  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem('nutri_is_premium') === 'true';
  });
  
  const [currentResult, setCurrentResult] = useState<{ data: NutritionData, image: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('nutri_history', JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('nutri_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('nutri_scan_count', scanCount.toString());
  }, [scanCount]);

  useEffect(() => {
    localStorage.setItem('nutri_is_premium', isPremium.toString());
  }, [isPremium]);

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!navigator.vibrate) return;
    const map = { light: 10, medium: 30, heavy: 70 };
    navigator.vibrate(map[type]);
  };

  const handleStart = () => {
    triggerHaptic('medium');
    localStorage.setItem('nutriscan_v1_onboarded', 'true');
    setState('CAMERA');
  };

  const handleCapture = async (result: CameraResult) => {
    if (!isPremium && scanCount >= FREE_LIMIT) {
      setState('PAYWALL');
      return;
    }

    triggerHaptic('heavy');
    setState('PROCESSING');
    setError(null);
    try {
      const data = await analyzeMeal(result.base64, result.mimeType, language);
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        image: result.base64,
        data: data
      };
      
      setHistory(prev => [entry, ...prev].slice(0, HISTORY_LIMIT));
      setScanCount(prev => prev + 1);
      setCurrentResult({ data, image: result.base64 });
      
      triggerHaptic('medium');
      setState('RESULT');
    } catch (err: any) {
      setError(err.message);
      triggerHaptic('heavy');
      setState('CAMERA');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleSubscribe = () => {
    triggerHaptic('heavy');
    setIsPremium(true);
    setState('CAMERA');
  };

  const renderContent = () => {
    switch (state) {
      case 'ONBOARDING':
        return <Onboarding onStart={handleStart} language={language} setLanguage={setLanguage} />;
      case 'PAYWALL':
        return <Paywall language={language} onSubscribe={handleSubscribe} />;
      case 'CAMERA':
        return (
          <>
            <CameraView onCapture={handleCapture} onCancel={() => history.length > 0 ? setState('HISTORY') : setState('ONBOARDING')} language={language} />
            {!isPremium && scanCount < FREE_LIMIT && (
              <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 z-[60]">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-white font-black uppercase tracking-widest">
                  {FREE_LIMIT - scanCount} {translations[language].freeRemaining}
                </span>
              </div>
            )}
            {error && (
              <div className="absolute top-24 left-6 right-6 bg-red-600 text-white p-4 rounded-2xl flex items-center gap-3 animate-bounce z-[60] shadow-2xl">
                <AlertCircle size={20} />
                <span className="text-xs font-black uppercase">{error}</span>
              </div>
            )}
          </>
        );
      case 'PROCESSING':
        return <Processing language={language} />;
      case 'RESULT':
        return currentResult ? (
          <ResultView data={currentResult.data} image={currentResult.image} onBack={() => setState('CAMERA')} language={language} />
        ) : null;
      case 'HISTORY':
        return <HistoryView 
          history={history} 
          onBack={() => setState('CAMERA')} 
          language={language} 
          onSelect={(h: HistoryEntry) => {
            setCurrentResult({ data: h.data, image: h.image });
            setState('RESULT');
          }} 
        />;
      case 'SETTINGS':
        return <SettingsView onBack={() => setState('CAMERA')} language={language} onNavigate={(s: AppState) => setState(s)} />;
      case 'PRIVACY':
        return <PrivacyView language={language} onBack={() => setState('SETTINGS')} />;
      case 'TERMS':
        return <TermsView language={language} onBack={() => setState('SETTINGS')} />;
      default:
        return null;
    }
  };

  const showNav = !['CAMERA', 'PROCESSING', 'RESULT', 'ONBOARDING', 'PRIVACY', 'TERMS', 'PAYWALL'].includes(state);

  return (
    <Layout>
      <div className="flex-1 flex flex-col relative bg-white overflow-hidden">
        {renderContent()}
        {showNav && (
          <nav className="h-24 bg-white/80 backdrop-blur-2xl border-t border-slate-100 flex items-center justify-around px-8 safe-pb z-50">
            {[
              { id: 'CAMERA', icon: CameraIcon, label: 'Scanner' },
              { id: 'HISTORY', icon: HistoryIcon, label: 'Diário' },
              { id: 'SETTINGS', icon: SettingsIcon, label: 'Ajustes' }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => { triggerHaptic(); setState(item.id as AppState); }}
                className={`flex flex-col items-center gap-1 transition-all ${state === item.id ? 'text-emerald-500 scale-110' : 'text-slate-300'}`}
              >
                <item.icon size={24} strokeWidth={state === item.id ? 3 : 2} />
                <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
        {isPremium && state === 'SETTINGS' && (
           <div className="absolute top-16 right-6">
             <div className="bg-amber-400 p-2 rounded-xl shadow-lg">
                <Star size={16} className="text-white fill-white" />
             </div>
           </div>
        )}
      </div>
    </Layout>
  );
};

export default App;