# 币安新币智能调研与链上监控系统方案

## 项目概述

构建一个基于 Multi-Agent 架构的自动化系统，实现币安新币上线的深度背景调研和实时链上数据监控，结合 GPT-4o API 与 Codex CPA（CliProxyAPI）混合部署，解决 Token 限制和成本优化问题。

**核心价值**：
- 新币上线 10 分钟内完成全面背景调研
- 7×24 小时链上实时监控，秒级异常检测
- 智能风险分级，自动触发告警和建议
- 混合 Token 策略，降低 60% 运营成本

---

## 一、系统架构

### 1.1 核心架构

系统采用分层架构设计：

**主控层**：Supervisor 代理负责任务分发、结果汇总、异常处理和 Token 路由

**业务层**：分为 Research Team（调研代理组）和 Monitoring Team（监控代理组）

**基础设施层**：包含 Token 路由层（GPT-4o API + Codex CPA Pool）、数据存储层（PostgreSQL + Redis）、通知层（Telegram/Discord）

### 1.2 技术栈选型

| 组件 | 推荐方案 | 选型理由 |
|------|---------|---------|
| Agent 框架 | LangGraph (Supervisor 模式) | 状态管理强，支持循环和条件路由 |
| LLM 主模型 | GPT-4o | 函数调用能力强，Token 效率高 |
| LLM 轻量模型 | GPT-4o-mini | 成本低 20 倍，适合简单任务 |
| 链上数据 | Alchemy + Etherscan API | 覆盖全，WebSocket 支持好 |
| 实时监控 | Web3.py + Redis Stream | Python 生态与 LLM 框架一致 |
| 数据存储 | PostgreSQL + TimescaleDB | 时序数据优化，支持历史回溯 |
| 任务队列 | Celery + Redis | 成熟稳定，支持定时任务 |
| 通知渠道 | Telegram Bot API | 加密社区主流，实时性好 |
| 部署 | Docker Compose | 快速迭代，适合 MVP 阶段 |

---

## 二、Agent 详细设计

### 2.1 Fundamentals Agent（项目基本面调研）

**职责**：深度调研新币项目背景，生成结构化基本面报告

**输入**：币安公告的新币合约地址/代币符号  
**输出**：JSON 格式基本面报告

**核心任务**：
- 白皮书分析：抓取并解析项目白皮书，提取技术架构、创新点、路线图
- 代币经济模型：分析 Tokenomics（分配比例、解锁计划、通胀机制、用途）
- 团队背景调查：LinkedIn 验证核心成员经历，检查历史项目记录
- 投资机构验证：查询融资历史，验证投资机构背景
- 代码库分析：GitHub 活跃度统计（提交频率、贡献者数量、代码质量）
- 竞品对比：识别直接竞争对手，对比技术差异和市场定位
- 审计报告：检查安全审计结果

**Token 策略**：使用 CPA（批量任务），单次调研预算 50K tokens

---

### 2.2 Sentiment Agent（市场情绪分析）

**职责**：监控社交媒体和新闻情绪，识别市场热点和 FUD

**输入**：代币符号、合约地址、时间范围  
**输出**：情绪评分（-1.0 ~ +1.0）、关键话题标签、KOL 观点摘要

**核心任务**：
- Twitter/X 监控：实时抓取提及量、情绪倾向、影响力加权
- Reddit 社区分析：r/CryptoCurrency、r/DeFi 等子版块热度追踪
- Discord/Telegram：社区活跃度、管理员响应质量
- 中文社区监控：微博、币乎、Odaily 等中文媒体情绪
- 新闻聚合：CoinDesk、Cointelegraph、TheBlock 等主流媒体报道
- KOL 影响力分析：识别关键意见领袖，追踪其历史预测准确率
- 情绪基线建立：建立历史情绪数据，识别异常波动

**数据源**：Twitter API v2、LunarCrush API、Exa AI、自定义爬虫

**Token 策略**：使用 CPA（批量任务），每小时批量处理一次

---

### 2.3 Tech Analysis Agent（技术分析）

