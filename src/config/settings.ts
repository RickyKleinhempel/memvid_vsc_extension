/**
 * Configuration management for Memvid Agent Memory Extension
 * @module config/settings
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { 
  ExtensionConfig, 
  OpenAIConfig, 
  AzureOpenAIConfig, 
  OllamaConfig, 
  EmbeddingConfig,
  LlmProviderType,
  OpenAILlmConfig,
  AzureOpenAILlmConfig,
  OllamaLlmConfig,
  LlmConfig,
} from '../types/index.js';

/** Configuration section name */
const CONFIG_SECTION = 'memvidAgentMemory';

/**
 * Get the full extension configuration
 * @returns The current extension configuration
 */
export function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  
  return {
    memoryFilePath: config.get<string>('memoryFilePath', ''),
    embeddingProvider: config.get<ExtensionConfig['embeddingProvider']>('embeddingProvider', 'none'),
    autoCreateMemory: config.get<boolean>('autoCreateMemory', true),
    enableSemanticSearch: config.get<boolean>('enableSemanticSearch', true),
    defaultSearchLimit: config.get<number>('defaultSearchLimit', 10),
  };
}

/**
 * Get OpenAI configuration
 * @returns OpenAI config with API key from settings or environment
 */
export function getOpenAIConfig(): OpenAIConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  
  return {
    apiKey: config.get<string>('openai.apiKey', '') || process.env.OPENAI_API_KEY || '',
    baseUrl: config.get<string>('openai.baseUrl', 'https://api.openai.com/v1'),
    model: config.get<string>('openai.model', 'text-embedding-3-small'),
  };
}

/**
 * Get Azure OpenAI configuration
 * @returns Azure OpenAI config with API key from settings or environment
 */
export function getAzureOpenAIConfig(): AzureOpenAIConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  
  return {
    endpoint: config.get<string>('azureOpenai.endpoint', ''),
    apiKey: config.get<string>('azureOpenai.apiKey', '') || process.env.AZURE_OPENAI_API_KEY || '',
    deploymentName: config.get<string>('azureOpenai.deploymentName', ''),
    apiVersion: config.get<string>('azureOpenai.apiVersion', '2024-02-01'),
  };
}

/**
 * Get Ollama configuration
 * @returns Ollama config
 */
export function getOllamaConfig(): OllamaConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  
  return {
    baseUrl: config.get<string>('ollama.baseUrl', 'http://localhost:11434'),
    model: config.get<string>('ollama.model', 'nomic-embed-text'),
  };
}

/**
 * Get complete embedding configuration based on selected provider
 * @returns Complete embedding configuration
 */
export function getEmbeddingConfig(): EmbeddingConfig {
  const mainConfig = getConfig();
  
  const embeddingConfig: EmbeddingConfig = {
    provider: mainConfig.embeddingProvider,
  };

  switch (mainConfig.embeddingProvider) {
    case 'openai':
      embeddingConfig.openai = getOpenAIConfig();
      break;
    case 'azureOpenai':
      embeddingConfig.azureOpenai = getAzureOpenAIConfig();
      break;
    case 'ollama':
      embeddingConfig.ollama = getOllamaConfig();
      break;
  }

  return embeddingConfig;
}

/**
 * Get LLM provider setting
 * @returns LLM provider type
 */
export function getLlmProvider(): LlmProviderType {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return config.get<LlmProviderType>('llmProvider', 'none');
}

/**
 * Get Copilot LLM configuration
 * @returns Copilot LLM model family preference
 */
export function getCopilotLlmConfig(): { modelFamily: string } {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    modelFamily: config.get<string>('llmCopilot.modelFamily', 'gpt-4o'),
  };
}

/**
 * Get OpenAI LLM configuration
 * @returns OpenAI LLM config with fallback to embedding API key
 */
export function getOpenAILlmConfig(): OpenAILlmConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const embeddingConfig = getOpenAIConfig();
  
  return {
    apiKey: config.get<string>('llmOpenai.apiKey', '') || embeddingConfig.apiKey,
    baseUrl: config.get<string>('llmOpenai.baseUrl', 'https://api.openai.com/v1'),
    model: config.get<string>('llmOpenai.model', 'gpt-4o-mini'),
    maxTokens: config.get<number>('llmOpenai.maxTokens', 1024),
    temperature: config.get<number>('llmOpenai.temperature', 0.7),
  };
}

