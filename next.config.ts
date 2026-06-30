import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  allowedDevOrigins: ['192.168.1.119', 'localhost', '192.168.1.121']
};

export default nextConfig;
