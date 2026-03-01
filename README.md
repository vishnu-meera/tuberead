# tuberead

CLI tool that transcribes YouTube videos and transforms them into engaging, readable technical articles using Gemini AI.

## Install

```bash
npm install -g tuberead
```

## Setup

```bash
# Set your Gemini API key (get one at https://aistudio.google.com/apikey)
tuberead config set gemini-key YOUR_GEMINI_API_KEY

# Optional: set a GitHub repo for saving articles
tuberead config set github-repo yourname/yt-articles
```

## Usage

```bash
# Transcribe a video
tuberead "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Pipe to a file
tuberead "https://www.youtube.com/watch?v=dQw4w9WgXcQ" > article.md

# Transcribe and save directly to GitHub
tuberead "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --save

# Push an existing markdown file to GitHub
tuberead push ./my-article.md
```

## Commands

| Command | Description |
|---|---|
| `tuberead <url>` | Transcribe a video and print to stdout |
| `tuberead <url> -s \| --save` | Transcribe and push to GitHub |
| `tuberead push <file.md>` | Push an existing markdown file to GitHub |
| `tuberead config set <key> <value>` | Set a config value |
| `tuberead config get <key>` | Get a config value |
| `tuberead config list` | Show all config |
| `tuberead config delete <key>` | Delete a config value |
| `tuberead logout` | Remove cached GitHub token |
| `tuberead --help` | Show help |

## Config

| Key | Required | Description |
|---|---|---|
| `gemini-key` | Yes | Your Gemini API key |
| `github-repo` | For `--save` / `push` | Target repo — accepts `owner/repo` or full GitHub URL |

Config is stored at `~/.tuberead/config.json`.

## GitHub Integration

When you use `--save` or `push` for the first time, tuberead authenticates via GitHub's device flow:

```
1. Go to: https://github.com/login/device
2. Enter code: ABCD-1234
```

No tokens to manage — just approve in your browser. The token is cached at `~/.tuberead/github-token` for future use. Articles are saved to the `articles/` directory in your configured repo.

## How It Works

1. Passes the YouTube URL directly to Gemini — no video download needed
2. Gemini transcribes the audio and transforms it into a well-structured technical article
3. With `--save`, pushes the markdown to your GitHub repo

## Supported URL Formats

- `https://www.youtube.com/watch?v=...`
- `https://youtu.be/...`
- `https://www.youtube.com/shorts/...`

## Requirements

- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier available)

## License

MIT