const defaultRuntimeCaching = require('next-pwa/cache');

/**
 * The session endpoint is excluded from next-pwa's defaults, which means the
 * app bounces to /login as soon as it loses connection. Caching it keeps the
 * user signed in while offline (e.g. standing in a shop with the list open).
 */
const runtimeCaching = [
  {
    urlPattern: /\/api\/auth\/session$/i,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'auth-session',
      networkTimeoutSeconds: 5,
      expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 30 },
    },
  },
  ...defaultRuntimeCaching,
];

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@my-receipe-book/shared'],
};

module.exports = withPWA(nextConfig);

