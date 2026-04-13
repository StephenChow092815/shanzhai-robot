import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Activity, 
  Cpu, 
  Shield, 
  Globe, 
  Loader2, 
  ChevronRight, 
  Database,
  TrendingUp,
  Clock,
  RefreshCw,
  History,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'research' | 'discovery' | 'gainers';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('gainers');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Gainer Snapshot States (For Cards)
  const [gainerData, setGainerData] = useState<any[]>([]);
  const [, setSnapshotTime] = useState<string>('');
  const [, setCaptureTime] = useState<string>('');
  const [historyMarks, setHistoryMarks] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // History Audit States (For Table)
  const [historyListData, setHistoryListData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [, setTotalItems] = useState(0);
  const pageSize = 10; 

  // 1. Fetch Snapshot for Cards
  const fetchSnapshot = async (time?: string) => {
    setLoading(true);
    try {
      const url = time ? `/api/admin/gainers/latest?time=${encodeURIComponent(time)}` : '/api/admin/gainers/latest';
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.success) {
        setGainerData(data.data);
        setSnapshotTime(data.snapshotTime);
        setCaptureTime(data.captureTime);
        if (!time) {
          setSelectedTime(data.snapshotTime);
          const dateStr = new Date(data.snapshotTime).toISOString().split('T')[0];
          setSelectedDate(dateStr);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Historical List for Table
  const fetchHistoryList = async (page: number, date?: string) => {
    setTableLoading(true);
    try {
      const url = `/api/admin/gainers/historical-list?page=${page}&pageSize=${pageSize}&date=${date || ''}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.success) {
        setHistoryListData(data.data);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTableLoading(false);
    }
  };

  const fetchHistoryMarks = async () => {
    try {
      const resp = await fetch('/api/admin/gainers/history-marks');
      const data = await resp.json();
      if (data.success) {
        setHistoryMarks(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const resp = await fetch('/api/admin/gainers/refresh', { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        setGainerData(data.data);
        setSnapshotTime(data.snapshotTime);
        setSelectedTime(data.snapshotTime);
        setSelectedDate(new Date(data.snapshotTime).toISOString().split('T')[0]);
        fetchHistoryMarks();
        fetchHistoryList(1, new Date(data.snapshotTime).toISOString().split('T')[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial Data Load
  useEffect(() => {
    if (activeTab === 'gainers') {
      fetchSnapshot();
      fetchHistoryMarks();
      fetchHistoryList(1, selectedDate);
    }
  }, [activeTab]);

  // Handle Date Change
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setCurrentPage(1);
    fetchHistoryList(1, date);
  };

  // Handle Snapshot Choice
  const handleSnapshotChange = (time: string) => {
    setSelectedTime(time);
    fetchSnapshot(time);
  };

  // Filter available times
  const availableTimesForDate = useMemo(() => {
    return historyMarks.filter(mark => mark.startsWith(selectedDate)).sort((a,b) => b.localeCompare(a));
  }, [historyMarks, selectedDate]);

  const handleAction = async () => {
    if (!input) return;
    setLoading(true);
    setResult(null);
    const endpoint = activeTab === 'research' ? '/api/admin/research' : '/api/admin/discovery';
    const body = activeTab === 'research' 
      ? { symbol: input, name: input }
      : { query: input };

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      setResult(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800/50 bg-zinc-950/50 backdrop-blur-xl flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/20">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none tracking-tight">ANTIGRAVITY</h1>
            <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-widest">Analytics Engine</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <SidebarNav
            icon={<TrendingUp className="h-4 w-4" />}
            label="涨幅监控"
            active={activeTab === 'gainers'}
            onClick={() => setActiveTab('gainers')}
          />
          <SidebarNav
            icon={<Shield className="h-4 w-4" />}
            label="代币调研"
            active={activeTab === 'research'}
            onClick={() => { setActiveTab('research'); setResult(null); setInput(''); }}
          />
          <SidebarNav
            icon={<Globe className="h-4 w-4" />}
            label="全链检索"
            active={activeTab === 'discovery'}
            onClick={() => { setActiveTab('discovery'); setResult(null); setInput(''); }}
          />
        </nav>

        <div className="mt-auto p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Database className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400">STATUS</p>
              <p className="text-[11px] text-green-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Syncing
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] bg-purple-500/5 blur-[120px] rounded-full" />

        <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-zinc-950/20 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <span>Terminal</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-zinc-300">
              {activeTab === 'research' ? 'Research Agent' : 
               activeTab === 'discovery' ? 'Chain Explorer' : 'Gainer Tracker'}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'gainers' ? (
            <div className="p-8 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent italic tracking-tighter">
                    MARKET GAINER CENTER
                  </h1>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                   <button 
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                    {refreshing ? 'REFRESHING' : 'MANUAL REFRESH'}
                  </button>
                </div>
              </div>

              {loading && gainerData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 backdrop-blur-xl">
                  <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                  <p className="text-zinc-400 font-medium tracking-widest text-[10px] uppercase text-center px-10">Initializing Neural Market Sensors...</p>
                </div>
              ) : (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {gainerData.slice(0, 10).map((coin, idx) => (
                      <div 
                        key={idx}
                        className="group relative bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50 backdrop-blur-xl hover:border-indigo-500/50 transition-all duration-300"
                      >
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                          <span className="text-3xl font-black italic tracking-tighter">#{idx + 1}</span>
                        </div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-0.5">
                             <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors tracking-tight">
                              {coin.symbol.replace('USDT', '')}
                            </h3>
                             <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Live Contract</p>
                          </div>
                          <button 
                            onClick={() => {
                              setActiveTab('research');
                              setInput(coin.symbol.replace('USDT', ''));
                              setResult(null);
                            }}
                            className="p-1.5 rounded-lg bg-zinc-900/50 text-zinc-500 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2 text-right">
                             <p className="text-2xl font-black text-emerald-500 tracking-tighter">
                              +{parseFloat(coin.priceChangePercent).toFixed(2)}%
                            </p>
                            <p className="text-[10px] font-mono font-bold text-zinc-400">
                               ${parseFloat(coin.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-zinc-950/40 rounded-[32px] border border-zinc-800/50 overflow-hidden shadow-2xl backdrop-blur-md">
                     <div className="p-6 border-b border-zinc-800/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-zinc-900/20">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                              <History className="w-5 h-5 text-indigo-400" />
                           </div>
                           <div>
                              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">Market Audit Log</h3>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">Historical Snapshot Stream</p>
                           </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                           <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-2 hover:border-zinc-700 transition-all">
                              <Calendar className="w-4 h-4 text-zinc-500" />
                              <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="bg-transparent border-none text-[11px] font-bold text-zinc-300 outline-none cursor-pointer"
                              />
                           </div>

                           <div className="relative group">
                             <select 
                               value={selectedTime || ''}
                               onChange={(e) => handleSnapshotChange(e.target.value)}
                               disabled={availableTimesForDate.length === 0}
                               className={cn(
                                 "bg-zinc-950 border border-zinc-900 rounded-xl px-5 py-2 text-[11px] font-bold text-zinc-300 outline-none cursor-pointer min-w-[140px] appearance-none hover:border-zinc-700 transition-all",
                                 availableTimesForDate.length === 0 && "opacity-50 cursor-not-allowed"
                               )}
                             >
                               <option value="" disabled>
                                 {availableTimesForDate.length === 0 ? 'No Snapshots Today' : 'Card View Mode'}
                               </option>
                               {availableTimesForDate.map(time => (
                                 <option key={time} value={time}>
                                   {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (北京)
                                 </option>
                               ))}
                             </select>
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                                <Clock className="w-3.5 h-3.5" />
                             </div>
                           </div>
                        </div>
                     </div>
                     
                     <div className="overflow-x-auto relative">
                       {tableLoading && (
                         <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                         </div>
                       )}
                       <table className="w-full text-left">
                         <thead>
                           <tr className="border-b border-zinc-900 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] bg-zinc-900/30">
                             <th className="px-8 py-5">#序号</th>
                             <th className="px-8 py-5">资产名称</th>
                             <th className="px-8 py-5">快照价格</th>
                             <th className="px-8 py-5">24H 涨幅</th>
                             <th className="px-8 py-5">观测日期</th>
                             <th className="px-8 py-5">时刻 (北京)</th>
                             <th className="px-8 py-5 text-right">深度调研</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-zinc-900/50">
                           {historyListData.map((coin, idx) => (
                             <tr key={idx} className="group hover:bg-indigo-500/[0.03] transition-colors">
                               <td className="px-8 py-4 text-xs font-bold text-zinc-600 font-mono">
                                 {String(idx + 1).padStart(2, '0')}
                               </td>
                               <td className="px-8 py-4 font-black text-white group-hover:text-indigo-400 transition-colors tracking-tight">
                                 {coin.symbol}
                               </td>
                               <td className="px-8 py-4 text-xs font-mono text-zinc-400">
                                 ${parseFloat(coin.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                               </td>
                               <td className="px-8 py-4 font-black">
                                 <span className="inline-flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md text-[11px]">
                                   <TrendingUp className="w-3 h-3" />
                                   +{parseFloat(coin.priceChangePercent).toFixed(2)}%
                                 </span>
                               </td>
                               <td className="px-8 py-4 text-[11px] font-bold text-zinc-400">
                                 {new Date(coin.observationTime).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}
                               </td>
                               <td className="px-8 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-zinc-300">
                                      {new Date(coin.observationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                               </td>
                               <td className="px-8 py-4 text-right">
                                 <button 
                                   onClick={() => {
                                     setActiveTab('research');
                                     setInput(coin.symbol.replace('USDT', ''));
                                     setResult(null);
                                   }}
                                   className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-400 transition-all"
                                 >
                                   <Search className="h-4.5 w-4.5" />
                                 </button>
                               </td>
                             </tr>
                           ))}
                           {!tableLoading && historyListData.length === 0 && (
                             <tr>
                               <td colSpan={7} className="px-8 py-24 text-center">
                                 <div className="flex flex-col items-center gap-3 opacity-30 grayscale saturate-0">
                                    <Database className="w-12 h-12 text-zinc-600" />
                                    <p className="font-black text-xs uppercase tracking-[0.3em]">No Audit Streams Decrypted</p>
                                 </div>
                               </td>
                             </tr>
                           )}
                         </tbody>
                       </table>
                     </div>

                     <div className="p-6 border-t border-zinc-900/50 flex flex-col sm:flex-row items-center justify-between bg-zinc-900/10 gap-4">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Items Per Page: <span className="text-zinc-300">{pageSize}</span> | Page {currentPage} of {totalPages || 1}
                        </p>
                        <div className="flex items-center gap-1.5">
                           <PaginationButton 
                             disabled={currentPage === 1}
                             onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchHistoryList(p, selectedDate); }}
                             icon={<ChevronLeft className="w-4 h-4" />}
                           />
                           
                           <div className="flex items-center gap-1 mx-4">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                 const pageNum = i + 1;
                                 return (
                                   <button 
                                      key={pageNum}
                                      onClick={() => { setCurrentPage(pageNum); fetchHistoryList(pageNum, selectedDate); }}
                                      className={cn(
                                        "h-8 w-8 rounded-lg text-[11px] font-black transition-all",
                                        currentPage === pageNum ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                                      )}
                                   >
                                     {pageNum}
                                   </button>
                                 )
                              })}
                           </div>

                           <PaginationButton 
                             disabled={currentPage === totalPages || totalPages === 0}
                             onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchHistoryList(p, selectedDate); }}
                             icon={<ChevronRight className="w-4 h-4" />}
                           />
                        </div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12">
               <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                  <Activity className="h-3.5 w-3.5" />
                  Terminal Ready
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter">
                  {activeTab === 'research' ? 'NEURAL TOKEN AUDIT' : 'GLOBAL ON-CHAIN FEED'}
                </h2>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 ml-1 uppercase tracking-widest">Target Identifier</label>
                  <div className="relative">
                    <input
                      className="w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-600 text-lg font-bold backdrop-blur-md italic"
                      placeholder={activeTab === 'research' ? "e.g. PNUT, SOL, PEPE" : "Token Address or Query"}
                      value={input}
                      onChange={(e) => setInput(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
                <button
                  disabled={loading || !input}
                  onClick={handleAction}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-black h-[62px] px-8 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 whitespace-nowrap"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                  {loading ? 'ANALYZING' : 'INITIATE AUDIT'}
                </button>
              </div>
              {result && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <DataCard label="AUDIT SCORE" value="88/100" sub="Standard Compliance" color="text-green-400" />
                    <DataCard label="LIQUIDITY INDEX" value="12.5%" sub="Market Stability" color="text-indigo-400" />
                    <DataCard label="THREAT LEVEL" value={result.risks?.length > 2 ? 'CRITICAL' : 'MINIMAL'} sub="Risk Profile" color="text-red-400" />
                  </div>
                  <pre className="p-8 rounded-3xl bg-zinc-950 border border-zinc-900 text-indigo-400/60 font-mono text-xs overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// UI Sub-components
function SidebarNav({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[11px] font-black transition-all group",
        active ? "bg-zinc-800 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
      )}
    >
      <div className={cn(
        "rounded-xl p-2 transition-all",
        active ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-600/20" : "bg-zinc-900 text-zinc-600 group-hover:text-zinc-300"
      )}>
        {icon}
      </div>
      <span className="tracking-[0.1em] uppercase">{label}</span>
    </button>
  );
}

function PaginationButton({ disabled, onClick, icon }: any) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-20 text-zinc-400 transition-all shadow-md active:scale-95"
    >
      {icon}
    </button>
  )
}

function DataCard({ label, value, sub, color }: any) {
  return (
    <div className="rounded-[32px] border border-zinc-800/50 bg-zinc-900/40 p-8 hover:border-zinc-700 transition-all backdrop-blur-md relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-3 group-hover:scale-110 transition-transform">
         <TrendingUp className="w-12 h-12" />
      </div>
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">{label}</p>
      <div className={cn("text-4xl font-black tracking-tighter mb-2", color)}>{value}</div>
      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest italic">{sub}</p>
    </div>
  );
}
