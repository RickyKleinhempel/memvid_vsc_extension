# Memvid Agent Memory

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/RickyKleinhempel.memvid-agent-memory?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=RickyKleinhempel.memvid-agent-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Give your AI agents a memory that lasts.**

⚠️ **Community Extension** - This is an unofficial VS Code extension built using the [Memvid](https://github.com/Olow304/memvid) framework. Not affiliated with the Memvid team.

Memvid Agent Memory gives GitHub Copilot persistent memory capabilities. Your AI assistant can now remember information across sessions, search through past conversations, and provide contextual answers based on stored knowledge.

![Memvid Demo](https://raw.githubusercontent.com/RickyKleinhempel/memvid-vscode-extension/main/images/demo.gif)

---

## ✨ Features

### 🧠 Persistent Memory
Store information that survives between VS Code sessions. Your agent remembers what you taught it yesterday, last week, or months ago.

### 🔍 Intelligent Search  
Find relevant memories using smart keyword matching with automatic fallback strategies. Supports both German and English queries.

### 🤖 AI-Powered Answers
Ask questions in natural language and get synthesized answers from your stored memories using your preferred LLM provider.

### 🔄 Query Rewriting
When a search doesn't find results, the AI automatically tries alternative search terms, synonyms, and translations.

### ⏱️ Timeline View
See your most recent memories at a glance, sorted from newest to oldest.

### 🔌 Zero Configuration
Works out of the box! MCP tools are automatically registered with GitHub Copilot - no manual setup required.

---

## 🚀 Quick Start

1. **Install** the extension from VS Code Marketplace
2. **Open** any workspace with GitHub Copilot
3. **Start using** memory commands in Copilot Chat:

```
💬 "Remember that this project uses PostgreSQL and Redis"
💬 "What database does this project use?"
💬 "Show me recent memories"
```

That's it! Your agent now has persistent memory.

---

## 🛠️ Available Tools

| Tool | What it does |
|------|--------------|
| `memvid_store` | Save information to memory |
| `memvid_search` | Find memories by keywords |
| `memvid_ask` | Ask questions with AI-generated answers |
| `memvid_timeline` | View recent memories |
| `memvid_stats` | Check memory statistics |

---

## ⚙️ Configuration

Access settings via **File → Preferences → Settings** → search for "Memvid"

### LLM Provider (for AI Answers)

Choose how answers are generated from your memories:

| Provider | Setup |
|----------|-------|
| **GitHub Copilot** ⭐ | No setup needed - uses your existing subscription |
| **OpenAI** | Add your API key |
| **Azure OpenAI** | Configure endpoint and deployment |
| **Ollama** | Run Ollama locally |

> 💡 **Tip:** Select "copilot" as LLM provider for the best experience with zero configuration!

### Embedding Provider (for Semantic Search)

Enable semantic search with embeddings:

| Provider | Best for |
|----------|----------|
| **None** | Keyword search only (fast, no setup) |
| **OpenAI** | Best quality embeddings |
| **Azure OpenAI** | Enterprise environments |
| **Ollama** | Privacy-focused, runs locally |

---

## 💡 Use Cases

### 📝 Project Documentation
```
"Remember: The API authentication uses JWT tokens with 24h expiry"
"Remember: Deploy to production using 'npm run deploy:prod'"
```

### 👤 User Preferences
```
"Remember that I prefer functional programming style"
"Remember I use tabs, not spaces"
```

### 🔧 Troubleshooting Notes
```
"Remember: If Docker fails, run 'docker system prune' first"
"Remember: The SSL cert renews on the 15th of each month"
```

### 📚 Learning & Research
```
"Remember this explanation of React hooks: ..."
"What did I learn about async/await patterns?"
```

---

## 📋 Requirements

- **VS Code** 1.102.0 or later
- **GitHub Copilot** subscription
- **Node.js** 18+ (for extension)

---

## 🔒 Privacy & Storage

- All memories are stored **locally** in your workspace (`.memvid/agent-memory.mv2`)
- No data is sent to external servers unless you configure an external LLM/embedding provider
- Use Copilot + no embeddings for a fully local experience

---

## 📖 Commands

Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type "Memvid":

| Command | Description |
|---------|-------------|
| `Memvid: Show Memory Statistics` | View how much is stored |
| `Memvid: Open Agent Memory File` | Browse memory file location |
| `Memvid: Clear Agent Memory` | Start fresh |
| `Memvid: Refresh MCP Server` | Reconnect if needed |

---

## 🐛 Troubleshooting

**Agent doesn't remember anything?**
- Check that the extension is active (look for Memvid in the status bar)
- Try `Memvid: Refresh MCP Server` from Command Palette

**Search returns no results?**
- Try different keywords
- Configure an LLM provider for automatic query rewriting
- Use `memvid_timeline` to see what's stored

**Need help?**
- [Open an issue](https://github.com/RickyKleinhempel/memvid-vscode-extension/issues)
- [Memvid Documentation](https://github.com/Olow304/memvid)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with ❤️ using the <a href="https://github.com/Olow304/memvid">Memvid</a> framework
</p>
