export const BLOG_LANES = ["AI Notes", "Bio Notes", "Asset Signals"] as const;
export type BlogLane = (typeof BLOG_LANES)[number];
export type AssetPostKind = "explainer" | "signal";

type PublicPostSummary = {
  slug: string;
  title: string;
  category: string;
  kind?: string;
};

export function getPublicCategoryLabel(category: string | undefined | null): string {
  const value = (category || "").trim();
  const normalized = value.toLowerCase();

  if (!value) return "Public Notes";
  if (normalized === "bio-science") return "Bio Notes";
  if (normalized === "automation") return "AI Notes";
  if (normalized === "market-intelligence") return "Asset Signals";
  if (normalized === "news") return "Public Notes";
  if (normalized === "shide ai" || normalized.startsWith("shide ai ")) return "AI Notes";
  if (normalized === "shide bio" || normalized.startsWith("shide bio ")) return "Bio Notes";
  if (normalized === "shide assets" || normalized.startsWith("shide assets ")) return "Asset Signals";
  if (normalized.startsWith("shide")) return "Public Notes";

  return value;
}

export function getPublicTagLabels(tags: string[] | undefined | null): string[] {
  const publicTags = (tags || [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => !tag.toLowerCase().startsWith("shide"));

  return [...new Set(publicTags)];
}

export function isBlogLane(category: string): category is BlogLane {
  return BLOG_LANES.some((lane) => lane === category);
}

export function getAssetPostKind(post: PublicPostSummary): AssetPostKind {
  if (getPublicCategoryLabel(post.category) !== "Asset Signals") return "explainer";
  if (post.kind === "signal" || post.kind === "explainer") return post.kind;

  const text = `${post.slug} ${post.title}`.toLowerCase();
  const signalPatterns = [
    /market[- ](?:signal|check|note|routine|close|open)/,
    /(?:pre[- ]?open|first[- ]hour|live[- ]revision)/,
    /(?:한국장|미국장|장전|개장|마감|시장\s*신호|시장\s*점검)/,
    /(?:kospi|korea market|us market).*(?:signal|check|note|open|close)/,
  ];

  return signalPatterns.some((pattern) => pattern.test(text)) ? "signal" : "explainer";
}
