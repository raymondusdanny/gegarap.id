/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable the `src/instrumentation.ts` hook (Sentry init, Bagian 10). On
  // Next 14.2 this is still behind an experimental flag (default from 15).
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
