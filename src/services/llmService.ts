/**
 * LLM Service - Handles LLM API calls for answer generation
 * Supports OpenAI, Azure OpenAI, and Ollama providers
 * @module services/llmService
 */

import type { 
  LlmConfig, 
  OpenAILlmConfig, 
  AzureOpenAILlmConfig, 
  OllamaLlmConfig,
  SearchHit,
} from '../types/index.js';

/**
 * Message format for chat completions
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Copilot LLM configuration
 */
interface CopilotLlmConfig {
  bridgePort: number;
  modelFamily: string;
}

/**
 * Response from LLM generation
 */
export interface LlmGenerationResult {
  /** Generated answer text */
  answer: string;
  /** Model used for generation */
  model: string;
  /** Provider used */
  provider: string;
  /** Tokens used (if available) */
  tokensUsed?: number;
}

/**
 * Default system prompt for RAG answer generation
 */
const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant with access to the user's agent memory. 
Answer questions based on the provided context from memory. 
If the context doesn't contain relevant information, say so clearly.
Be concise and accurate. Cite specific memories when relevant.`;

/**
 * System prompt for query rewriting
 */
const QUERY_REWRITE_PROMPT = `You are a search query optimizer. Given a user question, generate alternative search terms that might find relevant information in a memory database.

Rules:
1. Extract key concepts, nouns, and technical terms
2. Include synonyms and related terms (e.g., "konzentriertes Arbeiten" → "deep work", "focus", "produktivität")
3. Include both German and English variations if applicable
4. Return ONLY a JSON array of search terms, nothing else
5. Maximum 8 terms, prioritize the most likely matches

Example:
Question: "Wann ist die beste Zeit für konzentriertes Arbeiten?"
Response: ["arbeitszeiten", "produktivität", "deep work", "focus", "morgens", "konzentration", "working hours"]

