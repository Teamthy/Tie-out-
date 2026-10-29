import type { Metadata } from "next";
import { FamiliesPage } from "../../components/FamiliesPage";

export const metadata: Metadata = {
  title: "families",
  description: "Check families F1 and F2, their policy versions, and the OWASP Agentic crosswalk.",
};

export default function Families() {
  return <FamiliesPage />;
}