/**
 * Get Azure OpenAI LLM configuration
 * @returns Azure OpenAI LLM config with fallback to embedding config
 */
export function getAzureOpenAILlmConfig(): AzureOpenAILlmConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const embeddingConfig = getAzureOpenAIConfig();
  
  return {
    endpoint: config.get<string>('llmAzureOpenai.endpoint', '') || embeddingConfig.endpoint,
    apiKey: config.get<string>('llmAzureOpenai.apiKey', '') || embeddingConfig.apiKey,
    deploymentName: config.get<string>('llmAzureOpenai.deploymentName', ''),
    apiVersion: config.get<string>('llmAzureOpenai.apiVersion', '2024-02-01'),
    maxTokens: config.get<number>('llmAzureOpenai.maxTokens', 1024),
    temperature: config.get<number>('llmAzureOpenai.temperature', 0.7),
  };
}

/**
 * Get Ollama LLM configuration
 * @returns Ollama LLM config with fallback to embedding server URL
 */
export function getOllamaLlmConfig(): OllamaLlmConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const embeddingConfig = getOllamaConfig();
  
  return {
    baseUrl: config.get<string>('llmOllama.baseUrl', '') || embeddingConfig.baseUrl,
    model: config.get<string>('llmOllama.model', 'llama3.2'),
    maxTokens: config.get<number>('llmOllama.maxTokens', 1024),
    temperature: config.get<number>('llmOllama.temperature', 0.7),
  };
}

/**
 * Get complete LLM configuration based on selected provider
 * @returns Complete LLM configuration
 */
export function getLlmConfig(): LlmConfig {
  const provider = getLlmProvider();
  
  const llmConfig: LlmConfig = {
    provider,
  };

  switch (provider) {
    case 'openai':
      llmConfig.openai = getOpenAILlmConfig();
      break;
    case 'azureOpenai':
      llmConfig.azureOpenai = getAzureOpenAILlmConfig();
      break;
    case 'ollama':
      llmConfig.ollama = getOllamaLlmConfig();
      break;
  }

  return llmConfig;
}

/**
 * Validate LLM configuration
 * @returns Validation result with message
 */
export function validateLlmConfig(): { valid: boolean; message?: string } {
  const provider = getLlmProvider();
  
  switch (provider) {
    case 'none':
      return { 
        valid: true, 
        message: 'No LLM provider configured. memvid_ask will return context only without AI synthesis.',
      };
    
    case 'copilot':
      // Copilot uses VS Code's Language Model API - requires active Copilot subscription
      return { 
        valid: true, 
        message: 'Using GitHub Copilot for answer generation. Requires active Copilot subscription.',
      };
    
    case 'openai': {
      const config = getOpenAILlmConfig();
      if (!config.apiKey) {
        return {
          valid: false,
          message: 'OpenAI API key is not configured for LLM. Set it in extension settings or via OPENAI_API_KEY environment variable.',
        };
      }
      return { valid: true };
    }
    
    case 'azureOpenai': {
      const config = getAzureOpenAILlmConfig();
      if (!config.endpoint) {
        return {
          valid: false,
          message: 'Azure OpenAI endpoint is not configured for LLM.',
        };
      }
      if (!config.apiKey) {
        return {
          valid: false,
          message: 'Azure OpenAI API key is not configured for LLM.',
        };
      }
      if (!config.deploymentName) {
        return {
          valid: false,
          message: 'Azure OpenAI LLM deployment name is not configured.',
        };
      }
      return { valid: true };
    }
    
    case 'ollama':
      // Ollama doesn't require API keys
      return { valid: true };
    
    default:
      return { valid: false, message: `Unknown LLM provider: ${provider}` };
  }
}

/**
 * Validate embedding configuration and show warnings if incomplete
 * @returns True if configuration is valid, false otherwise
 */
