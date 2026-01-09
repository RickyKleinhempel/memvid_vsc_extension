/**
 * Local Bridge Server - Provides HTTP bridge between MCP server and VS Code extension
 * This allows the MCP server (separate process) to access VS Code APIs like Copilot LLM
 * 
 * @module services/bridgeServer
 */

import * as http from 'http';
import * as vscode from 'vscode';
import { copilotLlm } from './copilotLlmService.js';

/** Bridge server port (random available port) */
let bridgePort: number | undefined;

/** HTTP server instance */
let server: http.Server | undefined;

/**
 * Request body for LLM generation
 */
interface LlmGenerateRequest {
  question: string;
  context: Array<{ title: string; snippet: string; label?: string }>;
  modelFamily?: string;
  systemPrompt?: string;
}

/**
 * Start the bridge server
 * @returns The port the server is listening on
 */
export async function startBridgeServer(): Promise<number> {
  if (server && bridgePort) {
    return bridgePort;
  }

  return new Promise((resolve, reject) => {
    server = http.createServer(async (req, res) => {
      // CORS headers for local requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      // Parse request body
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const url = req.url || '';
          
          if (url === '/llm/generate') {
            await handleLlmGenerate(body, res);
          } else if (url === '/llm/available') {
            await handleLlmAvailable(res);
          } else if (url === '/llm/models') {
            await handleLlmModels(res);
          } else if (url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', port: bridgePort }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
          }
        } catch (error) {
          console.error('[Bridge Server] Error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: (error as Error).message }));
        }
      });
    });

    // Listen on random available port (localhost only for security)
    server.listen(0, '127.0.0.1', () => {
      const address = server!.address();
      if (address && typeof address === 'object') {
        bridgePort = address.port;
        console.log(`[Bridge Server] Started on port ${bridgePort}`);
        resolve(bridgePort);
      } else {
        reject(new Error('Failed to get server address'));
      }
    });

    server.on('error', (err) => {
      console.error('[Bridge Server] Server error:', err);
      reject(err);
    });
  });
}

/**
 * Handle LLM generate request
 */
async function handleLlmGenerate(body: string, res: http.ServerResponse): Promise<void> {
  const request: LlmGenerateRequest = JSON.parse(body);
  
  const result = await copilotLlm.generateAnswer(
    request.question,
    request.context,
    request.modelFamily,
    request.systemPrompt
  );

  if (result) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } else {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Copilot not available or generation failed' }));
  }
}

/**
 * Handle LLM availability check
 */
async function handleLlmAvailable(res: http.ServerResponse): Promise<void> {
  const available = await copilotLlm.isAvailable();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ available }));
}

/**
 * Handle LLM models list
 */
async function handleLlmModels(res: http.ServerResponse): Promise<void> {
  const models = await copilotLlm.getAvailableModels();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ models }));
}

/**
 * Stop the bridge server
 */
export function stopBridgeServer(): void {
  if (server) {
    server.close();
    server = undefined;
    bridgePort = undefined;
    console.log('[Bridge Server] Stopped');
  }
}

/**
 * Get the current bridge port
 */
export function getBridgePort(): number | undefined {
  return bridgePort;
}
