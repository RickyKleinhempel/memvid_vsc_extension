/**
 * VS Code Commands for Memvid Agent Memory Extension
 * @module commands
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { getMemoryFilePath } from './config/settings.js';
import { MemoryManager } from './memoryManager.js';

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
      const folderUri = vscode.Uri.file(memoryPath).with({ path: vscode.Uri.file(memoryPath).path.replace(/[^/]+$/, '') });
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

        // Show stats in a quick pick or information message
        const statsMessage = [
          `📊 Memory Statistics`,
          ``,
          `Entries: ${stats.frameCount}`,
          `Size: ${stats.sizeFormatted}`,
          `Location: ${memoryPath}`,
        ].join('\n');

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

  return disposables;
}
