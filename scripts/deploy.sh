#!/bin/bash

# Shanzhai Robot 自动化构建与部署脚本 (V13 Pulse Pro)
set -e

echo ">>> [V13] 启动自动化部署流程..."

# 1. 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "错误: 未在大项目根目录找到 .env 文件！"
    exit 1
fi

# 2. 停止旧服务
echo ">>> 正在下线旧版本服务..."
docker compose down || true

# 3. 核心构建
echo ">>> 正在启动多阶段 Docker 构建 (V13)..."
docker compose build --no-cache

# 4. 启动基础设施
echo ">>> 启动数据库与缓存服务..."
docker compose up -d postgres redis
sleep 5 # 等待数据库就绪

# 5. 数据库自愈同步 (CRITICAL FIX)
echo ">>> 正在执行 V13 数据库自愈同步..."
# 利用 app 镜像启动临时容器执行 SQL 补丁，确保主应用启动前表结构已就绪
docker compose run --rm app node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function sync() {
  try {
    await sql\`CREATE TABLE IF NOT EXISTS \"watchlist\" (\"id\" serial PRIMARY KEY, \"symbol\" varchar(20) NOT NULL UNIQUE, \"source\" varchar(20) NOT NULL, \"last_price\" numeric(30,10), \"created_at\" timestamp DEFAULT now())\`;
    await sql\`CREATE TABLE IF NOT EXISTS \"volatility_alerts\" (\"id\" serial PRIMARY KEY, \"symbol\" varchar(20) NOT NULL, \"change_percent\" numeric(10,2) NOT NULL, \"price_at_alert\" numeric(30,10) NOT NULL, \"direction\" varchar(10) NOT NULL, \"timestamp\" timestamp DEFAULT now() NOT NULL)\`;
    console.log('✅ Database V13 Tables Verified/Created');
  } catch (err) {
    console.error('❌ Sync Failed:', err.message);
    process.exit(1);
  } finally {
    process.exit();
  }
}
sync();
"

# 6. 正式启动主应用
echo ">>> 数据库已就绪，正在启动主应用..."
docker compose up -d app

# 7. 清理
echo ">>> 正在执行镜像清理..."
docker image prune -f

# 8. 状态检查
echo "------------------------------------------------"
echo "部署成功！V13 系统已在线恢复。"
docker compose ps
echo "------------------------------------------------"
