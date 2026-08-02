import fs from "fs/promises";
import path from "path";

const REPORT_ROOT = path.join(process.cwd(), "public", "reports");
const INDEX_PATH = path.join(REPORT_ROOT, "index.json");
const QUANT_TYPES = new Set(["KR", "US", "MORNING", "EVENING"]);

function normalizeType(value = "") {
  const raw = String(value).toUpperCase().trim();
  if (QUANT_TYPES.has(raw)) return raw;
  if (/\bKR\b/i.test(raw)) return "KR";
  if (/\bUS\b/i.test(raw)) return "US";
  return raw || "UNKNOWN";
}

function parseDateFromFilename(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})_(.+)\.json$/);
  if (!match) return null;
  const [, date, hh, mm, typeRaw] = match;
  const type = normalizeType(typeRaw);
  const timestamp = `${date}T${hh}:${mm}:00+09:00`;
  return { date, time: `${hh}:${mm}`, type, timestamp };
}

function buildEntry(file, parsed, fromFile = {}) {
  const filename = path.basename(file);
  const base = path.basename(file).replace(/\.json$/i, "");
  const html = `${base}.html`;
  const meta = parsed?.meta || {};
  const parsedDate = parseDateFromFilename(filename);
  const date = parsedDate?.date || meta.date || "";
  const time = parsedDate?.time || meta.time || "";
  const type = parsedDate?.type || normalizeType(meta.market || meta.type || "");
  const timestamp = parsedDate?.timestamp || meta.timestamp || new Date().toISOString();

  return {
    schema_version: "market_digest.web.v1",
    date,
    time,
    type,
    title: meta.title || `${date} ${time} ${type} Market Report`.trim(),
    path: `/reports/${base}.html`,
    filename,
    timestamp,
    json_path: `/reports/${filename}`,
    content_class: "reference",
    disclaimer: true,
    data_quality: meta.data_quality || "public-summary",
    source: "auto-sync",
  };
}

async function main() {
  const list = await fs.readdir(REPORT_ROOT);
  const jsonFiles = list.filter((x) => x.endsWith(".json") && x.includes("_") );

  const entries = await Promise.all(
    jsonFiles.map(async (file) => {
      const full = path.join(REPORT_ROOT, file);
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

  const indexByJson = new Map(entries.map((e) => [e.filename, e]));

  const existsHtml = new Set(
    list.filter((x) => x.endsWith(".html")).map((x) => x.toLowerCase())
  );

  // include only entries whose JSON exists and html/legacy entry is optional
  const filtered = [...indexByJson.values()].filter((entry) => {
    const htmlFile = path.basename(entry.path).toLowerCase();
    const hasHtml = existsHtml.has(htmlFile);
    return hasHtml || !entry.path;
  });

  const sorted = filtered.sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));

  await fs.writeFile(INDEX_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
  const latest = {
    schema_version: "market_digest.web.latest.v1",
    content_class: "reference",
    generated_at: sorted[0]?.timestamp || new Date().toISOString(),
    items: Object.fromEntries(
      ["KR", "US", "MORNING", "EVENING"].map((type) => [type, sorted.find((item) => item.type === type) || null])
    ),
    compliance: {
      disclaimer: "For education and commentary only, not investment advice.",
      no_trade_instruction: true,
    },
  };
  await fs.writeFile(path.join(REPORT_ROOT, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`, "utf-8");
  console.log(`updated index.json with ${sorted.length} items`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
