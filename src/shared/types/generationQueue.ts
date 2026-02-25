export type AutoGeneratePreference = 'prompt' | 'always' | 'never';

export interface GenerationProgress {
  repoPath: string;
  repoName: string;
  currentLevel: string;
  percent: number;
}

export interface GenerationComplete {
  repoPath: string;
  repoName: string;
  success: boolean;
  errorMessage?: string;
  completedLevels: string[];
}
