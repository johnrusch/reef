import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useRepositoryStore } from './stores/repositoryStore';
import MainLayout from './components/layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import RepositoryView from './pages/RepositoryView';
import WorkspaceManager from './pages/WorkspaceManager';
import Settings from './pages/Settings';

function App() {
  const { loadWorkspaces } = useWorkspaceStore();
  const { loadRepositories } = useRepositoryStore();

  useEffect(() => {
    loadWorkspaces();
    loadRepositories();
  }, [loadWorkspaces, loadRepositories]);

  useEffect(() => {
    window.reef.ipc.on('add-repository', () => {
      console.log('Add repository triggered');
    });

    window.reef.ipc.on('clone-repository', () => {
      console.log('Clone repository triggered');
    });

    window.reef.ipc.on('new-workspace', () => {
      console.log('New workspace triggered');
    });

    window.reef.ipc.on('open-workspace', () => {
      console.log('Open workspace triggered');
    });

    window.reef.ipc.on('show-preferences', () => {
      console.log('Show preferences triggered');
    });

    return () => {
      window.reef.ipc.off('add-repository', () => {});
      window.reef.ipc.off('clone-repository', () => {});
      window.reef.ipc.off('new-workspace', () => {});
      window.reef.ipc.off('open-workspace', () => {});
      window.reef.ipc.off('show-preferences', () => {});
    };
  }, []);

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/repository/:id" element={<RepositoryView />} />
        <Route path="/workspaces" element={<WorkspaceManager />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MainLayout>
  );
}

export default App;