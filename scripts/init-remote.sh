#!/bin/bash

# Ubuntu 24.04 远程服务器初始化脚本
set -e

echo "开始执行服务器环境初始化..."

# 1. 更新系统软件包
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# 2. 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gnupg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. 设置 Docker 仓库
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. 安装 Docker 引擎和 Compose 插件
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. 配置 Docker 镜像加速 (解决国内拉取超时)
echo "正在配置 Docker 国内镜像加速..."
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://docker.nju.edu.cn"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker

# 6. 配置用户组权限 (允许非 root 用户执行 docker)
if ! getent group docker > /dev/null; then
    sudo groupadd docker
fi
sudo usermod -aG docker $USER

# 6. 开启防火墙端口 (3000)
if command -v ufw > /dev/null; then
    echo "配置 UFW 防火墙允许 3000 端口..."
    sudo ufw allow 3000/tcp
fi

echo "------------------------------------------------"
echo "环境初始化完成！"
echo "注意：权限变更需要重新登录服务器生效。请注销并重新 SSH 登录后再开始部署。"
echo "------------------------------------------------"
