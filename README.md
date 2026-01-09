# Memvid Agent Memory

**Persistent AI Agent Memory for GitHub Copilot**

This VS Code extension provides persistent memory capabilities for GitHub Copilot agents using [Memvid](https://github.com/memvid/memvid). Agents can store, search, and retrieve information across sessions without any manual configuration.

## Features

- 🧠 **Persistent Memory**: Store information that persists across VS Code sessions
- 🔍 **Smart Search**: BM25 keyword search and semantic vector search
- 💬 **RAG Queries**: Ask natural language questions about stored memories
- ⏱️ **Timeline View**: See recent memory entries in chronological order
- 🔌 **Zero Configuration**: MCP tools are automatically registered - no `mcp.json` needed

## MCP Tools

The extension provides the following MCP tools for GitHub Copilot agents:

| Tool | Description |
|------|-------------|
| `memvid_store` | Store information in persistent memory |
| `memvid_search` | Search memory by keywords |
| `memvid_ask` | Ask questions using RAG |
| `memvid_timeline` | Get recent memory entries |
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

The agent will search memory and return relevant stored information.

### Viewing Timeline

```
"What have we discussed recently?"
```

The agent will show recent memory entries in chronological order.

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

### Embedding Providers

Choose one of the following embedding providers:

| Provider | Description |
|----------|-------------|
| `none` | BM25 keyword search only (no embeddings) |
| `local` | Local embeddings (not available on Windows) |
| `openai` | OpenAI embeddings (requires API key) |
| `azureOpenai` | Azure OpenAI embeddings (requires endpoint and API key) |
| `ollama` | Ollama local embeddings (requires local Ollama server) |
| `cohere` | Cohere embeddings (requires API key) |
| `voyage` | Voyage embeddings (requires API key) |

### OpenAI Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.openai.apiKey` | `""` | OpenAI API Key (or set via `OPENAI_API_KEY` env var) |
| `memvidAgentMemory.openai.baseUrl` | `"https://api.openai.com/v1"` | OpenAI API base URL (change for compatible endpoints) |
| `memvidAgentMemory.openai.model` | `"text-embedding-3-small"` | OpenAI embedding model |

### Azure OpenAI Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.azureOpenai.endpoint` | `""` | Azure OpenAI endpoint URL (e.g., `https://your-resource.openai.azure.com`) |
| `memvidAgentMemory.azureOpenai.apiKey` | `""` | Azure OpenAI API Key (or set via `AZURE_OPENAI_API_KEY` env var) |
| `memvidAgentMemory.azureOpenai.deploymentName` | `""` | Azure OpenAI deployment name for embeddings |
| `memvidAgentMemory.azureOpenai.apiVersion` | `"2024-02-01"` | Azure OpenAI API version |

### Ollama Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `memvidAgentMemory.ollama.baseUrl` | `"http://localhost:11434"` | Ollama server URL |
| `memvidAgentMemory.ollama.model` | `"nomic-embed-text"` | Ollama embedding model |

> **Tip**: On Windows, local embeddings are not available. Use `openai`, `azureOpenai`, or `ollama` as the embedding provider.

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
- GitHub Copilot subscription

## Platform Support

| Platform | Local Embeddings | Notes |
|----------|-----------------|-------|
| macOS (ARM64) | ✅ | Full support |
| macOS (Intel) | ✅ | Full support |
| Linux (x64) | ✅ | Full support |
| Windows | ❌ | Use OpenAI embeddings |

## Memory File Location

Memory is stored in a single `.mv2` file:

1. **Workspace**: `.memvid/agent-memory.mv2` in workspace root
2. **Global**: VS Code global storage if no workspace is open

## Development

```bash
# Clone the repository
git clone https://github.com/memvid/memvid-vscode-extension.git
cd memvid-vscode-extension

# Install dependencies
npm install

# Compile
npm run compile

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
