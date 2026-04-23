import fs from "fs/promises";
import path from "path";

const BIO_ROOT = path.join(process.cwd(), "public", "bio-data");
const INDEX_PATH = path.join(BIO_ROOT, "index.json");
const STATUS_PATH = path.join(BIO_ROOT, "_logs", "last-index.json");
const BIO_TYPES = new Set(["NOTE", "ORGANOID", "DATASET", "PAPER", "PROTOCOL"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FILENAME_RE = /^(\d{4}-\d{2}-\d{2})_([A-Z]+)_(.+)\.json$/i;

function normalizeType(value = "") {
  const raw = String(value).toUpperCase().trim();
  if (BIO_TYPES.has(raw)) return raw;
  if (/ORGAN/i.test(raw)) return "ORGANOID";
  if (/DATA/i.test(raw)) return "DATASET";
  if (/PAPER/i.test(raw)) return "PAPER";
  if (/PROTO/i.test(raw)) return "PROTOCOL";
  if (/NOTE/i.test(raw)) return "NOTE";
  return raw || "NOTE";
}

function parseFromFilename(filename) {
  const m = filename.match(FILENAME_RE);
  if (!m) return null;
  const [, date, typeRaw, slug] = m;
  return {
    date,
    type: normalizeType(typeRaw),
    slug,
    timestamp: `${date}T00:00:00+09:00`,
  };
}

function isValidTimestamp(value) {
  if (!value) return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

function validateEntry(filename, parsed) {
  const problems = [];
  const meta = parsed?.meta;
  if (!meta || typeof meta !== "object") {
    problems.push("missing meta");
  }
  const parsedName = parseFromFilename(filename);
  const date = parsedName?.date || meta?.date || "";
  if (!DATE_RE.test(String(date))) {
    problems.push(`invalid date (${date || "empty"})`);
  }
  const type = parsedName?.type || normalizeType(meta?.type || "");
  if (!BIO_TYPES.has(type)) {
    problems.push(`unknown type (${type})`);
  }
  const slug = parsedName?.slug || meta?.slug || "";
  if (!String(slug).trim()) {
    problems.push("empty slug");
  }
  const timestamp = parsedName?.timestamp || meta?.timestamp;
  if (timestamp && !isValidTimestamp(timestamp)) {
    problems.push(`unparseable timestamp (${timestamp})`);
  }
  return { problems, date, type, slug, timestamp };
}

function buildEntry(filename, parsed, validated) {
  const base = filename.replace(/\.json$/i, "");
  const meta = parsed?.meta || {};
  const timestamp = validated.timestamp || new Date().toISOString();

  return {
    date: validated.date,
    type: validated.type,
    slug: validated.slug || base,
    title: meta.title || `${validated.date} ${validated.type} ${validated.slug}`.trim(),
    summary: meta.summary || "",
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    filename,
    json_path: `/bio-data/${filename}`,
    timestamp,
    source: "auto-sync",
  };
}

async function readParsed(full) {
  const raw = await fs.readFile(full, "utf-8").catch(() => null);
  if (raw == null) return { ok: false, reason: "read failed" };
  try {
    return { ok: true, parsed: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, reason: `invalid json: ${err.message}` };
  }
}

async function writeStatus(summary) {
  await fs.mkdir(path.dirname(STATUS_PATH), { recursive: true });
  await fs.writeFile(STATUS_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf-8");
}

async function main() {
  await fs.mkdir(BIO_ROOT, { recursive: true });
  const list = await fs.readdir(BIO_ROOT).catch(() => []);
  const jsonFiles = list.filter((x) => x.endsWith(".json") && x !== "index.json");

  const entries = [];
  const skipped = [];

  for (const file of jsonFiles) {
    const full = path.join(BIO_ROOT, file);
    const read = await readParsed(full);
    if (!read.ok) {
      skipped.push({ filename: file, reason: read.reason });
      console.warn(`[bio-sync] skip ${file}: ${read.reason}`);
      continue;
    }
    const validated = validateEntry(file, read.parsed);
    if (validated.problems.length) {
      const reason = validated.problems.join("; ");
      if (!validated.date || !validated.slug) {
        skipped.push({ filename: file, reason });
        console.warn(`[bio-sync] skip ${file}: ${reason}`);
        continue;
      }
      console.warn(`[bio-sync] warn ${file}: ${reason}`);
    }
    entries.push(buildEntry(file, read.parsed, validated));
  }

  const sorted = entries.sort((a, b) =>
    String(b.timestamp || "").localeCompare(String(a.timestamp || ""))
  );

  await fs.writeFile(INDEX_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");

  const summary = {
    ranAt: new Date().toISOString(),
    scanned: jsonFiles.length,
    indexed: sorted.length,
    skipped: skipped.length,
    skippedFiles: skipped,
    latest: sorted[0]?.timestamp || null,
  };
  await writeStatus(summary);

  console.log(
    `updated bio-data/index.json: ${sorted.length}/${jsonFiles.length} indexed, ${skipped.length} skipped`
  );
}

main().catch(async (err) => {
  console.error(err);
  await writeStatus({
    ranAt: new Date().toISOString(),
    error: err?.message || String(err),
  }).catch(() => {});
  process.exit(1);
});
