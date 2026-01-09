/**
 * Memory Manager - Core wrapper for Memvid SDK operations
 * Provides a singleton interface for memory operations
 * @module memoryManager
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  MemoryEntry,
  StoredMemoryEntry,
  SearchOptions,
  SearchResult,
  SearchHit,
  AskOptions,
  AskResult,
  MemoryStats,
  TimelineEntry,
  EmbeddingConfig,
} from './types/index.js';
import {
  MemoryNotInitializedError,
  MemoryFileError,
  StoreError,
  SearchError,
  AskError,
  mapMemvidError,
} from './errors.js';

// Dynamic import for Memvid SDK (ESM module)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let memvidSdk: any = null;

/**
 * Lazy load the Memvid SDK
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getMemvidSdk(): Promise<any> {
  if (!memvidSdk) {
    memvidSdk = await import('@memvid/sdk');
  }
  return memvidSdk;
}

/**
 * Build embedder configuration for Memvid SDK based on embedding config
 * @param config - Embedding configuration
 * @returns Embedder configuration object for Memvid SDK, or undefined if no embedder
 */
function buildEmbedderConfig(config?: EmbeddingConfig): Record<string, unknown> | undefined {
  if (!config || config.provider === 'none') {
    return undefined;
  }

  switch (config.provider) {
    case 'openai':
      if (!config.openai?.apiKey) {
        console.warn('[MemoryManager] OpenAI API key not configured');
        return undefined;
      }
      return {
        type: 'openai',
        apiKey: config.openai.apiKey,
        baseUrl: config.openai.baseUrl || 'https://api.openai.com/v1',
        model: config.openai.model || 'text-embedding-3-small',
      };

    case 'azureOpenai':
      if (!config.azureOpenai?.endpoint || !config.azureOpenai?.apiKey || !config.azureOpenai?.deploymentName) {
        console.warn('[MemoryManager] Azure OpenAI configuration incomplete');
        return undefined;
      }
      return {
        type: 'azure-openai',
        endpoint: config.azureOpenai.endpoint,
        apiKey: config.azureOpenai.apiKey,
        deploymentName: config.azureOpenai.deploymentName,
        apiVersion: config.azureOpenai.apiVersion || '2024-02-01',
      };

    case 'ollama':
      return {
        type: 'ollama',
        baseUrl: config.ollama?.baseUrl || 'http://localhost:11434',
        model: config.ollama?.model || 'nomic-embed-text',
      };

    default:
      return undefined;
  }
}

/**
 * Memory Manager class - singleton wrapper for Memvid operations
 */
export class MemoryManager {
  private static instance: MemoryManager | null = null;
  private memory: unknown = null;
  private memoryPath: string = '';
  private isInitialized: boolean = false;
  private embeddingConfig?: EmbeddingConfig;

  private constructor() {}

