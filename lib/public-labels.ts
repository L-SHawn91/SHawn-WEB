export function getPublicCategoryLabel(category: string | undefined | null): string {
  const value = (category || "").trim();
  const normalized = value.toLowerCase();

  if (!value) return "Public Notes";
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
