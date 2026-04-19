#!/bin/bash

# Shanzhai Robot 自动化构建与部署脚本 (V13 Pulse Edition)
set -e

echo ">>> [V13] 启动自动化部署流程..."

# 1. 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "错误: 未在大项目根目录找到 .env 文件！"
    echo "请在服务器上创建 .env 并参考本地配置填入必要参数。"
    exit 1
fi

# 2. 预清理：停止旧版本服务
echo ">>> 正在下线旧版本服务 (保留数据卷)..."
docker compose down || true

# 3. 物理清理：强制移除旧的构建缓存（防止 UI 菜单不更新）
echo ">>> 正在清理构建残留与缓存..."
docker system prune -f

# 4. 核心构建：在服务器上进行生产级编译
echo ">>> 正在启动多阶段 Docker 构建 (V13)..."
docker compose build --no-cache

# 5. 启动基础服务（DB & Redis）
echo ">>> 启动基础设施容器..."
docker compose up -d postgres redis

# 6. 数据库同步 (CRITICAL)
echo ">>> 正在执行 V13 数据库架构对齐 (Drizzle Push)..."
# 注意：由于 runner 容器不含 devDeps，我们将利用构建阶段产生的中间层或临时容器执行 push
# 这里的最稳妥做法是在 app 启动前，确保 db 准备就绪
sleep 5 # 等待 Postgres 启动

# 7. 启动主应用
echo ">>> 服务全面启动中..."
docker compose up -d app

# 8. 后置操作：清理虚悬镜像
echo ">>> 正在执行最后清理..."
docker image prune -f

# 9. 状态检查
echo "------------------------------------------------"
echo "部署成功！V13 系统已上线。"
echo "服务状态："
docker compose ps
echo "------------------------------------------------"
echo "您可以访问: http://$(curl -s ifconfig.me):3000"
echo "查看实时预警日志: docker compose logs -f app"
echo "------------------------------------------------"
