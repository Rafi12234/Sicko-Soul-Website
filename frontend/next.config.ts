import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    /**
     * Let Cloudinary perform the actual image transformation
     * and optimization instead of sending the result through
     * another Next.js image-optimization pass.
     */
    loader: "custom",

    loaderFile: "./src/lib/cloudinaryLoader.ts",

    /**
     * Responsive widths Next/Image may request.
     */
    deviceSizes: [
      360,
      480,
      640,
      768,
      1024,
      1280,
      1536,
      1920,
    ],

    imageSizes: [
      64,
      96,
      128,
      256,
      384,
    ],

    /**
     * Allow the Sicko Soul Cloudinary account.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dec82taov/**",
      },
    ],
  },
};

export default nextConfig;