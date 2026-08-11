import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const scriptPath = "/home/mdge/.hermes/scripts/shawn_web_wordpress_sync.sh";
const source = fs.readFileSync(scriptPath, "utf8");

assert.match(source, /public\/reports\/time-sliced/, "generated report artifact boundary must be explicit");
assert.match(source, /excluded_generated_artifact\(rel: str\)/, "baseline and snapshot need a shared exclusion rule");
assert.match(source, /node scripts\/sync-public-content\.mjs/, "nightly job must use the full public-content pipeline");
assert.match(source, /MANAGED_PUBLIC_PATHS=\(content\/ public\/reports\/index\.json public\/reports\/latest\.json\)/, "managed public index files must be tracked with WordPress content");
assert.match(source, /managed_public_tree_digest\(\)/, "deploy state must include the report index as well as content");
assert.match(source, /verify_vercel_auth\(\)/, "Vercel authorization must be checked before content sync");
assert.match(source, /verify_vercel_project_access\(\)/, "Vercel project linkage must be checked before content sync");
const authCall = source.indexOf("verify_vercel_auth\nverify_vercel_project_access\n[[ -f");
assert.ok(authCall >= 0 && authCall < source.indexOf("SYNC_OUTPUT=$(node scripts/sync-public-content.mjs"), "authorization preflight must precede public-content writes");
assert.doesNotMatch(source, /node scripts\/sync-wordpress-public-posts\.mjs 2>&1/, "nightly job must not bypass the full public-content pipeline");

console.log("nightly public-content sync policy test passed");
