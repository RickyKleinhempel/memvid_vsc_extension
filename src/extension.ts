/**
 * Memvid Agent Memory Extension - Main Entry Point
 * Provides persistent AI Agent Memory using Memvid for GitHub Copilot agents
 * 
 * @module extension
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MemvidMcpProvider } from './mcpProvider.js';
import { registerCommands } from './commands.js';
import { onConfigurationChange, getMemoryFilePath } from './config/settings.js';

/** Output channel for extension logging */
let outputChannel: vscode.OutputChannel;

/** MCP Provider instance */
let mcpProvider: MemvidMcpProvider | undefined;

/**
 * Log a message to the output channel
 * @param message - Message to log
 */
function log(message: string): void {
  const timestamp = new Date().toISOString();
  outputChannel?.appendLine(`[${timestamp}] ${message}`);
}

/**
 * Ensure the global storage directory exists
 * @param globalStoragePath - Path to global storage
 */
function ensureStorageDirectory(globalStoragePath: string): void {
  if (!fs.existsSync(globalStoragePath)) {
    fs.mkdirSync(globalStoragePath, { recursive: true });
    log(`Created global storage directory: ${globalStoragePath}`);
  }
}

/**
 * Activate the extension
 * Called by VS Code when the extension is activated
 * 
 * @param context - Extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext): void {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('Memvid Agent Memory');
  context.subscriptions.push(outputChannel);
  
  log('Memvid Agent Memory extension is activating...');

  // Get storage paths
  const globalStoragePath = context.globalStorageUri.fsPath;
  const extensionPath = context.extensionPath;

  // Ensure storage directory exists
  ensureStorageDirectory(globalStoragePath);

  // Create MCP provider
  mcpProvider = new MemvidMcpProvider(extensionPath, globalStoragePath);
  
  // Register MCP server definition provider
  try {
    const mcpDisposable = vscode.lm.registerMcpServerDefinitionProvider(
      'memvid-agent-memory.mcp-server',
      mcpProvider
    );
    context.subscriptions.push(mcpDisposable);
    log('MCP server definition provider registered');
  } catch (error) {
    log(`Failed to register MCP provider: ${(error as Error).message}`);
    vscode.window.showErrorMessage(
      `Memvid Agent Memory: Failed to register MCP provider. ${(error as Error).message}`
    );
  }

  // Register commands
  const commandDisposables = registerCommands(
    context,
    globalStoragePath,
    () => mcpProvider?.refresh()
  );
  context.subscriptions.push(...commandDisposables);
  log('Commands registered');

  // Listen for configuration changes
  const configDisposable = onConfigurationChange((e) => {
    log('Configuration changed, refreshing MCP provider...');
    mcpProvider?.refresh();
  });
  context.subscriptions.push(configDisposable);

  // Show welcome message on first activation
  const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome', false);
  if (!hasShownWelcome) {
    showWelcomeMessage(context);
  }

  // Log memory file location
  const memoryPath = getMemoryFilePath(globalStoragePath);
  log(`Memory file location: ${memoryPath}`);

  log('Memvid Agent Memory extension activated successfully');
}

/**
 * Show welcome message to new users
 * @param context - Extension context
 */
async function showWelcomeMessage(context: vscode.ExtensionContext): Promise<void> {
  const message = 'Memvid Agent Memory is now active! GitHub Copilot agents can now store and retrieve information from persistent memory.';
  
  const choice = await vscode.window.showInformationMessage(
    message,
    'Learn More',
    'Show Stats',
    'Dismiss'
  );

  if (choice === 'Learn More') {
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/memvid/memvid'));
  } else if (choice === 'Show Stats') {
    vscode.commands.executeCommand('memvidAgentMemory.showStats');
  }

  // Mark as shown
  await context.globalState.update('hasShownWelcome', true);
}

/**
 * Deactivate the extension
 * Called by VS Code when the extension is deactivated
 */
export function deactivate(): void {
  log('Memvid Agent Memory extension is deactivating...');
  
  if (mcpProvider) {
    mcpProvider.dispose();
    mcpProvider = undefined;
  }

  log('Memvid Agent Memory extension deactivated');
}
