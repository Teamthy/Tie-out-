import { Icon } from "./Icon";

/** The one place the author URL is written down. */
export const LINKEDIN_URL = "https://www.linkedin.com/in/olusanya-timothy";
export const AUTHOR = "Timothy Olusanya";

/**
 * The author link, in the site's own button language: monochrome, hairline
 * border, no brand colour. `variant` picks the weight — "btn" for action
 * rows, "link" for inline bylines.
 */
export function LinkedInButton({
  label = "linkedin",
  variant = "btn",
}: {
  label?: string;
  variant?: "btn" | "link";
}) {
  const className = variant === "btn" ? "btn btn-ghost" : "inline-link";
  return (
    <a
      className={className}
      href={LINKEDIN_URL}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`${AUTHOR} on LinkedIn`}
    >
      <Icon name={variant === "btn" ? "arrow-up-right" : "link"} size={variant === "btn" ? 14 : 13} />
      {label}
    </a>
  );
}
