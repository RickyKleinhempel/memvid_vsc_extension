# Memvid Agent Memory

**Persistent AI Agent Memory for GitHub Copilot**

This VS Code extension provides persistent memory capabilities for GitHub Copilot agents using [Memvid](https://github.com/memvid/memvid). Agents can store, search, and retrieve information across sessions without any manual configuration.

## Features

- 🧠 **Persistent Memory**: Store information that persists across VS Code sessions
- 🔍 **Smart Search**: BM25 keyword search with intelligent fallback strategies
- 🤖 **Query Rewriter Agent**: LLM-powered query rewriting when initial search fails
- 💬 **RAG Queries**: Ask natural language questions with LLM-generated answers
- ⏱️ **Timeline View**: See recent memory entries (newest first)
- 🔌 **Zero Configuration**: MCP tools are automatically registered - no `mcp.json` needed
- 🌐 **Multi-Language Support**: Stopword filtering for German and English

## MCP Tools

The extension provides the following MCP tools for GitHub Copilot agents:

| Tool | Description |
|------|-------------|
| `memvid_store` | Store information in persistent memory |
| `memvid_search` | Search memory by keywords |
| `memvid_ask` | Ask questions using RAG with LLM answer synthesis |
| `memvid_timeline` | Get recent memory entries (newest first) |
| `memvid_stats` | View memory statistics |

## Usage

### Storing Information

Copilot agents can store information using natural language:

```
"Remember that the user prefers dark mode and uses TypeScript"
```

The agent will use the `memvid_store` tool to save this preference.

### Retrieving Information

```
"What are the user's coding preferences?"
```

The agent will search memory and return relevant stored information. If an LLM provider is configured, it will synthesize an answer from the search results.

### Query Rewriting

When a search returns no results, the extension can use an LLM to generate alternative search terms:

```
User: "When is the best time for deep work?"
→ Initial search: "deep work" - no results
→ Query Rewriter generates: ["konzentriertes arbeiten", "focus", "produktivität", "flow"]
→ Retry search finds relevant memories
```

### Viewing Timeline

```
"What have we discussed recently?"
```

The agent will show recent memory entries in reverse chronological order (newest first).

## Configuration

Configure the extension in VS Code Settings (`Ctrl+,`):

### General Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.memoryFilePath` | `""` | Custom path to memory file. If empty, uses workspace or global storage. |
| `memvidAgentMemory.embeddingProvider` | `"none"` | Embedding provider for semantic search |
| `memvidAgentMemory.autoCreateMemory` | `true` | Auto-create memory file if it doesn't exist |
| `memvidAgentMemory.enableSemanticSearch` | `true` | Enable semantic/vector search |
| `memvidAgentMemory.defaultSearchLimit` | `10` | Default number of search results |

---

## Embedding Providers

Choose one of the following embedding providers for semantic search:

| Provider | Description |
|----------|-------------|
| `none` | BM25 keyword search only (no embeddings) |
| `local` | Local embeddings (not available on Windows) |
| `openai` | OpenAI embeddings (requires API key) |
| `azureOpenai` | Azure OpenAI embeddings (requires endpoint and API key) |
| `ollama` | Ollama local embeddings (requires local Ollama server) |
| `cohere` | Cohere embeddings (requires API key) |
| `voyage` | Voyage embeddings (requires API key) |

### OpenAI Embedding Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.openai.apiKey` | `""` | OpenAI API Key (or set via `OPENAI_API_KEY` env var) |
| `memvidAgentMemory.openai.baseUrl` | `"https://api.openai.com/v1"` | OpenAI API base URL (change for compatible endpoints) |
| `memvidAgentMemory.openai.model` | `"text-embedding-3-small"` | OpenAI embedding model |

### Azure OpenAI Embedding Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.azureOpenai.endpoint` | `""` | Azure OpenAI endpoint URL |
| `memvidAgentMemory.azureOpenai.apiKey` | `""` | Azure OpenAI API Key |
| `memvidAgentMemory.azureOpenai.deploymentName` | `""` | Azure OpenAI deployment name for embeddings |
| `memvidAgentMemory.azureOpenai.apiVersion` | `"2024-02-01"` | Azure OpenAI API version |

### Ollama Embedding Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.ollama.baseUrl` | `"http://localhost:11434"` | Ollama server URL |
| `memvidAgentMemory.ollama.model` | `"nomic-embed-text"` | Ollama embedding model |

---

## LLM Provider (for Answer Generation)

The LLM provider is used to generate answers from search results and to rewrite queries when no results are found.

| Provider | Description |
|----------|-------------|
| `none` | No LLM - returns raw search results only |
| `copilot` | **Recommended** - Uses GitHub Copilot via VS Code Language Model API |
| `openai` | OpenAI Chat API (requires API key) |
| `azureOpenai` | Azure OpenAI Chat API (requires endpoint and API key) |
| `ollama` | Ollama local LLM (requires local Ollama server) |

### LLM General Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.llm.provider` | `"none"` | LLM provider for answer generation |
| `memvidAgentMemory.llm.maxTokens` | `1024` | Maximum tokens in LLM response |
| `memvidAgentMemory.llm.temperature` | `0.7` | LLM temperature (0-1) |

### GitHub Copilot LLM (Recommended)

Uses your existing GitHub Copilot subscription - no additional API keys needed!

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.llm.copilot.modelFamily` | `"gpt-4o"` | Copilot model family (`gpt-4o`, `gpt-4o-mini`, `claude-3.5-sonnet`) |

### OpenAI LLM Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.llm.openai.apiKey` | `""` | OpenAI API Key |
| `memvidAgentMemory.llm.openai.baseUrl` | `"https://api.openai.com/v1"` | OpenAI API base URL |
| `memvidAgentMemory.llm.openai.model` | `"gpt-4o-mini"` | OpenAI chat model |

### Azure OpenAI LLM Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.llm.azureOpenai.endpoint` | `""` | Azure OpenAI endpoint URL |
| `memvidAgentMemory.llm.azureOpenai.apiKey` | `""` | Azure OpenAI API Key |
| `memvidAgentMemory.llm.azureOpenai.deploymentName` | `""` | Azure OpenAI deployment name for chat |
| `memvidAgentMemory.llm.azureOpenai.apiVersion` | `"2024-02-01"` | Azure OpenAI API version |

### Ollama LLM Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.llm.ollama.baseUrl` | `"http://localhost:11434"` | Ollama server URL |
| `memvidAgentMemory.llm.ollama.model` | `"llama3.2"` | Ollama chat model |

---

## Search Behavior

The search system uses intelligent fallback strategies:

1. **Full Query Search**: Searches with the complete query
2. **OR Query**: If no results, combines keywords with OR logic
3. **Single Keyword Search**: Falls back to individual keyword searches
4. **Query Rewriting** (if LLM configured): Uses LLM to generate alternative search terms including:
   - Synonyms
   - German/English translations
   - Related technical terms

### Stopword Filtering

The search automatically filters common stopwords in German and English to improve result quality.

---

## Commands

| Command | Description |
|---------|-------------|
| `Memvid: Open Agent Memory File` | Open the memory file location |
| `Memvid: Clear Agent Memory` | Clear all stored memories |
| `Memvid: Show Memory Statistics` | Display memory stats |
| `Memvid: Refresh MCP Server` | Refresh the MCP server connection |

## Requirements

- VS Code 1.102.0 or later
- Node.js 18 or later
- GitHub Copilot subscription (for MCP tools and optional Copilot LLM)

## Platform Support

| Platform | Local Embeddings | Notes |
|----------|-----------------|-------|
| macOS (ARM64) | ✅ | Full support |
| macOS (Intel) | ✅ | Full support |
| Linux (x64) | ✅ | Full support |
| Windows | ❌ | Use OpenAI/Azure/Ollama embeddings |

## Memory File Location

Memory is stored in a single `.mv2` file:

1. **Workspace**: `.memvid/agent-memory.mv2` in workspace root
2. **Global**: VS Code global storage if no workspace is open

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Copilot                          │
│                          ↕                                  │
│                    MCP Protocol                             │
│                          ↕                                  │
├─────────────────────────────────────────────────────────────┤
│  VS Code Extension                                          │
│  ├── MCP Provider (auto-registers tools)                    │
│  ├── Bridge Server (Copilot LLM access)                     │
│  └── Memory Manager                                         │
│                          ↕                                  │
├─────────────────────────────────────────────────────────────┤
│  MCP Server Process                                         │
│  ├── Tool Handlers (store, search, ask, timeline, stats)    │
│  ├── LLM Service (answer generation, query rewriting)       │
│  └── Memvid SDK                                             │
│                          ↕                                  │
├─────────────────────────────────────────────────────────────┤
│  Storage: agent-memory.mv2                                  │
└─────────────────────────────────────────────────────────────┘
```

## Development

```bash
# Clone the repository
git clone https://github.com/memvid/memvid-vscode-extension.git
cd memvid-vscode-extension

# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Run extension in debug mode
# Press F5 in VS Code
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Memvid GitHub](https://github.com/memvid/memvid)
- [Memvid Documentation](https://docs.memvid.com/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Model Context Protocol](https://modelcontextprotocol.io/)
