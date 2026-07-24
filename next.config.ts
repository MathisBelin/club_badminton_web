import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Images d'en-tête des formulaires, stockées sur Vercel Blob.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