  /**
   * Get the singleton instance of MemoryManager
   */
  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (MemoryManager.instance) {
      MemoryManager.instance.close().catch(() => {});
      MemoryManager.instance = null;
    }
  }

  /**
   * Check if memory is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the current memory file path
   */
  public get path(): string {
    return this.memoryPath;
  }

  /**
   * Get the current embedding provider
   */
  public get embeddingProvider(): string {
    return this.embeddingConfig?.provider || 'none';
  }

  /**
   * Initialize the memory manager with a file path
   * Creates the memory file if it doesn't exist and autoCreate is true
   * 
   * @param memoryFilePath - Path to the .mv2 memory file
   * @param autoCreate - Whether to create the file if it doesn't exist
   * @param embeddingConfig - Optional embedding configuration for semantic search
   */
  public async initialize(
    memoryFilePath: string, 
    autoCreate: boolean = true,
    embeddingConfig?: EmbeddingConfig
  ): Promise<void> {
    if (this.isInitialized && this.memoryPath === memoryFilePath) {
      return; // Already initialized with same path
    }

    // Close existing memory if open
    if (this.isInitialized) {
      await this.close();
    }

    this.memoryPath = memoryFilePath;
    this.embeddingConfig = embeddingConfig;

    try {
      // Ensure directory exists
      const dir = path.dirname(memoryFilePath);
      if (!fs.existsSync(dir)) {
        if (autoCreate) {
          fs.mkdirSync(dir, { recursive: true });
        } else {
          throw new MemoryFileError(`Directory does not exist: ${dir}`);
        }
      }

      const sdk = await getMemvidSdk();
      const fileExists = fs.existsSync(memoryFilePath);
      const embedderConfig = buildEmbedderConfig(embeddingConfig);

      // Build SDK options
      const sdkOptions: Record<string, unknown> = {
        mode: fileExists ? 'open' : 'create',
      };

      // Add embedder configuration if available
      if (embedderConfig) {
        sdkOptions.embedder = embedderConfig;
        console.log(`[MemoryManager] Using embedding provider: ${embeddingConfig?.provider}`);
      } else {
        console.log('[MemoryManager] No embedding provider configured, using BM25 search only');
      }

      if (fileExists) {
        // Open existing file
        this.memory = await sdk.use('basic', memoryFilePath, sdkOptions);
      } else if (autoCreate) {
        // Create new file with options
        if (embedderConfig) {
          this.memory = await sdk.create(memoryFilePath, { embedder: embedderConfig });
        } else {
          this.memory = await sdk.create(memoryFilePath);
        }
      } else {
        throw new MemoryFileError(`Memory file does not exist: ${memoryFilePath}`);
      }

      this.isInitialized = true;
      console.log(`[MemoryManager] Initialized with file: ${memoryFilePath}`);
    } catch (error) {
      this.isInitialized = false;
      this.memory = null;
      throw mapMemvidError(error);
    }
  }

  /**
   * Ensure memory is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.memory) {
      throw new MemoryNotInitializedError();
    }
  }

  /**
   * Store a new entry in memory
   * 
   * @param entry - The memory entry to store
   * @returns The stored entry with assigned frameId
   */
  public async store(entry: MemoryEntry): Promise<StoredMemoryEntry> {
    this.ensureInitialized();

    try {
      const mv = this.memory as {
        put: (doc: unknown) => Promise<string>;
      };

      const createdAt = new Date().toISOString();
      
      const frameId = await mv.put({
        title: entry.title,
        label: entry.label || 'general',
        text: entry.content,
        tags: entry.tags || [],
        metadata: {
          ...entry.metadata,
          createdAt,
        },
      });

      console.log(`[MemoryManager] Stored entry: ${entry.title} (${frameId})`);

      return {
        ...entry,
        frameId,
        createdAt,
      };
    } catch (error) {
      throw new StoreError(`Failed to store entry: ${(error as Error).message}`);
    }
  }

  /**
   * Store multiple entries in batch
   * 
   * @param entries - Array of memory entries to store
   * @returns Array of stored entries with assigned frameIds
   */
  public async storeMany(entries: MemoryEntry[]): Promise<StoredMemoryEntry[]> {
    this.ensureInitialized();

    try {
      const mv = this.memory as {
        putMany: (docs: unknown[]) => Promise<string[]>;
      };

      const createdAt = new Date().toISOString();
      
      const docs = entries.map(entry => ({
        title: entry.title,
        label: entry.label || 'general',
        text: entry.content,
        tags: entry.tags || [],
        metadata: {
          ...entry.metadata,
          createdAt,
        },
      }));

      const frameIds = await mv.putMany(docs);

      console.log(`[MemoryManager] Stored ${frameIds.length} entries in batch`);

      return entries.map((entry, index) => ({
        ...entry,
        frameId: frameIds[index],
        createdAt,
      }));
    } catch (error) {
      throw new StoreError(`Failed to store entries in batch: ${(error as Error).message}`);
    }
  }

  /**
   * Extract meaningful keywords from a query (removes stopwords)
   * Supports German and English stopwords
   */
  private extractKeywords(query: string): string[] {
    // German and English stopwords
    const stopwords = new Set([
      // German
      'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'einem', 'einen',
      'und', 'oder', 'aber', 'wenn', 'weil', 'dass', 'als', 'auch', 'noch', 'schon',
      'ist', 'sind', 'war', 'waren', 'wird', 'werden', 'hat', 'haben', 'hatte', 'hatten',
      'kann', 'können', 'konnte', 'konnten', 'muss', 'müssen', 'soll', 'sollen',
      'was', 'wer', 'wie', 'wo', 'wann', 'warum', 'welche', 'welcher', 'welches',
      'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mein', 'dein', 'sein', 'ihr',
      'nicht', 'kein', 'keine', 'keiner', 'nur', 'sehr', 'mehr', 'viel', 'alle', 'alles',
      'für', 'mit', 'bei', 'von', 'zu', 'nach', 'aus', 'über', 'unter', 'zwischen',
      'durch', 'gegen', 'ohne', 'um', 'an', 'auf', 'in', 'vor', 'hinter', 'neben',
      // English
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its',
      'and', 'or', 'but', 'if', 'because', 'as', 'while', 'of', 'at', 'by', 'for',
      'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
      'can', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    ]);

    // Extract words, filter stopwords and short words
    const words = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Keep letters and numbers (Unicode-aware)
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word));

    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Search memory by query
   * Uses keyword extraction and fallback strategy for better results
   * 
   * @param query - Search query string
   * @param options - Search options
   * @returns Search results with hits
   */
  public async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    this.ensureInitialized();

    const startTime = Date.now();

    try {
      const mv = this.memory as {
        find: (query: string, options?: unknown) => Promise<{
          hits: Array<{
            frameId?: string;
            title?: string;
            score?: number;
            snippet?: string;
            label?: string;
            metadata?: Record<string, unknown>;
          }>;
        }>;
      };

      const searchOptions = {
        k: options.limit || 10,
        mode: options.mode || 'auto',
        snippetChars: options.snippetChars || 240,
      };

      // Try original query first
      let result = await mv.find(query, searchOptions);
      console.log(`[MemoryManager] Search "${query.substring(0, 50)}..." returned ${result.hits?.length || 0} results`);

      // If no results, try with extracted keywords (OR query)
      if (!result.hits || result.hits.length === 0) {
        const keywords = this.extractKeywords(query);
        console.log(`[MemoryManager] Fallback: extracted keywords: ${keywords.join(', ')}`);
        
        if (keywords.length > 0) {
          // Try OR query with keywords
          const orQuery = keywords.join(' OR ');
          result = await mv.find(orQuery, searchOptions);
          console.log(`[MemoryManager] OR query "${orQuery}" returned ${result.hits?.length || 0} results`);
          
          // If still no results, try each keyword individually
          if (!result.hits || result.hits.length === 0) {
            for (const keyword of keywords) {
              result = await mv.find(keyword, searchOptions);
              if (result.hits && result.hits.length > 0) {
                console.log(`[MemoryManager] Single keyword "${keyword}" returned ${result.hits.length} results`);
                break;
              }
            }
          }
        }
      }

      const hits: SearchHit[] = (result.hits || []).map(hit => ({
        frameId: hit.frameId || '',
        title: hit.title || '',
        score: hit.score || 0,
        snippet: hit.snippet || '',
        label: hit.label,
        metadata: hit.metadata,
      }));

      // Filter by label if specified
      const filteredHits = options.label 
        ? hits.filter(hit => hit.label === options.label)
        : hits;

      const searchTimeMs = Date.now() - startTime;
      console.log(`[MemoryManager] Final search returned ${filteredHits.length} results in ${searchTimeMs}ms`);

      return {
        hits: filteredHits,
        totalHits: filteredHits.length,
        searchTimeMs,
      };
    } catch (error) {
      throw new SearchError(`Search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Ask a question using RAG (Retrieval Augmented Generation)
   * 
   * @param question - The question to ask
   * @param options - RAG options
   * @returns The synthesized answer
   */
  public async ask(question: string, options: AskOptions = {}): Promise<AskResult> {
    this.ensureInitialized();

    try {
      const mv = this.memory as {
        ask: (question: string, options?: unknown) => Promise<{
          text: string;
          context?: Array<{
            frameId?: string;
            title?: string;
            score?: number;
            snippet?: string;
          }>;
        }>;
      };

      const result = await mv.ask(question, {
        k: options.contextLimit || 5,
        model: options.model,
        contextOnly: options.contextOnly || false,
      });

      console.log(`[MemoryManager] RAG query: "${question.substring(0, 50)}..."`);

      return {
        text: result.text,
        context: result.context?.map(c => ({
          frameId: c.frameId || '',
          title: c.title || '',
          score: c.score || 0,
          snippet: c.snippet || '',
        })),
        model: options.model,
      };
    } catch (error) {
      throw new AskError(`RAG query failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get recent entries in reverse chronological order (newest first)
   * 
   * @param limit - Maximum number of entries to return
   * @returns Array of timeline entries (newest first)
   */
  public async getTimeline(limit: number = 20): Promise<TimelineEntry[]> {
    this.ensureInitialized();

    try {
      const mv = this.memory as {
        timeline?: (options?: { limit?: number; reverse?: boolean }) => Promise<Array<Record<string, unknown>>>;
        find: (query: string, options?: unknown) => Promise<{
          hits: Array<Record<string, unknown>>;
        }>;
      };

      // Try timeline method first if available
      if (typeof mv.timeline === 'function') {
        // reverse: true returns newest entries first (DESC order)
        const entries = await mv.timeline({ limit, reverse: true });
        console.log(`[MemoryManager] Timeline returned ${entries?.length || 0} entries (reverse order)`);
        
        if (entries && entries.length > 0) {
          // Log first entry structure for debugging
          console.log(`[MemoryManager] Timeline entry keys:`, Object.keys(entries[0]));
          
          return entries.map(entry => {
            // Timeline entries from Memvid SDK have:
            // frame_id, timestamp, preview, uri, child_frames
            // Note: There is NO title field - we extract title from metadata or use preview
            
            const frameId = String(
              entry.frame_id || 
              entry.frameId || 
              entry.id || 
              ''
            );
            
            // Preview is the main content snippet from Memvid SDK
            const preview = String(
              entry.preview || 
              entry.text || 
              entry.content || 
              entry.snippet ||
              ''
            );
            
            // Extract title from metadata if available, otherwise use first line of preview
            const metadataTitle = (entry.metadata as Record<string, unknown>)?.title;
            const title = metadataTitle 
              ? String(metadataTitle)
              : preview.split('\n')[0].substring(0, 100) || 'Memory Entry';
            
            // Extract label from metadata
            const label = String(
              (entry.metadata as Record<string, unknown>)?.label ||
              entry.label || 
              'general'
            );
            
            // Extract timestamp - convert from unix timestamp if needed
            const timestamp = entry.timestamp;
            let createdAt = '';
            if (typeof timestamp === 'number' && timestamp > 0) {
              // Convert unix timestamp (seconds) to ISO string
              createdAt = new Date(timestamp * 1000).toISOString();
            } else if (entry.createdAt) {
              createdAt = String(entry.createdAt);
            } else if ((entry.metadata as Record<string, unknown>)?.createdAt) {
              createdAt = String((entry.metadata as Record<string, unknown>)?.createdAt);
            }

            return {
              frameId,
              title,
              label,
              createdAt,
              preview: preview.substring(0, 200),
            };
          });
        }
      }

      // Fallback: Use find with wildcard query to get recent entries
      console.log('[MemoryManager] Timeline not available, using find fallback');
      const result = await mv.find('*', { k: limit, mode: 'lex' });
      
      if (result.hits && result.hits.length > 0) {
        console.log(`[MemoryManager] Find returned ${result.hits.length} hits`);
        console.log(`[MemoryManager] Hit keys:`, Object.keys(result.hits[0]));
        
        return result.hits.map(hit => {
          const frameId = String(hit.frameId || hit.frame_id || hit.id || '');
          
          // For search hits, snippet contains the content
          const content = String(
            hit.snippet || 
            hit.text || 
            hit.content ||
            ''
          );
          
          // Extract title from hit or use first line of content
          const title = hit.title 
            ? String(hit.title)
            : content.split('\n')[0].substring(0, 100) || 'Memory Entry';
          
          const label = String(hit.label || 'general');
          const createdAt = String(
            (hit.metadata as Record<string, unknown>)?.createdAt || 
            hit.createdAt ||
            ''
          );

          return {
            frameId,
            title,
            label,
            createdAt,
            preview: content.substring(0, 200),
          };
        });
      }

      return [];
    } catch (error) {
      // Timeline might not be available, return empty array
      console.warn(`[MemoryManager] Timeline failed: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get memory statistics
   * 
   * @returns Statistics about the memory store
   */
  public async getStats(): Promise<MemoryStats> {
    this.ensureInitialized();

    try {
      const mv = this.memory as {
        stats: () => Promise<{
          frame_count?: number;
          size_bytes?: number;
        }>;
      };

      const stats = await mv.stats();
      const frameCount = stats.frame_count || 0;
      const sizeBytes = stats.size_bytes || 0;

      // Format size for display
      let sizeFormatted: string;
      if (sizeBytes < 1024) {
        sizeFormatted = `${sizeBytes} B`;
      } else if (sizeBytes < 1024 * 1024) {
        sizeFormatted = `${(sizeBytes / 1024).toFixed(2)} KB`;
      } else {
        sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
      }

      console.log(`[MemoryManager] Stats: ${frameCount} entries, ${sizeFormatted}`);

      return {
        frameCount,
        sizeBytes,
        sizeFormatted,
        labels: {}, // TODO: Implement label counting if SDK supports it
      };
    } catch (error) {
      // Return default stats on error
      console.warn(`[MemoryManager] Stats not available: ${(error as Error).message}`);
      return {
        frameCount: 0,
        sizeBytes: 0,
        sizeFormatted: '0 B',
        labels: {},
      };
    }
  }

  /**
   * Clear all entries from memory
   * Note: This creates a new empty memory file
   */
  public async clear(): Promise<void> {
    const currentPath = this.memoryPath;
    
    // Close current memory
    await this.close();

    try {
      // Delete the file if it exists
      if (fs.existsSync(currentPath)) {
        fs.unlinkSync(currentPath);
      }

      // Reinitialize with a fresh file
      await this.initialize(currentPath, true);
      console.log(`[MemoryManager] Memory cleared`);
    } catch (error) {
      throw new MemoryFileError(`Failed to clear memory: ${(error as Error).message}`);
    }
  }

  /**
   * Close the memory file and release resources
   */
  public async close(): Promise<void> {
    if (!this.isInitialized || !this.memory) {
      return;
    }

    try {
      const mv = this.memory as {
        seal?: () => Promise<void>;
      };

      if (mv.seal) {
        await mv.seal();
      }

      console.log(`[MemoryManager] Memory closed`);
    } catch (error) {
      console.warn(`[MemoryManager] Error closing memory: ${(error as Error).message}`);
    } finally {
      this.memory = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance getter
export function getMemoryManager(): MemoryManager {
  return MemoryManager.getInstance();
}
