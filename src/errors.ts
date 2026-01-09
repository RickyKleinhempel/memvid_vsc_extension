/**
 * Custom error classes for Memvid Agent Memory Extension
 * @module errors
 */

/**
 * Base error class for Memvid operations
 */
export class MemvidError extends Error {
  /** Error code for programmatic handling */
  readonly code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'MemvidError';
    this.code = code;
  }
}

/**
 * Error thrown when memory file is not initialized
 */
export class MemoryNotInitializedError extends MemvidError {
  constructor() {
    super('Memory file is not initialized. Call initialize() first.', 'MV_NOT_INITIALIZED');
    this.name = 'MemoryNotInitializedError';
  }
}

/**
 * Error thrown when memory file cannot be found or created
 */
export class MemoryFileError extends MemvidError {
  constructor(message: string) {
    super(message, 'MV_FILE_ERROR');
    this.name = 'MemoryFileError';
  }
}

/**
 * Error thrown when a search operation fails
 */
export class SearchError extends MemvidError {
  constructor(message: string) {
    super(message, 'MV_SEARCH_ERROR');
    this.name = 'SearchError';
  }
}

/**
 * Error thrown when a store operation fails
 */
export class StoreError extends MemvidError {
  constructor(message: string) {
    super(message, 'MV_STORE_ERROR');
    this.name = 'StoreError';
  }
}

/**
 * Error thrown when embedding generation fails
 */
export class EmbeddingError extends MemvidError {
  constructor(message: string) {
    super(message, 'MV_EMBEDDING_ERROR');
    this.name = 'EmbeddingError';
  }
}

/**
 * Error thrown when RAG query fails
 */
export class AskError extends MemvidError {
  constructor(message: string) {
    super(message, 'MV_ASK_ERROR');
    this.name = 'AskError';
  }
}

/**
 * Map Memvid SDK error codes to custom errors
 * @param error - Original error from Memvid SDK
 * @returns Wrapped custom error
 */
export function mapMemvidError(error: unknown): MemvidError {
  if (error instanceof MemvidError) {
    return error;
  }
  
  if (error instanceof Error) {
    const message = error.message;
    
    // Map common Memvid error codes
    if (message.includes('MV001') || message.includes('capacity exceeded')) {
      return new StoreError('Storage capacity exceeded');
    }
    if (message.includes('MV007') || message.includes('locked')) {
      return new MemoryFileError('Memory file is locked by another process');
    }
    if (message.includes('MV010') || message.includes('not found')) {
      return new SearchError('Frame not found');
    }
    if (message.includes('MV013') || message.includes('file not found')) {
      return new MemoryFileError('Memory file not found');
    }
    if (message.includes('MV015') || message.includes('embedding')) {
      return new EmbeddingError('Embedding generation failed: ' + message);
    }
    
    return new MemvidError(message, 'MV_UNKNOWN');
  }
  
  return new MemvidError(String(error), 'MV_UNKNOWN');
}
