/** @type {import('next').NextConfig} */
const API_TARGET = 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/sessions/:path*',      // all /sessions requests from frontend
        destination: `${API_TARGET}/sessions/:path*`, // proxy to backend
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_BASE: '', // we use relative URLs in frontend
  },
};

module.exports = nextConfig;
