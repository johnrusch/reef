import { Loader2, X } from 'lucide-react';
import { useGenerationQueueStore } from '../stores/generationQueueStore';

/**
 * GenerationStatusBar
 *
 * Fixed full-width bar at the bottom of the app that shows C4 diagram generation
 * progress. Hidden when no active jobs are running.
 *
 * Z-index: z-40 (below modals/toasts)
 */
export function GenerationStatusBar() {
  const { hasActiveJobs, getActiveJob, jobs } = useGenerationQueueStore();

  if (!hasActiveJobs()) {
    return null;
  }

  const activeJob = getActiveJob();
  if (!activeJob) {
    return null;
  }

  // Count all active jobs to show queue depth
  const activeJobCount = Array.from(jobs.values()).filter(
    (j) => j.status === 'queued' || j.status === 'running'
  ).length;

  const handleCancel = () => {
    window.reef.c4Generation.cancel(activeJob.repoPath);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-700 px-4 py-2">
      <div className="flex items-center">
        {/* Left: spinner + repo name */}
        <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
        <span className="text-sm text-gray-300 ml-2 whitespace-nowrap">
          Generating diagrams for <span className="font-medium text-gray-100">{activeJob.repoName}</span>
          {activeJob.currentLevel ? `  (${activeJob.currentLevel})` : ''}...
        </span>

        {/* Center: progress bar */}
        <div className="flex-1 mx-4 bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 rounded-full h-2 transition-all duration-300"
            style={{ width: `${activeJob.percent}%` }}
          />
        </div>

        {/* Percentage label */}
        <span className="text-sm text-gray-400 min-w-[3rem] text-right">{activeJob.percent}%</span>

        {/* Cancel button */}
        <button
          onClick={handleCancel}
          className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
          title="Cancel generation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Queue depth indicator */}
      {activeJobCount > 1 && (
        <p className="text-xs text-gray-500 mt-0.5 pl-6">
          + {activeJobCount - 1} more in queue
        </p>
      )}
    </div>
  );
}
