/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['models.dev'],
    remotePatterns: [
      { protocol: 'https', hostname: 'models.dev', pathname: '/logos/**' },
      { protocol: 'https', hostname: 'cdn.freelogovectors.net', pathname: '/**' },
      { protocol: 'https', hostname: 'sajalsharma.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cline.bot', pathname: '/**' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'pirago.vn', pathname: '/**' },
      { protocol: 'https', hostname: 'zed.dev', pathname: '/**' },
      { protocol: 'https', hostname: 'pbs.twimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/**' },
      { protocol: 'https', hostname: 'uxwing.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.jsdelivr.net', pathname: '/**' }
    ]
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "polydev.ai", "*.vercel.app"]
    }
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({ crypto: 'crypto' })
    }
    return config
  }
}

module.exports = nextConfig
