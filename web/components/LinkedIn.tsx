export const LINKEDIN_URL = "https://www.linkedin.com/in/olusanya-timothy";
export const AUTHOR = "Timothy Olusanya";

/**
 * The LinkedIn link, in the site's own monochrome button language: a
 * bordered mono label, no brand blue, no icon-lockup. `variant="link"`
 * is the quieter inline form used in bylines.
 */
export function LinkedInButton({
  label = "linkedin",
  variant = "btn",
}: {
  label?: string;
  variant?: "btn" | "link";
}) {
  return (
    <a
      className={variant === "btn" ? "btn" : "byline-link"}
      href={LINKEDIN_URL}
      target="_blank"
      rel="noreferrer noopener"
    >
      {label} <span aria-hidden="true">↗</span>
    </a>
  );
}
