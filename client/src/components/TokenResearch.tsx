import { useEffect, useState } from 'react';
import { BarChart3, ExternalLink, Globe2, MessageCircle, Newspaper, Search, ShieldAlert, Users } from 'lucide-react';

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

const formatRatioPercent = (value: any) => {
  if (value === null || value === undefined || value === '') return '--';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return `${(number * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
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
  const binanceOi = sources.binanceOi || {};
  const oiTimeframes = binanceOi.timeframes || {};
  const coinGecko = sources.coinGecko || null;
  const cgLinks = coinGecko?.links || {};
  const ave = sources.ave || null;
  const aveSummary = ave?.summary || {};
  const aveRisk = ave?.risk || {};
  const aveConcentration = ave?.holders?.concentration || {};
  const aveChanges = ave?.klines?.intervalChanges || {};
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
          正在调用 Ave / Binance OI / OpenNews / OpenTwitter 并生成交易判断...
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
          <section className="glass-card rounded-2xl border border-sky-500/15 bg-sky-500/[0.03] p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Globe2 className="w-5 h-5 text-sky-300" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">CoinGecko 项目资料</h3>
            </div>
            {coinGecko ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ['项目', `${coinGecko.name || '--'} (${coinGecko.symbol || '--'})`],
                    ['CoinGecko ID', coinGecko.id],
                    ['市值', `$${formatValue(coinGecko.mcap)}`],
                    ['FDV', `$${formatValue(coinGecko.fdv)}`],
                    ['流通量', formatValue(coinGecko.circulating_supply)],
                    ['总供应', formatValue(coinGecko.total_supply)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/5 bg-black/30 p-4">
                      <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">{label}</div>
                      <div className="text-sm font-black text-white break-words">{value || '--'}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['官网', cgLinks.homepage],
                    ['Twitter/X', cgLinks.twitter_url],
                    ['Telegram', cgLinks.telegram_url],
                    ['Reddit', cgLinks.subreddit_url],
                  ].filter(([, url]) => Boolean(url)).map(([label, url]) => (
                    <a
                      key={label}
                      href={url as string}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-sky-200 hover:border-sky-300/40"
                    >
                      {label} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ))}
                  {cgLinks.twitter_screen_name && (
                    <span className="rounded-xl border border-white/5 bg-black/30 px-3 py-2 text-[10px] font-black text-zinc-400">
                      @{cgLinks.twitter_screen_name}
                    </span>
                  )}
                </div>
                {coinGecko.description && (
                  <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-xs text-zinc-400 leading-relaxed">
                    {stripHtml(coinGecko.description)}
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-white/5 bg-black/30 p-5 text-sm text-zinc-500">CoinGecko 未找到匹配项目资料。</div>
            )}
          </section>

          <section className="glass-card rounded-2xl border border-orange-500/15 bg-orange-500/[0.03] p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-orange-300" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Ave 链上分析</h3>
              </div>
              <span className="text-[10px] font-black text-zinc-600">{ave?.available ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            {ave?.available && ave?.token ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ['Token ID', aveSummary.tokenId],
                    ['链', aveSummary.chain],
                    ['项目', `${aveSummary.name || '--'} (${aveSummary.symbol || '--'})`],
                    ['持有人', formatValue(aveSummary.holders)],
                    ['价格', `$${formatValue(aveSummary.priceUsd)}`],
                    ['流动性', `$${formatValue(aveSummary.liquidityUsd)}`],
                    ['24H 成交额', `$${formatValue(aveSummary.volume24hUsd)}`],
                    ['市值', `$${formatValue(aveSummary.marketCap)}`],
                    ['FDV', `$${formatValue(aveSummary.fdv)}`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/5 bg-black/30 p-4">
                      <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">{label}</div>
                      <div className="text-sm font-black text-white break-words">{value || '--'}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-black/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-orange-300" />
                      <div className="text-[10px] font-black text-white uppercase tracking-widest">合约风险</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">等级</div>
                        <div className="text-sm font-black text-orange-200">{aveRisk.level || '--'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">评分</div>
                        <div className="text-sm font-black text-orange-200">{formatValue(aveRisk.score)}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(aveRisk.flags || []).slice(0, 8).map((flag: string) => (
                        <span key={flag} className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[9px] font-bold text-orange-200">
                          {flag}
                        </span>
                      ))}
                      {(!aveRisk.flags || aveRisk.flags.length === 0) && <span className="text-xs text-zinc-500">暂无风险标记。</span>}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-300" />
                      <div className="text-[10px] font-black text-white uppercase tracking-widest">持仓集中度</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Top1', aveConcentration.top1],
                        ['Top5', aveConcentration.top5],
                        ['Top10', aveConcentration.top10],
                        ['Top100', aveConcentration.top100],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">{label}</div>
                          <div className="text-sm font-black text-white">{formatRatioPercent(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ['15M', aveChanges['15m']],
                    ['1H', aveChanges['1h']],
                    ['4H', aveChanges['4h']],
                    ['1D', aveChanges['1d']],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/5 bg-black/30 p-4">
                      <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">{label}</div>
                      <div className={`text-sm font-black ${metricTone(value)}`}>{formatValue(value)}%</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white/5 bg-black/30 p-5 text-sm text-zinc-500">
                {ave?.reason === 'missing_api_key' ? 'AVE_API_KEY 未配置，已跳过 Ave 链上数据。' : 'Ave 未找到匹配代币或接口暂不可用。'}
              </div>
            )}
          </section>

          <section className="glass-card rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-emerald-300" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Binance OI</h3>
            </div>
            {binanceOi?.available ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ['15M', oiTimeframes['15m']],
                    ['1H', oiTimeframes['1h']],
                    ['4H', oiTimeframes['4h']],
                    ['1D', oiTimeframes['1d']],
                  ].map(([label, item]: any) => (
                    <div key={label} className="rounded-xl border border-white/5 bg-black/30 p-4">
                      <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">{label}</div>
                      <div className="text-sm font-black text-white break-words">{formatValue(item?.openInterest)}</div>
                      <div className={`mt-1 text-[10px] font-black ${metricTone(item?.changePercent)}`}>{formatValue(item?.changePercent)}%</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-xs text-zinc-500 leading-relaxed">
                  OI 为币安 U 本位合约持仓量。上方大数字是各周期最近一个采样点 OI，小数字是该周期内 OI 变化百分比；OI 快速上升通常代表杠杆拥挤，需要结合 Ave 链上量价判断。
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white/5 bg-black/30 p-5 text-sm text-zinc-500">
                该交易对未返回 Binance Futures OI{binanceOi?.symbol ? `（${binanceOi.symbol}）` : ''}。
                {binanceOi?.reason === 'no_binance_futures_oi' ? ' 可能未上线币安 U 本位合约。' : ''}
              </div>
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
