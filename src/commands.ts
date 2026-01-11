/**
 * VS Code Commands for Memvid Agent Memory Extension
 * @module commands
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { getMemoryFilePath, getEmbeddingConfig } from './config/settings.js';
import { MemoryManager } from './memoryManager.js';
import { CopilotLlmService } from './services/copilotLlmService.js';

/**
 * Register all extension commands
 * @param context - Extension context
 * @param globalStoragePath - Global storage path
 * @param onRefreshMcp - Callback to refresh MCP provider
 * @returns Array of disposables
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  globalStoragePath: string,
  onRefreshMcp: () => void
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Command: Initialize Memory
  disposables.push(
    vscode.commands.registerCommand('memvidAgentMemory.initialize', async () => {
      const memoryPath = getMemoryFilePath(globalStoragePath);
      const embeddingConfig = getEmbeddingConfig();
      
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Memvid: Initializing Memory...',
          cancellable: false,
        },
        async (progress) => {
          try {
            progress.report({ message: 'Creating memory file...' });
            
            const manager = MemoryManager.getInstance();
            await manager.initialize(memoryPath, true, embeddingConfig);
            
            progress.report({ message: 'Getting statistics...' });
            const stats = await manager.getStats();
            
            vscode.window.showInformationMessage(
              `Memvid Memory initialized successfully!\n` +
              `Path: ${memoryPath}\n` +
              `Entries: ${stats.frameCount} (${stats.sizeFormatted})\n` +
              `Embedding: ${embeddingConfig.provider}`
            );
            
            // Refresh MCP server to use the initialized memory
            onRefreshMcp();
          } catch (error) {
            const errorMessage = (error as Error).message;
            vscode.window.showErrorMessage(
              `Failed to initialize memory: ${errorMessage}\n\n` +
              `Path: ${memoryPath}\n` +
              `Embedding: ${embeddingConfig.provider}`
            );
          }
        }
      );
    })
  );

  // Command: Open Memory File
  disposables.push(
    vscode.commands.registerCommand('memvidAgentMemory.openMemory', async () => {
      const memoryPath = getMemoryFilePath(globalStoragePath);
      
      if (!fs.existsSync(memoryPath)) {
        const choice = await vscode.window.showWarningMessage(
          `Memory file does not exist at: ${memoryPath}`,
          'Create Now',
          'Cancel'
        );
        
        if (choice === 'Create Now') {
          try {
            const manager = MemoryManager.getInstance();
            await manager.initialize(memoryPath, true);
            await manager.close();
            vscode.window.showInformationMessage(`Memory file created: ${memoryPath}`);
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to create memory file: ${(error as Error).message}`);
            return;
          }
        } else {
          return;
        }
      }

      // Open the folder containing the memory file
      await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(memoryPath));
    })
  );

  // Command: Clear Memory
  disposables.push(
    vscode.commands.registerCommand('memvidAgentMemory.clearMemory', async () => {
      const memoryPath = getMemoryFilePath(globalStoragePath);
      
      if (!fs.existsSync(memoryPath)) {
        vscode.window.showInformationMessage('No memory file to clear.');
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to clear all agent memory? This action cannot be undone.',
        { modal: true },
        'Clear Memory',
        'Cancel'
      );

      if (confirm !== 'Clear Memory') {
        return;
      }

      try {
        const manager = MemoryManager.getInstance();
        await manager.initialize(memoryPath, false);
        await manager.clear();
        await manager.close();
        
        vscode.window.showInformationMessage('Agent memory has been cleared.');
        onRefreshMcp(); // Refresh MCP to use new empty memory
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to clear memory: ${(error as Error).message}`);
      }
    })
  );

  // Command: Show Memory Statistics
  disposables.push(
    vscode.commands.registerCommand('memvidAgentMemory.showStats', async () => {
      const memoryPath = getMemoryFilePath(globalStoragePath);
      
      if (!fs.existsSync(memoryPath)) {
        vscode.window.showInformationMessage('No memory file exists yet. Start using the agent memory tools to create one.');
        return;
      }

      try {
        const manager = MemoryManager.getInstance();
        await manager.initialize(memoryPath, false);
        const stats = await manager.getStats();
        await manager.close();

        // Show as information message with option to open file
        const choice = await vscode.window.showInformationMessage(
          `Memory contains ${stats.frameCount} entries (${stats.sizeFormatted})`,
          'Show in Explorer',
          'OK'
        );

        if (choice === 'Show in Explorer') {
          await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(memoryPath));
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get memory stats: ${(error as Error).message}`);
      }
    })
  );

  // Command: Refresh MCP Server
  disposables.push(
    vscode.commands.registerCommand('memvidAgentMemory.refreshMcp', () => {
      onRefreshMcp();
      vscode.window.showInformationMessage('Memvid MCP server refreshed.');
    })
  );

  // Command: Select Copilot Model
  disposables.push(
    vscode.commands.registerCommand('memvidAgentMemory.selectCopilotModel', async () => {
      const copilotLlm = CopilotLlmService.getInstance();
      
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Fetching available Copilot models...',
          cancellable: false,
        },
        async () => {
          try {
            const isAvailable = await copilotLlm.isAvailable();
            
            if (!isAvailable) {
              vscode.window.showWarningMessage(
                'No Copilot models available. Make sure GitHub Copilot is installed and you are signed in.'
              );
              return;
            }
            
            const models = await copilotLlm.getAvailableModelsDetailed();
            
            if (models.length === 0) {
              vscode.window.showWarningMessage('No Copilot models found.');
              return;
            }
            
            const config = vscode.workspace.getConfiguration('memvidAgentMemory');
            const currentModel = config.get<string>('llmCopilot.modelFamily', 'gpt-4o');
            
            const items: vscode.QuickPickItem[] = models.map(m => ({
              label: m.family,
              description: m.id,
              detail: `${m.vendor} - Max Tokens: ${m.maxInputTokens?.toLocaleString() || 'unknown'}`,
              picked: m.family === currentModel
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
              placeHolder: 'Select a Copilot model for answer generation',
              title: 'Available Copilot Models',
            });
            
            if (selected) {
              await config.update('llmCopilot.modelFamily', selected.label, vscode.ConfigurationTarget.Global);
              vscode.window.showInformationMessage(`Copilot model set to: ${selected.label}`);
            }
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch models: ${(error as Error).message}`);
          }
        }
      );
    })
  );

  return disposables;
}
