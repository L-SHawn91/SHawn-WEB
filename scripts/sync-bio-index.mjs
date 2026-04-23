import fs from "fs/promises";
import path from "path";

const BIO_ROOT = path.join(process.cwd(), "public", "bio-data");
const INDEX_PATH = path.join(BIO_ROOT, "index.json");
const BIO_TYPES = new Set(["NOTE", "ORGANOID", "DATASET", "PAPER", "PROTOCOL"]);

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
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})_([A-Z]+)_(.+)\.json$/i);
  if (!m) return null;
  const [, date, typeRaw, slug] = m;
  return {
    date,
    type: normalizeType(typeRaw),
    slug,
    timestamp: `${date}T00:00:00+09:00`,
  };
}

function buildEntry(file, parsed) {
  const filename = path.basename(file);
  const base = filename.replace(/\.json$/i, "");
  const meta = parsed?.meta || {};
  const parsedName = parseFromFilename(filename);
  const date = parsedName?.date || meta.date || "";
  const type = parsedName?.type || normalizeType(meta.type || "NOTE");
  const slug = parsedName?.slug || meta.slug || base;
  const timestamp = parsedName?.timestamp || meta.timestamp || new Date().toISOString();

  return {
    date,
    type,
    slug,
    title: meta.title || `${date} ${type} ${slug}`.trim(),
    summary: meta.summary || "",
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    filename,
    json_path: `/bio-data/${filename}`,
    timestamp,
    source: "auto-sync",
  };
}

async function main() {
  await fs.mkdir(BIO_ROOT, { recursive: true });
  const list = await fs.readdir(BIO_ROOT).catch(() => []);
  const jsonFiles = list.filter((x) => x.endsWith(".json") && x !== "index.json");

  const entries = await Promise.all(
    jsonFiles.map(async (file) => {
      const full = path.join(BIO_ROOT, file);
      const raw = await fs.readFile(full, "utf-8").catch(() => "{}");
      const parsed = (() => {
        try {
          return JSON.parse(raw);
        } catch {
          return {};
        }
      })();
      return buildEntry(file, parsed);
    })
  );

  const sorted = entries.sort((a, b) =>
    String(b.timestamp || "").localeCompare(String(a.timestamp || ""))
  );

  await fs.writeFile(INDEX_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
  console.log(`updated bio-data/index.json with ${sorted.length} items`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
