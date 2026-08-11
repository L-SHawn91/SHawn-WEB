import assert from "node:assert/strict";
import fs from "node:fs";

const scriptPath = "/home/mdge/.hermes/scripts/shawn_web_wordpress_sync.sh";
const source = fs.readFileSync(scriptPath, "utf8");

assert.match(source, /public\/reports\/time-sliced/, "generated report artifact boundary must be explicit");
assert.match(source, /excluded_generated_artifact\(rel: str\)/, "baseline needs an explicit generated-artifact exclusion rule");
assert.match(source, /node scripts\/sync-public-content\.mjs/, "nightly job must use the full public-content pipeline");
assert.match(source, /MANAGED_PUBLIC_PATHS=\(content\/ public\/reports\/index\.json public\/reports\/latest\.json\)/, "managed public index files must be tracked with WordPress content");
assert.match(source, /managed_public_tree_digest\(\)/, "deploy state must include the report index as well as content");
assert.match(source, /git push origin HEAD:main/, "nightly deploy must use the repository's protected GitHub Actions path");
assert.match(source, /wait_for_github_deployment/, "nightly deploy must wait for the canonical deployment workflow");
assert.match(source, /run watch .*--exit-status/, "workflow completion must be checked, not assumed after push");
assert.doesNotMatch(source, /populate_deploy_snapshot/, "nightly job must not retain an alternate local deployment snapshot path");
assert.doesNotMatch(source, /VERCEL=/, "nightly job must not depend on local Vercel credentials");
assert.doesNotMatch(source, /\[\[ -n "\$changed_summary" \]\] && echo/, "no-change success reporting must not trip set -e");
assert.doesNotMatch(source, /node scripts\/sync-wordpress-public-posts\.mjs 2>&1/, "nightly job must not bypass the full public-content pipeline");

const pushIndex = source.indexOf("git push origin HEAD:main");
const waitIndex = source.lastIndexOf("wait_for_github_deployment \"$GH_BIN\"");
const readbackIndex = source.lastIndexOf("probe_deployment \"$PRODUCTION_URL\"");
assert.ok(pushIndex >= 0 && pushIndex < waitIndex && waitIndex < readbackIndex, "push, workflow completion, and production read-back must occur in order");

console.log("nightly public-content sync policy test passed");
