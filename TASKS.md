# Memvid Agent Memory Extension - Implementation Tasks

## Overview

This document contains the implementation task list for the Memvid Agent Memory VS Code Extension. Tasks are organized in phases and should be completed in order.

---

## Phase 1: Project Setup & Foundation

### 1.1 Initialize Extension Project
- [ ] **T-001**: Run VS Code Extension Generator (`yo code`)
  - Select: New Extension (TypeScript)
  - Name: `memvid-agent-memory`
  - Initialize git repository
- [ ] **T-002**: Configure `tsconfig.json` for ES2022 and Node.js
- [ ] **T-003**: Set up ESLint and Prettier for code quality
- [ ] **T-004**: Configure esbuild for bundling

### 1.2 Install Dependencies
- [ ] **T-005**: Install `@memvid/sdk` package
- [ ] **T-006**: Install `@modelcontextprotocol/sdk` for MCP server
- [ ] **T-007**: Install dev dependencies (`@types/vscode`, `@types/node`, `typescript`, `esbuild`)

### 1.3 Configure Extension Manifest
- [ ] **T-008**: Update `package.json` with extension metadata
  - Name, displayName, description, publisher
  - VS Code engine version (^1.102.0)
  - Categories and keywords
- [ ] **T-009**: Add `activationEvents` (`onStartupFinished`)
- [ ] **T-010**: Add `contributes.mcpServerDefinitionProviders` contribution point
- [ ] **T-011**: Add `contributes.configuration` settings schema
- [ ] **T-012**: Add `contributes.commands` for manual actions

---

## Phase 2: Core Memory Management

### 2.1 Memory Manager Implementation
- [ ] **T-013**: Create `src/memoryManager.ts` file
- [ ] **T-014**: Implement `MemoryManager` class with singleton pattern
- [ ] **T-015**: Implement `initialize(path: string)` method
  - Create or open `.mv2` memory file using Memvid SDK
  - Handle file creation in workspace or global storage
- [ ] **T-016**: Implement `store(entry: MemoryEntry)` method
  - Store documents with title, content, label, tags, metadata
- [ ] **T-017**: Implement `search(query: string, options?: SearchOptions)` method
  - BM25 keyword search with limit and label filter
- [ ] **T-018**: Implement `ask(question: string, options?: AskOptions)` method
  - RAG query against memory
- [ ] **T-019**: Implement `getTimeline(limit?: number)` method
  - Return recent entries in chronological order
- [ ] **T-020**: Implement `getStats()` method
  - Return memory statistics (count, size, labels)
- [ ] **T-021**: Implement `close()` method for cleanup
- [ ] **T-022**: Implement `clear()` method to reset memory

### 2.2 Type Definitions
- [ ] **T-023**: Create `src/types/index.ts` file
- [ ] **T-024**: Define `MemoryEntry` interface
- [ ] **T-025**: Define `SearchOptions` interface
- [ ] **T-026**: Define `AskOptions` interface
- [ ] **T-027**: Define `MemoryStats` interface
- [ ] **T-028**: Define `TimelineEntry` interface

### 2.3 Configuration Management
- [ ] **T-029**: Create `src/config/settings.ts` file
- [ ] **T-030**: Implement `getMemoryFilePath()` function
- [ ] **T-031**: Implement `getEmbeddingProvider()` function
- [ ] **T-032**: Implement `shouldAutoCreateMemory()` function
- [ ] **T-033**: Implement configuration change listener

---

## Phase 3: MCP Server Implementation

### 3.1 MCP Server Core
- [ ] **T-034**: Create `src/mcpServer.ts` file
- [ ] **T-035**: Implement `MemvidMcpServer` class
- [ ] **T-036**: Initialize MCP Server with name and version
- [ ] **T-037**: Set up stdio transport for communication
- [ ] **T-038**: Implement memory initialization on server start

### 3.2 Tool Handlers
- [ ] **T-039**: Implement `tools/list` request handler
  - Return array of all available tools with schemas
- [ ] **T-040**: Implement `tools/call` request handler dispatcher
- [ ] **T-041**: Implement `handleStore()` for `memvid_store` tool
- [ ] **T-042**: Implement `handleSearch()` for `memvid_search` tool
- [ ] **T-043**: Implement `handleAsk()` for `memvid_ask` tool
- [ ] **T-044**: Implement `handleTimeline()` for `memvid_timeline` tool
- [ ] **T-045**: Implement `handleStats()` for `memvid_stats` tool

### 3.3 Tool Schemas
- [ ] **T-046**: Create `src/tools/schemas.ts` file
- [ ] **T-047**: Define JSON Schema for `memvid_store` tool
- [ ] **T-048**: Define JSON Schema for `memvid_search` tool
- [ ] **T-049**: Define JSON Schema for `memvid_ask` tool
- [ ] **T-050**: Define JSON Schema for `memvid_timeline` tool
- [ ] **T-051**: Define JSON Schema for `memvid_stats` tool

### 3.4 Error Handling
- [ ] **T-052**: Create `src/errors.ts` file
- [ ] **T-053**: Define custom error classes for MCP operations
- [ ] **T-054**: Implement error mapping to MCP error responses
- [ ] **T-055**: Add logging for debugging

---

## Phase 4: MCP Provider Integration

