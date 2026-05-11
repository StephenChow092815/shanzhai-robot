import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export function GainerMonitor({ onTradeAnalyze }: { onTradeAnalyze?: (symbol: string) => void }) {
  const [, setHistoryMarks] = useState<string[]>([]);
  const [filterDate] = useState<string>('');
  const [selectedTime] = useState<string>('');
  const [, setLastSnapshotTime] = useState<string>('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');
  const [cardsData, setCardsData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tablePage] = useState(1);
  const [, setTableTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistoryMarks();
    fetchCardsData();
    const timer = window.setInterval(fetchCardsData, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTableData();
  }, [selectedTime, filterDate, tablePage]);

  const fetchHistoryMarks = async () => {
    try {
      const resp = await fetch('/api/admin/gainers/history-marks');
      const data = await resp.json();
      if (data.success) setHistoryMarks(data.data);
    } catch (e) { }
  };

  const fetchCardsData = async () => {
    try {
      const resp = await fetch('/api/admin/gainers/latest');
      const data = await resp.json();
      if (data.success) {
        setCardsData(data.data.slice(0, 10));
        if (data.snapshotTime) setLastSnapshotTime(data.snapshotTime);
        if (data.updatedAt) setLastUpdatedAt(data.updatedAt);
      }
    } catch (e) { }
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
    } catch (e) { } finally {
      setRefreshing(false);
    }
  };

  const formatPrice = (value: any) => {
    const price = parseFloat(value);
    if (Number.isNaN(price)) return '--';
    return price < 1
      ? price.toLocaleString(undefined, { maximumFractionDigits: 8 })
      : price.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const formatChange = (value: any) => {
    const change = parseFloat(value);
    if (Number.isNaN(change)) return '--';
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  const getChangeClass = (value: any) => {
    const change = parseFloat(value);
    if (Number.isNaN(change)) return 'text-zinc-600';
    return change >= 0 ? 'text-emerald-400' : 'text-rose-400';
  };

  const intervalLabels = [
    ['15m', '15M'],
    ['1h', '1H'],
    ['4h', '4H'],
    ['1d', '1D'],
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20 md:pb-0">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest">REAL-TIME PULSE</div>
            <h2 className="text-3xl md:text-4xl premium-header text-white uppercase leading-none">Market Gainer Center</h2>
            {lastUpdatedAt && (
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed">
                最新价格每 10 秒刷新 · {new Date(lastUpdatedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
          <button onClick={fetchCardsData} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Latest
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {cardsData.map((item, i) => (
            <div key={i} className="glass-card group p-4 md:p-5 rounded-3xl border border-white/5 hover:border-indigo-500/30">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-lg md:text-xl premium-header text-white mb-1 uppercase truncate">{item.symbol}</div>
                <button
                  onClick={() => onTradeAnalyze?.(item.symbol)}
                  className="shrink-0 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-[9px] font-black text-indigo-200 uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
                >
                  交易
                </button>
              </div>
              <div className="text-[9px] text-zinc-500 font-bold mb-1 italic">快照 ${formatPrice(item.lastPrice)}</div>
              <div className="text-sm text-white font-black mb-4">${formatPrice(item.realtimePrice || item.lastPrice)}</div>
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className={`text-sm font-black italic ${parseFloat(item.priceChangePercent) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {parseFloat(item.priceChangePercent) >= 0 ? '+' : ''}{parseFloat(item.priceChangePercent).toFixed(2)}%
                </div>
                <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">24H</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {intervalLabels.map(([key, label]) => (
                  <div key={key} className="rounded-xl border border-white/5 bg-black/30 px-3 py-2 min-w-0">
                    <div className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">{label}</div>
                    <div className={`text-[11px] font-black whitespace-nowrap ${getChangeClass(item.intervalChanges?.[key] ?? item.volatility?.changes?.[key])}`}>
                      {formatChange(item.intervalChanges?.[key] ?? item.volatility?.changes?.[key])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card rounded-[1.25rem] overflow-hidden border border-white/5 shadow-inner">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-4 md:px-8 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-700">Symbol</th>
                <th className="px-4 md:px-8 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-700">Price</th>
                <th className="px-4 md:px-8 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-700 text-center">∆ 24H</th>
                <th className="px-4 md:px-8 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-700 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tableData.map((item, i) => (
                <tr key={i} className="hover:bg-white/5 transition-all">
                  <td className="px-4 md:px-8 py-4 font-black italic text-zinc-200 uppercase">{item.symbol}</td>
                  <td className="px-4 md:px-8 py-4 text-[11px] font-mono text-zinc-500">${parseFloat(item.lastPrice).toLocaleString()}</td>
                  <td className="px-4 md:px-8 py-4 text-center">
                    <div className={`text-[11px] font-black italic ${parseFloat(item.priceChangePercent) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {parseFloat(item.priceChangePercent).toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-4 text-right text-[10px] text-zinc-500">{new Date(item.observationTime).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
