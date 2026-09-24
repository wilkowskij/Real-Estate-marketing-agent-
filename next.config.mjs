/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // `next build` runs ESLint by default. A working ESLint config was added
    // in this same change (previously `next lint` had no config at all and
    // dropped into an interactive setup wizard, so lint had never actually
    // run in this repo's history). That newly-real lint found 6 pre-existing
    // react/no-unescaped-entities errors in app source, which is out of scope
    // to fix here. `npm run lint` still runs and reports them on its own —
    // this only keeps a pre-existing, unrelated lint failure from blocking
    // `npm run build`. Remove this once those 6 errors are fixed.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
