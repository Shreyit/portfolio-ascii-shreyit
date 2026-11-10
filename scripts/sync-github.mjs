import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const USER = "Shreyit";
const ALLOWLIST_PATH = join(ROOT, "content/allowlist.json");
const OUTPUT_PATH = join(ROOT, "content/generated/github.json");

function resolveToken() {
  if (process.env.GITHUB_TOKEN?.trim()) {
    return process.env.GITHUB_TOKEN.trim();
  }
  try {
    const token = execSync("gh auth token", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (token) {
      return token;
    }
  } catch {
    // fall through to the error below
  }
  console.error(
    "No GitHub token available. Set GITHUB_TOKEN or run `gh auth login`.",
  );
  process.exit(1);
}

// Pure guard, exported for unit tests: given raw REST repo objects (or nulls
// for missing repos), split into { allowed, rejected }. Private, archived or
// missing repos are rejected — the caller must not write their data.
export function filterPublic(repos) {
  const allowed = [];
  const rejected = [];
  for (const repo of repos) {
    if (!repo) {
      rejected.push({ name: "<unknown>", reason: "missing or inaccessible" });
      continue;
    }
    if (repo.private) {
      rejected.push({ name: repo.name, reason: "private" });
      continue;
    }
    if (repo.archived) {
      rejected.push({ name: repo.name, reason: "archived" });
      continue;
    }
    allowed.push(repo);
  }
  return { allowed, rejected };
}

async function fetchRepo(token, name) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    Authorization: `Bearer ${token}`,
    "User-Agent": "portfolio-ascii-shreyit-sync",
  };
  const get = async (path) => {
    const res = await fetch(`https://api.github.com${path}`, { headers });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`GitHub API ${path} failed with HTTP ${res.status}`);
    }
    return res.json();
  };

  const repo = await get(`/repos/${USER}/${name}`);
  if (!repo) {
    return { name, repo: null, languages: {}, topics: [] };
  }
  const [languages, topicsResponse] = await Promise.all([
    get(`/repos/${USER}/${name}/languages`),
    get(`/repos/${USER}/${name}/topics`),
  ]);
  const topics = Array.isArray(topicsResponse?.names)
    ? [...topicsResponse.names].sort()
    : [];
  const sortedLanguages = Object.fromEntries(
    Object.entries(languages ?? {}).sort(([a], [b]) => a.localeCompare(b)),
  );
  return { name, repo, languages: sortedLanguages, topics };
}

async function main() {
  const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  if (
    !Array.isArray(allowlist) ||
    allowlist.some((n) => typeof n !== "string")
  ) {
    console.error("content/allowlist.json must be an array of repo names.");
    process.exit(1);
  }

  const token = resolveToken();

  const results = [];
  for (const name of allowlist) {
    results.push(await fetchRepo(token, name));
  }

  const { rejected } = filterPublic(results.map((r) => r.repo));
  if (rejected.length > 0) {
    const missing = results.filter((r) => !r.repo).map((r) => r.name);
    for (const name of missing) {
      console.error(
        `WARNING: repo "${name}" is missing or inaccessible — refusing to sync.`,
      );
    }
    for (const item of rejected.filter((r) => r.name !== "<unknown>")) {
      console.error(
        `WARNING: repo "${item.name}" is ${item.reason} — refusing to sync.`,
      );
    }
    process.exit(1);
  }

  const output = results
    .map(({ repo, languages, topics }) => ({
      name: repo.name,
      url: repo.html_url,
      description: repo.description ?? null,
      homepage: repo.homepage && repo.homepage.trim() ? repo.homepage : null,
      languages,
      topics,
      stars: repo.stargazers_count,
      pushedAt: repo.pushed_at,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(`Wrote ${OUTPUT_PATH} (${output.length} repos).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
