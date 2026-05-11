import { useState, useEffect } from 'react';
import { Shield, BrainCircuit, Activity, Bell } from 'lucide-react';
import { io } from 'socket.io-client';
import { GainerMonitor } from './components/GainerMonitor';
import { TokenResearch } from './components/TokenResearch';
import { AnomalyScout } from './components/AnomalyScout';

function App() {
  const [activeTab, setActiveTab] = useState('gainers');
  const [analysisSymbol, setAnalysisSymbol] = useState('');
  const [socketAlert, setSocketAlert] = useState<any>(null);
  const [, setSocketStatus] = useState<'disconnected' | 'connected'>('disconnected');

  useEffect(() => {
    const socket = io('/realtime');
    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));
    socket.on('volatility_pulse', (data) => setSocketAlert(data));
    return () => { socket.disconnect(); };
  }, []);

  const navItems = [
    { key: 'gainers', label: '涨幅监控', icon: Activity },
    { key: 'research', label: '代币调研', icon: Shield },
    { key: 'volatility', label: '异常波动', icon: Bell },
  ];

  const renderSidebar = () => (
    <aside className="hidden md:flex w-60 flex-shrink-0 border-r border-white/5 bg-black/95 flex-col z-20">
      <div className="p-8 border-b border-white/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xs font-black tracking-[0.2em] text-white uppercase leading-none mb-1">Antigravity</h1>
          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Analytics Engine</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.key} onClick={() => setActiveTab(item.key)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.key ? 'bg-zinc-800/80 text-white shadow-lg border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Icon className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/5">
        <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-3 border border-white/5">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div className="absolute inset-0 bg-emerald-500/40 blur-md rounded-full" />
          </div>
          <div>
            <div className="text-[9px] text-zinc-600 uppercase font-black mb-1">Status</div>
            <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live Syncing</div>
          </div>
        </div>
      </div>
    </aside>
  );

  const renderMobileNav = () => (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-black/95 backdrop-blur-xl px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-3 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.key} onClick={() => setActiveTab(item.key)} className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-all ${activeTab === item.key ? 'bg-zinc-800 text-white border border-white/5' : 'text-zinc-500'}`}>
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-black tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {renderSidebar()}
      <main className="flex-1 flex min-h-screen flex-col min-w-0 bg-transparent z-10 pb-20 md:pb-0">
        <header className="sticky top-0 z-20 h-14 md:h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-10 backdrop-blur-md bg-black/80">
          <div className="text-[9px] md:text-[10px] font-black tracking-[0.18em] md:tracking-[0.3em] uppercase text-zinc-300 truncate">
            {activeTab === 'gainers' ? 'Market Gainer Monitor' : activeTab === 'research' ? 'Neural Audit' : 'Volatility Scout'}
          </div>
          <div className="text-[8px] md:text-[9px] font-black text-zinc-700 tracking-[0.24em] md:tracking-[0.4em] uppercase px-3 md:px-4 py-2 border border-white/5 rounded-xl bg-white/5">PRO.v13</div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 md:p-8 scrollbar-thin scrollbar-thumb-zinc-900">
          {activeTab === 'gainers' && <GainerMonitor onTradeAnalyze={(symbol) => {
            setAnalysisSymbol(symbol);
            setActiveTab('research');
          }} />}
          {activeTab === 'volatility' && <AnomalyScout socketAlert={socketAlert} />}
          {activeTab === 'research' && <TokenResearch initialSymbol={analysisSymbol} />}
        </div>
      </main>
      {renderMobileNav()}
    </div>
  );
}

export default App;
