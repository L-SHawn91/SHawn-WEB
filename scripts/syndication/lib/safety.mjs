// Public-safety scrub for spoke channels. Mirrors the production
// sync-shide-blog-packages.mjs intent: replace internal model/bot names and
// strip overt monetization framing before content leaves for public channels.
// The hub bake already scrubs; spokes re-apply defensively.

const REPLACEMENTS = new Map([
  [["ge", "mini"].join(""), "Google AI"],
  [["sonol", "bot"].join(""), "automation bot"],
]);

const FORBIDDEN = new RegExp([...REPLACEMENTS.keys()].join("|"), "gi");

// Overt monetization phrases that the public surface must not carry.
const MONETIZATION_PATTERNS = [
  /\b수익\s*(창출|극대화|화)\b/g,
  /\b돈\s*벌/g,
  /\bmonetiz\w*/gi,
];

export function scrubText(input) {
  let out = String(input ?? "");
  out = out.replace(FORBIDDEN, (m) => REPLACEMENTS.get(m.toLowerCase()) ?? m);
  return out;
}

export function hasMonetizationFraming(input) {
  return MONETIZATION_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(String(input ?? ""));
  });
}

// Gate: returns { ok, issues[] }. Blocks if forbidden terms survive or overt
// monetization framing is present in public-facing fields.
export function runSafetyGate(item) {
  const issues = [];
  const fields = { title: item.title, excerpt: item.excerpt, body: item.bodyMarkdown };
  for (const [name, value] of Object.entries(fields)) {
    FORBIDDEN.lastIndex = 0;
    if (FORBIDDEN.test(String(value ?? ""))) issues.push(`forbidden internal term in ${name}`);
    if (hasMonetizationFraming(value)) issues.push(`monetization framing in ${name}`);
  }
  return { ok: issues.length === 0, issues };
}
