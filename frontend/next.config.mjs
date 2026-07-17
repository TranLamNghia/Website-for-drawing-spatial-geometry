import path from 'path'
import { fileURLToPath } from 'url'
import { loadRootEnv } from './lib/load-root-env.mjs'

loadRootEnv()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo/desktop path: keep Turbopack rooted at the frontend package.
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/dang-nhap',
        destination: '/dangnhap',
        permanent: true,
      },
    ]
  },
  async headers() {
    // Prevent bfcache on auth pages so Back always does a full reload.
    return [
      {
        source: '/dangnhap',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        source: '/dangky',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ]
  },
}

export default nextConfig
