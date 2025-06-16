/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // 启用静态导出
  staticPageGenerationTimeout: 60,
};

module.exports = nextConfig;
