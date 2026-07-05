"use client";

// Google AdSense integration for SHawn-WEB (phdshawn.com, self-hosted Next.js).
// Inert until NEXT_PUBLIC_ADSENSE_CLIENT is set, so it is safe to commit and
// deploy before AdSense approval. See docs/WEB_MONETIZATION.md.
import { useEffect, type CSSProperties } from "react";
import Script from "next/script";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT; // e.g. "ca-pub-1234567890123456"

/**
 * Loads the AdSense loader script once. Place in app/layout.tsx <body> (or head).
 * Renders nothing if AdSense is not configured.
 */
export function AdSenseScript() {
  if (!ADSENSE_CLIENT) return null;
  return (
    <Script
      id="adsbygoogle-init"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  );
}

type AdSlotProps = {
  /** AdSense ad unit slot id (from the AdSense dashboard). */
  slot: string;
  format?: string;
  responsive?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * A single responsive display ad unit. Drop into blog post bodies / sidebars.
 * Renders nothing until AdSense is configured, so layouts stay clean pre-approval.
 */
export function AdSlot({ slot, format = "auto", responsive = true, className, style }: AdSlotProps) {
  useEffect(() => {
    if (!ADSENSE_CLIENT) return;
    try {
      // @ts-expect-error adsbygoogle is injected by the AdSense loader script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense not ready yet; ignored */
    }
  }, [slot]);

  if (!ADSENSE_CLIENT || !slot) return null;

  return (
    <aside className={className} aria-label="advertisement" data-ad-container>
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </aside>
  );
}
