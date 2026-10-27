/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用 outputFileTracing 解决 pnpm 符号链接兼容性问题
  outputFileTracing: false,
}

module.exports = nextConfig
