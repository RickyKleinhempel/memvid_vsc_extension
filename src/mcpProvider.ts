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
  validateEmbeddingConfig,
  getLlmConfig,
  validateLlmConfig,
  getCopilotLlmConfig,
} from './config/settings.js';

/**
 * Build environment variables for the MCP server based on embedding and LLM configuration
 * @param memoryPath - Path to the memory file
 * @param bridgePort - Optional port for Copilot LLM bridge server
 * @returns Environment variables object
 */
function buildEnvironmentVariables(memoryPath: string, bridgePort?: number): Record<string, string> {
  const embeddingConfig = getEmbeddingConfig();
  const llmConfig = getLlmConfig();
  const mainConfig = getConfig();
  
  const env: Record<string, string> = {
    MEMVID_MEMORY_PATH: memoryPath,
    MEMVID_EMBEDDING_PROVIDER: embeddingConfig.provider,
    MEMVID_ENABLE_SEMANTIC_SEARCH: mainConfig.enableSemanticSearch ? '1' : '0',
    MEMVID_LLM_PROVIDER: llmConfig.provider,
    NODE_ENV: 'production',
  };

  // Add bridge port for Copilot LLM access
  if (bridgePort) {
    env.MEMVID_BRIDGE_PORT = bridgePort.toString();
  }

  // Add embedding provider-specific configuration
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

  // Add LLM provider-specific configuration
  switch (llmConfig.provider) {
    case 'openai':
      if (llmConfig.openai) {
        env.MEMVID_LLM_OPENAI_API_KEY = llmConfig.openai.apiKey;
        env.MEMVID_LLM_OPENAI_BASE_URL = llmConfig.openai.baseUrl;
        env.MEMVID_LLM_OPENAI_MODEL = llmConfig.openai.model;
        env.MEMVID_LLM_MAX_TOKENS = llmConfig.openai.maxTokens.toString();
        env.MEMVID_LLM_TEMPERATURE = llmConfig.openai.temperature.toString();
      }
      break;
    
    case 'azureOpenai':
      if (llmConfig.azureOpenai) {
        env.MEMVID_LLM_AZURE_ENDPOINT = llmConfig.azureOpenai.endpoint;
        env.MEMVID_LLM_AZURE_API_KEY = llmConfig.azureOpenai.apiKey;
        env.MEMVID_LLM_AZURE_DEPLOYMENT = llmConfig.azureOpenai.deploymentName;
        env.MEMVID_LLM_AZURE_API_VERSION = llmConfig.azureOpenai.apiVersion;
        env.MEMVID_LLM_MAX_TOKENS = llmConfig.azureOpenai.maxTokens.toString();
        env.MEMVID_LLM_TEMPERATURE = llmConfig.azureOpenai.temperature.toString();
      }
      break;
    
    case 'ollama':
      if (llmConfig.ollama) {
        env.MEMVID_LLM_OLLAMA_BASE_URL = llmConfig.ollama.baseUrl;
        env.MEMVID_LLM_OLLAMA_MODEL = llmConfig.ollama.model;
        env.MEMVID_LLM_MAX_TOKENS = llmConfig.ollama.maxTokens.toString();
        env.MEMVID_LLM_TEMPERATURE = llmConfig.ollama.temperature.toString();
      }
      break;
    
    case 'copilot': {
      // Copilot uses the bridge server - just pass the model family preference
      const copilotConfig = getCopilotLlmConfig();
      env.MEMVID_LLM_COPILOT_MODEL = copilotConfig.modelFamily;
      break;
    }
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
   * @param bridgePort - Optional port for the Copilot LLM bridge server
   */
  constructor(
    private readonly extensionPath: string,
    private readonly globalStoragePath: string,
    private readonly bridgePort?: number
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
    const embeddingValidation = validateEmbeddingConfig();
    if (!embeddingValidation.valid && embeddingValidation.message) {
      console.warn(`[MCP Provider] Embedding config warning: ${embeddingValidation.message}`);
    }

    // Validate LLM configuration
    const llmValidation = validateLlmConfig();
    if (!llmValidation.valid && llmValidation.message) {
      console.warn(`[MCP Provider] LLM config warning: ${llmValidation.message}`);
    }

    // Path to the compiled MCP server script
    const serverPath = path.join(this.extensionPath, 'out', 'mcpServer.js');
    
    // Get the memory file path
    const memoryPath = getMemoryFilePath(this.globalStoragePath);

    // Build environment variables with embedding, LLM config, and bridge port
    const env = buildEnvironmentVariables(memoryPath, this.bridgePort);

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
    console.log(`[MCP Provider] LLM provider: ${env.MEMVID_LLM_PROVIDER}`);

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
    const embeddingValidation = validateEmbeddingConfig();
    if (!embeddingValidation.valid && embeddingValidation.message) {
      vscode.window.showWarningMessage(`Memvid Embedding: ${embeddingValidation.message}`);
    }

    // Validate LLM configuration before starting
    const llmValidation = validateLlmConfig();
    if (!llmValidation.valid && llmValidation.message) {
      vscode.window.showWarningMessage(`Memvid LLM: ${llmValidation.message}`);
    }

    // Update memory path and config in case configuration changed
    const memoryPath = getMemoryFilePath(this.globalStoragePath);
    const env = buildEnvironmentVariables(memoryPath, this.bridgePort);
    
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
    console.log(`[MCP Provider] Resolved LLM provider: ${env.MEMVID_LLM_PROVIDER}`);

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
