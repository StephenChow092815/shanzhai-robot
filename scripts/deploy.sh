#!/bin/bash

# Shanzhai Robot 自动化构建与部署脚本
set -e

echo ">>> 启动自动化部署流程..."

# 1. 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "错误: 未在大项目根目录找到 .env 文件！"
    echo "请在服务器上创建 .env 并填入以下必要参数："
    echo "KIMI_API_KEY=xxx"
    echo "EXA_API_KEY=xxx"
    echo "DATABASE_URL=postgres://user:password@postgres:5432/shanzhai_db"
    exit 1
fi

# 2. 预清理：停止并删除现有容器（保留 Volume 数据）
echo ">>> 正在停止旧版本服务..."
docker compose down || true

# 3. 核心构建：在服务器上进行生产级编译
echo ">>> 正在启动多阶段 Docker 构建 (此过程可能需要几分钟)..."
docker compose build --no-cache

# 4. 启动服务
echo ">>> 服务启动中..."
docker compose up -d

# 5. 后置清理：删除构建残留的虚悬镜像 (dangling images)
echo ">>> 正在清理构建残留..."
docker image prune -f

# 6. 状态检查
echo "------------------------------------------------"
echo "部署成功！服务概览："
docker compose ps
echo "------------------------------------------------"
echo "您可以访问: http://$(curl -s ifconfig.me):3000"
echo "查看实时运行日志: docker compose logs -f app"
echo "------------------------------------------------"
