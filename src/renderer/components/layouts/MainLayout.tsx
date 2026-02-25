import React, { useEffect } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { GenerationStatusBar } from '../GenerationStatusBar';
import { ToastContainer } from '../ToastContainer';
import { useGenerationQueueStore } from '../../stores/generationQueueStore';
import { useToastStore } from '../../stores/toastStore';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  useEffect(() => {
    // Subscribe to generation progress events
    const unsubProgress = window.reef.c4Generation.onProgress((_event, data) => {
      useGenerationQueueStore.getState().setProgress(data);
    });

    // Subscribe to generation completion events
    const unsubComplete = window.reef.c4Generation.onComplete((_event, data) => {
      useGenerationQueueStore.getState().setComplete(data);
      const { addToast } = useToastStore.getState();

      if (data.success) {
        addToast({
          type: 'success',
          message: `Diagrams ready for ${data.repoName}`,
          duration: 5000, // Auto-dismiss after 5 seconds
        });
        // Auto-dismiss the completed job from status bar after a short delay
        setTimeout(() => useGenerationQueueStore.getState().dismissJob(data.repoPath), 2000);
      } else {
        const partialMsg =
          data.completedLevels.length > 0
            ? ` (${data.completedLevels.join(', ')} levels completed)`
            : '';
        addToast({
          type: 'error',
          message: `Generation failed for ${data.repoName}${partialMsg}`,
          duration: 0, // Error toasts do NOT auto-dismiss
          action: {
            label: 'Retry',
            onClick: () => {
              useGenerationQueueStore.getState().addJob(data.repoPath, data.repoName);
              void window.reef.c4Generation.enqueue(data.repoPath, data.repoName);
            },
          },
        });
      }
    });

    // Subscribe to cancellation events
    const unsubCancelled = window.reef.c4Generation.onCancelled((_event, data) => {
      useGenerationQueueStore.getState().setCancelled(data.repoPath);
      useToastStore.getState().addToast({
        type: 'info',
        message: `Generation cancelled for ${data.repoName}`,
        duration: 3000,
      });
      // Remove from status bar
      setTimeout(() => useGenerationQueueStore.getState().dismissJob(data.repoPath), 1000);
    });

    return () => {
      unsubProgress();
      unsubComplete();
      unsubCancelled();
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto bg-gray-800 pb-10">
          {children}
        </main>
      </div>
      <GenerationStatusBar />
      <ToastContainer />
    </div>
  );
};

export default MainLayout;
