import { httpRequest, sleep } from "./http.js";
import {
  getConfigValue,
  loadGitHubToken,
  saveGitHubToken,
  deleteGitHubToken,
} from "./config.js";

const CLIENT_ID = "Ov23lidgm30Vz8I4D8T6";

async function deviceFlow() {
  console.error("\nAuthenticating with GitHub...\n");

  const codeRes = await httpRequest("https://github.com/login/device/code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      scope: "repo",
    }),
  });

  const { device_code, user_code, verification_uri, expires_in, interval } =
    codeRes.data;

  console.error(`  1. Go to: ${verification_uri}`);
  console.error(`  2. Enter code: ${user_code}\n`);
  console.error("Waiting for authorization...");

  let pollInterval = (interval || 5) * 1000;
  const deadline = Date.now() + expires_in * 1000;

  while (Date.now() < deadline) {
    await sleep(pollInterval);

    const tokenRes = await httpRequest(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      }
    );

    const { access_token, error } = tokenRes.data;

    if (access_token) {
      saveGitHubToken(access_token);
      console.error("GitHub authenticated ✓\n");
      return access_token;
    }

    if (error === "slow_down") {
      pollInterval += 5000;
    } else if (error === "authorization_pending") {
      // keep polling
    } else if (error === "expired_token") {
      throw new Error("Code expired. Please try again.");
    } else if (error === "access_denied") {
      throw new Error("Authorization denied by user.");
    } else if (error) {
      throw new Error(`GitHub auth error: ${error}`);
    }
  }

  throw new Error("Timed out waiting for authorization.");
}

async function getToken() {
  const cached = loadGitHubToken();
  if (cached) return cached;
  return deviceFlow();
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  const firstLine = markdown.split("\n").find((l) => l.trim());
  return firstLine ? firstLine.trim().slice(0, 80) : "transcript";
}

async function pushFile(token, repo, filePath, content, commitMessage) {
  const base64 = Buffer.from(content).toString("base64");

  return httpRequest(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "tuberead-cli",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: base64,
      }),
    }
  );
}


function normalizeRepo(input) {
  return input
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\/+$/, "");
}

export async function saveToGitHub(markdown) {
  const raw = getConfigValue("github-repo");
  if (!raw) {
    console.error("Error: GitHub repo not configured.");
    console.error('Run: tuberead config set github-repo owner/repo');
    process.exit(1);
  }

  const repo = normalizeRepo(raw);

  let token = await getToken();

  const title = extractTitle(markdown);
  const slug = slugify(title);
  const date = new Date().toISOString().split("T")[0];
  const filename = `${date}-${slug}.md`;
  const filePath = `articles/${filename}`;

  console.error(`Saving to ${repo}/${filePath}...`);

  let res = await pushFile(
    token,
    repo,
    filePath,
    markdown,
    `Add transcript: ${filename}`
  );

  // Handle expired token — re-auth once
  if (res.status === 401) {
    console.error("GitHub token expired. Re-authenticating...");
    deleteGitHubToken();
    token = await deviceFlow();
    res = await pushFile(
      token,
      repo,
      filePath,
      markdown,
      `Add transcript: ${filename}`
    );
  }

  if (res.status === 200 || res.status === 201) {
    const url =
      res.data.content?.html_url ||
      `https://github.com/${repo}/blob/main/${filePath}`;
    console.error(`Saved ✓`);
    console.error(`  ${url}`);
  } else {
    console.error(`Error saving to GitHub (${res.status}):`);
    console.error(JSON.stringify(res.data, null, 2));
    process.exit(1);
  }
}