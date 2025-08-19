/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: false },
  experimental: { typedRoutes: false },

  allowedDevOrigins: ["http://192.168.0.212:3001", "http://192.168.0.212"],

  async headers() {
    return [
      {
        source: "/_imgcache/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
