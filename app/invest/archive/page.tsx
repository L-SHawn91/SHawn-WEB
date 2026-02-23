import { InvestHubPageInner } from "@/components/invest/invest-hub-page";

// i18n-exempt: wrapper route renders shared i18n-enabled Invest Hub component.
export default function InvestArchivePage() {
  return <InvestHubPageInner forcedPanel="archive" />;
}
