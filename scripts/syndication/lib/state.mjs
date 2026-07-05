// Idempotency state: maps packageId -> { channel -> { key -> record } }.
// Persisted as JSON so re-runs update instead of duplicating.
import fs from "node:fs";
import path from "node:path";
import { STATE_FILE } from "../config.mjs";

export function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

// key lets a channel namespace by sub-target (e.g. WordPress lane).
export function getRecord(state, packageId, channel, key = "_") {
  return state?.[packageId]?.[channel]?.[key] ?? null;
}

export function setRecord(state, packageId, channel, key, record) {
  state[packageId] = state[packageId] || {};
  state[packageId][channel] = state[packageId][channel] || {};
  state[packageId][channel][key] = { ...record, updatedAt: new Date().toISOString() };
  return state;
}
