import type { Metadata } from "next";
import { PrivacyPageClient } from "@/components/legal/privacy-page-client";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How SHawn_LAB handles optional reader updates and aggregate analytics.",
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