**职责**：链上数据和技术指标分析，识别价格模式和流动性风险

**输入**：代币合约地址、交易对、时间周期  
**输出**：技术评级、支撑压力位、流动性健康度评分

**核心任务**：
- 价格走势分析：OHLCV 数据，识别趋势、支撑阻力、波动率
- 流动性池分析：Uniswap/PancakeSwap 池深度，滑点计算
- 持仓分布分析：前 10/50/100 地址持仓占比，集中度风险
- 交易模式识别：大额交易时间分布，洗盘/吸筹信号
- 智能合约风险：重入攻击、权限控制、代理合约风险扫描
- 与大盘相关性：与 BTC/ETH 的价格相关性分析
- 交易所流入流出：CEX 存款/提款趋势，抛压/吸筹信号

**数据源**：DEX Screener API、DeFiLlama API、Etherscan/BscScan API、Nansen/Arkham Intelligence

**Token 策略**：使用 CPA（批量任务），与 On-Chain Monitor 共享数据

---

### 2.4 On-Chain Monitor Agent（链上实时监控）

**职责**：7×24 小时链上数据实时监控，捕获异常交易模式

**输入**：监控的代币合约地址列表  
**输出**：实时数据流、异常标记、事件日志

**核心任务**：
- WebSocket 连接管理：维护与 Alchemy/Infura 的稳定连接
- 事件订阅配置：Transfer、Swap、Approval、Mint/Burn 事件
- 大额转账检测：大于 100k USD 的转账实时监控
- 交易所地址监控：币安、Coinbase、OKX 等热钱包异动
- 合约交互监控：异常函数调用（如 ownership 转移、升级）
- Gas 消耗分析：识别异常高频调用（可能的攻击）
- 跨链桥监控：大额跨链转移检测
- 数据持久化：原始数据写入 TimescaleDB，支持历史回溯

**监控指标阈值**：

| 指标 | 警告阈值 | 紧急阈值 | 响应时间 |
|------|---------|---------|---------|
| 单笔转账 | 大于 100k USD | 大于 1M USD | 小于 5 秒 |
| 交易所流入 | 大于 500k/小时 | 大于 2M/小时 | 小于 30 秒 |
| 持仓变化 | 前 10 地址变化 大于 5% | 变化 大于 10% | 小于 1 分钟 |
| 合约交互 | 异常函数调用 | 所有权转移 | 立即 |
| 价格偏差 | DEX 与 CEX 价差 大于 2% | 价差 大于 5% | 小于 10 秒 |

**Token 策略**：不使用 LLM，纯代码逻辑处理，降低 90% Token 消耗

---

### 2.5 Whale Alert Agent（巨鲸监控）

**职责**：识别并追踪巨鲸行为模式，预测市场影响

**输入**：On-Chain Monitor 标记的大额交易  
**输出**：巨鲸标记、行为分类、预测建议

**核心任务**：
- 地址聚类分析：识别同一实体控制的多地址（启发式算法）
- 历史行为建模：分类为 HODLer、Trader、Market Maker、VC
- 异常模式检测：沉睡地址突然活跃、规律性出货模式
- 关联分析：与历史暴涨/暴跌事件的地址关联
- 影响力预测：基于巨鲸类型和历史行为预测价格影响
- 标签库维护：自建地址标签库，集成 Nansen/Arkham 数据

**行为分类模型**：

| 类型 | 特征 | 市场影响 | 响应策略 |
|------|------|---------|---------|
| Smart Money | 历史胜率 大于 70%，持仓周期长 | 跟随信号 | 监控其新持仓 |
| VC 解锁 | 投资机构地址，定期线性解锁 | 持续抛压 | 提前预警 |
| Market Maker | 高频双向交易，流动性提供 | 稳定市场 | 正常监控 |
| Whale Trader | 大额波段操作，持仓 1-7 天 | 短期波动 | 技术分析确认 |
| Rug Pull 嫌疑 | 合约部署者，权限未放弃 | 极高风险 | 立即告警 |

