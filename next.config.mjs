/** @type {import('next').NextConfig} */
const serverExternals = ['sharp', '@wa-directory/shared', 'wa-directory-shared'];

const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: serverExternals,
  },
  webpack: (config, options) => {
    if (options.isServer && options.nextRuntime === 'nodejs') {
      config.externals.push(...serverExternals.map((pkg) => ({ [pkg]: `commonjs2 ${pkg}` })));
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zefhvpifhzklkbkptjgv.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
