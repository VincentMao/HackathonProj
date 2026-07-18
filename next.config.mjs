/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The API routes read data/ at runtime via fs. Ensure those files are traced into the
  // serverless function bundles on Vercel (they aren't imported, so they aren't traced by default).
  outputFileTracingIncludes: {
    "/api/run": ["./data/**/*"],
    "/api/case": ["./data/**/*"],
  },
};

export default nextConfig;
