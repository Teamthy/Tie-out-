import type { Metadata } from "next";
import { RunDetail } from "../../../components/RunDetail";
import { listRunIds } from "../../../lib/runs";

/**
 * One static page per committed bundle. A run id is a path relative to
 * runs/ (demo, demo-stability/a), so the route is a catch-all and the
 * exported directory nests exactly like the runs directory does:
 * /run/demo-stability/a/. A single dynamic segment would have encoded
 * the slash into one path segment and made the stability pair
 * unreachable by URL.
 */
export function generateStaticParams() {
  return listRunIds().map((id) => ({ id: id.split("/") }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: { id: string[] } }): Metadata {
  const id = params.id.join("/");
  return {
    title: `run ${id}`,
    description: `The evidence bundle for ${id}: chained verdict events, negative controls, named gaps, judge audit, provenance.`,
  };
}

export default function RunPage({ params }: { params: { id: string[] } }) {
  return <RunDetail id={params.id.join("/")} />;
}
