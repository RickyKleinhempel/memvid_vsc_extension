/**
 * Copilot LLM Service - Uses VS Code's Language Model API to access Copilot models
 * This service runs in the extension context (not MCP server) and provides
 * access to GitHub Copilot's language models for answer generation.
 * 
 * @module services/copilotLlmService
 */

import * as vscode from 'vscode';

/**
 * Message format for chat
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Result from Copilot LLM generation
 */
export interface CopilotGenerationResult {
  answer: string;
  model: string;
  provider: 'copilot';
  tokensUsed?: number;
}

/**
 * Result from query rewriting
 */
export interface CopilotRewriteResult {
  answer: string;
  model: string;
}

/**
 * Copilot LLM Service using VS Code Language Model API
 */
export class CopilotLlmService {
  private static instance: CopilotLlmService | undefined;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): CopilotLlmService {
    if (!CopilotLlmService.instance) {
      CopilotLlmService.instance = new CopilotLlmService();
    }
    return CopilotLlmService.instance;
  }

  /**
   * Check if Copilot models are available
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      return models.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get available Copilot models
   */
  public async getAvailableModels(): Promise<string[]> {
    try {
      const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      return models.map(m => `${m.family} (${m.id})`);
    } catch {
      return [];
    }
  }

  /**
   * Generate an answer using Copilot's language model
   * @param question - User's question
   * @param context - Retrieved memory context
   * @param modelFamily - Preferred model family (e.g., 'gpt-4o', 'gpt-4o-mini')
   * @param systemPrompt - Optional system prompt
   * @param cancellationToken - Optional cancellation token
   */
  public async generateAnswer(
    question: string,
    context: Array<{ title: string; snippet: string; label?: string }>,
    modelFamily?: string,
    systemPrompt?: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<CopilotGenerationResult | null> {
    try {
      // Select model - prefer specified family, fallback to any Copilot model
      let models: vscode.LanguageModelChat[] = [];
      
      if (modelFamily) {
        models = await vscode.lm.selectChatModels({ 
          vendor: 'copilot', 
          family: modelFamily 
        });
      }
      
      // Fallback to any Copilot model
      if (models.length === 0) {
        models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      }

      if (models.length === 0) {
        console.warn('[Copilot LLM] No Copilot models available');
        return null;
      }

      const model = models[0];
      
      // Build messages
      const messages = this.buildMessages(question, context, systemPrompt);
      
      // Send request
      const response = await model.sendRequest(
        messages,
        {},
        cancellationToken
      );

      // Collect response text
      let answer = '';
      for await (const chunk of response.text) {
        answer += chunk;
      }

      return {
        answer,
        model: `${model.family} (${model.vendor})`,
        provider: 'copilot',
      };
    } catch (error) {
      if (error instanceof vscode.LanguageModelError) {
        console.error(`[Copilot LLM] Language model error: ${error.message} (${error.code})`);
        
        // Handle specific errors
        if (error.code === 'NoPermissions') {
          vscode.window.showWarningMessage(
            'Memvid: Copilot access not available. Please ensure you have an active GitHub Copilot subscription.'
          );
        }
      } else {
        console.error(`[Copilot LLM] Error: ${(error as Error).message}`);
      }
      return null;
    }
  }

  /**
   * Build chat messages for Copilot
   */
  private buildMessages(
    question: string,
    context: Array<{ title: string; snippet: string; label?: string }>,
    customSystemPrompt?: string
  ): vscode.LanguageModelChatMessage[] {
    const defaultSystemPrompt = `You are a helpful AI assistant with access to the user's agent memory. 
Answer questions based on the provided context from memory. 
If the context doesn't contain relevant information, say so clearly.
Be concise and accurate. Cite specific memories when relevant.`;

    const systemPrompt = customSystemPrompt || defaultSystemPrompt;
    
    // Format context
    const formattedContext = context.length === 0
      ? 'No relevant memories found.'
      : context.map((item, index) => {
          const parts = [`[Memory ${index + 1}]`];
          if (item.title) {
            parts.push(`Title: ${item.title}`);
          }
          if (item.label) {
            parts.push(`Category: ${item.label}`);
          }
          parts.push(`Content: ${item.snippet}`);
          return parts.join('\n');
        }).join('\n\n---\n\n');

    return [
      vscode.LanguageModelChatMessage.User(
        `${systemPrompt}\n\nHere is the relevant context from my agent memory:\n\n${formattedContext}\n\nQuestion: ${question}`
      ),
    ];
  }

  /**
   * Rewrite a query to generate better search terms using Copilot
   * Used when initial search returns no results
   * @param question - Original user question
   * @param failedKeywords - Keywords that were already tried
   * @param modelFamily - Preferred model family
   * @param cancellationToken - Optional cancellation token
   */
  public async rewriteQuery(
    question: string,
    failedKeywords: string[],
    modelFamily?: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<CopilotRewriteResult | null> {
    try {
      // Select model
      let models: vscode.LanguageModelChat[] = [];
      
      if (modelFamily) {
        models = await vscode.lm.selectChatModels({ 
          vendor: 'copilot', 
          family: modelFamily 
        });
      }
      
      if (models.length === 0) {
        models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      }

      if (models.length === 0) {
        console.warn('[Copilot LLM] No Copilot models available for query rewriting');
        return null;
      }

      const model = models[0];
      
      // Build rewrite prompt
      const systemPrompt = `You are a search query optimizer. Given a user question, generate alternative search terms that might find relevant information in a memory database.

Rules:
1. Extract key concepts, nouns, and technical terms
2. Include synonyms and related terms (e.g., "konzentriertes Arbeiten" → "deep work", "focus", "produktivität")
3. Include both German and English variations if applicable
4. Return ONLY a JSON array of search terms, nothing else
5. Maximum 8 terms, prioritize the most likely matches`;

      const userMessage = `Question: "${question}"
Previously tried search terms (no results): ${failedKeywords.join(', ')}

Generate alternative search terms that might find relevant information. Return ONLY a JSON array.`;

      const messages = [
        vscode.LanguageModelChatMessage.User(`${systemPrompt}\n\n${userMessage}`),
      ];
      
      // Send request
      const response = await model.sendRequest(
        messages,
        {},
        cancellationToken
      );

      // Collect response text
      let answer = '';
      for await (const chunk of response.text) {
        answer += chunk;
      }

      return {
        answer,
        model: `${model.family} (${model.vendor})`,
      };
    } catch (error) {
      console.error(`[Copilot LLM] Query rewrite error: ${(error as Error).message}`);
      return null;
    }
  }
}

/**
 * Global instance for easy access
 */
export const copilotLlm = CopilotLlmService.getInstance();
