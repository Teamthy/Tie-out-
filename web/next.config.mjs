/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // every route is a directory with an index.html, so the export is
  // served identically by Vercel and by `tieout serve` (Starlette
  // StaticFiles, html=True) with no rewrite rules
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
