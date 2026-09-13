/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://us.apsara.lol:15511/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://us.apsara.lol:15511/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
