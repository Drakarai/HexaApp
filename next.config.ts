import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      // Las imágenes viajan como data URL dentro del formulario
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
