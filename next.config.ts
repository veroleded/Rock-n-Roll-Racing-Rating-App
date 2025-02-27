import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      "cdn.discordapp.com",
      "robohash.org",
      "api.dicebear.com",
      "discord.com",
    ],
  },
};

export default nextConfig;
