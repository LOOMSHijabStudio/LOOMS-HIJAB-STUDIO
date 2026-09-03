import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async headers() {
    const baseHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "X-XSS-Protection", value: "1; mode=block" },

      process.env.NODE_ENV === "production" && {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      },
    ].filter(Boolean) as Array<{ key: string; value: string }>;

    return [
      {
        source: "/:path*",
        headers: baseHeaders,
      },

      {
        source: "/admin/:path*",
        headers: [
          ...baseHeaders,
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';",
          },
        ],
      },

      {
        source: "/api/:path*",
        headers: [
          ...baseHeaders,
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
