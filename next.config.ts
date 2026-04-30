import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 把 data/ecdict.db 一并打包进 serverless function
  // （否则 Next.js 默认只打包 import 引用的文件，运行时 fs 读的二进制不会被带上）
  outputFileTracingIncludes: {
    "/api/lookup": ["./data/ecdict.db"],
    "/listening": ["./public/listening-materials/**/*.json"],
    "/listening/[id]": ["./public/listening-materials/**/*.json"],
  },
  outputFileTracingExcludes: {
    "/api/upload-material": ["./public/listening-materials/**/*"],
    "/listening": ["./public/listening-materials/**/*.mp3"],
    "/listening/[id]": ["./public/listening-materials/**/*.mp3"],
  },
  // better-sqlite3 是原生模块，要告诉 Next 别试图把它打包进客户端
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
