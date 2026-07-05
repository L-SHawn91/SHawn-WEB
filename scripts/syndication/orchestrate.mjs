#!/usr/bin/env node
// Content syndication orchestrator.
//   node scripts/syndication/orchestrate.mjs --slug <slug> [--channels shawn-web,wordpress,naver] [--dry-run] [--publish]
//   node scripts/syndication/orchestrate.mjs --all [--filter 20260702] [--dry-run]
// Flow: normalize (baked MDX -> ContentItem) -> safety gate -> hub first
// (canonical) -> spokes in parallel -> persist idempotency state -> report.
import process from "node:process";
import { readContentItem, listPostSlugs } from "./lib/content-item.mjs";
import { runSafetyGate } from "./lib/safety.mjs";
import { loadState, saveState } from "./lib/state.mjs";
import { DEFAULTS } from "./config.mjs";
import { shawnWebAdapter } from "./adapters/shawn-web.mjs";
import { wordpressAdapter } from "./adapters/wordpress.mjs";
import { naverAdapter } from "./adapters/naver.mjs";

const ALL_ADAPTERS = { "shawn-web": shawnWebAdapter, wordpress: wordpressAdapter, naver: naverAdapter };

function parseArgs(argv) {
  const args = { channels: null, slugs: [], dryRun: false, publish: false, all: false, filter: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--publish") args.publish = true;
    else if (a === "--all") args.all = true;
    else if (a === "--slug") args.slugs.push(argv[++i]);
    else if (a === "--filter") args.filter = argv[++i];
    else if (a === "--channels") args.channels = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
  }
  return args;
}

function selectedAdapters(channels) {
  const keys = channels && channels.length ? channels : Object.keys(ALL_ADAPTERS);
  const hub = keys.filter((k) => ALL_ADAPTERS[k]?.role === "hub").map((k) => ALL_ADAPTERS[k]);
  const spokes = keys.filter((k) => ALL_ADAPTERS[k]?.role === "spoke").map((k) => ALL_ADAPTERS[k]);
  return { hub, spokes };
}

async function syndicateOne(slug, ctx) {
  const item = readContentItem(slug);
  const gate = runSafetyGate(item);
  if (!gate.ok) {
    return { slug, gate, results: [{ channel: "gate", status: "failed", note: gate.issues.join("; ") }] };
  }

  const { hub, spokes } = selectedAdapters(ctx.channels);
  const results = [];

  // 1) Hub first, to establish canonical.
  for (const adapter of hub) results.push(await adapter.publish(item, ctx));

  // Abort spokes if hub hard-failed.
  const hubFailed = results.some((r) => ALL_ADAPTERS[r.channel]?.role === "hub" && r.status === "failed");
  if (hubFailed) {
    return { slug, gate, results: [...results, { channel: "spokes", status: "skipped", note: "hub failed" }] };
  }

  // 2) Spokes in parallel.
  const spokeResults = await Promise.allSettled(spokes.map((a) => a.publish(item, ctx)));
  spokeResults.forEach((r, i) => {
    results.push(r.status === "fulfilled" ? r.value
      : { channel: spokes[i].key, status: "failed", note: String(r.reason?.message || r.reason) });
  });

  return { slug, gate, results };
}

async function main() {
  const args = parseArgs(process.argv);
  const slugs = args.all ? listPostSlugs(args.filter) : args.slugs;
  if (slugs.length === 0) {
    console.error("No slugs. Use --slug <slug> or --all [--filter <substr>].");
    process.exit(1);
  }

  const state = loadState();
  const ctx = {
    dryRun: args.dryRun,
    draftFirst: args.publish ? false : DEFAULTS.draftFirst,
    channels: args.channels,
    state,
  };

  console.log(`Syndicating ${slugs.length} post(s)${ctx.dryRun ? " [DRY-RUN]" : ""}${ctx.draftFirst ? " [draft-first]" : " [PUBLISH]"}`);
  for (const slug of slugs) {
    const { results } = await syndicateOne(slug, ctx);
    console.log(`\n# ${slug}`);
    for (const r of results) {
      const icon = { created: "✅", updated: "✅", "manual-required": "📝", skipped: "⏭️", failed: "❌" }[r.status] || "•";
      console.log(`  ${icon} ${r.channel}: ${r.status}${r.note ? ` — ${r.note}` : ""}${r.url ? ` (${r.url})` : ""}`);
    }
  }

  if (!ctx.dryRun) saveState(state);
  console.log(`\nDone.${ctx.dryRun ? " (dry-run: state not saved)" : ""}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
