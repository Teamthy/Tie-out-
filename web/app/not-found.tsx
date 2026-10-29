export default function NotFound() {
  return (
    <section>
      <div className="run-head">
        <h1>404</h1>
      </div>
      <p className="sub">
        no page at this path. the evidence starts at <a href="/">the landing page</a>, the records
        at <a href="/runs/">runs</a>, and the articles at <a href="/blog/">the blog</a>.
      </p>
    </section>
  );
}
