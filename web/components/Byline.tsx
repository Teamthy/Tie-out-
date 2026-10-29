import { LinkedInButton, AUTHOR } from "./LinkedIn";

/**
 * Author · linkedin · discipline · date · minutes, as one hairline row.
 * Used under every article title and on the article's closing card.
 */
export function Byline({
  discipline,
  date,
  minutes,
}: {
  discipline: string;
  date: string;
  minutes: number;
}) {
  return (
    <div className="byline">
      <span className="byline-avatar" aria-hidden="true">TO</span>
      <span className="byline-author">{AUTHOR}</span>
      <span className="byline-sep" aria-hidden="true">·</span>
      <LinkedInButton variant="link" label="linkedin" />
      <span className="byline-sep" aria-hidden="true">·</span>
      <span className="byline-meta">{discipline}</span>
      <span className="byline-sep" aria-hidden="true">·</span>
      <span className="byline-meta">{date}</span>
      <span className="byline-sep" aria-hidden="true">·</span>
      <span className="byline-meta">{minutes} min</span>
    </div>
  );
}
