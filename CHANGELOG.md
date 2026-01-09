# Changelog

All notable changes to the Memvid Agent Memory extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-01-09

### Added
- Initial release
- MCP server with automatic registration (no mcp.json required)
- `memvid_store` tool for storing information in memory
- `memvid_search` tool for keyword-based search
- `memvid_ask` tool for RAG queries
- `memvid_timeline` tool for chronological memory view
- `memvid_stats` tool for memory statistics
- Commands for memory management:
  - Open memory file
  - Clear memory
  - Show statistics
  - Refresh MCP server
- Configuration options:
  - Custom memory file path
  - Embedding provider selection
  - Auto-create memory setting
  - Semantic search toggle
  - Default search limit
- Welcome message for first-time users
- Support for workspace and global storage locations
