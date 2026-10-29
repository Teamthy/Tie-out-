import type { Metadata } from "next";
import { Compare } from "../../components/Compare";

export const metadata: Metadata = {
  title: "compare",
  description:
    "Cross-run stability: align two bundles by pre-assigned id, and separate verdict drift from transcript drift.",
};

export default function ComparePage() {
  return <Compare />;
}
