import type { Metadata } from "next";
import { DocPage } from "../../components/DocPage";

export const metadata: Metadata = {
  title: "matrix",
};

export default function Page() {
  return <DocPage docKey="matrix" />;
}
