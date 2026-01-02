# OnePrompt

**An Electron desktop app to compare responses from multiple AI platforms simultaneously.**

Tired of copy-pasting the same prompt into ChatGPT, Claude, Gemini, and Perplexity to compare responses? OnePrompt solves this: write your prompt once and automatically send it to all the AIs you want, getting multiple responses to compare side-by-side.

## 🎯 The Problem It Solves

When working on something important, you want the best possible answers. Often this means:
1. Open ChatGPT → paste prompt → wait for response
2. Open Claude → paste same prompt → wait for response
3. Open Gemini → paste again → wait for response
4. Open Perplexity → ... and so on

**OnePrompt automates this workflow**: one prompt, all AIs, immediate responses to compare.

## Features

- 🚀 **One prompt for all AIs**: Write once, send everywhere
- 🎯 **Flexible selection**: Choose which AIs to use for each prompt
- 🔐 **Persistent sessions**: Keeps your logins active (like Franz)
- 💻 **Native for macOS**: Optimized for macOS (Windows coming soon)
- 🎨 **Clean interface**: Minimalist and intuitive design

## Supported AI Platforms

- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- Perplexity
- More coming...

## Installation

### Download Binaries (Recommended)

Download the latest version from the [Releases page](https://github.com/calabr93/one-prompt/releases):
- **macOS**: Download the `.dmg` or `.zip` file
- **Windows**: Download the `.exe` file

### Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Build

```bash
# Build for macOS
npm run build:mac

# Build for Windows
npm run build:win
```

## Releases

Releases are created automatically via GitHub Actions when you push a new tag:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will automatically compile the application for macOS and Windows and create a release with the binaries.

## How It Works

OnePrompt uses **Electron webviews** to embed various AI platforms directly in the app, keeping sessions active just like a dedicated multi-tab browser.

**Technical architecture**:
- Each AI runs in an isolated webview with persistent session
- Automatic prompt injection via preload scripts
- No external APIs required (works with your existing free accounts)

**Benefits**:
- ✅ **No additional costs**: No paid API keys needed
- ✅ **Full access**: All features of the web platforms
- ✅ **Persistent sessions**: Your logins stay active between sessions
- ✅ **Privacy**: Your prompts and AI responses never leave your device

## 🔒 Privacy & Data Collection

OnePrompt collects **minimal, anonymous usage statistics** to understand how many people actively use the app.

### What We Collect

**Update Checks** (automatic, on app launch)
- **When**: Every time you open OnePrompt (standard practice for all desktop apps)
- **Data collected**:
  - App version (e.g., "1.0.0")
  - Operating system (e.g., "macOS", "Windows", "Linux")
  - Timestamp
- **Why**: To estimate Daily Active Users (DAU) and prioritize platform support
- **What we DON'T collect**:
  - ❌ IP addresses or location data
  - ❌ User identifiers or personal information
  - ❌ Your prompts or AI responses
  - ❌ Browsing history or usage patterns
  - ❌ Any data from your AI accounts

### How It Works

When you open OnePrompt, the app checks for updates (standard for all modern apps). This request is logged by our update server with only: timestamp, version, and OS type. That's it.

**Transparency**: All data collection code is visible in this repository:
- Update check: [`src/main.js`](src/main.js) (lines 188-197)
- Server logging: [`cloudflare-worker/worker.js`](cloudflare-worker/worker.js) (lines 30-36)

### Opt-Out

Want **zero data collection**? You have options:

1. **Firewall block**: Block `updates.oneprompt.dev` in your firewall
2. **Build from source**: Clone this repo and remove the update check from `src/main.js`
3. **Run in dev mode**: Use `npm run dev` (update checks disabled in dev mode)

### Your Data Stays Private

- ✅ Your prompts never leave your device
- ✅ Your AI conversations are between you and the AI platforms
- ✅ We never see, store, or transmit your actual usage data
- ✅ No tracking scripts, no analytics SDKs, no third-party services

**We only know**: "Someone using version X on macOS opened the app today"

## ⚠️ Important Notes

### Project Status

**This is an experimental project under active development.**

Currently working on:
- ✅ Base interface and webview management (completed)
- 🔄 Automatic prompt injection (in development - focusing on Perplexity)
- ⏳ Login support for ChatGPT, Claude, Gemini (coming soon)
- ⏳ Side-by-side response visualization (planned)

### Compliance and Legal Disclaimer

**IMPORTANT**: This application uses browser automation to interact with third-party AI services. This **may violate the Terms of Service** of some platforms:

- ⚠️ OpenAI (ChatGPT) - ToS prohibit unauthorized automation
- ⚠️ Anthropic (Claude) - ToS prohibit bots and scraping
- ⚠️ Google (Gemini) - ToS prohibit access through unofficial methods
- 🟡 Perplexity - Less restrictive ToS but still limit automation

**Recommended use**:
- ✅ Personal and educational use only
- ❌ Not for commercial distribution
- ❌ Not for intensive/abusive use

**ToS-compliant alternatives**:
In the future, the app may support an "API mode" that uses official APIs (paid) instead of browser automation, ensuring full legal compliance.

For more details on legal risks, see the project planning documentation.

### Author's Intent

This project was born from my personal need to **compare responses from different AIs** to make better decisions. Often one AI provides a perspective that others don't, and managing 4-5 separate browser tabs is inconvenient.

**Goals**:
1. **Short term**: Create a working MVP for personal use with Perplexity (no login required)
2. **Medium term**: Extend support to all major AIs with login management
3. **Long term**: Evaluate transition to API mode for full compliance or maintain dual-mode (webview + API)

It's not my intention to violate ToS or harm AI platforms. If this project causes issues, I'm open to:
- Switching completely to official APIs
- Removing automation features
- Making the project purely educational

## License

MIT

**Disclaimer**: By using this software, you agree to be solely responsible for compliance with the Terms of Service of the AI platforms you use. The author assumes no responsibility for any bans, limitations, or other consequences arising from the use of this application.

## Author

**Fabio Calabretta**

Developer interested in AI tooling and productivity. This is a personal project for experimentation and learning.
