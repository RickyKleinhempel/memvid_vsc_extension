# Memvid Agent Memory VS Code Extension - Concept Document

## 1. Overview

This document describes the concept for a VS Code extension that provides persistent AI Agent Memory using the [Memvid](https://github.com/memvid/memvid) library. The extension automatically registers MCP (Model Context Protocol) tools, allowing GitHub Copilot agents to store and retrieve information from their memory without requiring manual `mcp.json` configuration.

### Key Features

- **Automatic MCP Tool Registration**: Tools are registered programmatically via VS Code API
- **Persistent Agent Memory**: Uses Memvid's `.mv2` file format for single-file memory storage
- **GitHub Copilot Integration**: Seamless integration with Copilot agents
- **Zero Configuration**: Works immediately after installation

---

## 2. Technology Stack

### 2.1 Memvid SDK

**Package**: `@memvid/sdk` (npm)

**What is Memvid?**
Memvid is a portable AI memory system that packages data, embeddings, search structure, and metadata into a single `.mv2` file. It enables fast retrieval directly from the file without complex RAG pipelines or server-based vector databases.

**Core Capabilities:**
- Single-file memory storage (`.mv2` format)
- BM25 + vector ranking search
- RAG (Retrieval Augmented Generation) queries
- Framework integrations (LangChain, LlamaIndex, OpenAI, Vercel AI)
- Sub-5ms local memory access
- Append-only, versioned, crash-safe storage

**Installation:**
```bash
npm install @memvid/sdk
```

**Basic API Usage:**
```typescript
import { create, use } from "@memvid/sdk";

// Create a new memory file
const mv = await create("agent-memory.mv2");

// Store documents
await mv.put({
  title: "Memory Entry",
  label: "agent",
  text: "Information to remember...",
  metadata: { date: "2026-01-09", type: "context" }
});

// Search by keyword
const results = await mv.find("search term", { k: 10 });

// RAG query
const answer = await mv.ask("What do I remember about X?", {
  model: "openai:gpt-4o-mini"
});

// Close the memory file
await mv.seal();
```

**Platform Support:**
| Platform | Architecture | Local Embeddings |
|----------|-------------|------------------|
| macOS | ARM64 (Apple Silicon) | ✅ |
| macOS | x64 (Intel) | ✅ |
| Linux | x64 (glibc) | ✅ |
| Windows | x64 | ❌ (use OpenAI) |

> **Note**: On Windows, local embedding models are not available. Use OpenAI embeddings by setting `OPENAI_API_KEY`.

---

## 3. VS Code Extension Architecture

### 3.1 Extension Structure

```
memvid-agent-memory/
├── src/
│   ├── extension.ts           # Extension entry point & activation
│   ├── memoryManager.ts       # Memvid SDK wrapper & memory operations
│   ├── mcpProvider.ts         # MCP server definition provider
│   ├── mcpServer.ts           # MCP server implementation (stdio)
│   ├── tools/
│   │   ├── index.ts           # Tool exports
│   │   ├── storeMemory.ts     # Tool: Store information in memory
│   │   ├── searchMemory.ts    # Tool: Search memory by keywords
│   │   ├── askMemory.ts       # Tool: RAG query against memory
│   │   ├── getTimeline.ts     # Tool: Get recent memory entries
│   │   └── clearMemory.ts     # Tool: Clear/reset memory
│   └── config/
│       └── settings.ts        # Extension settings management
├── package.json               # Extension manifest
├── tsconfig.json
└── README.md
```

### 3.2 Extension Manifest (package.json)

```json
{
  "name": "memvid-agent-memory",
  "displayName": "Memvid Agent Memory",
  "description": "Provides persistent AI Agent Memory using Memvid for GitHub Copilot agents",
  "version": "1.0.0",
  "publisher": "your-publisher-id",
  "engines": {
    "vscode": "^1.102.0"
  },
  "categories": ["AI", "Other"],
  "keywords": ["memvid", "agent", "memory", "copilot", "mcp", "ai"],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "mcpServerDefinitionProviders": [
      {
        "id": "memvid-agent-memory.mcp-server",
        "label": "Memvid Agent Memory"
      }
    ],
    "configuration": {
      "title": "Memvid Agent Memory",
      "properties": {
        "memvidAgentMemory.memoryFilePath": {
          "type": "string",
          "default": "",
          "description": "Path to the memory file (.mv2). If empty, uses workspace or global storage."
        },
        "memvidAgentMemory.embeddingProvider": {
          "type": "string",
          "enum": ["local", "openai", "cohere", "voyage"],
          "default": "local",
          "description": "Embedding provider for semantic search"
        },
        "memvidAgentMemory.autoCreateMemory": {
          "type": "boolean",
          "default": true,
          "description": "Automatically create memory file if it doesn't exist"
        }
      }
    },
    "commands": [
      {
        "command": "memvidAgentMemory.openMemory",
        "title": "Memvid: Open Agent Memory"
      },
      {
        "command": "memvidAgentMemory.clearMemory",
        "title": "Memvid: Clear Agent Memory"
      },
      {
        "command": "memvidAgentMemory.showStats",
        "title": "Memvid: Show Memory Statistics"
      }
    ]
  },
  "dependencies": {
    "@memvid/sdk": "^2.0.146"
  },
  "devDependencies": {
    "@types/vscode": "^1.102.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "esbuild": "^0.20.0"
  }
}
```

---

## 4. MCP Integration Concept

### 4.1 Automatic MCP Registration (No mcp.json Required)

VS Code provides the `lm.registerMcpServerDefinitionProvider` API that allows extensions to programmatically register MCP servers. This eliminates the need for users to manually configure `mcp.json` files.

**Key API:**
```typescript
vscode.lm.registerMcpServerDefinitionProvider(
  id: string,
  provider: McpServerDefinitionProvider
): Disposable
```

**McpServerDefinitionProvider Interface:**
```typescript
interface McpServerDefinitionProvider<T extends McpServerDefinition> {
  readonly onDidChangeMcpServerDefinitions?: Event<void>;
  provideMcpServerDefinitions(token: CancellationToken): ProviderResult<T[]>;
  resolveMcpServerDefinition?(server: T, token: CancellationToken): ProviderResult<T>;
}
```

**McpStdioServerDefinition Class:**
```typescript
class McpStdioServerDefinition {
  constructor(
    label: string,
    command: string,
    args?: string[],
    env?: Record<string, string | number | null>,
    version?: string
  )
}
```

### 4.2 MCP Provider Implementation

```typescript
// src/mcpProvider.ts
import * as vscode from 'vscode';

export class MemvidMcpProvider implements vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> {
  
  private _onDidChangeMcpServerDefinitions = new vscode.EventEmitter<void>();
  readonly onDidChangeMcpServerDefinitions = this._onDidChangeMcpServerDefinitions.event;

  constructor(private extensionPath: string) {}

  provideMcpServerDefinitions(
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.McpStdioServerDefinition[]> {
    
    const serverPath = vscode.Uri.joinPath(
      vscode.Uri.file(this.extensionPath),
      'out',
      'mcpServer.js'
    ).fsPath;

    const server = new vscode.McpStdioServerDefinition(
      'Memvid Agent Memory',           // label
      'node',                           // command
      [serverPath],                     // args
      {                                 // env
        MEMVID_MEMORY_PATH: this.getMemoryPath()
      },
      '1.0.0'                          // version
    );

    return [server];
  }

  resolveMcpServerDefinition(
    server: vscode.McpStdioServerDefinition,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.McpStdioServerDefinition> {
    // Resolve configuration at startup time
    return server;
  }

  private getMemoryPath(): string {
    const config = vscode.workspace.getConfiguration('memvidAgentMemory');
    const customPath = config.get<string>('memoryFilePath');
    
    if (customPath) {
      return customPath;
    }
    
    // Default to workspace or global storage
    if (vscode.workspace.workspaceFolders?.[0]) {
      return vscode.Uri.joinPath(
        vscode.workspace.workspaceFolders[0].uri,
        '.memvid',
        'agent-memory.mv2'
      ).fsPath;
    }
    
    return '';
  }

  refresh(): void {
    this._onDidChangeMcpServerDefinitions.fire();
  }
}
```

### 4.3 Extension Activation

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { MemvidMcpProvider } from './mcpProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Memvid Agent Memory extension is now active');

  // Register MCP server definition provider
  const mcpProvider = new MemvidMcpProvider(context.extensionPath);
  
  const disposable = vscode.lm.registerMcpServerDefinitionProvider(
    'memvid-agent-memory.mcp-server',
    mcpProvider
  );
  
  context.subscriptions.push(disposable);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('memvidAgentMemory.openMemory', () => {
      // Open memory file or show UI
    }),
    vscode.commands.registerCommand('memvidAgentMemory.clearMemory', () => {
      // Clear memory with confirmation
    }),
    vscode.commands.registerCommand('memvidAgentMemory.showStats', () => {
      // Show memory statistics
    })
  );
}

