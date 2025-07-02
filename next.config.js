/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "utf-8-validate": false,
        bufferutil: false,
      };
    }

    config.module.rules.push({
      test: /\.wasm$/,
      resourceQuery: /url/,
      type: "asset/resource",
    });

    return config;
  },
};

module.exports = nextConfig;
