import React from 'react';
import { useParams } from 'react-router-dom';
import { useRepositoryStore } from '../stores/repositoryStore';

const RepositoryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { repositories } = useRepositoryStore();
  
  const repository = repositories.find(r => r.id === id);

  if (!repository) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Repository not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">{repository.name}</h2>
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
        <p className="text-gray-400">Repository details coming soon...</p>
      </div>
    </div>
  );
};

export default RepositoryView;