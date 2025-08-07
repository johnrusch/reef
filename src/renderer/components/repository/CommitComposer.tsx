import React, { useState } from 'react';
import { GitCommit, Info, ChevronDown } from 'lucide-react';

interface CommitComposerProps {
  stagedCount: number;
  conventionalCommits?: boolean;
  onCommit: (message: string, type?: string) => Promise<void>;
}

const commitTypes = [
  { value: 'feat', label: 'feat', description: 'A new feature' },
  { value: 'fix', label: 'fix', description: 'A bug fix' },
  { value: 'docs', label: 'docs', description: 'Documentation only changes' },
  { value: 'style', label: 'style', description: 'Changes that do not affect the meaning of the code' },
  { value: 'refactor', label: 'refactor', description: 'A code change that neither fixes a bug nor adds a feature' },
  { value: 'perf', label: 'perf', description: 'A code change that improves performance' },
  { value: 'test', label: 'test', description: 'Adding missing tests or correcting existing tests' },
  { value: 'build', label: 'build', description: 'Changes that affect the build system or external dependencies' },
  { value: 'ci', label: 'ci', description: 'Changes to CI configuration files and scripts' },
  { value: 'chore', label: 'chore', description: 'Other changes that don\'t modify src or test files' },
  { value: 'revert', label: 'revert', description: 'Reverts a previous commit' },
];

export const CommitComposer: React.FC<CommitComposerProps> = ({
  stagedCount,
  conventionalCommits = false,
  onCommit,
}) => {
  const [message, setMessage] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState('feat');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [isAmending, setIsAmending] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || stagedCount === 0) return;

    setIsCommitting(true);
    try {
      let fullMessage = message;
      if (conventionalCommits && selectedType) {
        fullMessage = `${selectedType}: ${message}`;
      }
      if (description.trim()) {
        fullMessage += `\n\n${description}`;
      }
      
      await onCommit(fullMessage, selectedType);
      setMessage('');
      setDescription('');
      setSelectedType('feat');
    } finally {
      setIsCommitting(false);
    }
  };

  const selectedTypeInfo = commitTypes.find(t => t.value === selectedType);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <GitCommit className="w-5 h-5" />
          <span>Commit</span>
        </h3>
        <div className="flex items-center space-x-2">
          {stagedCount > 0 ? (
            <span className="text-sm text-green-400">
              {stagedCount} file{stagedCount !== 1 ? 's' : ''} staged
            </span>
          ) : (
            <span className="text-sm text-gray-500">No files staged</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {conventionalCommits && (
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Commit Type</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-700 rounded hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-white">{selectedType}</span>
                  <span className="text-xs text-gray-500">{selectedTypeInfo?.description}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showTypeDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg max-h-64 overflow-auto">
                  {commitTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setSelectedType(type.value);
                        setShowTypeDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors ${
                        selectedType === type.value ? 'bg-gray-700' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{type.label}</span>
                        <span className="text-xs text-gray-500">{type.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="commit-message" className="text-sm text-gray-400">
            Commit Message
          </label>
          <input
            id="commit-message"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={conventionalCommits ? "Short description (imperative mood)" : "Enter commit message"}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={stagedCount === 0}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="commit-description" className="text-sm text-gray-400">
            Description (optional)
          </label>
          <textarea
            id="commit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a longer description..."
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={stagedCount === 0}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isAmending}
              onChange={(e) => setIsAmending(e.target.checked)}
              className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              disabled={stagedCount === 0}
            />
            <span className="text-sm text-gray-400">Amend previous commit</span>
          </label>

          <div className="flex items-center space-x-2">
            {conventionalCommits && (
              <div className="flex items-center text-xs text-gray-500">
                <Info className="w-3 h-3 mr-1" />
                <span>Conventional Commits</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!message.trim() || stagedCount === 0 || isCommitting}
          className={`w-full py-2 px-4 rounded font-medium transition-colors ${
            !message.trim() || stagedCount === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isCommitting ? 'Committing...' : isAmending ? 'Amend Commit' : 'Commit'}
        </button>
      </form>
    </div>
  );
};