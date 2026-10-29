import type { Metadata } from "next";
import { DocPage } from "../../components/DocPage";

export const metadata: Metadata = {
  title: "format",
};

export default function Page() {
  return <DocPage docKey="format" />;
}
