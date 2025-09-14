/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['models.dev'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'models.dev',
        port: '',
        pathname: '/logos/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "polydev.ai", "*.vercel.app"]
    }
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure crypto is available in server environment
      config.externals = config.externals || []
      config.externals.push({
        'crypto': 'crypto'
      })
    }
    return config
  }
}

module.exports = nextConfig