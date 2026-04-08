/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node.js-only modules from being bundled client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "thread-stream": false,
        worker_threads: false,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

export default nextConfig
