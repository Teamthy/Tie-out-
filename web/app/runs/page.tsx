import type { Metadata } from "next";
import { RunList } from "../../components/RunList";

export const metadata: Metadata = {
  title: "runs",
  description: "Every committed evidence bundle: verdicts, controls, named gaps, judge audit.",
};

export default function RunsPage() {
  return <RunList />;
}
