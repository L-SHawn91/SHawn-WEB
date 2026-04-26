import { Dirent, promises as fs } from "fs";
import path from "path";

const githubRoot = "/home/mdge/github";
const currentRepoRoot = process.cwd();
const dashboardRepoRoot = "/home/mdge/github/SHawn-dashboard";
const workspaceProjectsPath = path.join(dashboardRepoRoot, "workspace.projects.json");
const obsidianVaultRoot = "/home/mdge/github/SHawn-Lab-Vault";

export type DashboardProject = {
  slug: string;
  name: string;
  status: string;
  repo: string;
  tag: string;
  workingFolder: string;
  session: string;
  discussion: string;
  canonicalFiles: string[];
  kind: string;
  axis: string;
  summary: string;
  recentHint: string;
  fileCountHint: number;
  documentPreview: { fileName: string; preview: string }[];
  obsidianSignals: { title: string; path: string }[];
};

type RawProject = {
  project_slug?: string;
  display_name?: string;
  status?: string;
  working_folder?: string;
  repo_name?: string;
  main_session?: string;
  discussion_thread?: string;
  canonical_files?: Record<string, string>;
  kind?: string;
  axis?: string;
  tags?: string[];
};

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readTextSafe(filePath: string, limit = 4000): Promise<string> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw.slice(0, limit);
  } catch {
    return "";
  }
}

async function exists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function toLocationTag(axis?: string, tags?: string[]) {
  if (Array.isArray(tags) && tags.length > 0) return tags[0];
  if (axis === "sh-paper") return "paper";
  if (axis === "sh-projects") return "project";
  if (axis === "onedrive") return "cloud";
  if (axis === "github") return "repo";
  return "project";
}

function firstMeaningfulLine(text: string) {
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("*")) || ""
  );
}

function trimmedPreview(text: string, limit = 260) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit)}...` : compact;
}

async function loadDocumentPreview(folderPath: string, fileNames: string[]) {
  const previews: { fileName: string; preview: string }[] = [];

  for (const fileName of fileNames.slice(0, 4)) {
    const targetPath = path.join(folderPath, fileName);
    const text = await readTextSafe(targetPath, 2500);
    if (!text) continue;
    previews.push({ fileName, preview: trimmedPreview(text) });
  }

  return previews;
}

async function searchObsidianSignals(projectName: string, slug: string) {
  const terms = [projectName, slug].filter(Boolean).map((v) => v.toLowerCase());
  const results: { title: string; path: string }[] = [];

  async function walk(dir: string, depth = 0): Promise<void> {
    if (depth > 3 || results.length >= 5) return;
    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= 5) break;
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const lowerName = entry.name.toLowerCase();
      if (!terms.some((term) => lowerName.includes(term))) continue;
      results.push({ title: entry.name.replace(/\.md$/, ""), path: fullPath.replace(`${obsidianVaultRoot}/`, "") });
    }
  }

  await walk(obsidianVaultRoot);
  return results;
}

async function summarizeProjectFolder(folderPath: string, projectName: string, slug: string, canonicalFiles: string[]) {
  const projectText = await readTextSafe(path.join(folderPath, "PROJECT.md"));
  const readmeText = await readTextSafe(path.join(folderPath, "README.md"));
  const statusText = await readTextSafe(path.join(folderPath, "STATUS.md"));
  const merged = [statusText, projectText, readmeText].filter(Boolean).join("\n");
  const summary = firstMeaningfulLine(merged) || "No summary extracted yet.";

  let fileCountHint = 0;
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    fileCountHint = entries.filter((entry) => !entry.name.startsWith(".")).length;
  } catch {
    fileCountHint = 0;
  }

  let recentHint = "metadata not reviewed yet";
  try {
    const stat = await fs.stat(folderPath);
    recentHint = `updated ${stat.mtime.toISOString().slice(0, 10)}`;
  } catch {}

  const documentPreview = await loadDocumentPreview(folderPath, canonicalFiles);
  const obsidianSignals = await searchObsidianSignals(projectName, slug);

  return { summary, recentHint, fileCountHint, documentPreview, obsidianSignals };
}

async function normalizeProject(metadata: RawProject, fallbackName: string): Promise<DashboardProject> {
  const canonicalFiles = metadata.canonical_files
    ? Object.values(metadata.canonical_files).filter(Boolean)
    : ["PROJECT.md", "project.json", "README.md"];

  const workingFolder = metadata.working_folder || fallbackName;
  const slug = metadata.project_slug || fallbackName.toLowerCase();
  const name = metadata.display_name || fallbackName;
  const { summary, recentHint, fileCountHint, documentPreview, obsidianSignals } = await summarizeProjectFolder(
    workingFolder,
    name,
    slug,
    canonicalFiles
  );

  return {
    slug,
    name,
    status: metadata.status || "repo-only",
    repo: metadata.repo_name || fallbackName,
    tag: toLocationTag(metadata.axis, metadata.tags),
    workingFolder,
    session: metadata.main_session || "not-bound",
    discussion: metadata.discussion_thread || "not fixed yet",
    canonicalFiles,
    kind: metadata.kind || "repo-project",
    axis: metadata.axis || "github",
    summary,
    recentHint,
    fileCountHint,
    documentPreview,
    obsidianSignals,
  };
}

async function listGithubProjects(): Promise<DashboardProject[]> {
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(githubRoot, { withFileTypes: true });
  } catch {
    const metadata =
      (await readJsonSafe<RawProject>(path.join(currentRepoRoot, "project.json"))) ||
      ({
        project_slug: "shawn-web",
        display_name: "SHawn-WEB",
        status: "active-repo",
        working_folder: currentRepoRoot,
        repo_name: "SHawn-WEB",
        kind: "repo-project",
        axis: "github",
        tags: ["web"],
      } satisfies RawProject);

    return [await normalizeProject({ ...metadata, working_folder: currentRepoRoot }, metadata.display_name || "SHawn-WEB")];
  }

  const projects: DashboardProject[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const repoPath = path.join(githubRoot, entry.name);
    const gitPath = path.join(repoPath, ".git");
    if (!(await exists(gitPath))) continue;

    const metadata =
      (await readJsonSafe<RawProject>(path.join(repoPath, "project.json"))) ||
      ({
        project_slug: entry.name.toLowerCase(),
        display_name: entry.name,
        status: "repo-only",
        working_folder: repoPath,
        repo_name: entry.name,
        kind: "repo-project",
        axis: "github",
      } satisfies RawProject);

    projects.push(await normalizeProject(metadata, entry.name));
  }

  return projects;
}

async function listWorkspaceProjects(): Promise<DashboardProject[]> {
  const items = await readJsonSafe<RawProject[]>(workspaceProjectsPath);
  if (!Array.isArray(items)) return [];
  return Promise.all(items.map((item) => normalizeProject(item, item.display_name || item.project_slug || "workspace-project")));
}

export async function getDashboardProjects(): Promise<DashboardProject[]> {
  const githubProjects = await listGithubProjects();
  const workspaceProjects = await listWorkspaceProjects();
  return [...githubProjects, ...workspaceProjects].sort((a, b) => a.name.localeCompare(b.name));
}
