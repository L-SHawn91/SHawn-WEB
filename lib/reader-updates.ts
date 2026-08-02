export const READER_UPDATE_INTERESTS = ["updates", "reports", "collaboration"] as const;

export type ReaderUpdateInterest = (typeof READER_UPDATE_INTERESTS)[number];

export type ReaderUpdateSubmission = {
  email: string;
  interests: ReaderUpdateInterest[];
  website?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeReaderUpdateSubmission(input: unknown): ReaderUpdateSubmission | null {
  if (!input || typeof input !== "object") return null;

  const value = input as Record<string, unknown>;
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const website = typeof value.website === "string" ? value.website.trim() : "";
  const rawInterests = Array.isArray(value.interests) ? value.interests : [];
  const interests = [...new Set(rawInterests.filter((item): item is ReaderUpdateInterest =>
    typeof item === "string" && READER_UPDATE_INTERESTS.includes(item as ReaderUpdateInterest),
  ))];

  if (!EMAIL_PATTERN.test(email) || email.length > 254 || website.length > 0 || interests.length === 0) {
    return null;
  }

  return { email, interests, website };
}
