import { useEffect, useState } from 'react';
import { Activity, BarChart3, Gauge, MessageCircle, Newspaper, Search } from 'lucide-react';

const stripHtml = (value: any) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const getBody = (item: any) => {
  return [item.title, item.summary, item.content, item.text, item.body, item.message, item.description]
    .map(stripHtml)
    .find(Boolean) || '暂无正文';
};

const formatValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '--';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return number.toLocaleString(undefined, { maximumFractionDigits: 4 });
};

const formatPercent = (value: any, scale = 1) => {
  if (value === null || value === undefined || value === '') return '--';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return `${(number * scale).toLocaleString(undefined, { maximumFractionDigits: 4 })}%`;
};

const metricTone = (value: any, positiveWhenAboveZero = true) => {
  const number = Number(value);
  if (Number.isNaN(number)) return 'text-zinc-400';
  const positive = positiveWhenAboveZero ? number >= 0 : number <= 0;
  return positive ? 'text-emerald-300' : 'text-rose-300';
};

const decisionClass: Record<string, string> = {
  LONG: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  SHORT: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  WAIT: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

export function TokenResearch({ initialSymbol = '' }: { initialSymbol?: string }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialSymbol && initialSymbol !== symbol) setSymbol(initialSymbol);
  }, [initialSymbol]);

  useEffect(() => {
    if (initialSymbol) analyze(initialSymbol);
  }, [initialSymbol]);

  const analyze = async (targetSymbol = symbol) => {
    if (!targetSymbol) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const resp = await fetch('/api/admin/trade/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: targetSymbol.toUpperCase() }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'analysis failed');
      setResult(data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const analysis = result?.analysis;
  const sources = result?.sources || {};
  const cex = sources.cex || {};
  const derivatives = cex.derivatives || {};
  const dex = sources.dex || {};
  const newsItems = sources.openNews?.items || [];
  const twitterItems = sources.openTwitter?.items || [];

  return (
    <div className="max-w-6xl space-y-8 animate-in fade-in duration-700 pb-20 md:pb-0">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
            TRADE DECISION ENGINE
          </div>
          <h2 className="text-3xl md:text-4xl premium-header text-white uppercase leading-none">代币交易分析</h2>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="例如 LABUSDT"
            className="w-full sm:w-56 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-white outline-none"
          />
          <button
            onClick={() => analyze()}
            disabled={loading || !symbol}
            className="inline-flex justify-center px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-[10px] font-black uppercase tracking-widest items-center gap-2 disabled:opacity-50"
          >
            <Search className="w-4 h-4" /> 分析
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-20 text-center text-zinc-700 uppercase tracking-widest animate-pulse font-black">
          正在调用 OpenNews / OpenTwitter / CEX / DEX 并生成交易判断...
        </div>
      )}

      {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">{error}</div>}

      {analysis && (
        <section className="glass-card rounded-3xl border border-white/5 p-5 md:p-8 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">{analysis.symbol || symbol}</div>
              <h3 className="text-xl md:text-2xl font-black text-white leading-snug">{analysis.summary}</h3>
            </div>
            <div className={`w-full md:w-auto rounded-2xl border px-6 py-4 text-center ${decisionClass[analysis.decision] || decisionClass.WAIT}`}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-1">建议</div>
              <div className="text-3xl font-black">{analysis.decision}</div>
              <div className="text-[10px] font-bold opacity-70">置信度 {analysis.confidence ?? 0}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              ['做多依据', analysis.long_thesis],
              ['做空依据', analysis.short_thesis],
              ['等待条件', analysis.wait_conditions],
            ].map(([title, items]: any) => (
              <div key={title} className="rounded-2xl border border-white/5 bg-black/30 p-5">
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">{title}</h4>
                <div className="space-y-2">
                  {(items || []).map((item: string, index: number) => (
                    <p key={index} className="text-xs text-zinc-400 leading-relaxed">{item}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/30 p-5">
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">交易计划</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                ['方向', analysis.trade_plan?.bias],
                ['入场', analysis.trade_plan?.entry],
                ['失效', analysis.trade_plan?.invalidated_if],
                ['风控', analysis.trade_plan?.risk_note],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">{label}</div>
                  <div className="text-xs text-zinc-300 leading-relaxed">{value || '--'}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {result && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="glass-card rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-emerald-300" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">CEX 交易数据</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['交易场所', cex.venue],
                ['实时价格', `$${formatValue(cex.currentPrice || cex.lastPrice)}`],
                ['24H', `${formatValue(cex.priceChangePercent24h)}%`],
                ['24H 成交额', `$${formatValue(cex.quoteVolume24h)}`],
                ['15M', `${formatValue(cex.intervalChanges?.['15m'])}%`],
                ['1H', `${formatValue(cex.intervalChanges?.['1h'])}%`],
                ['4H', `${formatValue(cex.intervalChanges?.['4h'])}%`],
                ['1D', `${formatValue(cex.intervalChanges?.['1d'])}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/5 bg-black/30 p-4">
                  <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">{label}</div>
                  <div className="text-sm font-black text-white break-words">{value || '--'}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-2xl border border-fuchsia-500/15 bg-fuchsia-500/[0.03] p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-fuchsia-300" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">订单流 / 衍生品指标</h3>
            </div>
            {derivatives ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ['OI 当前', formatValue(derivatives.openInterest), derivatives.openInterest],
                    ['OI 1H变化', formatPercent(derivatives.openInterestChange1hPercent), derivatives.openInterestChange1hPercent],
                    ['Funding', formatPercent(derivatives.fundingRate, 100), derivatives.fundingRate],
                    ['Taker买卖比', formatValue(derivatives.takerBuySellRatio1h), (derivatives.takerBuySellRatio1h || 1) - 1],
                    ['CVD 15M(USDT)', formatValue(derivatives.cvdQuote15m), derivatives.cvdQuote15m],
                    ['CVD 1H(USDT)', formatValue(derivatives.cvdQuote1h), derivatives.cvdQuote1h],
                    ['买盘占比15M', formatPercent(derivatives.cvdBuyRatio15m, 100), (derivatives.cvdBuyRatio15m || 0.5) - 0.5],
                    ['买盘占比1H', formatPercent(derivatives.cvdBuyRatio1h, 100), (derivatives.cvdBuyRatio1h || 0.5) - 0.5],
                  ].map(([label, value, toneValue]: any) => (
                    <div key={label} className="rounded-xl border border-white/5 bg-black/30 p-4">
                      <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">{label}</div>
                      <div className={`text-sm font-black break-words ${metricTone(toneValue)}`}>{value || '--'}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-xs text-zinc-500 leading-relaxed">
                  CVD 为主动买入量减主动卖出量的近似值。OI 上升且 CVD 为正通常代表多头增仓更健康；价格上涨但 CVD 为负或资金费率过热时，需要警惕诱多和多头拥挤。
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white/5 bg-black/30 p-5 text-sm text-zinc-500">该交易对未返回 Futures 衍生品指标。</div>
            )}
          </section>

          <section className="glass-card rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.03] p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-cyan-300" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">DEX 流动性数据</h3>
            </div>
            {dex ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['主链', dex.masterChainId],
                  ['名称', dex.name],
                  ['DEX 价格', `$${formatValue(dex.priceUsd)}`],
                  ['流动性', `$${formatValue(dex.liquidityUsd)}`],
                  ['24H 成交额', `$${formatValue(dex.volume24hUsd)}`],
                  ['置信度', `${formatValue((dex.confidenceScore || 0) * 100)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/5 bg-black/30 p-4">
                    <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">{label}</div>
                    <div className="text-sm font-black text-white break-words">{value || '--'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-black/30 p-5 text-sm text-zinc-500">未找到 DEX 数据。</div>
            )}
          </section>

          <EvidencePanel icon={<Newspaper className="w-5 h-5 text-amber-300" />} title="OpenNews 新闻与市场信号" items={newsItems} accent="amber" />
          <EvidencePanel icon={<MessageCircle className="w-5 h-5 text-indigo-300" />} title="OpenTwitter 情绪证据" items={twitterItems} accent="indigo" />
        </div>
      )}
    </div>
  );
}

function EvidencePanel({ icon, title, items, accent }: { icon: any; title: string; items: any[]; accent: 'amber' | 'indigo' }) {
  const color = accent === 'amber' ? 'border-amber-500/15 bg-amber-500/[0.03]' : 'border-indigo-500/15 bg-indigo-500/[0.03]';

  return (
    <section className={`glass-card rounded-2xl border ${color} p-5 md:p-6 space-y-4`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
        </div>
        <span className="text-[10px] font-black text-zinc-600">{items.length} 条</span>
      </div>
      <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
        {items.length > 0 ? items.slice(0, 12).map((item, index) => {
          const body = getBody(item).replace(/https?:\/\/\S+/g, '').trim();
          const link = item.url || item.link || getBody(item).match(/https?:\/\/\S+/)?.[0];
          return (
            <article key={`${link || item.id || index}`} className="rounded-xl border border-white/5 bg-black/30 p-4">
              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">
                {stripHtml(item.source || item.site || item.author || item.username || 'source')}
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{body || '暂无正文'}</p>
              {link && <a href={link} target="_blank" rel="noreferrer" className="mt-3 block truncate text-[10px] font-bold text-indigo-300 hover:underline">{link}</a>}
            </article>
          );
        }) : (
          <div className="rounded-xl border border-white/5 bg-black/30 p-5 text-sm text-zinc-500">暂无数据。</div>
        )}
      </div>
    </section>
  );
}
