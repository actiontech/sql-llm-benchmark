/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 移除 output: 'export' 以启用 API Routes 功能
  // output: 'export', // 已禁用静态导出模式
  staticPageGenerationTimeout: 60,
};

module.exports = nextConfig;
