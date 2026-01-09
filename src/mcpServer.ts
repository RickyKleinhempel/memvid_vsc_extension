/**
 * MCP Server - Model Context Protocol server for Memvid Agent Memory
 * This server runs as a child process and communicates via stdio
 * @module mcpServer
 */

import { MemoryManager } from './memoryManager.js';
import { allToolSchemas } from './tools/schemas.js';
import { LlmService, createLlmServiceFromEnv } from './services/llmService.js';
import type {
  StoreToolInput,
  SearchToolInput,
  AskToolInput,
  TimelineToolInput,
  McpToolResponse,
  EmbeddingConfig,
} from './types/index.js';

/**
 * MCP Message types
 */
interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface McpNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP Error codes
 */
const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

/**
 * Parse embedding configuration from environment variables
 * @returns Embedding configuration object
 */
function getEmbeddingConfigFromEnv(): EmbeddingConfig {
  const provider = (process.env.MEMVID_EMBEDDING_PROVIDER || 'none') as EmbeddingConfig['provider'];
  
  const config: EmbeddingConfig = {
    provider,
  };

  switch (provider) {
    case 'openai':
      config.openai = {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      };
      break;
    
    case 'azureOpenai':
      config.azureOpenai = {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
        apiKey: process.env.AZURE_OPENAI_API_KEY || '',
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || '',
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-01',
      };
      break;
    
    case 'ollama':
      config.ollama = {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      };
      break;
  }

  return config;
}

/**
 * Memvid MCP Server class
 * Handles MCP protocol communication over stdio
 */
export class MemvidMcpServer {
  private memoryManager: MemoryManager;
  private llmService: LlmService;
  private buffer: string = '';
  private initialized: boolean = false;

  constructor() {
    this.memoryManager = MemoryManager.getInstance();
    this.llmService = createLlmServiceFromEnv();
  }

  /**
   * Start the MCP server
   */
  public async start(): Promise<void> {
    // Initialize memory from environment variable
    const memoryPath = process.env.MEMVID_MEMORY_PATH || './agent-memory.mv2';
    const embeddingConfig = getEmbeddingConfigFromEnv();
    const enableSemanticSearch = process.env.MEMVID_ENABLE_SEMANTIC_SEARCH === '1';
    
    console.error(`[MCP Server] Embedding provider: ${embeddingConfig.provider}`);
    console.error(`[MCP Server] Semantic search enabled: ${enableSemanticSearch}`);
    console.error(`[MCP Server] LLM provider: ${process.env.MEMVID_LLM_PROVIDER || 'none'}`);
    
    try {
      await this.memoryManager.initialize(memoryPath, true, embeddingConfig);
      this.initialized = true;
      console.error(`[MCP Server] Memory initialized: ${memoryPath}`);
    } catch (error) {
      console.error(`[MCP Server] Failed to initialize memory: ${(error as Error).message}`);
    }

    // Set up stdio communication
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => this.handleInput(chunk));
    process.stdin.on('end', () => this.shutdown());

