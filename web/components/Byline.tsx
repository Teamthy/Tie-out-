import { AUTHOR, LinkedInButton } from "./LinkedIn";

/** The byline under every article: who wrote it, when, and where to find them. */
export function Byline({
  date,
  minutes,
  discipline,
}: {
  date: string;
  minutes: number;
  discipline: string;
}) {
  return (
    <div className="byline">
      <span className="byline-author">{AUTHOR}</span>
      <span className="byline-sep">·</span>
      <LinkedInButton variant="link" label="linkedin" />
      <span className="byline-sep">·</span>
      <span>
        {discipline} · {date} · {minutes} min
      </span>
    </div>
  );
}
