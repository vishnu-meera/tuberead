import fs from "fs";
import path from "path";
import os from "os";

// Exported so tests can override via _setPaths()
let CONFIG_DIR = path.join(os.homedir(), ".tuberead");
let CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
let GITHUB_TOKEN_FILE = path.join(CONFIG_DIR, "github-token");

/** @internal — used by tests to redirect to a temp directory */
export function _setPaths(dir) {
  CONFIG_DIR = dir;
  CONFIG_FILE = path.join(dir, "config.json");
  GITHUB_TOKEN_FILE = path.join(dir, "github-token");
}

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { mode: 0o700, recursive: true });
  }
}

export function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function saveConfig(config) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

export function getConfigValue(key) {
  return loadConfig()[key] || null;
}

export function setConfigValue(key, value) {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

export function deleteConfigValue(key) {
  const config = loadConfig();
  delete config[key];
  saveConfig(config);
}

// --- TODO ---

export function loadGitHubToken() {
  try {
    return fs.readFileSync(GITHUB_TOKEN_FILE, "utf-8").trim() || null;
  } catch {
    return null;
  }
}

export function saveGitHubToken(token) {
  ensureDir();
  fs.writeFileSync(GITHUB_TOKEN_FILE, token, { mode: 0o600 });
}

export function deleteGitHubToken() {
  try {
    fs.unlinkSync(GITHUB_TOKEN_FILE);
  } catch {}
}