    console.error('[MCP Server] Started and listening on stdio');
  }

  /**
   * Handle incoming data from stdin
   */
  private handleInput(chunk: string): void {
    this.buffer += chunk;

    // Process complete messages (newline-delimited JSON)
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.substring(0, newlineIndex).trim();
      this.buffer = this.buffer.substring(newlineIndex + 1);

      if (line) {
        this.processMessage(line).catch(error => {
          console.error(`[MCP Server] Error processing message: ${(error as Error).message}`);
        });
      }
    }
  }

  /**
   * Process a single MCP message
   */
  private async processMessage(line: string): Promise<void> {
    let request: McpRequest;

    try {
      request = JSON.parse(line) as McpRequest;
    } catch {
      this.sendError(null, MCP_ERROR_CODES.PARSE_ERROR, 'Parse error');
      return;
    }

    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      this.sendError(request.id, MCP_ERROR_CODES.INVALID_REQUEST, 'Invalid JSON-RPC version');
      return;
    }

    try {
      const result = await this.handleMethod(request.method, request.params || {});
      this.sendResult(request.id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.sendError(request.id, MCP_ERROR_CODES.INTERNAL_ERROR, message);
    }
  }

  /**
   * Route method calls to handlers
   */
  private async handleMethod(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize':
        return this.handleInitialize(params);
      
      case 'initialized':
        // Notification, no response needed
        return undefined;
      
      case 'tools/list':
        return this.handleToolsList();
      
      case 'tools/call':
        return this.handleToolCall(params);
      
      case 'shutdown':
        await this.shutdown();
        return {};
      
      default:
        throw new Error(`Method not found: ${method}`);
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(params: Record<string, unknown>): unknown {
    console.error(`[MCP Server] Initialize request from: ${JSON.stringify(params.clientInfo || {})}`);
    
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'memvid-agent-memory',
        version: '1.0.0',
      },
    };
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(): unknown {
    return {
      tools: allToolSchemas.map(schema => ({
        name: schema.name,
        description: schema.description,
        inputSchema: schema.inputSchema,
      })),
    };
  }

  /**
   * Handle tools/call request
   */
  private async handleToolCall(params: Record<string, unknown>): Promise<McpToolResponse> {
    const name = params.name as string;
    const args = (params.arguments || {}) as Record<string, unknown>;

    if (!this.initialized) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Memory not initialized. Please check the extension configuration.',
        }],
        isError: true,
      };
    }

    switch (name) {
      case 'memvid_store':
        return this.handleStore(args as unknown as StoreToolInput);
      
      case 'memvid_search':
        return this.handleSearch(args as unknown as SearchToolInput);
      
      case 'memvid_ask':
        return this.handleAsk(args as unknown as AskToolInput);
      
      case 'memvid_timeline':
        return this.handleTimeline(args as TimelineToolInput);
      
      case 'memvid_stats':
        return this.handleStats();
      
      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  }

  /**
   * Handle memvid_store tool call
   */
  private async handleStore(args: StoreToolInput): Promise<McpToolResponse> {
    try {
      const stored = await this.memoryManager.store({
        title: args.title,
        content: args.content,
        label: args.label,
        tags: args.tags,
      });

      return {
        content: [{
          type: 'text',
          text: `✓ Stored in memory: "${stored.title}" (ID: ${stored.frameId})`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to store: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle memvid_search tool call
   */
  private async handleSearch(args: SearchToolInput): Promise<McpToolResponse> {
    try {
      const result = await this.memoryManager.search(args.query, {
        limit: args.limit,
        label: args.label,
      });

      if (result.hits.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No results found for: "${args.query}"`,
          }],
        };
      }

      const formattedResults = result.hits.map((hit, i) => 
        `${i + 1}. **${hit.title}** (score: ${hit.score.toFixed(3)})\n   ${hit.snippet}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `Found ${result.hits.length} results for "${args.query}":\n\n${formattedResults}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Search failed: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle memvid_ask tool call
   * Uses LLM to generate answer from retrieved context if configured
   */
  private async handleAsk(args: AskToolInput): Promise<McpToolResponse> {
    try {
      console.error(`[MCP Server] Ask: "${args.question}"`);
      console.error(`[MCP Server] LLM provider: ${process.env.MEMVID_LLM_PROVIDER}`);
      console.error(`[MCP Server] Bridge port: ${process.env.MEMVID_BRIDGE_PORT}`);
      console.error(`[MCP Server] LLM configured: ${this.llmService.isConfigured()}`);
      
      // First, check if memory has any entries
      const stats = await this.memoryManager.getStats();
      console.error(`[MCP Server] Memory stats: ${stats.frameCount} entries, ${stats.sizeFormatted}`);
      
      if (stats.frameCount === 0) {
        return {
          content: [{
            type: 'text',
            text: '📭 **Memory is empty.** No information has been stored yet.\n\nUse `memvid_store` to add information to memory first.\n\nExample:\n```\nmemvid_store: title="User Preference", content="User prefers dark mode", label="preferences"\n```',
          }],
        };
      }
      
      // Retrieve relevant context from memory
      const searchResult = await this.memoryManager.search(args.question, { 
        limit: args.contextLimit || 5,
      });
      
      console.error(`[MCP Server] Search found ${searchResult.hits.length} hits`);
      
      if (searchResult.hits.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `🔍 **No relevant memories found** for: "${args.question}"\n\nMemory contains ${stats.frameCount} entries, but none matched your query.\n\nTry:\n- Using different keywords\n- Asking about topics that have been stored\n- Use \`memvid_timeline\` to see what's in memory`,
          }],
        };
      }

      // Check if LLM is configured for answer generation
      if (this.llmService.isConfigured()) {
        console.error(`[MCP Server] Calling LLM for answer generation...`);
        try {
          const llmResult = await this.llmService.generateAnswer(
            args.question,
            searchResult.hits
          );
          
          console.error(`[MCP Server] LLM result: ${llmResult ? 'success' : 'null'}`);
          
          if (llmResult) {
            // Format answer with context sources
            const sourcesInfo = searchResult.hits.slice(0, 3).map((hit, i) => 
              `[${i + 1}] ${hit.title}`
            ).join(', ');
            
            return {
              content: [{
                type: 'text',
                text: `${llmResult.answer}\n\n---\n*Sources: ${sourcesInfo}*\n*Model: ${llmResult.model} (${llmResult.provider})*`,
              }],
            };
          }
        } catch (llmError) {
          console.error(`[MCP Server] LLM generation failed: ${(llmError as Error).message}`);
          // Fall through to context-only response
        }
      } else {
        console.error(`[MCP Server] LLM not configured, returning context only`);
      }

      // No LLM configured or LLM failed - return context only
      const context = searchResult.hits.map((hit, i) => 
        `**[${i + 1}] ${hit.title}**\n${hit.snippet}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `Based on my memory (${searchResult.hits.length} relevant entries):\n\n${context}`,
        }],
      };
    } catch (error) {
      console.error(`[MCP Server] Ask error: ${(error as Error).message}`);
      return {
        content: [{
          type: 'text',
          text: `Query failed: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle memvid_timeline tool call
   */
  private async handleTimeline(args: TimelineToolInput): Promise<McpToolResponse> {
    try {
      const entries = await this.memoryManager.getTimeline(args.limit || 20);

      if (entries.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No entries in memory timeline.',
          }],
        };
      }

      const formattedEntries = entries.map((entry, i) => 
        `${i + 1}. **${entry.title}** [${entry.label || 'general'}]\n   ${entry.preview}...`
      ).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `Recent memory entries:\n\n${formattedEntries}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Timeline failed: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Handle memvid_stats tool call
   */
  private async handleStats(): Promise<McpToolResponse> {
    try {
      const stats = await this.memoryManager.getStats();

      const text = [
        '📊 **Memory Statistics**',
        '',
        `- Total entries: ${stats.frameCount}`,
        `- Storage size: ${stats.sizeFormatted}`,
        `- Memory file: ${this.memoryManager.path}`,
      ].join('\n');

      return {
        content: [{
          type: 'text',
          text,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Stats failed: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Send a successful result
   */
  private sendResult(id: string | number | null, result: unknown): void {
    if (id === null) {return;} // Notification, no response
    
    const response: McpResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };
    
    this.send(response);
  }

  /**
   * Send an error response
   */
  private sendError(id: string | number | null, code: number, message: string, data?: unknown): void {
    const response: McpResponse = {
      jsonrpc: '2.0',
      id: id ?? 0,
      error: {
        code,
        message,
        data,
      },
    };
    
    this.send(response);
  }

  /**
   * Send a message to stdout
   */
  private send(message: McpResponse | McpNotification): void {
    const json = JSON.stringify(message);
    process.stdout.write(json + '\n');
  }

  /**
   * Shutdown the server
   */
  private async shutdown(): Promise<void> {
    console.error('[MCP Server] Shutting down...');
    await this.memoryManager.close();
    process.exit(0);
  }
}

// Main entry point when running as standalone process
if (require.main === module) {
  const server = new MemvidMcpServer();
  server.start().catch(error => {
    console.error(`[MCP Server] Fatal error: ${(error as Error).message}`);
    process.exit(1);
  });
}