### 4.1 MCP Provider
- [ ] **T-056**: Create `src/mcpProvider.ts` file
- [ ] **T-057**: Implement `MemvidMcpProvider` class
- [ ] **T-058**: Implement `provideMcpServerDefinitions()` method
  - Return `McpStdioServerDefinition` with node command
- [ ] **T-059**: Implement `resolveMcpServerDefinition()` method
- [ ] **T-060**: Implement `onDidChangeMcpServerDefinitions` event emitter
- [ ] **T-061**: Implement `refresh()` method for configuration changes

### 4.2 Extension Activation
- [ ] **T-062**: Update `src/extension.ts` with activation logic
- [ ] **T-063**: Register MCP provider using `lm.registerMcpServerDefinitionProvider()`
- [ ] **T-064**: Register extension commands
- [ ] **T-065**: Initialize memory manager on activation
- [ ] **T-066**: Implement `deactivate()` function for cleanup

---

## Phase 5: VS Code Commands

### 5.1 Command Implementations
- [ ] **T-067**: Create `src/commands/index.ts` file
- [ ] **T-068**: Implement `openMemory` command
  - Show memory file in editor or file explorer
- [ ] **T-069**: Implement `clearMemory` command
  - Show confirmation dialog before clearing
- [ ] **T-070**: Implement `showStats` command
  - Display memory statistics in information message or webview

### 5.2 Status Bar Integration
- [ ] **T-071**: Create status bar item showing memory status
- [ ] **T-072**: Update status bar on memory changes
- [ ] **T-073**: Add click action to show memory stats

---

## Phase 6: Testing

### 6.1 Unit Tests
- [ ] **T-074**: Set up Jest or Mocha testing framework
- [ ] **T-075**: Write tests for `MemoryManager` class
- [ ] **T-076**: Write tests for MCP tool handlers
- [ ] **T-077**: Write tests for configuration management

### 6.2 Integration Tests
- [ ] **T-078**: Write integration tests for MCP server communication
- [ ] **T-079**: Write tests for extension activation/deactivation
- [ ] **T-080**: Write tests for memory file creation and persistence

### 6.3 Manual Testing
- [ ] **T-081**: Test MCP tools with GitHub Copilot in agent mode
- [ ] **T-082**: Test memory persistence across VS Code sessions
- [ ] **T-083**: Test on Windows (with OpenAI embeddings)
- [ ] **T-084**: Test on macOS/Linux (with local embeddings)

---

## Phase 7: Documentation & Polish

### 7.1 Documentation
- [ ] **T-085**: Write comprehensive README.md
  - Features, installation, usage, configuration
- [ ] **T-086**: Add inline code documentation (JSDoc comments)
- [ ] **T-087**: Create CHANGELOG.md
- [ ] **T-088**: Add LICENSE file

### 7.2 Extension Assets
- [ ] **T-089**: Create extension icon (128x128 PNG)
- [ ] **T-090**: Add screenshots for marketplace listing
- [ ] **T-091**: Write marketplace description

### 7.3 Code Quality
- [ ] **T-092**: Review and refactor code for best practices
- [ ] **T-093**: Ensure all functions and classes are documented in English
- [ ] **T-094**: Run linter and fix all issues
- [ ] **T-095**: Optimize bundle size

---

## Phase 8: Publishing

### 8.1 Pre-publish Checklist
- [ ] **T-096**: Verify all tests pass
- [ ] **T-097**: Update version number in `package.json`
- [ ] **T-098**: Create `.vscodeignore` file for clean packaging
- [ ] **T-099**: Test extension package locally (`vsce package`)

### 8.2 Publish to Marketplace
- [ ] **T-100**: Create publisher account on VS Code Marketplace
- [ ] **T-101**: Generate Personal Access Token (PAT)
- [ ] **T-102**: Publish extension (`vsce publish`)
- [ ] **T-103**: Verify extension is live and installable

---

## Task Dependencies

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5
                │                       │
                └───────────────────────┴──► Phase 6 ──► Phase 7 ──► Phase 8
```

---

## Estimated Time

| Phase | Description | Estimated Hours |
|-------|-------------|-----------------|
| Phase 1 | Project Setup | 2-3h |
| Phase 2 | Memory Management | 4-6h |
| Phase 3 | MCP Server | 6-8h |
| Phase 4 | MCP Provider | 2-3h |
| Phase 5 | Commands | 2-3h |
| Phase 6 | Testing | 4-6h |
| Phase 7 | Documentation | 2-3h |
| Phase 8 | Publishing | 1-2h |
| **Total** | | **23-34h** |

---

## Priority Tasks (MVP)

For a Minimum Viable Product, focus on these essential tasks:

1. **T-001 to T-012**: Project setup and manifest
2. **T-013 to T-022**: Core memory manager
3. **T-034 to T-045**: MCP server and tool handlers
4. **T-056 to T-066**: MCP provider and activation
5. **T-081 to T-082**: Basic manual testing

**MVP Estimated Time**: 12-16 hours

---

## Notes

- All code comments and function documentation must be in **English**
- Follow VS Code extension best practices
- Test on Windows with OpenAI embeddings (local embeddings not supported)
- Consider error handling for network failures (embedding API calls)
- Memory file should be excluded from git via `.gitignore`
