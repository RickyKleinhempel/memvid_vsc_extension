/**
 * MCP Provider - Provides MCP server definitions to VS Code
 * Enables automatic registration without mcp.json configuration
 * @module mcpProvider
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { 
  getMemoryFilePath, 
  getEmbeddingConfig, 
  getConfig,
  validateEmbeddingConfig 
} from './config/settings.js';

/**
 * Build environment variables for the MCP server based on embedding configuration
 * @param memoryPath - Path to the memory file
 * @returns Environment variables object
 */
function buildEnvironmentVariables(memoryPath: string): Record<string, string> {
  const embeddingConfig = getEmbeddingConfig();
  const mainConfig = getConfig();
  
  const env: Record<string, string> = {
    MEMVID_MEMORY_PATH: memoryPath,
    MEMVID_EMBEDDING_PROVIDER: embeddingConfig.provider,
    MEMVID_ENABLE_SEMANTIC_SEARCH: mainConfig.enableSemanticSearch ? '1' : '0',
    NODE_ENV: 'production',
  };

  // Add provider-specific configuration
  switch (embeddingConfig.provider) {
    case 'openai':
      if (embeddingConfig.openai) {
        if (embeddingConfig.openai.apiKey) {
          env.OPENAI_API_KEY = embeddingConfig.openai.apiKey;
        }
        env.OPENAI_BASE_URL = embeddingConfig.openai.baseUrl;
        env.OPENAI_EMBEDDING_MODEL = embeddingConfig.openai.model;
      }
      break;
    
    case 'azureOpenai':
      if (embeddingConfig.azureOpenai) {
        env.AZURE_OPENAI_ENDPOINT = embeddingConfig.azureOpenai.endpoint;
        if (embeddingConfig.azureOpenai.apiKey) {
          env.AZURE_OPENAI_API_KEY = embeddingConfig.azureOpenai.apiKey;
        }
        env.AZURE_OPENAI_DEPLOYMENT = embeddingConfig.azureOpenai.deploymentName;
        env.AZURE_OPENAI_API_VERSION = embeddingConfig.azureOpenai.apiVersion;
      }
      break;
    
    case 'ollama':
      if (embeddingConfig.ollama) {
        env.OLLAMA_BASE_URL = embeddingConfig.ollama.baseUrl;
        env.OLLAMA_EMBEDDING_MODEL = embeddingConfig.ollama.model;
      }
      break;
  }

  return env;
}

/**
 * Memvid MCP Server Definition Provider
 * Registers the Memvid MCP server with VS Code for GitHub Copilot integration
 */
export class MemvidMcpProvider implements vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> {
  
  private _onDidChangeMcpServerDefinitions = new vscode.EventEmitter<void>();
  
  /**
   * Event fired when server definitions change
   */
  readonly onDidChangeMcpServerDefinitions = this._onDidChangeMcpServerDefinitions.event;

  /**
   * Create a new MCP provider
   * @param extensionPath - Path to the extension directory
   * @param globalStoragePath - Path to VS Code global storage
   */
  constructor(
    private readonly extensionPath: string,
    private readonly globalStoragePath: string
  ) {}

  /**
   * Provide available MCP server definitions
   * Called by VS Code to discover available MCP servers
   * 
   * @param token - Cancellation token
   * @returns Array of MCP server definitions
   */
  provideMcpServerDefinitions(
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.McpStdioServerDefinition[]> {
    if (token.isCancellationRequested) {
      return [];
    }

    // Validate embedding configuration
    const validation = validateEmbeddingConfig();
    if (!validation.valid && validation.message) {
      console.warn(`[MCP Provider] Embedding config warning: ${validation.message}`);
    }

    // Path to the compiled MCP server script
    const serverPath = path.join(this.extensionPath, 'out', 'mcpServer.js');
    
    // Get the memory file path
    const memoryPath = getMemoryFilePath(this.globalStoragePath);

    // Build environment variables with embedding config
    const env = buildEnvironmentVariables(memoryPath);

    // Create the server definition
    const server = new vscode.McpStdioServerDefinition(
      'Memvid Agent Memory',  // Label shown in VS Code
      'node',                  // Command to run
      [serverPath],            // Arguments
      env,                     // Environment variables
      '1.0.0'                  // Version
    );

    console.log(`[MCP Provider] Providing server definition: ${serverPath}`);
    console.log(`[MCP Provider] Memory path: ${memoryPath}`);
    console.log(`[MCP Provider] Embedding provider: ${env.MEMVID_EMBEDDING_PROVIDER}`);

    return [server];
  }

  /**
   * Resolve a server definition before starting
   * Called when VS Code needs to start the MCP server
   * 
   * @param server - The server definition to resolve
   * @param token - Cancellation token
   * @returns The resolved server definition
   */
  resolveMcpServerDefinition(
    server: vscode.McpStdioServerDefinition,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.McpStdioServerDefinition> {
    if (token.isCancellationRequested) {
      return undefined;
    }

    // Validate embedding configuration before starting
    const validation = validateEmbeddingConfig();
    if (!validation.valid && validation.message) {
      vscode.window.showWarningMessage(`Memvid: ${validation.message}`);
    }

    // Update memory path and embedding config in case configuration changed
    const memoryPath = getMemoryFilePath(this.globalStoragePath);
    const env = buildEnvironmentVariables(memoryPath);
    
    // Create updated server definition with current settings
    const resolvedServer = new vscode.McpStdioServerDefinition(
      server.label,
      server.command,
      server.args,
      env,
      server.version
    );

    console.log(`[MCP Provider] Resolved server with memory path: ${memoryPath}`);
    console.log(`[MCP Provider] Resolved embedding provider: ${env.MEMVID_EMBEDDING_PROVIDER}`);

    return resolvedServer;
  }

  /**
   * Trigger a refresh of server definitions
   * Call this when configuration changes
   */
  refresh(): void {
    console.log('[MCP Provider] Refreshing server definitions');
    this._onDidChangeMcpServerDefinitions.fire();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this._onDidChangeMcpServerDefinitions.dispose();
  }
}
