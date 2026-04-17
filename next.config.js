/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone-Output für Docker/Coolify-Deployment
  output: "standalone",

  // PWA headers
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
};

module.exports = nextConfig;
