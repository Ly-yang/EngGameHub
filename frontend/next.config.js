const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.enggamehub\.com\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 300, // 5 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 86400, // 24 hours
        },
      },
    },
  ],
});

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 实验性功能
  experimental: {
    optimizePackageImports: ['lucide-react', 'lodash'],
    serverComponentsExternalPackages: ['@microsoft/cognitiveservices-speech-sdk'],
  },

  // 编译优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    domains: [
      'localhost',
      'api.enggamehub.com',
      'cdn.enggamehub.com',
      'storage.googleapis.com',
      's3.amazonaws.com',
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 公共运行时配置
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  },

  // 重定向规则
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/overview',
        permanent: true,
      },
      {
        source: '/game',
        destination: '/game/lobby',
        permanent: true,
      },
    ];
  },

  // 重写规则
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },

  // Headers 配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=86400, stale-while-revalidate=59',
          },
        ],
      },
    ];
  },

  // Webpack 配置
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 添加自定义loader或插件
    if (!isServer) {
      // 客户端特定配置
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
      };
    }

    // 优化bundle拆分
    config.optimization.splitChunks = {
      ...config.optimization.splitChunks,
      cacheGroups: {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          maxSize: 244000,
        },
        common: {
          minChunks: 2,
          chunks: 'all',
          name: 'common',
          priority: -10,
          reuseExistingChunk: true,
          enforce: true,
        },
      },
    };

    // 性能优化
    if (!dev) {
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    return config;
  },

  // 输出配置
  output: 'standalone',
  
  // 静态优化
  trailingSlash: false,
  
  // 压缩配置
  compress: true,
  
  // 电源模式
  poweredByHeader: false,
  
  // 严格模式
  reactStrictMode: true,
  
  // SWC 配置
  swcMinify: true,
  
  // 类型检查
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint 配置
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['pages', 'components', 'lib', 'src'],
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));
