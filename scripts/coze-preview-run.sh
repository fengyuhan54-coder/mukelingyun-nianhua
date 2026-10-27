#!/usr/bin/env bash
set -euo pipefail

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)/.."
cd "$PROJECT_DIR"

# 显式声明关键环境变量
export PORT=5000
export HOSTNAME=0.0.0.0

# 清理 5000 端口残留进程（绝不碰 9000）
fuser -k 5000/tcp 2>/dev/null || true
sleep 1

# 确保 pnpm-workspace.yaml 不会干扰单项目安装
if [ -f "pnpm-workspace.yaml" ] && ! grep -q "^packages:" pnpm-workspace.yaml; then
    rm -f pnpm-workspace.yaml
fi

# 安装依赖（如果 node_modules 不存在）
if [ ! -d "node_modules" ]; then
    pnpm install
fi

# 启动 Next.js 开发服务器
exec pnpm dev
