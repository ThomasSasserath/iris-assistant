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
      {
        // Teams benötigt Framing – X-Frame-Options für Microsoft-Domains erlauben
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://teams.microsoft.com https://*.teams.microsoft.com https://*.skype.com",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
