"use client";

import { useEffect } from "react";

function shouldKeepTitle(el: HTMLElement): boolean {
  if (el.tagName === "IFRAME") return true;
  if (el.hasAttribute("data-allow-title")) return true;
  return false;
}

function scrubTitle(el: HTMLElement) {
  if (!el.hasAttribute("title")) return;
  if (shouldKeepTitle(el)) return;

  const title = String(el.getAttribute("title") || "").trim();
  if (!title) {
    el.removeAttribute("title");
    return;
  }

  const hasAria = el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby");
  const text = String(el.textContent || "").trim();

  // Preserve a11y label when the element is icon-first and has no readable text.
  if (!hasAria && text.length === 0) {
    el.setAttribute("aria-label", title);
  }

  el.removeAttribute("title");
}

function scrubAllTitles(root: ParentNode) {
  const nodes = root.querySelectorAll<HTMLElement>("[title]");
  nodes.forEach((node) => scrubTitle(node));
}

export function SuppressTitleTooltips() {
  useEffect(() => {
    let rafId = 0;

    const run = () => scrubAllTitles(document);
    const schedule = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(run);
    };

    run();

    const observer = new MutationObserver(() => {
      schedule();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["title"],
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return null;
}