**Token 策略**：使用 GPT-4o API（高优先级），需要快速推理和模式识别

---

### 2.6 Risk Alert Agent（风险预警）

**职责**：综合所有信号生成风险评级，触发分级响应

**输入**：各代理的输出信号、历史风险数据库  
**输出**：风险评分、预警通知、建议操作

**核心任务**：
- 信号聚合：收集 Fundamentals、Sentiment、Tech、Whale 信号
- 风险评分算法：加权评分模型，动态调整权重
- 分级响应策略：根据风险等级触发不同响应
- 通知渠道管理：Telegram/Discord/邮件/短信分级推送
- 误报学习：记录误报案例，优化阈值
- 历史回测：用历史数据验证风险模型有效性

**风险等级定义**：

| 等级 | 评分 | 条件示例 | 响应动作 |
|------|------|---------|---------|
| 低风险 | 0-30 | 所有指标正常 | 记录日志，定期汇总 |
| 中风险 | 31-50 | 单一指标异常（社媒 FUD） | 推送通知，增加监控频率 |
| 高风险 | 51-75 | 多指标异常（巨鲸出货+合约风险） | 立即告警，建议减仓 |
| 极高风险 | 76-100 | 明确危险信号（Rug Pull 模式） | 紧急告警，建议清仓 |

**Token 策略**：使用 GPT-4o API（高优先级），需要复杂推理和决策

---

## 三、Token 路由与成本优化

### 3.1 混合部署架构

系统采用三层 Token 来源：

**GPT-4o API（高优先级）**：用于紧急风险预警、复杂推理分析、多代理协调、最终报告生成、Whale Alert、Risk Alert

**Codex CPA Pool（批量任务）**：用于日常链上数据监控、社媒情绪批量抓取、代码库静态分析、历史数据回溯、定时任务调度、非紧急调研任务

**本地缓存（Redis）**：用于热点数据缓存、重复查询优化、上下文共享

### 3.2 路由策略

根据任务特性智能选择 Token 来源：

**高优先级任务**：紧急程度为 high/critical，或任务复杂度为 complex 且紧急程度为 normal，使用官方 API

**批量任务**：紧急程度为 low/normal 且任务复杂度为 simple/medium，使用 CPA

**监控任务**：不使用 LLM，纯代码逻辑

### 3.3 成本估算

假设每日处理 200 万 Token：

| 方案 | 配置 | 日成本 | 月成本 | 适用场景 |
|------|------|--------|--------|---------|
| 纯官方 API | GPT-4o | 12.5 USD | 约 375 USD | 高可靠性要求 |
| 混合方案（推荐） | 30% API + 70% CPA | 7.5 USD | 约 225 USD | 平衡成本与可靠性 |
| 纯 CPA | 5x ChatGPT Plus | 3.3 USD | 约 100 USD | 成本敏感，可容忍延迟 |

混合方案详细：
- 官方 API（30% = 600K tokens）：3.0 USD/天
- CPA（70% = 1.4M tokens）：0.5 USD/天（Plus 订阅折算）
- Plus 订阅固定成本：100 USD/月 ÷ 30 = 3.3 USD/天
- 总计：约 7.5 USD/天，225 USD/月

---

## 四、实施路线图

### Phase 1: 基础设施（Week 1-2）

**Week 1: 环境搭建**
- 服务器/云环境准备（AWS/GCP/Azure）
- Docker 环境配置
- PostgreSQL + TimescaleDB 部署
- Redis 集群部署
- 基础监控（Prometheus + Grafana）

**Week 2: 数据接入**
- Alchemy/Infura 账号配置
- Etherscan API Key 申请
- Twitter API v2 申请
- Telegram Bot 创建
- 测试数据接入

### Phase 2: 核心代理开发（Week 3-6）

**Week 3: On-Chain Monitor**
- WebSocket 连接管理模块
- 事件订阅与解析
- 大额转账检测逻辑
- 数据写入 TimescaleDB
- 基础告警接口

