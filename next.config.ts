import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) does its own dynamic requires that the
  // server bundler shouldn't try to trace/inline.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
