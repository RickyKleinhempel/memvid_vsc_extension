/**
 * Type definitions for Memvid Agent Memory Extension
 * @module types
 */

/**
 * Represents a single memory entry to be stored
 */
export interface MemoryEntry {
  /** Brief title for the memory entry */
  title: string;
  /** The content to store in memory */
  content: string;
  /** Category label for organization (e.g., 'user-preference', 'decision', 'context') */
  label?: string;
  /** Optional tags for better searchability */
  tags?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a stored memory entry with additional system fields
 */
export interface StoredMemoryEntry extends MemoryEntry {
  /** Unique frame ID assigned by Memvid */
  frameId: string;
  /** ISO timestamp when the entry was created */
  createdAt: string;
}

/**
 * Options for search operations
 */
export interface SearchOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Filter results by label */
  label?: string;
  /** Search mode: 'lex' (keyword), 'sem' (semantic), or 'auto' */
  mode?: 'lex' | 'sem' | 'auto';
  /** Number of characters for result snippets */
  snippetChars?: number;
}

/**
 * Represents a single search result hit
 */
export interface SearchHit {
  /** Frame ID of the matched entry */
  frameId: string;
  /** Title of the matched entry */
  title: string;
  /** Relevance score */
  score: number;
  /** Text snippet with matched content */
  snippet: string;
  /** Label of the matched entry */
  label?: string;
  /** Metadata of the matched entry */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a search operation
 */
export interface SearchResult {
  /** Array of matching entries */
  hits: SearchHit[];
  /** Total number of potential matches */
  totalHits: number;
  /** Time taken for the search in milliseconds */
  searchTimeMs: number;
}

/**
 * Options for RAG (Retrieval Augmented Generation) queries
 */
export interface AskOptions {
  /** Number of memory entries to use as context (default: 5) */
  contextLimit?: number;
  /** LLM model to use for synthesis (e.g., 'openai:gpt-4o-mini') */
  model?: string;
  /** If true, return only context without LLM synthesis */
  contextOnly?: boolean;
}

/**
 * Result of a RAG query
 */
export interface AskResult {
  /** Synthesized answer text */
  text: string;
  /** Context entries used for the answer */
  context?: SearchHit[];
  /** Model used for synthesis */
  model?: string;
}

/**
 * Statistics about the memory store
 */
export interface MemoryStats {
  /** Total number of stored entries */
  frameCount: number;
  /** Total size in bytes */
  sizeBytes: number;
  /** Human-readable size */
  sizeFormatted: string;
  /** List of unique labels with counts */
  labels: Record<string, number>;
  /** Timestamp of the oldest entry */
  oldestEntry?: string;
  /** Timestamp of the newest entry */
  newestEntry?: string;
}

/**
 * Represents an entry in the timeline view
 */
export interface TimelineEntry {
  /** Frame ID */
  frameId: string;
  /** Title */
  title: string;
  /** Label/category */
  label?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Preview snippet of content */
  preview: string;
}

/**
 * Configuration settings for the extension
 */
export interface ExtensionConfig {
  /** Custom path to memory file */
  memoryFilePath: string;
  /** Embedding provider */
  embeddingProvider: 'none' | 'local' | 'openai' | 'azureOpenai' | 'ollama' | 'cohere' | 'voyage';
  /** Auto-create memory file if not exists */
  autoCreateMemory: boolean;
  /** Enable semantic search */
  enableSemanticSearch: boolean;
  /** Default search result limit */
  defaultSearchLimit: number;
}

/**
 * OpenAI configuration settings
 */
export interface OpenAIConfig {
  /** API Key */
  apiKey: string;
  /** Base URL for API */
  baseUrl: string;
  /** Embedding model */
  model: string;
}

/**
 * Azure OpenAI configuration settings
 */
export interface AzureOpenAIConfig {
  /** Azure endpoint URL */
  endpoint: string;
  /** API Key */
  apiKey: string;
  /** Deployment name */
  deploymentName: string;
  /** API version */
  apiVersion: string;
}

/**
 * Ollama configuration settings
 */
export interface OllamaConfig {
  /** Ollama server URL */
  baseUrl: string;
  /** Embedding model */
  model: string;
}

/**
 * Complete embedding configuration
 */
export interface EmbeddingConfig {
  provider: ExtensionConfig['embeddingProvider'];
  openai?: OpenAIConfig;
  azureOpenai?: AzureOpenAIConfig;
  ollama?: OllamaConfig;
}

/**
 * MCP Tool input schema for store operation
 */
export interface StoreToolInput {
  title: string;
  content: string;
  label?: string;
  tags?: string[];
}

/**
 * MCP Tool input schema for search operation
 */
export interface SearchToolInput {
  query: string;
  limit?: number;
  label?: string;
}

/**
 * MCP Tool input schema for ask operation
 */
export interface AskToolInput {
  question: string;
  contextLimit?: number;
}

/**
 * MCP Tool input schema for timeline operation
 */
export interface TimelineToolInput {
  limit?: number;
}

/**
 * MCP Tool response content
 */
export interface McpToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
