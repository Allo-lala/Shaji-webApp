/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
  turbopack: {
    resolveAlias: {
      "thread-stream": { browser: false },
      "worker_threads": { browser: false },
    },
  },
}

export default nextConfig
