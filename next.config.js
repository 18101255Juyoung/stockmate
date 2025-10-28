/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable instrumentation for scheduler
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
