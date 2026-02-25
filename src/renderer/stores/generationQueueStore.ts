import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GenerationProgress, GenerationComplete } from '@shared/types/generationQueue';

interface GenerationJob {
  repoPath: string;
  repoName: string;
  percent: number;
  currentLevel: string;
  status: 'queued' | 'running' | 'complete' | 'error' | 'cancelled';
  errorMessage?: string;
}

interface GenerationQueueStore {
  /** Active jobs indexed by repoPath */
  jobs: Map<string, GenerationJob>;
  /** Whether there are any active (running/queued) jobs */
  hasActiveJobs: () => boolean;
  /** Get the first active job (for status bar display) */
  getActiveJob: () => GenerationJob | undefined;
  /** Set progress from IPC event */
  setProgress: (data: GenerationProgress) => void;
  /** Set completion from IPC event */
  setComplete: (data: GenerationComplete) => void;
  /** Mark job as cancelled */
  setCancelled: (repoPath: string) => void;
  /** Remove a completed/error/cancelled job from the map */
  dismissJob: (repoPath: string) => void;
  /** Add a new queued job (called when user clicks Generate Now) */
  addJob: (repoPath: string, repoName: string) => void;
}

export const useGenerationQueueStore = create<GenerationQueueStore>()(
  devtools(
    (set, get) => ({
      jobs: new Map(),

      hasActiveJobs: () => {
        for (const job of get().jobs.values()) {
          if (job.status === 'queued' || job.status === 'running') {
            return true;
          }
        }
        return false;
      },

      getActiveJob: () => {
        for (const job of get().jobs.values()) {
          if (job.status === 'queued' || job.status === 'running') {
            return job;
          }
        }
        return undefined;
      },

      setProgress: (data: GenerationProgress) => {
        set((prev) => {
          const newJobs = new Map(prev.jobs);
          const existing = newJobs.get(data.repoPath);
          newJobs.set(data.repoPath, {
            repoPath: data.repoPath,
            repoName: data.repoName,
            percent: data.percent,
            currentLevel: data.currentLevel,
            status: 'running',
            errorMessage: existing?.errorMessage,
          });
          return { jobs: newJobs };
        });
      },

      setComplete: (data: GenerationComplete) => {
        set((prev) => {
          const newJobs = new Map(prev.jobs);
          const existing = newJobs.get(data.repoPath);
          if (existing) {
            newJobs.set(data.repoPath, {
              ...existing,
              status: data.success ? 'complete' : 'error',
              percent: 100,
              errorMessage: data.errorMessage,
            });
          }
          return { jobs: newJobs };
        });
      },

      setCancelled: (repoPath: string) => {
        set((prev) => {
          const newJobs = new Map(prev.jobs);
          const existing = newJobs.get(repoPath);
          if (existing) {
            newJobs.set(repoPath, {
              ...existing,
              status: 'cancelled',
            });
          }
          return { jobs: newJobs };
        });
      },

      dismissJob: (repoPath: string) => {
        set((prev) => {
          const newJobs = new Map(prev.jobs);
          newJobs.delete(repoPath);
          return { jobs: newJobs };
        });
      },

      addJob: (repoPath: string, repoName: string) => {
        set((prev) => {
          const newJobs = new Map(prev.jobs);
          newJobs.set(repoPath, {
            repoPath,
            repoName,
            percent: 0,
            currentLevel: '',
            status: 'queued',
          });
          return { jobs: newJobs };
        });
      },
    }),
    { name: 'generation-queue' }
  )
);
