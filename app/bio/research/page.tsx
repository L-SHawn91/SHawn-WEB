import { BioHubPageInner } from "@/components/bio/bio-hub-page";

// i18n-exempt: wrapper route renders shared Bio Hub component.
export default function BioResearchPage() {
  return <BioHubPageInner forcedPanel="research" />;
}
