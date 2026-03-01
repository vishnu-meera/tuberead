import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

import {
  _setPaths,
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  deleteConfigValue,
  loadGitHubToken,
  saveGitHubToken,
  deleteGitHubToken,
} from "./config.js";

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tuberead-test-"));
  _setPaths(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- loadConfig / saveConfig ---

describe("loadConfig", () => {
  it("returns empty object when no config file exists", () => {
    assert.deepEqual(loadConfig(), {});
  });

  it("returns parsed config when file exists", () => {
    const data = { "gemini-key": "abc123", "github-repo": "user/repo" };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(data));
    assert.deepEqual(loadConfig(), data);
  });

  it("returns empty object when config file is invalid JSON", () => {
    fs.writeFileSync(path.join(tmpDir, "config.json"), "not json{{{");
    assert.deepEqual(loadConfig(), {});
  });
});

describe("saveConfig", () => {
  it("creates config file with correct content", () => {
    const data = { key: "value" };
    saveConfig(data);
    const raw = fs.readFileSync(path.join(tmpDir, "config.json"), "utf-8");
    assert.deepEqual(JSON.parse(raw), data);
  });

  it("creates config directory if it doesn't exist", () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    _setPaths(path.join(tmpDir, "nested"));
    saveConfig({ a: 1 });
    assert.ok(fs.existsSync(path.join(tmpDir, "nested", "config.json")));
  });

  it("overwrites existing config", () => {
    saveConfig({ old: "data" });
    saveConfig({ new: "data" });
    assert.deepEqual(loadConfig(), { new: "data" });
  });
});

// --- getConfigValue / setConfigValue / deleteConfigValue ---

describe("getConfigValue", () => {
  it("returns null for missing key", () => {
    assert.equal(getConfigValue("nope"), null);
  });

  it("returns value for existing key", () => {
    saveConfig({ "gemini-key": "test123" });
    assert.equal(getConfigValue("gemini-key"), "test123");
  });

  it("returns null for empty string value", () => {
    saveConfig({ "gemini-key": "" });
    assert.equal(getConfigValue("gemini-key"), null);
  });
});

describe("setConfigValue", () => {
  it("sets a new key", () => {
    setConfigValue("gemini-key", "abc");
    assert.equal(getConfigValue("gemini-key"), "abc");
  });

  it("overwrites an existing key", () => {
    setConfigValue("gemini-key", "old");
    setConfigValue("gemini-key", "new");
    assert.equal(getConfigValue("gemini-key"), "new");
  });

  it("preserves other keys when setting", () => {
    setConfigValue("a", "1");
    setConfigValue("b", "2");
    assert.equal(getConfigValue("a"), "1");
    assert.equal(getConfigValue("b"), "2");
  });
});

describe("deleteConfigValue", () => {
  it("removes an existing key", () => {
    setConfigValue("gemini-key", "abc");
    deleteConfigValue("gemini-key");
    assert.equal(getConfigValue("gemini-key"), null);
  });

  it("does not throw when deleting non-existent key", () => {
    assert.doesNotThrow(() => deleteConfigValue("nope"));
  });

  it("preserves other keys when deleting", () => {
    setConfigValue("a", "1");
    setConfigValue("b", "2");
    deleteConfigValue("a");
    assert.equal(getConfigValue("a"), null);
    assert.equal(getConfigValue("b"), "2");
  });
});

// --- GitHub token ---

describe("loadGitHubToken", () => {
  it("returns null when no token file exists", () => {
    assert.equal(loadGitHubToken(), null);
  });

  it("returns token from file", () => {
    fs.writeFileSync(path.join(tmpDir, "github-token"), "ghp_abc123");
    assert.equal(loadGitHubToken(), "ghp_abc123");
  });

  it("trims whitespace from token", () => {
    fs.writeFileSync(path.join(tmpDir, "github-token"), "  ghp_abc123\n  ");
    assert.equal(loadGitHubToken(), "ghp_abc123");
  });

  it("returns null for empty token file", () => {
    fs.writeFileSync(path.join(tmpDir, "github-token"), "   \n  ");
    assert.equal(loadGitHubToken(), null);
  });
});

describe("saveGitHubToken", () => {
  it("writes token to file", () => {
    saveGitHubToken("ghp_test");
    assert.equal(loadGitHubToken(), "ghp_test");
  });

  it("overwrites existing token", () => {
    saveGitHubToken("ghp_old");
    saveGitHubToken("ghp_new");
    assert.equal(loadGitHubToken(), "ghp_new");
  });
});

describe("deleteGitHubToken", () => {
  it("removes token file", () => {
    saveGitHubToken("ghp_test");
    deleteGitHubToken();
    assert.equal(loadGitHubToken(), null);
  });

  it("does not throw when no token file exists", () => {
    assert.doesNotThrow(() => deleteGitHubToken());
  });
});