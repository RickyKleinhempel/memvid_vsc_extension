/**
 * MCP Tool Schemas - JSON Schema definitions for all MCP tools
 * @module tools/schemas
 */

/**
 * Schema for the memvid_store tool
 */
export const storeToolSchema = {
  name: 'memvid_store',
  description: 'Store information in the agent\'s persistent memory for later retrieval. Use this to remember important context, decisions, user preferences, code patterns, or any information that should persist across sessions.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'A brief, descriptive title for the memory entry (e.g., "User prefers dark mode", "Project uses React 18")',
      },
      content: {
        type: 'string',
        description: 'The detailed content to store in memory. Be specific and include relevant context.',
      },
      label: {
        type: 'string',
        description: 'Category label for organization. Common labels: user-preference, decision, context, code-pattern, project-info, error-solution',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional tags for better searchability (e.g., ["typescript", "react", "performance"])',
      },
    },
    required: ['title', 'content'],
  },
};

/**
 * Schema for the memvid_search tool
 */
export const searchToolSchema = {
  name: 'memvid_search',
  description: 'Search the agent\'s memory using keywords. Returns relevant memory entries matching the search query. Use this to recall specific information that was previously stored.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query - keywords or phrases to find in memory',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)',
      },
      label: {
        type: 'string',
        description: 'Optional: filter results by label (e.g., "user-preference", "decision")',
      },
    },
    required: ['query'],
  },
};

/**
 * Schema for the memvid_ask tool
 */
export const askToolSchema = {
  name: 'memvid_ask',
  description: 'Ask a natural language question about the agent\'s stored memories. Uses RAG (Retrieval Augmented Generation) to synthesize an answer from relevant memory entries. Best for complex queries that require understanding context.',
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The question to ask about stored memories (e.g., "What are the user\'s coding preferences?", "What decisions were made about the database?")',
      },
      contextLimit: {
        type: 'number',
        description: 'Number of memory entries to use as context for answering (default: 5)',
      },
    },
    required: ['question'],
  },
};

/**
 * Schema for the memvid_timeline tool
 */
export const timelineToolSchema = {
  name: 'memvid_timeline',
  description: 'Retrieve recent memory entries in chronological order. Useful for understanding recent context, reviewing what was discussed, or getting a history of stored information.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of entries to return (default: 20)',
      },
    },
    required: [],
  },
};

/**
 * Schema for the memvid_stats tool
 */
export const statsToolSchema = {
  name: 'memvid_stats',
  description: 'Get statistics about the agent\'s memory, including total number of entries, storage size, and available labels. Useful for understanding the current state of the memory.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

/**
 * All available tool schemas
 */
export const allToolSchemas = [
  storeToolSchema,
  searchToolSchema,
  askToolSchema,
  timelineToolSchema,
  statsToolSchema,
];

/** Tool schema type */
export type ToolSchema = typeof storeToolSchema | typeof searchToolSchema | typeof askToolSchema | typeof timelineToolSchema | typeof statsToolSchema;

/**
 * Get a tool schema by name
 * @param name - Tool name
 * @returns Tool schema or undefined
 */
export function getToolSchema(name: string): ToolSchema | undefined {
  return allToolSchemas.find(schema => schema.name === name) as ToolSchema | undefined;
}
