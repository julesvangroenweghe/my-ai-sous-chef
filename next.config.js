/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: '.',
  },
  async redirects() {
    return [
      // Redirect placeholder MEP UUID naar overzicht
      {
        source: '/mep/e1111111-1111-1111-1111-111111111111',
        destination: '/mep',
        permanent: false,
      },
    ]
  },
};

module.exports = nextConfig;
