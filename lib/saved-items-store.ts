import fs from "node:fs/promises";
import path from "node:path";

export type SavedItemType = "paper" | "dataset";

export interface SavedItem {
  userId: string;
  type: SavedItemType;
  itemId: string;
  title: string;
  url: string;
  source?: string;
  year?: number;
  savedAt: string;
}

const STATE_DIR = path.join(process.cwd(), "state");
const STATE_FILE = path.join(STATE_DIR, "saved-items.json");

async function readAll(): Promise<SavedItem[]> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: SavedItem[]) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function listSavedItems(userId: string, type?: SavedItemType) {
  const all = await readAll();
  return all.filter((x) => x.userId === userId && (!type || x.type === type));
}

export async function saveItem(item: SavedItem) {
  const all = await readAll();
  const exists = all.find((x) => x.userId === item.userId && x.type === item.type && x.itemId === item.itemId);
  if (!exists) {
    all.push(item);
    await writeAll(all);
  }
}

export async function removeItem(userId: string, type: SavedItemType, itemId: string) {
  const all = await readAll();
  const next = all.filter((x) => !(x.userId === userId && x.type === type && x.itemId === itemId));
  await writeAll(next);
}
