/** @type {import('next').NextConfig} */
const nextConfig = {
    // 启用严格模式
    reactStrictMode: true,

    // 图片域名白名单
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },

    // 环境变量
    env: {
        API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },
};

export default nextConfig;
