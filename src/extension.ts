/**
 * Memvid Agent Memory Extension - Main Entry Point
 * Provides persistent AI Agent Memory using Memvid for GitHub Copilot agents
 * 
 * @module extension
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { MemvidMcpProvider } from './mcpProvider.js';
import { registerCommands } from './commands.js';
import { onConfigurationChange, getMemoryFilePath } from './config/settings.js';
import { startBridgeServer, stopBridgeServer, getBridgePort } from './services/bridgeServer.js';

/** Output channel for extension logging */
let outputChannel: vscode.OutputChannel;

/** MCP Provider instance */
let mcpProvider: MemvidMcpProvider | undefined;

/** Bridge server port for Copilot LLM access */
let bridgePort: number | undefined;

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
 * Copy instruction file to workspace .github/instructions folder
 * @param extensionPath - Extension installation path
 */
function copyInstructionFileToWorkspace(extensionPath: string): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    log('No workspace folder open, skipping instruction file copy');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const sourceFile = path.join(extensionPath, 'resources', 'instructions', 'memvidagentmemory.instructions.md');
  const targetDir = path.join(workspaceRoot, '.github', 'instructions');
  const targetFile = path.join(targetDir, 'memvidagentmemory.instructions.md');

  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    log(`Instruction file not found at ${sourceFile}`);
    return;
  }

  // Check if target file already exists
  if (fs.existsSync(targetFile)) {
    log('Instruction file already exists in workspace, skipping copy');
    return;
  }

  try {
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      log(`Created instructions directory: ${targetDir}`);
    }

    // Copy the file
    fs.copyFileSync(sourceFile, targetFile);
    log(`Copied instruction file to ${targetFile}`);
    
    vscode.window.showInformationMessage(
      'Memvid: Instruction file added to .github/instructions for Copilot integration.'
    );
  } catch (error) {
    log(`Failed to copy instruction file: ${(error as Error).message}`);
  }
}

/**
 * Check if @memvid/sdk is installed in the extension directory
 * @param extensionPath - Extension installation path
 * @returns true if SDK is available
 */
function isSdkInstalled(extensionPath: string): boolean {
  const sdkPath = path.join(extensionPath, 'node_modules', '@memvid', 'sdk');
  return fs.existsSync(sdkPath);
}

/**
 * Install the Memvid SDK in the extension directory
 * @param extensionPath - Extension installation path
 */
async function installSdk(extensionPath: string): Promise<void> {
  log('Installing @memvid/sdk...');
  
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Memvid: Installing dependencies...',
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ message: 'This may take a minute...' });
        
        // Run npm install in extension directory
        execSync('npm install --omit=dev --no-save', {
          cwd: extensionPath,
          stdio: 'pipe',
          timeout: 120000, // 2 minutes timeout
        });
        
        log('SDK installed successfully');
        vscode.window.showInformationMessage('Memvid: Dependencies installed successfully. Please reload the window.');
        
        // Offer to reload
        const reload = await vscode.window.showInformationMessage(
          'Memvid dependencies installed. Reload window to activate?',
          'Reload Now',
          'Later'
        );
        
        if (reload === 'Reload Now') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      } catch (error) {
        const errorMsg = (error as Error).message;
        log(`Failed to install SDK: ${errorMsg}`);
        vscode.window.showErrorMessage(
          `Memvid: Failed to install dependencies. ${errorMsg}\n\n` +
          `Try running manually: cd "${extensionPath}" && npm install`
        );
      }
    }
  );
}

/**
 * Activate the extension
 * Called by VS Code when the extension is activated
 * 
 * @param context - Extension context provided by VS Code
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('Memvid Agent Memory');
  context.subscriptions.push(outputChannel);
  
  log('Memvid Agent Memory extension is activating...');

  // Get storage paths
  const globalStoragePath = context.globalStorageUri.fsPath;
  const extensionPath = context.extensionPath;

  // Ensure storage directory exists
  ensureStorageDirectory(globalStoragePath);

  // Check if SDK is installed, if not offer to install
  if (!isSdkInstalled(extensionPath)) {
    log('Memvid SDK not found, offering to install...');
    
    const choice = await vscode.window.showWarningMessage(
      'Memvid Agent Memory: Required dependencies not found. Install now?',
      'Install',
      'Cancel'
    );
    
    if (choice === 'Install') {
      await installSdk(extensionPath);
      return; // Exit activation, will complete after reload
    } else {
      vscode.window.showErrorMessage(
        'Memvid Agent Memory requires dependencies to be installed. ' +
        'Run "Memvid: Initialize Memory" command to install later.'
      );
    }
  }

  // Start bridge server for Copilot LLM access
  try {
    bridgePort = await startBridgeServer();
    log(`Bridge server started on port ${bridgePort}`);
  } catch (error) {
    log(`Failed to start bridge server: ${(error as Error).message}`);
    // Continue without bridge - Copilot LLM won't be available
  }

  // Create MCP provider (with bridge port for Copilot access)
  mcpProvider = new MemvidMcpProvider(extensionPath, globalStoragePath, bridgePort);
  
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
  const configDisposable = onConfigurationChange(() => {
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

  // Copy instruction file to workspace
  copyInstructionFileToWorkspace(extensionPath);

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
  
  // Stop bridge server
  stopBridgeServer();
  log('Bridge server stopped');
  
  if (mcpProvider) {
    mcpProvider.dispose();
    mcpProvider = undefined;
  }

  log('Memvid Agent Memory extension deactivated');
}