**Week 4: Fundamentals Agent**
- 白皮书抓取与解析
- GitHub 分析模块
- 团队背景调查
- 代币经济模型解析
- 报告生成模板

**Week 5: Sentiment & Tech Analysis**
- Twitter 数据抓取
- 情绪分析模型集成
- 价格/流动性分析
- 持仓分布计算
- 技术评分算法

**Week 6: Whale Alert & Risk Alert**
- 地址聚类算法
- 巨鲸行为分类
- 风险评分模型
- 分级通知系统
- 历史回测框架

### Phase 3: 集成与优化（Week 7-8）

**Week 7: Multi-Agent 集成**
- Supervisor 代理实现
- LangGraph 工作流编排
- Agent 间通信协议
- 状态共享机制
- 异常处理与熔断

**Week 8: Token 路由与部署**
- CliProxyAPI 部署
- 多账号配置
- 智能路由实现
- 成本监控面板
- 生产环境部署

### Phase 4: 测试与上线（Week 9-10）

**Week 9: 测试**
- 单元测试覆盖 大于 80%
- 集成测试（模拟币安公告）
- 压力测试（高并发链上事件）
- 故障演练
- 安全审计

**Week 10: 上线**
- 生产环境切换
- 监控告警配置
- 运维手册编写
- 团队培训
- 持续迭代计划

---

## 五、运维与监控

### 5.1 关键指标（KPIs）

| 指标 | 目标值 | 监控方式 |
|------|--------|---------|
| 新币调研完成时间 | 小于 10 分钟 | Agent 日志 |
| 链上事件检测延迟 | 小于 5 秒 | Prometheus |
| 风险告警准确率 | 大于 85% | 人工标注回测 |
| Token 日消耗 | 小于 50 USD | 成本监控面板 |
| 系统可用性 | 大于 99.5% | Uptime 监控 |
| 误报率 | 小于 15% | 告警反馈统计 |

### 5.2 告警分级

**Critical（极高风险）**：Telegram + Discord + PagerDuty + SMS，5 分钟内未确认升级到团队负责人，15 分钟升级到经理

**High（高风险）**：Telegram + Discord

**Medium（中风险）**：Telegram

**Low（低风险）**：仅记录日志

---

## 六、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| API 限流 | 监控中断 | CPA 多账号池 + 熔断降级 |
| CPA 失效 | Token 成本激增 | 自动切换到官方 API，告警通知 |
| 链上节点故障 | 数据丢失 | 多节点备份（Alchemy + Infura + QuickNode） |
| LLM 幻觉 | 错误投资决策 | 所有结论附来源链接，关键数据人工复核 |
| 延迟过高 | 错过交易时机 | 链上监控无 LLM，本地缓存热点数据 |
| 安全漏洞 | 资金损失 | 代码审计，私钥分离，最小权限原则 |

---

## 七、附录

### 7.1 环境变量清单

- OpenAI API Key 和 Base URL
- CliProxyAPI Key 和 Base URL
- Alchemy API Key 和 WebSocket URL
- Etherscan API Key
- Twitter API Key 和 Secret
- LunarCrush API Key
- PostgreSQL 和 Redis 连接字符串
- Telegram Bot Token 和 Chat ID
- Discord Webhook URL
- PagerDuty Service Key

### 7.2 启动命令

1. 启动基础设施：docker-compose up -d postgres redis
2. 启动 CliProxyAPI：docker-compose up -d
3. 初始化数据库：python scripts/init_db.py
4. 启动主系统：python -m crypto_multi_agent.main
5. 启动监控面板：docker-compose up -d prometheus grafana

### 7.3 测试命令

- 单元测试：pytest tests/ -v --cov=agents
- 集成测试：python scripts/simulate_new_listing.py --symbol TEST --address 0x...
- 压力测试：locust -f tests/load_test.py --host=http://localhost:8000
- 链上监控测试：python scripts/test_onchain_monitor.py --test-transfer 100000

---

**版本**: v1.0  
**更新日期**: 2024-01-15  
**状态**: 待实施
