"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
function App() {
    const [activeTab, setActiveTab] = (0, react_1.useState)('research');
    const [input, setInput] = (0, react_1.useState)('');
    const [inputName, setInputName] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [result, setResult] = (0, react_1.useState)(null);
    const handleResearch = async () => {
        if (!input)
            return;
        setLoading(true);
        setResult(null);
        try {
            const resp = await fetch('/api/admin/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: input, name: inputName || input }),
            });
            const data = await resp.json();
            setResult(data.data);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setLoading(false);
        }
    };
    const handleDiscovery = async () => {
        if (!input)
            return;
        setLoading(true);
        setResult(null);
        try {
            const resp = await fetch('/api/admin/discovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: input }),
            });
            const data = await resp.json();
            setResult(data.data);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="flex min-h-screen">
      
      <aside className="w-64 glass m-4 flex flex-col p-6 sticky top-4 h-[calc(100vh-2rem)]">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <lucide_react_1.Cpu className="text-white w-5 h-5"/>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Antigravity</h1>
        </div>

        <nav className="flex flex-col gap-2">
          <button onClick={() => { setActiveTab('research'); setResult(null); setInput(''); setInputName(''); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'research' ? 'bg-primary/20 text-primary border-l-4 border-primary' : 'hover:bg-white/5 opacity-60'}`}>
            <lucide_react_1.Shield size={18}/>
            <span>代币调研</span>
          </button>
          <button onClick={() => { setActiveTab('discovery'); setResult(null); setInput(''); }} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'discovery' ? 'bg-primary/20 text-primary border-l-4 border-primary' : 'hover:bg-white/5 opacity-60'}`}>
            <lucide_react_1.Globe size={18}/>
            <span>全链检索</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5 opacity-40 text-xs">
          v1.0.0-PRO
        </div>
      </aside>

      
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h2 className="text-3xl font-bold mb-2">
              {activeTab === 'research' ? '代币深度调研' : '全链交易检索'}
            </h2>
            <p className="opacity-60">基于 Multi-Agent 系统与 DexScreener 实时数据</p>
          </header>

          <section className="glass p-8 mb-8">
            <div className="flex gap-4">
              <input className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 glow-input text-lg" placeholder={activeTab === 'research' ? "输入代币符号 (如 PENDLE)" : "输入代币符号或合约地址"} value={input} onChange={(e) => setInput(e.target.value)}/>
              {activeTab === 'research' && (<input className="w-48 bg-white/5 border border-white/10 rounded-lg px-4 py-3 glow-input" placeholder="项目全称 (选填)" value={inputName} onChange={(e) => setInputName(e.target.value)}/>)}
              <button disabled={loading} onClick={activeTab === 'research' ? handleResearch : handleDiscovery} className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shine-button disabled:opacity-50">
                {loading ? <lucide_react_1.Loader2 className="animate-spin"/> : <lucide_react_1.Search size={20}/>}
                {loading ? '正在分析...' : '开启调研'}
              </button>
            </div>
          </section>

          
          <div className="space-y-6">
            {loading && (<div className="glass p-12 flex flex-col items-center justify-center gap-4">
                <lucide_react_1.Loader2 size={40} className="text-primary animate-spin"/>
                <p className="animate-pulse opacity-60">正在调用智能代理集群进行链上扫描与经济审计...</p>
              </div>)}

            {!loading && result && (<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'research' ? (<div className="grid gap-6">
                    <div className="glass p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <lucide_react_1.Activity className="text-primary"/> 项目概览
                      </h3>
                      <p className="leading-relaxed opacity-80">{result.summary}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="glass p-6">
                        <h4 className="font-bold mb-3">代币经济学</h4>
                        <div className="text-sm space-y-2 opacity-70">
                          <p>TGE: {result.tokenomics?.tge_date}</p>
                          <p>做市商: {result.tokenomics?.market_makers?.join(', ')}</p>
                          <p>上线板块: {result.tokenomics?.exchanges?.map((e) => e.name).join(', ')}</p>
                        </div>
                      </div>
                      <div className="glass p-6">
                        <h4 className="font-bold mb-3">风险提示</h4>
                        <ul className="text-sm space-y-1 opacity-70 list-disc list-inside">
                          {result.risks?.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="glass p-6">
                      <h3 className="text-xl font-bold mb-4">原始研究协议 (JSON)</h3>
                      <pre>{JSON.stringify(result, null, 2)}</pre>
                    </div>
                  </div>) : (<div className="grid gap-6">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="glass p-6 text-center">
                        <div className="text-3xl font-bold text-primary mb-1">${(result.priceUsd || 0)}</div>
                        <div className="text-xs uppercase opacity-40">当前币价</div>
                      </div>
                      <div className="glass p-6 text-center">
                        <div className="text-3xl font-bold text-green-400 mb-1">${result.liquidityUsd?.toLocaleString()}</div>
                        <div className="text-xs uppercase opacity-40">总流动性</div>
                      </div>
                      <div className="glass p-6 text-center">
                        <div className="text-3xl font-bold mb-1">${result.volume24hUsd?.toLocaleString()}</div>
                        <div className="text-xs uppercase opacity-40">24H 交易量</div>
                      </div>
                    </div>
                    
                    <div className="glass p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">主链分布分析</h3>
                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/30">
                          置信度 {Math.round(result.confidenceScore * 100)}%
                        </span>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                          <span className="opacity-50">推荐监控链</span>
                          <span className="font-mono text-primary font-bold">{result.masterChainId?.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                          <span className="opacity-50">主要交易对地址</span>
                          <span className="font-mono text-xs cursor-pointer hover:text-primary transition-colors">{result.mainPairAddress}</span>
                        </div>
                      </div>
                    </div>
                  </div>)}
              </div>)}
          </div>
        </div>
      </main>
    </div>);
}
exports.default = App;
//# sourceMappingURL=App.js.map