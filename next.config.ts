import type { NextConfig } from "next";

// 보안 헤더: 다른 사이트가 이 앱을 작은 창(iframe)에 끼워 넣는 것을 막고, 파일 형식 추측과 불필요한 권한·정보 전달을 줄인다.
// (엄격한 CSP는 Next.js 인라인 스크립트와 맞춰야 해서 넣지 않았다. 공개 전 과제로 보고서에 적어 둠)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
