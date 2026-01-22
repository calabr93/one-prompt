# OnePrompt

**Compare AIs in an instant.**

<div align="center">
  <img src="assets/logo/logo.webp" alt="OnePrompt Logo" width="120" height="120">
</div>

![Experimental](https://img.shields.io/badge/status-experimental-orange?style=for-the-badge)
![Educational](https://img.shields.io/badge/purpose-educational-blue?style=for-the-badge)
![Open Source](https://img.shields.io/badge/version-Open%20Source-green?style=for-the-badge)

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buy.stripe.com/28E6oIcRUcc0cE48oO2wU04)

**A desktop app to view and compare responses from multiple AI services side-by-side.**

See responses from ChatGPT, Claude, Gemini, and more in one window. Find the best answer at a glance.

<div align="center">
  <img src="assets/OnePrompt-demo.gif" alt="OnePrompt Demo" width="100%">
</div>

---

## ⚠️ Legal & Compliance Notice

This application is designed with a **privacy-first and compliance-ready** approach, providing two distinct ways to interact with AI services: **API Mode** and **Web Mode**.

### Built for Compliance
To ensure **100% compatibility** with the Terms of Service (ToS) of major AI providers (OpenAI, Anthropic, Google, Perplexity, etc.) and to prevent any risk of account limitations, OnePrompt strictly avoids any form of browser automation.

* **No Bot Simulation**: The app does not "inject" code, simulate clicks, or use automated scripts to send prompts.
* **User-Centric Control**: OnePrompt acts as a specialized browser that facilitates manual copy-pasting and side-by-side comparison.
* **Human-in-the-Loop**: Every interaction is initiated and controlled by the user, maintaining the same behavioral footprint as a standard web browser.

---

### Usage Guidelines
* ℹ️ **Commercial Distribution**: This repository contains the **Open Source edition**. 
* 🚀 **Enterprise & Managed**: If you are interested in commercial licenses or credit-based managed versions, please contact the author.
* ⚖️ **Disclaimer**: OnePrompt is a tool to enhance productivity. Users are responsible for adhering to the specific usage policies of the AI services they access.

---

## 🎯 Why OnePrompt?

Different AIs have different strengths. When you need the best answer, comparing responses helps you:

- **Find the most accurate answer** - Each AI may interpret your question differently
- **Discover unique insights** - Different models offer different perspectives
- **Save time** - No more switching between tabs and browser windows

## Features

- 🔍 **Side-by-side comparison**: View responses from multiple AIs in one window
- 🔀 **Cross-Check**: Each AI analyzes the others' responses for comprehensive validation
- 🔄 **Dual Mode**:
  - **Web Mode**: Use the original web interfaces (free, requires login)
  - **API Mode**: Use your own API keys (BYOK) for direct API access
- 🌐 **Web Search**: AI responses enhanced with real-time web search (API Mode)
- 🎯 **Flexible selection**: Choose which AIs to use for each prompt
- 🔐 **Privacy First**: API keys and data are stored locally on your device
- 📂 **Session Management**: Organize your work in multiple tabs with conversation history
- 💻 **Cross-platform**: Available for macOS, Windows and Linux
- 🎨 **Clean interface**: Minimalist design with Dark/Light themes
- 🌍 **Multi-language**: Available in 7 languages (EN, IT, ES, FR, DE, PT, TR)

## Supported AI Platforms

### API Mode (BYOK)
- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)

### Web Mode (Web Interface)
- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- DeepSeek
- Grok (xAI)
- Perplexity

**Note**: Web Mode features are experimental and may not work consistently across all platforms. API Mode is recommended for stability.

## Installation

### Download Binaries (Recommended)

Download the latest version from the [Releases page](https://github.com/calabr93/one-prompt/releases):
- **macOS**: Download the `.dmg` file (Apple Silicon or Intel)
- **Windows**: Download the `.exe` file (Installer or Portable)
- **Linux**: Download the `.AppImage` (universal) or `.deb` (Debian/Ubuntu)

### Development

#### Requirements
- **Node.js 22** or higher
- If using nvm: run `nvm use` (automatically reads `.nvmrc`)

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

# Build for Linux
npm run build:linux
```

## Releases & Updates

### Creating a New Release (for developers)

Releases are created automatically via GitHub Actions when you push a new tag:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will automatically compile the application for macOS, Windows, and Linux, and create a release with the binaries.

### How Updates Work

The update process differs depending on the version you are using:

- **OnePrompt (GitHub Edition)**: Updates are manual. You can check for new versions by visiting the [Releases page](https://github.com/calabr93/one-prompt/releases) or by checking the application console on launch.
- **OnePrompt Desktop App**: Features a fully automatic update system with visual in-app notifications for a seamless experience.

**No manual downloads needed for the Desktop version!** It keeps itself up-to-date automatically.

> **Note**: For the GitHub version, update notifications currently appear only in the console. Visual UI for updates is reserved for the Desktop App.

## How It Works

OnePrompt uses **Electron webviews** to embed various AI platforms directly in the app, keeping sessions active just like a dedicated multi-tab browser.

**Technical architecture**:
- Each AI runs in an isolated webview with persistent session
- Automatic prompt sending via preload scripts
- No external APIs required (works with your existing free accounts)

**Benefits**:
- ✅ **No additional costs**: No paid API keys needed
- ✅ **Full access**: All features of the web platforms
- ✅ **Persistent sessions**: Your logins stay active between sessions
- ✅ **Privacy**: Your prompts and AI responses never leave your device

## 🔒 Privacy

**OnePrompt respects your privacy.**

- ✅ **No Analytics**: The desktop app does not collect any usage data.
- ✅ **No Personal Data**: We do not collect your prompts, AI responses, or login credentials.
- ✅ **Your prompts never leave your device**: All AI interactions happen directly between you and the AI platforms.
- ✅ **Open Source**: You can inspect the code to verify our privacy claims.

**Your data stays completely private.**

## 📋 Project Status

**Experimental - Active Development**

### Current Development Focus
- ✅ Base interface and webview management
- ✅ Auto-update system
- ✅ Automatic prompt sending for supported platforms
- ✅ Side-by-side response visualization
- 🔄 Expanding platform support (adding more AI services)

## License

MIT

**Disclaimer**: By using this software, you agree to be solely responsible for compliance with the Terms of Service of the AI platforms you use. The author assumes no responsibility for any service limitations or changes arising from the use of this application.

## Bug Reports & Feature Requests

Found a bug? Have an idea for a new feature? I'd love to hear from you!

**Please use GitHub Issues:**

- 🐛 **Report a bug**: [Create a bug report](https://github.com/calabr93/one-prompt/issues/new?labels=bug&template=bug_report.md)
- 💡 **Request a feature**: [Create a feature request](https://github.com/calabr93/one-prompt/issues/new?labels=enhancement&template=feature_request.md)
- 💬 **General discussion**: [Open an issue](https://github.com/calabr93/one-prompt/issues/new)

**Before creating an issue**, please:
1. Search existing issues to avoid duplicates
2. Include your OS and OnePrompt version
3. For bugs: Steps to reproduce, expected vs actual behavior
4. For features: Explain the use case and why it would be useful

All feedback is appreciated! 🙏

## Support

Enjoying OnePrompt? Consider buying me a coffee!

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buy.stripe.com/28E6oIcRUcc0cE48oO2wU04)

Your support helps keep this project alive and motivates me to add new features and maintain it. Every coffee counts! 🙏

## Author

**Fabio Calabretta**

Developer interested in AI tooling and productivity. This is a personal project for experimentation and learning.
