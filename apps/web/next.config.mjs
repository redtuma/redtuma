/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fully static site → export HTML/CSS/JS to `out/` for Cloudflare Pages.
  output: 'export',
  images: { unoptimized: true },
  // Emit `/docs/agents/index.html` so nested routes resolve cleanly on Pages.
  trailingSlash: true,
}

export default nextConfig
