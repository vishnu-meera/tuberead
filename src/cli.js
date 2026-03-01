#!/usr/bin/env node

import {
  getConfigValue,
  setConfigValue,
  deleteConfigValue,
  loadConfig,
  deleteGitHubToken,
} from "./config.js";
import { transcribe } from "./transcribe.js";
import { saveToGitHub } from "./github.js";
import fs from "fs";
import path from "path";

const HELP = `tuberead - Transcribe YouTube videos into engaging technical articles

Usage:
  tuberead <youtube-url>              Transcribe and print to stdout
  tuberead <youtube-url> -s           Transcribe and save to GitHub
  tuberead <youtube-url> --save       Same as -s
  tuberead push <file.md>             Push an existing .md file to GitHub

Config:
  tuberead config set <key> <value>   Set a config value
  tuberead config get <key>           Get a config value
  tuberead config list                Show all config
  tuberead config delete <key>        Delete a config value

Auth:
  tuberead logout                     Remove cached GitHub token

Required config:
  gemini-key      Your Gemini API key

Optional config (for --save / push):
  github-repo     Target repo as owner/repo (e.g. nandu/yt-articles)

Examples:
  tuberead config set gemini-key AIzaSy...
  tuberead config set github-repo nandu/yt-articles
  tuberead "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  tuberead "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --save
  tuberead push ./my-article.md`;

function isYouTubeURL(url) {
  return (
    url.includes("youtube.com/watch") ||
    url.includes("youtu.be/") ||
    url.includes("youtube.com/shorts/")
  );
}

function handleConfig(args) {
  const [action, key, ...rest] = args;
  const value = rest.join(" ");

  switch (action) {
    case "set":
      if (!key || !value) {
        console.error("Usage: tuberead config set <key> <value>");
        process.exit(1);
      }
      setConfigValue(key, value);
      console.log(`${key} saved ✓`);
      break;

    case "get":
      if (!key) {
        console.error("Usage: tuberead config get <key>");
        process.exit(1);
      }
      const val = getConfigValue(key);
      if (val) {
        console.log(val);
      } else {
        console.error(`"${key}" is not set`);
        process.exit(1);
      }
      break;

    case "list": {
      const config = loadConfig();
      const keys = Object.keys(config);
      if (keys.length === 0) {
        console.log("No config set. Run: tuberead config set <key> <value>");
      } else {
        for (const k of keys) {
          // Mask sensitive values
          const v = k.includes("key") || k.includes("token")
            ? config[k].slice(0, 8) + "..."
            : config[k];
          console.log(`  ${k} = ${v}`);
        }
      }
      break;
    }

    case "delete":
      if (!key) {
        console.error("Usage: tuberead config delete <key>");
        process.exit(1);
      }
      deleteConfigValue(key);
      console.log(`${key} deleted ✓`);
      break;

    default:
      console.error("Usage: tuberead config <set|get|list|delete>");
      process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  // Handle: tuberead config ...
  if (args[0] === "config") {
    handleConfig(args.slice(1));
    return;
  }

  // Handle: tuberead logout
  if (args[0] === "logout") {
    deleteGitHubToken();
    console.log("GitHub token removed ✓");
    return;
  }

  // Handle: tuberead push <file.md>
  if (args[0] === "push") {
    const filePath = args[1];
    if (!filePath) {
      console.error("Usage: tuberead push <file.md>");
      process.exit(1);
    }

    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: file not found: ${resolved}`);
      process.exit(1);
    }

    try {
      const markdown = fs.readFileSync(resolved, "utf-8");
      await saveToGitHub(markdown);
    } catch (e) {
      console.error(`Error: ${e.message}`);
      process.exit(1);
    }
    return;
  }

  // Parse: tuberead <url> [--save | -s]
  let url = null;
  let save = false;

  for (const arg of args) {
    if (arg === "-s" || arg === "--save") {
      save = true;
    } else if (!arg.startsWith("-")) {
      url = arg;
    }
  }

  if (!url || !isYouTubeURL(url)) {
    console.error("Error: provide a valid YouTube URL");
    console.error("Run: tuberead --help");
    process.exit(1);
  }

  console.error("Transcribing...");

  try {
    const markdown = await transcribe(url);
    console.log(markdown);

    if (save) {
      await saveToGitHub(markdown);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();