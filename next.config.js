/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Fallback for dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "utf-8-validate": false,
        bufferutil: false,
      };
    }

    // Add custom rule to load .wasm files as assets when using ?url
    config.module.rules.push({
      test: /\.wasm$/,
      resourceQuery: /url/, // only if imported with ?url
      type: "asset/resource",
    });

    return config;
  },
};

module.exports = nextConfig;
