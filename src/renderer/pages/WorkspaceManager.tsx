import React from 'react';
import { Plus, FolderGit2, Trash2, Edit } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';

const WorkspaceManager: React.FC = () => {
  const { workspaces, setActiveWorkspace, deleteWorkspace } = useWorkspaceStore();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Workspaces</h2>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={18} />
          <span>New Workspace</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.length === 0 ? (
          <div className="col-span-full bg-gray-900 p-8 rounded-lg border border-gray-700 text-center">
            <FolderGit2 className="mx-auto text-gray-600 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No workspaces</h3>
            <p className="text-gray-500">
              Create a workspace to organize your repositories
            </p>
          </div>
        ) : (
          workspaces.map(workspace => (
            <div key={workspace.id} className="bg-gray-900 rounded-lg border border-gray-700 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{workspace.name}</h3>
                  {workspace.description && (
                    <p className="text-sm text-gray-400 mt-1">{workspace.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button className="p-1 text-gray-400 hover:text-white transition-colors">
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => deleteWorkspace(workspace.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 mb-3">
                {workspace.repositories.length} repositories
              </div>
              
              <button
                onClick={() => setActiveWorkspace(workspace)}
                className="w-full py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
              >
                Activate
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkspaceManager;