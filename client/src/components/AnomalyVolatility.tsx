import React, { useState, useEffect } from 'react';
import { Activity, Trash2, Plus, Zap, Clock, TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface Alert {
  id: number;
  symbol: string;
  changePercent: string;
  priceAtAlert: string;
  direction: string;
  timestamp: string;
}

interface WatchlistItem {
  id: number;
  symbol: string;
  source: 'auto' | 'manual';
  lastPrice: string | null;
}

export const AnomalyVolatility: React.FC<{ socketAlert: any }> = ({ socketAlert }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  
  // V13.3: Pagination & Filter State
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAlerts, setTotalAlerts] = useState(0);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [filterDate, page]);

  // Sync real-time alert from socket (only prepends if on page 1 and no date filter)
  useEffect(() => {
    if (socketAlert && page === 1 && !filterDate) {
      setAlerts(prev => [socketAlert, ...prev].slice(0, 20));
      setTotalAlerts(prev => prev + 1);
    }
  }, [socketAlert]);

  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/admin/watchlist');
      const data = await res.json();
      if (data.success) setWatchlist(data.data);
    } catch (e) {}
  };

  const fetchAlerts = async () => {
    try {
      const url = `/api/admin/volatility/alerts?page=${page}&pageSize=10${filterDate ? `&date=${filterDate}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data);
        setTotalPages(data.totalPages);
        setTotalAlerts(data.total);
      }
    } catch (e) {}
  };

  const addToWatchlist = async () => {
    if (!newSymbol) return;
    setLoading(true);
    try {
      await fetch('/api/admin/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: newSymbol.toUpperCase() }),
      });
      setNewSymbol('');
      fetchWatchlist();
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    try {
      await fetch(`/api/admin/watchlist/${symbol}`, { method: 'DELETE' });
      fetchWatchlist();
    } catch (e) {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Left: Watchlist Management */}
      <div className="lg:col-span-1 space-y-4">
        <div className="glass-card p-6 rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Observation Pool</h3>
            <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          </div>
          
          <div className="flex gap-2 mb-6">
            <input 
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="e.g. BTCUSDT"
              className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <button 
              onClick={addToWatchlist}
              disabled={loading}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {watchlist.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="text-xs font-black text-white">{item.symbol}</div>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${item.source === 'auto' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {item.source}
                  </span>
                </div>
                {item.source === 'manual' && (
                  <button 
                    onClick={() => removeFromWatchlist(item.symbol)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Alerts Timeline */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 px-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-500" />
            <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Anomaly Pulse Timeline</h3>
          </div>
          {/* V13.3: Date Filter UI */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 backdrop-blur-md">
            <Calendar className="w-3 h-3 text-zinc-500" />
            <input 
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent border-none outline-none text-[10px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center rounded-3xl border border-white/5 border-dashed">
              <Clock className="w-8 h-8 text-zinc-700 mb-4" />
              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                {filterDate ? `No alerts for ${filterDate}` : 'Awaiting Volatility pulse...'}
              </div>
            </div>
          ) : (
            alerts.map((alert, i) => (
              <div 
                key={alert.id || i} 
                className={`glass-card p-5 rounded-3xl border transition-all animate-in slide-in-from-right-4 duration-500 ${
                  alert.direction === 'up' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${alert.direction === 'up' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                      {alert.direction === 'up' ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-rose-500" />}
                    </div>
                    <div>
                      <div className="text-xl font-black text-white italic tracking-tighter">{alert.symbol}</div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        {new Date(alert.timestamp).toLocaleDateString()} at {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-2xl font-black italic tracking-tighter ${alert.direction === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {alert.direction === 'up' ? '+' : ''}{alert.changePercent}%
                    </div>
                    <div className="text-[9px] font-black text-zinc-600 uppercase">PRICE: ${parseFloat(alert.priceAtAlert).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* V13.3: Pagination UI */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl backdrop-blur-xl mt-6">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">Total Logs: {totalAlerts}</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-500 hover:text-white disabled:opacity-20 transition-all text-[9px] font-black"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 text-[9px] font-black text-white italic">
                PAGE {page} / {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-500 hover:text-white disabled:opacity-20 transition-all text-[9px] font-black"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