export function deactivate() {
  // Cleanup resources
}
```

---

## 5. MCP Tools Definition

The MCP server exposes the following tools for GitHub Copilot agents:

### 5.1 Tool: `memvid_store`

**Description**: Store information in the agent's persistent memory.

```json
{
  "name": "memvid_store",
  "description": "Store information in the agent's persistent memory for later retrieval. Use this to remember important context, decisions, user preferences, or any information that should persist across sessions.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "A brief title for the memory entry"
      },
      "content": {
        "type": "string",
        "description": "The content to store in memory"
      },
      "label": {
        "type": "string",
        "description": "Category label for organization (e.g., 'user-preference', 'decision', 'context')"
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Optional tags for better searchability"
      }
    },
    "required": ["title", "content"]
  }
}
```

### 5.2 Tool: `memvid_search`

**Description**: Search the agent's memory by keywords.

```json
{
  "name": "memvid_search",
  "description": "Search the agent's memory using keywords. Returns relevant memory entries matching the search query.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query"
      },
      "limit": {
        "type": "number",
        "description": "Maximum number of results to return (default: 10)"
      },
      "label": {
        "type": "string",
        "description": "Optional: filter by label"
      }
    },
    "required": ["query"]
  }
}
```

### 5.3 Tool: `memvid_ask`

**Description**: Ask a question about the stored memory using RAG.

```json
{
  "name": "memvid_ask",
  "description": "Ask a natural language question about the agent's stored memories. Uses RAG to synthesize an answer from relevant memory entries.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "question": {
        "type": "string",
        "description": "The question to ask about stored memories"
      },
      "contextLimit": {
        "type": "number",
        "description": "Number of memory entries to use as context (default: 5)"
      }
    },
    "required": ["question"]
  }
}
```

### 5.4 Tool: `memvid_timeline`

**Description**: Get recent memory entries in chronological order.

```json
{
  "name": "memvid_timeline",
  "description": "Retrieve recent memory entries in chronological order. Useful for understanding recent context or history.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "limit": {
        "type": "number",
        "description": "Maximum number of entries to return (default: 20)"
      }
    },
    "required": []
  }
}
```

### 5.5 Tool: `memvid_stats`

**Description**: Get statistics about the agent's memory.

```json
{
  "name": "memvid_stats",
  "description": "Get statistics about the agent's memory, including total entries, size, and labels.",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

---

## 6. MCP Server Implementation

The MCP server runs as a Node.js process communicating via stdio:

```typescript
// src/mcpServer.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { create, use } from '@memvid/sdk';

class MemvidMcpServer {
  private server: Server;
  private memory: any; // Memvid instance

  constructor() {
    this.server = new Server(
      { name: 'memvid-agent-memory', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.setupHandlers();
  }

  private async initMemory(): Promise<void> {
    const memoryPath = process.env.MEMVID_MEMORY_PATH || './agent-memory.mv2';
    this.memory = await use('basic', memoryPath, { mode: 'auto' });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'memvid_store',
          description: 'Store information in the agent\'s persistent memory',
          inputSchema: { /* ... */ }
        },
        {
          name: 'memvid_search',
          description: 'Search the agent\'s memory using keywords',
          inputSchema: { /* ... */ }
        },
        // ... other tools
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'memvid_store':
          return this.handleStore(args);
        case 'memvid_search':
          return this.handleSearch(args);
        case 'memvid_ask':
          return this.handleAsk(args);
        case 'memvid_timeline':
          return this.handleTimeline(args);
        case 'memvid_stats':
          return this.handleStats(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleStore(args: any): Promise<any> {
    await this.memory.put({
      title: args.title,
      label: args.label || 'general',
      text: args.content,
      tags: args.tags || [],
      metadata: { timestamp: new Date().toISOString() }
    });
    
    return {
      content: [{ type: 'text', text: `Stored: "${args.title}"` }]
    };
  }

  private async handleSearch(args: any): Promise<any> {
    const results = await this.memory.find(args.query, {
      k: args.limit || 10
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results.hits, null, 2)
      }]
    };
  }

  private async handleAsk(args: any): Promise<any> {
    const answer = await this.memory.ask(args.question, {
      k: args.contextLimit || 5,
      contextOnly: false
    });
    
    return {
      content: [{ type: 'text', text: answer.text }]
    };
  }

  private async handleTimeline(args: any): Promise<any> {
    const entries = await this.memory.timeline({ limit: args.limit || 20 });
    return {
      content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }]
    };
  }

  private async handleStats(args: any): Promise<any> {
    const stats = await this.memory.stats();
    return {
      content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }]
    };
  }

  async run(): Promise<void> {
    await this.initMemory();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new MemvidMcpServer();
server.run().catch(console.error);
```

---

## 7. User Workflow

### 7.1 Installation

1. User installs the "Memvid Agent Memory" extension from VS Code Marketplace
2. Extension activates on VS Code startup (`onStartupFinished`)
3. MCP server is automatically registered - no `mcp.json` configuration needed
4. Memory file is created automatically in workspace or global storage

### 7.2 Usage with GitHub Copilot

**Storing Information:**
```
User: "Remember that the user prefers dark mode and uses TypeScript"

Copilot Agent: [Uses memvid_store tool]
→ Stores: title="User Preferences", content="User prefers dark mode and uses TypeScript", label="user-preference"
```

**Retrieving Information:**
```
User: "What are the user's preferences?"

Copilot Agent: [Uses memvid_search or memvid_ask tool]
→ Retrieves relevant memory entries
→ Responds: "Based on my memory, the user prefers dark mode and uses TypeScript."
```

**Checking Recent Context:**
```
User: "What have we discussed recently?"

Copilot Agent: [Uses memvid_timeline tool]
→ Returns chronological list of recent memory entries
```

---

## 8. Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `memvidAgentMemory.memoryFilePath` | string | `""` | Custom path to memory file. If empty, uses workspace `.memvid/agent-memory.mv2` |
| `memvidAgentMemory.embeddingProvider` | enum | `"local"` | Embedding provider: `local`, `openai`, `cohere`, `voyage` |
| `memvidAgentMemory.autoCreateMemory` | boolean | `true` | Auto-create memory file if not exists |
| `memvidAgentMemory.enableSemanticSearch` | boolean | `true` | Enable semantic/vector search |
| `memvidAgentMemory.maxMemorySize` | number | `100` | Max memory entries before rotation (MB) |

---

## 9. Security Considerations

1. **Memory File Location**: Memory files are stored locally, not transmitted externally
2. **API Keys**: If using OpenAI embeddings, `OPENAI_API_KEY` is required but stored securely
3. **MCP Trust**: VS Code prompts users to trust the MCP server on first use
4. **Data Isolation**: Each workspace can have its own isolated memory file
5. **Encryption**: Future consideration - Memvid supports `.mv2e` encrypted capsules

---

## 10. Development Setup

### 10.1 Prerequisites

- Node.js 18+
- VS Code 1.102+
- Git

### 10.2 Project Initialization

```bash
# Create extension scaffold
npx --package yo --package generator-code -- yo code

# Select: New Extension (TypeScript)
# Name: memvid-agent-memory

# Install dependencies
cd memvid-agent-memory
npm install @memvid/sdk
npm install @modelcontextprotocol/sdk
```

### 10.3 Build & Test

```bash
# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Run extension in debug mode
# Press F5 in VS Code
```

---

## 11. Roadmap

### Phase 1: MVP
- [x] Concept design
- [ ] Basic extension structure
- [ ] MCP server registration via API
- [ ] Core memory tools (store, search, timeline)

### Phase 2: Enhanced Features
- [ ] Semantic search with embeddings
- [ ] RAG query support (`memvid_ask`)
- [ ] Memory statistics UI
- [ ] Memory browser webview

### Phase 3: Advanced
- [ ] Multi-workspace memory management
- [ ] Memory export/import
- [ ] Encrypted memory files
- [ ] Memory sharing between team members

---

## 12. References

- [Memvid GitHub Repository](https://github.com/memvid/memvid)
- [Memvid SDK (npm)](https://www.npmjs.com/package/@memvid/sdk)
- [Memvid Documentation](https://docs.memvid.com/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code MCP Integration](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [VS Code Extension Generator](https://www.npmjs.com/package/generator-code)

---

## 13. Conclusion

This extension provides a seamless way to give GitHub Copilot agents persistent memory capabilities. By leveraging Memvid's single-file memory system and VS Code's MCP API, agents can store, retrieve, and reason about information across sessions without any user configuration.

The automatic MCP tool registration ensures a zero-configuration experience, making it accessible for all users while providing powerful memory capabilities for AI agents.