Question: "Mein Docker Container startet nicht"
Response: ["docker", "container", "fehler", "error", "startet nicht", "troubleshooting", "docker error"]`;

/**
 * Query rewrite result
 */
export interface QueryRewriteResult {
  /** Alternative search terms */
  terms: string[];
  /** Model used */
  model: string;
}

/**
 * LLM Service class for generating answers from context
 */
export class LlmService {
  private config: LlmConfig;
  private copilotConfig?: CopilotLlmConfig;

  constructor(config: LlmConfig, copilotConfig?: CopilotLlmConfig) {
    this.config = config;
    this.copilotConfig = copilotConfig;
  }

  /**
   * Check if LLM is configured
   */
  public isConfigured(): boolean {
    if (this.config.provider === 'copilot') {
      return !!this.copilotConfig?.bridgePort;
    }
    return this.config.provider !== 'none';
  }

  /**
   * Generate an answer from context using the configured LLM
   * @param question - User's question
   * @param context - Retrieved memory context (search hits)
   * @param systemPrompt - Optional custom system prompt
   * @returns Generated answer or null if LLM not configured
   */
  public async generateAnswer(
    question: string,
    context: SearchHit[],
    systemPrompt?: string
  ): Promise<LlmGenerationResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const formattedContext = this.formatContextForLlm(context);
    const messages = this.buildMessages(question, formattedContext, systemPrompt);

    switch (this.config.provider) {
      case 'copilot':
        return this.callCopilotBridge(question, context, systemPrompt);
      case 'openai':
        return this.callOpenAI(messages, this.config.openai!);
      case 'azureOpenai':
        return this.callAzureOpenAI(messages, this.config.azureOpenai!);
      case 'ollama':
        return this.callOllama(messages, this.config.ollama!);
      default:
        return null;
    }
  }

  /**
   * Format search hits into context string for LLM
   */
  private formatContextForLlm(context: SearchHit[]): string {
    if (context.length === 0) {
      return 'No relevant memories found.';
    }

    return context.map((hit, index) => {
      const parts = [`[Memory ${index + 1}]`];
      if (hit.title) {
        parts.push(`Title: ${hit.title}`);
      }
      if (hit.label) {
        parts.push(`Category: ${hit.label}`);
      }
      parts.push(`Content: ${hit.snippet}`);
      return parts.join('\n');
    }).join('\n\n---\n\n');
  }

  /**
   * Build chat messages for the LLM
   */
  private buildMessages(
    question: string, 
    context: string, 
    customSystemPrompt?: string
  ): ChatMessage[] {
    const systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;
    
    return [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Here is the relevant context from my agent memory:\n\n${context}\n\nQuestion: ${question}`,
      },
    ];
  }

  /**
   * Call Copilot via bridge server
   * The bridge server runs in the VS Code extension context and has access to vscode.lm API
   */
  private async callCopilotBridge(
    question: string,
    context: SearchHit[],
    systemPrompt?: string
  ): Promise<LlmGenerationResult> {
    if (!this.copilotConfig?.bridgePort) {
      throw new Error('Copilot bridge not available');
    }

    const bridgeUrl = `http://127.0.0.1:${this.copilotConfig.bridgePort}/llm/generate`;
    
    const response = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        context: context.map(hit => ({
          title: hit.title,
          snippet: hit.snippet,
          label: hit.label,
        })),
        modelFamily: this.copilotConfig.modelFamily,
        systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      throw new Error(`Copilot bridge error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json() as {
      answer: string;
      model: string;
      provider: string;
      tokensUsed?: number;
    };

    return {
      answer: data.answer,
      model: data.model,
      provider: 'copilot',
      tokensUsed: data.tokensUsed,
    };
  }

  /**
   * Call OpenAI API for chat completion
   */
  private async callOpenAI(
    messages: ChatMessage[],
    config: OpenAILlmConfig
  ): Promise<LlmGenerationResult> {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
    };

    return {
      answer: data.choices[0]?.message?.content || 'No response generated.',
      model: config.model,
      provider: 'openai',
      tokensUsed: data.usage?.total_tokens,
    };
  }

  /**
   * Call Azure OpenAI API for chat completion
   */
  private async callAzureOpenAI(
    messages: ChatMessage[],
    config: AzureOpenAILlmConfig
  ): Promise<LlmGenerationResult> {
    const url = `${config.endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
    };

    return {
      answer: data.choices[0]?.message?.content || 'No response generated.',
      model: config.deploymentName,
      provider: 'azureOpenai',
      tokensUsed: data.usage?.total_tokens,
    };
  }

  /**
   * Call Ollama API for chat completion
   */
  private async callOllama(
    messages: ChatMessage[],
    config: OllamaLlmConfig
  ): Promise<LlmGenerationResult> {
    const response = await fetch(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        options: {
          num_predict: config.maxTokens,
          temperature: config.temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      message?: { content: string };
      eval_count?: number;
    };

    return {
      answer: data.message?.content || 'No response generated.',
      model: config.model,
      provider: 'ollama',
      tokensUsed: data.eval_count,
    };
  }

  /**
   * Rewrite a query to generate better search terms using LLM
   * Used when initial search returns no results
   * @param question - Original user question
   * @param failedKeywords - Keywords that were already tried
   * @returns Array of alternative search terms
   */
  public async rewriteQuery(
    question: string,
    failedKeywords: string[]
  ): Promise<QueryRewriteResult | null> {
    if (!this.isConfigured()) {
      console.log('[LlmService] Query rewrite skipped - LLM not configured');
      return null;
    }

    console.log(`[LlmService] Rewriting query: "${question}"`);
    console.log(`[LlmService] Failed keywords: ${failedKeywords.join(', ')}`);

    const userMessage = `Question: "${question}"
Previously tried search terms (no results): ${failedKeywords.join(', ')}

Generate alternative search terms that might find relevant information. Return ONLY a JSON array.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: QUERY_REWRITE_PROMPT },
      { role: 'user', content: userMessage },
    ];

    try {
      let result: LlmGenerationResult;

      switch (this.config.provider) {
        case 'copilot':
          result = await this.callCopilotBridgeForRewrite(question, failedKeywords);
          break;
        case 'openai':
          result = await this.callOpenAI(messages, this.config.openai!);
          break;
        case 'azureOpenai':
          result = await this.callAzureOpenAI(messages, this.config.azureOpenai!);
          break;
        case 'ollama':
          result = await this.callOllama(messages, this.config.ollama!);
          break;
        default:
          return null;
      }

      // Parse the JSON array from response
      const terms = this.parseSearchTerms(result.answer);
      console.log(`[LlmService] Generated search terms: ${terms.join(', ')}`);

      return {
        terms,
        model: result.model,
      };
    } catch (error) {
      console.error('[LlmService] Query rewrite failed:', error);
      return null;
    }
  }

  /**
   * Call Copilot bridge specifically for query rewriting
   */
  private async callCopilotBridgeForRewrite(
    question: string,
    failedKeywords: string[]
  ): Promise<LlmGenerationResult> {
    if (!this.copilotConfig?.bridgePort) {
      throw new Error('Copilot bridge not available');
    }

    const bridgeUrl = `http://127.0.0.1:${this.copilotConfig.bridgePort}/llm/rewrite`;
    
    const response = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        failedKeywords,
        modelFamily: this.copilotConfig.modelFamily,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      throw new Error(`Copilot bridge error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json() as {
      answer: string;
      model: string;
    };

    return {
      answer: data.answer,
      model: data.model,
      provider: 'copilot',
    };
  }

  /**
   * Parse search terms from LLM response
   * Handles various response formats (JSON array, comma-separated, etc.)
   */
  private parseSearchTerms(response: string): string[] {
    // Clean response - remove markdown code blocks if present
    let cleaned = response.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    
    // Try parsing as JSON array
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((term): term is string => typeof term === 'string')
          .map(term => term.trim().toLowerCase())
          .filter(term => term.length > 0);
      }
    } catch {
      // Not valid JSON, try alternative parsing
    }

    // Try extracting JSON array from text
    const jsonMatch = cleaned.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((term): term is string => typeof term === 'string')
            .map(term => term.trim().toLowerCase())
            .filter(term => term.length > 0);
        }
      } catch {
        // Continue to fallback
      }
    }

    // Fallback: split by comma or newline
    return cleaned
      .split(/[,\n]+/)
      .map(term => term.replace(/["[\]]/g, '').trim().toLowerCase())
      .filter(term => term.length > 1);
  }
}

/**
 * Create LLM service from environment variables (for MCP server)
 */
export function createLlmServiceFromEnv(): LlmService {
  const provider = (process.env.MEMVID_LLM_PROVIDER || 'none') as LlmConfig['provider'];
  
  const config: LlmConfig = {
    provider,
  };

  // Copilot config from bridge port
  let copilotConfig: CopilotLlmConfig | undefined;
  if (provider === 'copilot') {
    const bridgePort = parseInt(process.env.MEMVID_BRIDGE_PORT || '0', 10);
    if (bridgePort > 0) {
      copilotConfig = {
        bridgePort,
        modelFamily: process.env.MEMVID_LLM_COPILOT_MODEL || 'gpt-4o',
      };
    }
  }

  switch (provider) {
    case 'openai':
      config.openai = {
        apiKey: process.env.MEMVID_LLM_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.MEMVID_LLM_OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.MEMVID_LLM_OPENAI_MODEL || 'gpt-4o-mini',
        maxTokens: parseInt(process.env.MEMVID_LLM_MAX_TOKENS || '1024', 10),
        temperature: parseFloat(process.env.MEMVID_LLM_TEMPERATURE || '0.7'),
      };
      break;
    
    case 'azureOpenai':
      config.azureOpenai = {
        endpoint: process.env.MEMVID_LLM_AZURE_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT || '',
        apiKey: process.env.MEMVID_LLM_AZURE_API_KEY || process.env.AZURE_OPENAI_API_KEY || '',
        deploymentName: process.env.MEMVID_LLM_AZURE_DEPLOYMENT || '',
        apiVersion: process.env.MEMVID_LLM_AZURE_API_VERSION || '2024-02-01',
        maxTokens: parseInt(process.env.MEMVID_LLM_MAX_TOKENS || '1024', 10),
        temperature: parseFloat(process.env.MEMVID_LLM_TEMPERATURE || '0.7'),
      };
      break;
    
    case 'ollama':
      config.ollama = {
        baseUrl: process.env.MEMVID_LLM_OLLAMA_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.MEMVID_LLM_OLLAMA_MODEL || 'llama3.2',
        maxTokens: parseInt(process.env.MEMVID_LLM_MAX_TOKENS || '1024', 10),
        temperature: parseFloat(process.env.MEMVID_LLM_TEMPERATURE || '0.7'),
      };
      break;
  }

  return new LlmService(config, copilotConfig);
}
