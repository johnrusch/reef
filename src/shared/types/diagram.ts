export interface DiagramOptions {
  type: 'component' | 'class' | 'sequence' | 'c4-context' | 'c4-container' | 'c4-component' | 'c4-code';
  detailLevel: 'overview' | 'detailed';
  focusArea?: 'api' | 'database' | 'business-logic';
  /**
   * Element ID for drill-down navigation (optional)
   * When specified, generates a focused diagram centered on this element
   */
  elementId?: string;
}

export interface DiagramResult {
  success: boolean;
  diagram?: string;
  error?: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
  /**
   * Analysis coverage statistics (optional)
   * Useful for understanding how much of the codebase was analyzed
   */
  coverage?: {
    analyzedFiles: number;
    totalFiles: number;
    percentage: number;
  };
}

export interface ExtractorOptions {
  maxTokens?: number;
  includeTests?: boolean;
  focusArea?: 'api' | 'database' | 'business-logic';
}

export interface ExtractionResult {
  files: Array<{
    path: string;
    content: string;
    size: number;
    priority: 'critical' | 'important' | 'optional';
  }>;
  totalSize: number;
  estimatedTokens: number;
  truncated: boolean;
  formattedContext?: string;
}