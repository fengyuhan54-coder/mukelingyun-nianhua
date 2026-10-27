#!/usr/bin/env bash
set -euo pipefail

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)/.."
cd "$PROJECT_DIR"

# 确保 pnpm-workspace.yaml 不会干扰单项目安装
if [ -f "pnpm-workspace.yaml" ] && ! grep -q "^packages:" pnpm-workspace.yaml; then
    rm -f pnpm-workspace.yaml
fi

# 安装依赖
pnpm install
