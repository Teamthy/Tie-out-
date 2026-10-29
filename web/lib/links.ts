/**
 * Client-safe link helpers (no node: imports, so this can be used from
 * client components).
 *
 * A run id is a path relative to runs/ (demo, demo-stability/a). The
 * static export nests run pages the same way, so every segment is
 * encoded individually and the trailing slash matches
 * `trailingSlash: true`.
 */
export function runPath(id: string): string {
  const encoded = id
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `/run/${encoded}/`;
}
