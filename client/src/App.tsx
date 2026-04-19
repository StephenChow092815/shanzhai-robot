import { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Globe, ChevronRight, Search, ArrowUpRight, ArrowDownRight, 
  Calendar, Clock, RefreshCw, TrendingUp, CheckCircle2, 
  BrainCircuit, Activity, PieChart, Lock, Zap, Bell
} from 'lucide-react';
import { io } from 'socket.io-client';
import { AnomalyVolatility } from './components/AnomalyVolatility';

function App() {
  const [activeTab, setActiveTab] = useState('gainers');
  const [loading, setLoading] = useState(false);

  // --- Gainers Module State ---
  const [historyMarks, setHistoryMarks] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState<string>(''); 
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [lastSnapshotTime, setLastSnapshotTime] = useState<string>('');
  const [cardsData, setCardsData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableTotal, setTableTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // --- Research Module State ---
  const [symbol, setSymbol] = useState('');
  const [discoveryCandidates, setDiscoveryCandidates] = useState<any[] | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [researchResult, setResearchResult] = useState<any>(null);

  // --- Discovery Module State ---
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResult, setGlobalResult] = useState<any>(null);

  // --- V13: Volatility & Realtime State ---
  const [socketAlert, setSocketAlert] = useState<any>(null);
  const [socketStatus, setSocketStatus] = useState<'disconnected' | 'connected'>('disconnected');

  // --- Init & Effects ---
  useEffect(() => {
    fetchHistoryMarks();
    fetchCardsData(); // Initial card load

    // V13: Establish Realtime Pulse Connection
    const socket = io('/realtime');
    
    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));
    
    socket.on('volatility_pulse', (data) => {
      console.log('Pulse detected:', data);
      setSocketAlert(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'gainers') {
      fetchTableData();
    }
  }, [activeTab, selectedTime, filterDate, tablePage]);

  // --- API Handlers ---
  const fetchHistoryMarks = async () => {
    try {
      const resp = await fetch('/api/admin/gainers/history-marks');
      const data = await resp.json();
      if (data.success) setHistoryMarks(data.data);
    } catch (e) {}
  };

  const availableTimes = useMemo(() => {
    if (!filterDate) return [];
    return historyMarks.filter(m => m.startsWith(filterDate));
  }, [historyMarks, filterDate]);

  const fetchCardsData = async () => {
    try {
      const resp = await fetch('/api/admin/gainers/latest');
      const data = await resp.json();
      if (data.success) {
        setCardsData(data.data.slice(0, 10));
        if (data.snapshotTime) setLastSnapshotTime(data.snapshotTime);
      }
    } catch (e) {}
  };

  const fetchTableData = async () => {
    setRefreshing(true);
    try {
      const url = `/api/admin/gainers/historical-list?page=${tablePage}&pageSize=10${filterDate ? `&date=${filterDate}` : ''}${selectedTime ? `&time=${selectedTime}` : ''}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.success) {
        setTableData(data.data);
        setTableTotal(data.total);
      }
    } catch (e) {} finally {
      setRefreshing(false);
    }
  };

  const handleResearchDiscover = async () => {
    if (!symbol) return;
    setLoading(true);
    setDiscoveryCandidates(null);
    setResearchResult(null);
    try {
      const resp = await fetch('/api/admin/research/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const data = await resp.json();
      if (data.success) setDiscoveryCandidates(data.data);
    } finally {
      setLoading(false);
    }
  };

  const handleDeepAnalyze = async (candidate: any) => {
    setAnalysisLoading(true);
    setDiscoveryCandidates(null);
    try {
      const resp = await fetch('/api/admin/research/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: candidate.symbol,
          name: candidate.name,
          anchor: candidate.recent_activity
        }),
      });
      const data = await resp.json();
      if (data.success) setResearchResult(data.data);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleGlobalDiscovery = async () => {
    if (!globalQuery) return;
    setLoading(true);
    setGlobalResult(null);
    try {
      const resp = await fetch('/api/admin/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: globalQuery }),
      });
      const data = await resp.json();
      if (data.success) setGlobalResult(data.data);
    } finally {
      setLoading(false);
    }
  };

  const renderSidebar = () => (
    <aside className="w-60 flex-shrink-0 border-r border-white/5 bg-black/95 flex flex-col z-20">
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
        <button 
          onClick={() => setActiveTab('gainers')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'gainers' ? 'bg-zinc-800/80 text-white shadow-lg border border-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
        >
          <Activity className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest uppercase">涨幅监控</span>
        </button>
        <button 
          onClick={() => setActiveTab('research')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'research' ? 'bg-zinc-800/80 text-white shadow-lg border border-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
        >
          <Shield className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest uppercase">代币调研</span>
        </button>
        <button 
          onClick={() => setActiveTab('discovery')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'discovery' ? 'bg-zinc-800/80 text-white shadow-lg border border-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest uppercase">全链检索</span>
        </button>
        <button 
          onClick={() => setActiveTab('volatility')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'volatility' ? 'bg-zinc-800/80 text-white shadow-lg border border-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
        >
          <Bell className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest uppercase">异常波动</span>
        </button>
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

  const renderGainers = () => (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
               REAL-TIME PULSE
            </div>
            <h2 className="text-4xl premium-header text-white uppercase leading-none">Market Gainer Center</h2>
            {lastSnapshotTime && (
              <div className="text-[10px] font-black tracking-[0.2em] text-zinc-600 uppercase italic ml-1">
                Latest Archive: {new Date(lastSnapshotTime).toLocaleDateString()} {new Date(lastSnapshotTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (BJ)
              </div>
            )}
          </div>
          <button 
            onClick={fetchCardsData}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Latest
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {cardsData.map((item, i) => (
            <div key={i} className="glass-card group p-5 rounded-3xl transition-all border border-white/5 hover:border-indigo-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tight italic">RANK #{i + 1}</span>
                  <TrendingUp className="w-3 h-3 text-indigo-500" />
                </div>
                <div className="text-xl premium-header text-white mb-1 uppercase tracking-tighter">{item.symbol}</div>
                <div className="text-[9px] text-zinc-500 font-bold mb-4 uppercase tracking-widest italic">${parseFloat(item.lastPrice).toLocaleString()}</div>
              </div>

              {/* V13: Volatility Matrix */}
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {['5m', '15m', '1h', '4h'].map(inv => (
                  <div key={inv} className="bg-black/40 rounded-lg p-1.5 border border-white/5 flex flex-col items-center">
                    <span className="text-[7px] text-zinc-600 font-black uppercase mb-0.5">{inv}</span>
                    <span className={`text-[10px] font-black italic tracking-tighter ${item.volatility?.[inv] >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {item.volatility?.[inv] >= 0 ? '+' : ''}{item.volatility?.[inv] || 0}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">24H Change</div>
                <div className={`text-sm font-black italic tracking-tighter ${parseFloat(item.priceChangePercent) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {parseFloat(item.priceChangePercent) >= 0 ? '+' : ''}{parseFloat(item.priceChangePercent).toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">Historical Snapshot Stream</h3>
          
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
              <select 
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setSelectedTime('');
                  setTablePage(1);
                }}
                className="bg-black/40 border border-white/5 rounded-lg pl-8 pr-6 py-2 text-[9px] font-black text-zinc-500 outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none tracking-widest"
              >
                <option value="">NO DATE FILTER</option>
                {[...new Set(historyMarks.map(m => m.split('T')[0]))].map(d => (
                  <option key={d} value={d}>{d.replace(/-/g, '/')}</option>
                ))}
              </select>
            </div>
            {filterDate && (
              <div className="relative group animate-in slide-in-from-left-2 duration-300">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                <select 
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="bg-black/40 border border-white/5 rounded-lg pl-8 pr-6 py-2 text-[9px] font-black text-zinc-500 outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none tracking-widest"
                >
                  <option value="">ALL TIMES</option>
                  {availableTimes.map(t => (
                    <option key={t} value={t}>{new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (BJ)</option>
                  ))}
                </select>
              </div>
            )}
            <button 
              onClick={fetchTableData}
              className="p-2.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-lg text-zinc-600 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="glass-card rounded-[1.25rem] overflow-hidden border border-white/5 shadow-inner">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-700">Index</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-700">Security</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-700">Price</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-700 text-center">∆ 24H</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-700 text-right">Moment (BJ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tableData.map((item, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-all group">
                    <td className="px-8 py-4">
                      <span className="text-[9px] font-black text-zinc-700">#{i + 1 + (tablePage - 1) * 10}</span>
                    </td>
                    <td className="px-8 py-4 font-black italic text-zinc-200 uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                      {item.symbol}
                    </td>
                    <td className="px-8 py-4 text-[11px] font-mono text-zinc-500">
                      ${parseFloat(item.lastPrice).toLocaleString()}
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className={`text-[11px] font-black italic flex items-center justify-center gap-1 ${parseFloat(item.priceChangePercent) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {parseFloat(item.priceChangePercent) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(parseFloat(item.priceChangePercent)).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <span className="text-[10px] text-zinc-500 font-black italic">{new Date(item.observationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       <span className="text-[9px] text-zinc-700 ml-2 font-bold">{new Date(item.observationTime).toLocaleDateString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-8 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between">
            <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">RECORDS: {tableTotal}</div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setTablePage(p => Math.max(1, p - 1))}
                disabled={tablePage === 1}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-600 hover:text-white disabled:opacity-10 transition-all font-black uppercase text-[9px]"
              >
                Prev
              </button>
              <span className="text-[9px] font-black text-zinc-500 px-3 py-1 bg-white/5 rounded-lg">P.{tablePage}</span>
              <button 
                onClick={() => setTablePage(p => p + 1)}
                disabled={tableData.length < 10}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-600 hover:text-white disabled:opacity-10 transition-all font-black uppercase text-[9px]"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <div className="absolute inset-0 glow-bg animate-drift opacity-60 z-0 pointer-events-none" />

      {renderSidebar()}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent z-10">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-10 flex-shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em]">
            <span className="text-zinc-700 uppercase">Terminal</span>
            <ChevronRight className="w-3 h-3 text-zinc-800" />
            <span className="text-zinc-300 uppercase italic">
              {activeTab === 'gainers' ? 'Market Gainer Monitor' : 
               activeTab === 'research' ? 'Neural Audit' : 'Chain Explorer'}
            </span>
          </div>
          <div className="text-[9px] font-black text-zinc-700 tracking-[0.4em] uppercase px-4 py-2 border border-white/5 rounded-xl bg-white/5">
            PRO.v1
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-zinc-900 scroll-smooth">
          {activeTab === 'gainers' && renderGainers()}

          {activeTab === 'volatility' && (
            <div className="max-w-6xl space-y-8 animate-in fade-in duration-700 pb-20">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[9px] font-black text-rose-400 uppercase tracking-widest">
                   {socketStatus === 'connected' ? 'LIVE PULSE ACTIVE' : 'RECONNECTING...'}
                </div>
                <h2 className="text-4xl premium-header text-white uppercase leading-none">Scout: Anomaly Search</h2>
              </div>
              <AnomalyVolatility socketAlert={socketAlert} />
            </div>
          )}

          {activeTab === 'research' && (
            <div className="max-w-4xl space-y-8 animate-in fade-in duration-700 pb-20">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                   SYSTEM READY
                </div>
                <h2 className="text-4xl premium-header text-white uppercase leading-none">Neural Token Audit</h2>
              </div>

              <div className="flex items-end gap-5 p-10 rounded-[2rem] bg-white/5 border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/5 blur-[80px] rounded-full" />
                <div className="flex-1 space-y-3 relative z-10">
                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.5em] ml-2">Target Identifier</label>
                  <input 
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. PNUT, SOL, PEPE"
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-lg font-black text-white placeholder:text-zinc-800 outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner tracking-tight"
                  />
                </div>
                <button 
                  onClick={handleResearchDiscover}
                  disabled={loading || !symbol}
                  className="px-8 py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 rounded-2xl text-white text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-2xl shadow-indigo-600/30 active:scale-[0.97] transition-all relative z-10 border border-white/10"
                >
                  <Search className="w-4 h-4" />
                  Initiate
                </button>
              </div>

              {discoveryCandidates && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-700 text-left">
                  {discoveryCandidates.map((c, i) => (
                    <div key={i} className="glass-card p-8 rounded-3xl hover:border-indigo-500/40 transition-all group shadow-xl">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h4 className="text-xl premium-header text-white uppercase tracking-tighter">{c.name}</h4>
                          <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest font-mono">{c.ecosystem}</span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600 italic mb-8 leading-relaxed font-bold tracking-tight">{c.summary}</p>
                      <button 
                        onClick={() => handleDeepAnalyze(c)}
                        className="w-full py-3.5 bg-zinc-900 border border-white/5 group-hover:bg-indigo-600 group-hover:border-indigo-500 rounded-xl text-[9px] font-black uppercase tracking-[0.5em] transition-all text-zinc-500 group-hover:text-white"
                      >
                        Launch Analysis
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {analysisLoading && (
                <div className="py-20 flex flex-col items-center justify-center space-y-8 animate-in fade-in">
                  <div className="relative">
                    <BrainCircuit className="w-12 h-12 text-indigo-500 animate-pulse" />
                    <div className="absolute inset-0 bg-indigo-500/30 blur-[30px] rounded-full" />
                  </div>
                  <div className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.7em]">Compiling Intelligence...</div>
                </div>
              )}

              {researchResult && (
                <div className="space-y-6 animate-in zoom-in-95 duration-700">
                  {/* Global Header */}
                  <div className="p-10 rounded-[2.5rem] glass-card shadow-2xl relative overflow-hidden text-left">
                    <div className="flex justify-between items-center mb-8 relative z-10">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                           <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-[9px] font-black text-white uppercase tracking-widest">VERIFIED</span>
                           <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest font-mono">Agent v5.1-INTEL</span>
                        </div>
                        <h2 className="text-5xl premium-header text-white leading-none uppercase">{researchResult.name}</h2>
                      </div>
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]" />
                    </div>

                    {/* Market Stats Grid - NEW V5 Improvement */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/5">
                      <div className="space-y-1">
                        <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">TGE Date</div>
                        <div className="text-xs font-black text-indigo-400 italic uppercase">{researchResult.tokenomics?.tge_date || 'Unknown'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Total Supply</div>
                        <div className="text-xs font-black text-white italic">{researchResult.tokenomics?.total_supply || 'N/A'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Initial Circulation</div>
                        <div className="text-xs font-black text-white italic">{researchResult.tokenomics?.initial_circulating_supply || 'N/A'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Circ Ratio</div>
                        <div className="text-xs font-black text-emerald-400 italic">{researchResult.tokenomics?.initial_circulating_percentage || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
                    {/* Project & Tech */}
                    <div className="space-y-6 flex flex-col">
                      <div className="flex-1 p-8 rounded-3xl glass-card">
                        <h3 className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-6 italic">
                          <Shield className="w-3.5 h-3.5" /> Project Core
                        </h3>
                        <p className="text-zinc-400 leading-relaxed italic font-bold text-sm tracking-tight">{researchResult.project_info?.summary}</p>
                      </div>

                      {/* Token Allocation - NEW V5 Improvement */}
                      <div className="p-8 rounded-3xl glass-card">
                        <h3 className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-6 italic">
                          <PieChart className="w-3.5 h-3.5" /> Token Allocation
                        </h3>
                        <div className="space-y-3">
                          {researchResult.tokenomics?.allocation?.map((a: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-[11px] font-black">
                              <span className="text-zinc-500 uppercase tracking-tighter">{a.category}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-zinc-700 animate-pulse">{a.amount}</span>
                                <span className="text-white italic">{a.percentage}</span>
                              </div>
                            </div>
                          ))}
                          {!researchResult.tokenomics?.allocation && (
                            <div className="text-[10px] text-zinc-700 italic">No detailed allocation found.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timeline & Unlocks */}
                    <div className="space-y-6 flex flex-col">
                      {/* Unlock Schedule - NEW V5 Improvement */}
                      {researchResult.tokenomics?.unlock_schedule && researchResult.tokenomics.unlock_schedule.length > 0 && (
                        <div className="p-8 rounded-3xl glass-card border-indigo-500/10">
                          <h3 className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-6 italic">
                            <Lock className="w-3.5 h-3.5" /> Unlock Milestones
                          </h3>
                          <div className="space-y-4">
                            {researchResult.tokenomics?.unlock_schedule?.map((u: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-[10px] font-black pb-2 border-b border-white/5 last:border-0 last:pb-0">
                                <div className="space-y-0.5">
                                  <div className="text-zinc-300 uppercase">{u.milestone}</div>
                                  <div className="text-zinc-700 text-[8px] font-mono">{u.date}</div>
                                </div>
                                <span className="text-emerald-500 italic uppercase">+{u.amount_unlocked}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex-1 p-8 rounded-3xl glass-card">
                        <h3 className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-6 italic">
                          <Zap className="w-3.5 h-3.5" /> Discovery Node
                        </h3>
                        <div className="space-y-4">
                          {researchResult.listing_timeline?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-[10px] font-black pb-3 border-b border-white/5 last:border-0 last:pb-0">
                              <span className="text-zinc-600 uppercase font-mono">{item.date}</span>
                              <span className="text-zinc-300 italic uppercase">{item.exchange}</span>
                              <span className="text-indigo-500 uppercase tracking-tighter">{item.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'discovery' && (
            <div className="max-w-3xl space-y-12 animate-in fade-in duration-700">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                   TERMINAL READY
                </div>
                <h2 className="text-4xl premium-header text-white uppercase leading-none">Global On-Chain Feed</h2>
              </div>

              <div className="flex items-end gap-5 p-10 rounded-[2rem] bg-white/5 border border-white/5 shadow-2xl relative backdrop-blur-3xl overflow-hidden">
                <div className="flex-1 space-y-3 relative z-10">
                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.5em] ml-2">Target Identifier</label>
                  <input 
                    value={globalQuery}
                    onChange={(e) => setGlobalQuery(e.target.value)}
                    placeholder="Token Address or Query"
                    className="w-full bg-black/70 border border-white/10 rounded-2xl px-8 py-5 text-xl font-bold text-white resize-none outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-800"
                  />
                </div>
                <button 
                  onClick={handleGlobalDiscovery}
                  disabled={loading || !globalQuery}
                  className="px-10 py-6 bg-zinc-900 hover:bg-indigo-600 border border-white/10 rounded-2xl flex items-center gap-3 transition-all group group-hover:shadow-[0_0_30px_rgba(79,70,229,0.3)]"
                >
                  <Search className="w-5 h-5 text-white" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 group-hover:text-white">Audit</span>
                </button>
              </div>

              {globalResult && (
                <div className="p-12 rounded-[2.5rem] glass-card animate-in zoom-in-95 shadow-inner text-left">
                   <div className="flex items-center gap-4 mb-8">
                     <div className="h-px flex-1 bg-white/5" />
                     <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.5em] italic">Scan Result</span>
                     <div className="h-px flex-1 bg-white/5" />
                   </div>
                   <div className="prose prose-invert max-w-none text-zinc-400 italic whitespace-pre-wrap leading-loose font-bold tracking-tight text-base">
                     {typeof globalResult === 'string' ? globalResult : JSON.stringify(globalResult, null, 2)}
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
