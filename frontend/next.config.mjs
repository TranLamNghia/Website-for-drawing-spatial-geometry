import { loadRootEnv } from './lib/load-root-env.mjs'

loadRootEnv()

/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

export default nextConfig
