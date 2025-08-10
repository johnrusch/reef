export interface DiagramOptions {
  type: 'component' | 'class' | 'sequence';
  detailLevel: 'overview' | 'detailed';
  focusArea?: 'api' | 'database' | 'business-logic';
}

export interface DiagramResult {
  success: boolean;
  diagram?: string;
  error?: string;
  tokensUsed?: {
    input: number;
    output: number;
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