export function validateEmbeddingConfig(): { valid: boolean; message?: string } {
  const config = getConfig();
  
  switch (config.embeddingProvider) {
    case 'none':
      // No embeddings configured - BM25 keyword search only
      return { 
        valid: true, 
        message: 'No embedding provider configured. Using BM25 keyword search only. Configure openai, azureOpenai, or ollama for semantic search.',
      };
    
    case 'local':
      if (process.platform === 'win32') {
        return {
          valid: false,
          message: 'Local embeddings are not available on Windows. Please select openai, azureOpenai, or ollama as embedding provider.',
        };
      }
      return { valid: true };
    
    case 'openai': {
      const openaiConfig = getOpenAIConfig();
      if (!openaiConfig.apiKey) {
        return {
          valid: false,
          message: 'OpenAI API key is not configured. Set it in extension settings or via OPENAI_API_KEY environment variable.',
        };
      }
      return { valid: true };
    }
    
    case 'azureOpenai': {
      const azureConfig = getAzureOpenAIConfig();
      if (!azureConfig.endpoint) {
        return {
          valid: false,
          message: 'Azure OpenAI endpoint is not configured. Please set it in extension settings.',
        };
      }
      if (!azureConfig.apiKey) {
        return {
          valid: false,
          message: 'Azure OpenAI API key is not configured. Set it in extension settings or via AZURE_OPENAI_API_KEY environment variable.',
        };
      }
      if (!azureConfig.deploymentName) {
        return {
          valid: false,
          message: 'Azure OpenAI deployment name is not configured. Please set it in extension settings.',
        };
      }
      return { valid: true };
    }
    
    case 'ollama': {
      // Ollama doesn't require API keys, just needs server to be running
      return { valid: true };
    }
    
    case 'cohere':
      if (!process.env.COHERE_API_KEY) {
        return {
          valid: false,
          message: 'Cohere API key is not configured. Set COHERE_API_KEY environment variable.',
        };
      }
      return { valid: true };
    
    case 'voyage':
      if (!process.env.VOYAGE_API_KEY) {
        return {
          valid: false,
          message: 'Voyage API key is not configured. Set VOYAGE_API_KEY environment variable.',
        };
      }
      return { valid: true };
    
    default:
      return { valid: false, message: `Unknown embedding provider: ${config.embeddingProvider}` };
  }
}

/**
 * Get the path to the memory file
 * Resolves in this order:
 * 1. Custom path from settings
 * 2. Workspace folder .memvid/agent-memory.mv2
 * 3. Global storage location
 * 
 * @param globalStoragePath - VS Code global storage path for fallback
 * @returns Resolved path to the memory file
 */
export function getMemoryFilePath(globalStoragePath: string): string {
  const config = getConfig();
  
  // 1. Custom path from settings
  if (config.memoryFilePath && config.memoryFilePath.trim() !== '') {
    return config.memoryFilePath;
  }
  
  // 2. Workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    return path.join(workspaceFolder.uri.fsPath, '.memvid', 'agent-memory.mv2');
  }
  
  // 3. Global storage
  return path.join(globalStoragePath, 'agent-memory.mv2');
}

/**
 * Get the configured embedding provider
 * On Windows, falls back to 'openai' if 'local' is selected
 * 
 * @returns The embedding provider to use
 */
export function getEmbeddingProvider(): ExtensionConfig['embeddingProvider'] {
  const config = getConfig();
  
  // On Windows, local embeddings are not available
  if (process.platform === 'win32' && config.embeddingProvider === 'local') {
    vscode.window.showWarningMessage(
      'Local embeddings are not available on Windows. Please configure openai, azureOpenai, or ollama as embedding provider.'
    );
    return 'openai';
  }
  
  return config.embeddingProvider;
}

/**
 * Check if memory file should be auto-created
 * @returns True if auto-creation is enabled
 */
export function shouldAutoCreateMemory(): boolean {
  return getConfig().autoCreateMemory;
}

/**
 * Check if semantic search is enabled
 * @returns True if semantic search is enabled
 */
export function isSemanticSearchEnabled(): boolean {
  return getConfig().enableSemanticSearch;
}

/**
 * Get the default search result limit
 * @returns Default number of results to return
 */
export function getDefaultSearchLimit(): number {
  return getConfig().defaultSearchLimit;
}

/**
 * Create a configuration change listener
 * @param callback - Function to call when configuration changes
 * @returns Disposable to unregister the listener
 */
export function onConfigurationChange(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(CONFIG_SECTION)) {
      callback(e);
    }
  });
}

/**
 * Update a configuration value
 * @param key - Configuration key
 * @param value - New value
 * @param global - If true, update global settings, otherwise workspace settings
 */
export async function updateConfig<K extends keyof ExtensionConfig>(
  key: K,
  value: ExtensionConfig[K],
  global: boolean = false
): Promise<void> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await config.update(key, value, global ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace);
}
