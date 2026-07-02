import { NextResponse } from "next/server";
import { getAuthenticatedAdminUserId } from "@/lib/admin-auth";
import {
  buildBlogStudioFiles,
  normalizeBlogStudioPayload,
  type BlogStudioFile,
  type BlogStudioInput,
} from "@/lib/blog-studio";

export const runtime = "nodejs";
export const maxDuration = 60;

type PublishBody = BlogStudioInput & {
  dryRun?: boolean;
  overwrite?: boolean;
};

async function githubRequest(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`github_${response.status}:${text.slice(0, 240)}`);
  }

  return response.json();
}

async function githubFileExists(owner: string, name: string, branch: string, token: string, filePath: string) {
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (response.status === 404) return false;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`github_${response.status}:${text.slice(0, 240)}`);
  }
  return true;
}

async function commitFilesToGitHub(files: BlogStudioFile[], message: string, overwrite: boolean) {
  const token = process.env.BLOG_PUBLISH_GITHUB_TOKEN;
  if (!token) {
    throw new Error("BLOG_PUBLISH_GITHUB_TOKEN is not configured");
  }

  const repo = process.env.BLOG_PUBLISH_REPO || process.env.GITHUB_REPOSITORY || "L-SHawn91/SHawn-WEB";
  const branch = process.env.BLOG_PUBLISH_BRANCH || "main";
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new Error("BLOG_PUBLISH_REPO must be owner/repo");

  const ref = await githubRequest(`/repos/${owner}/${name}/git/ref/heads/${branch}`, token);
  const headSha = ref.object.sha;
  const commit = await githubRequest(`/repos/${owner}/${name}/git/commits/${headSha}`, token);
  const baseTree = commit.tree.sha;
  const mdxPath = files.find((file) => file.path.endsWith(".mdx"))?.path;
  if (mdxPath && !overwrite && await githubFileExists(owner, name, branch, token, mdxPath)) {
    throw new Error(`post_exists:${mdxPath}`);
  }

  const tree = await Promise.all(
    files.map(async (file) => {
      const blob = await githubRequest(`/repos/${owner}/${name}/git/blobs`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: file.encoding === "base64" ? file.base64 : file.content,
          encoding: file.encoding === "base64" ? "base64" : "utf-8",
        }),
      });

      return {
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      };
    }),
  );

  const newTree = await githubRequest(`/repos/${owner}/${name}/git/trees`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_tree: baseTree, tree }),
  });

  const newCommit = await githubRequest(`/repos/${owner}/${name}/git/commits`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [headSha],
    }),
  });

  await githubRequest(`/repos/${owner}/${name}/git/refs/heads/${branch}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  return {
    repo,
    branch,
    commitSha: newCommit.sha,
    files: files.map((file) => file.path),
  };
}

export async function POST(req: Request) {
  const adminUserId = await getAuthenticatedAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (req.headers.get("x-shawn-blog-studio") !== "1") {
    return NextResponse.json({ error: "missing_studio_header" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as PublishBody;
    const payload = normalizeBlogStudioPayload(body);
    const files = buildBlogStudioFiles(payload);
    const mdxFile = files.find((file) => file.path.endsWith(".mdx"));

    if (body.dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        slug: payload.slug,
        heroImage: payload.heroImage || null,
        fileCount: files.length,
        files: files.map((file) => file.path),
        mdx: mdxFile?.content || "",
      });
    }

    const result = await commitFilesToGitHub(files, `feat(blog): publish ${payload.slug}`, Boolean(body.overwrite));
    return NextResponse.json({
      success: true,
      dryRun: false,
      slug: payload.slug,
      url: `/blog/${payload.slug}`,
      ...result,
    });
  } catch (error: any) {
    const message = String(error?.message || error || "publish_failed");
    const status = message.includes("BLOG_PUBLISH_GITHUB_TOKEN") ? 503 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
