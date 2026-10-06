import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        fs: false,
        https: false,
      };
      // PptxGenJS uses node: imports for helpers that are unavailable in browsers.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:(fs|https)$/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
    }

    return config;
  },
};

export default nextConfig;
