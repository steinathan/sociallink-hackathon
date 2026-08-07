import type { NextConfig } from "next";

const swHeaders = [
  { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
  { key: "Service-Worker-Allowed", value: "/" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/sw.js", headers: swHeaders },
      { source: "/firebase-messaging-sw.js", headers: swHeaders },
    ];
  },
};

export default nextConfig;
