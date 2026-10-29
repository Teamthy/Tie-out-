import type { Metadata } from "next";
import { DocPage } from "../../components/DocPage";

export const metadata: Metadata = {
  title: "harness",
};

export default function Page() {
  return <DocPage docKey="harness" />;
}
