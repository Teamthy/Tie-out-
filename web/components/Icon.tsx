/**
 * The icon set: one 24-grid, 1.6px stroke, currentColor.
 *
 * Hand-drawn as paths rather than pulled from a library so the whole set
 * shares a weight and a corner radius, and so the site ships no icon
 * package. Every icon is decorative (aria-hidden) — the label next to it
 * carries the meaning.
 */
import type { ReactNode } from "react";

export type IconName =
  | "runs"
  | "compare"
  | "book"
  | "method"
  | "format"
  | "matrix"
  | "families"
  | "harness"
  | "arrow"
  | "arrow-up-right"
  | "check"
  | "menu"
  | "close"
  | "hash"
  | "terminal"
  | "shield"
  | "layers"
  | "link"
  | "chevron-down";

const paths: Record<IconName, ReactNode> = {
  runs: (
    <>
      <path d="M4 6h9M4 12h13M4 18h7" />
      <path d="M17 6h3" />
    </>
  ),
  compare: (
    <>
      <path d="M7 4v13M7 17l-2.5-2.5M7 17l2.5-2.5" />
      <path d="M17 20V7M17 7l-2.5 2.5M17 7l2.5 2.5" />
    </>
  ),
  book: (
    <>
      <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H18v14H6.5A1.5 1.5 0 0 0 5 19.5z" />
      <path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H18v2H6.5" />
    </>
  ),
  method: (
    <>
      <path d="M9 4h6M12 4v4" />
      <path d="M8 8h8l2 5.5a6 6 0 0 1-12 0z" />
      <path d="M10 14h4" />
    </>
  ),
  format: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M10 12h5M10 16h5" />
    </>
  ),
  matrix: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 10h16M4 15h16M10 4v16M15 4v16" />
    </>
  ),
  families: (
    <>
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8z" />
      <path d="M12 12v8.5M12 12 4 8M12 12l8-4" />
    </>
  ),
  harness: (
    <>
      <path d="M4 5h16M4 19h16" />
      <path d="M7 5v3M12 5v3M17 5v3M7 16v3M12 16v3M17 16v3" />
      <path d="M7 8h10v8H7z" />
    </>
  ),
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  "arrow-up-right": <path d="M8 16 16 8M9 8h7v7" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  hash: <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" />,
  terminal: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v6c0 4 3 7 7 8.5 4-1.5 7-4.5 7-8.5V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3.5 8 4.5-8 4.5L4 8z" />
      <path d="m4 13 8 4.5 8-4.5" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11.2 7" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7L12.8 17" />
    </>
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
};

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `icon ${className}` : "icon"}
    >
      {paths[name]}
    </svg>
  );
}
