// Disclosed affiliate primitives for SHawn-WEB. Traffic-based monetization that
// complements (or replaces) display ads. Satisfies SHide `no_private_contracts`
// disclosure intent + FTC/공정위-style disclosure. See docs/WEB_MONETIZATION.md.
import type { ReactNode } from "react";

// Default Coupang Partners disclosure (Korea). Override per program/region.
export const DEFAULT_DISCLOSURE =
  "이 페이지의 일부 링크는 제휴 링크이며, 구매 시 판매자로부터 일정액의 수수료를 제공받을 수 있습니다. (쿠팡 파트너스 활동 포함)";

type AffiliateLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  /** Renders a small "광고" marker next to the link for at-a-glance disclosure. */
  marker?: boolean;
};

/**
 * An outbound affiliate link with the correct rel attributes for SEO + policy:
 * `sponsored` (paid relationship) + `nofollow noopener`. Opens in a new tab.
 */
export function AffiliateLink({ href, children, className, marker = true }: AffiliateLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      className={className}
      data-affiliate="true"
    >
      {children}
      {marker ? (
        <sup className="ml-0.5 align-super text-[0.6em] text-muted-foreground" title="제휴 링크">
          광고
        </sup>
      ) : null}
    </a>
  );
}

/**
 * Disclosure banner. Place near the top of any post/page that contains
 * affiliate links (required for compliance; keep it visible, not hidden).
 */
export function AffiliateDisclosure({ text = DEFAULT_DISCLOSURE, className }: { text?: string; className?: string }) {
  return (
    <p
      className={className ?? "rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground"}
      data-affiliate-disclosure="true"
    >
      {text}
    </p>
  );
}
