/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable instrumentation for scheduler
  experimental: {
    instrumentationHook: true,
  },
  // Skip build-time data collection for API routes
  // This prevents "Failed to collect page data" errors
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Disable static page generation for all API routes
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
