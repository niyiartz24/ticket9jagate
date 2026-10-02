/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Service worker + manifest are served from /public as static assets.
  // No sensitive API route should ever be cached by the SW (see public/sw.js).
};

export default nextConfig;
