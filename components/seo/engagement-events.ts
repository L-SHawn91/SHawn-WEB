"use client";

import { track } from "@vercel/analytics";

type EngagementProperties = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, parameters?: EngagementProperties) => void;
  }
}

/** Sends non-identifying interaction counts to the configured analytics tools. */
export function trackEngagement(eventName: string, properties: EngagementProperties = {}) {
  try {
    track(eventName, properties);
  } catch {
    // Analytics must never block a reader interaction.
  }

  try {
    window.gtag?.("event", eventName, properties);
  } catch {
    // GA4 is optional and may be blocked by a reader's privacy tooling.
  }
}
