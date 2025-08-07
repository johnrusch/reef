import React, { useState } from 'react';
import { GitCommit, AlertCircle, Check } from 'lucide-react';

interface CommitInterfaceProps {
  stagedCount: number;
  onCommit: (message: string, amend?: boolean) => Promise<void>;
}

const COMMIT_TYPES = [
  { value: 'feat', label: 'Feature', description: 'A new feature' },
  { value: 'fix', label: 'Fix', description: 'A bug fix' },
  { value: 'docs', label: 'Docs', description: 'Documentation changes' },
  { value: 'style', label: 'Style', description: 'Code style changes' },
  { value: 'refactor', label: 'Refactor', description: 'Code refactoring' },
  { value: 'test', label: 'Test', description: 'Adding tests' },
  { value: 'chore', label: 'Chore', description: 'Maintenance tasks' },
];

export const CommitInterface: React.FC<CommitInterfaceProps> = ({
  stagedCount,
  onCommit,
}) => {
  const [message, setMessage] = useState('');
  const [description, setDescription] = useState('');
  const [useConventional, setUseConventional] = useState(false);
  const [commitType, setCommitType] = useState('feat');
  const [scope, setScope] = useState('');
  const [amendLast, setAmendLast] = useState(false);
  const [loading, setLoading] = useState(false);

  const characterCount = message.length;
  const hasValidMessage = message.trim().length >= 3;
  const canCommit = stagedCount > 0 && hasValidMessage && !loading;

  const buildCommitMessage = () => {
    if (!useConventional) {
      return description ? `${message}\n\n${description}` : message;
    }

    const type = commitType;
    const scopePart = scope ? `(${scope})` : '';
    const subject = message;
    const body = description ? `\n\n${description}` : '';
    
    return `${type}${scopePart}: ${subject}${body}`;
  };

  const handleCommit = async () => {
    if (!canCommit) return;

    setLoading(true);
    try {
      const fullMessage = buildCommitMessage();
      await onCommit(fullMessage, amendLast);
      setMessage('');
      setDescription('');
      setScope('');
      setAmendLast(false);
    } catch (error) {
      console.error('Commit failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center space-x-2">
          <GitCommit className="w-4 h-4" />
          <span>Commit Changes</span>
        </h3>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={useConventional}
              onChange={(e) => setUseConventional(e.target.checked)}
              className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span>Conventional</span>
          </label>
          <label className="flex items-center space-x-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={amendLast}
              onChange={(e) => setAmendLast(e.target.checked)}
              className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span>Amend last</span>
          </label>
        </div>
      </div>

      {stagedCount === 0 && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-800/50 rounded flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-300">
            No files staged for commit. Stage changes before committing.
          </p>
        </div>
      )}

      {useConventional && (
        <div className="mb-3 flex space-x-2">
          <select
            value={commitType}
            onChange={(e) => setCommitType(e.target.value)}
            className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
          >
            {COMMIT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} - {type.description}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Scope (optional)"
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-gray-400">
              {useConventional ? 'Subject' : 'Commit message'}
            </label>
            <span className={`text-xs ${characterCount > 50 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {characterCount}/50
            </span>
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={useConventional ? "Short description" : "Enter commit message..."}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleCommit();
              }
            }}
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description..."
            rows={3}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-gray-500">
            {stagedCount} file{stagedCount !== 1 ? 's' : ''} staged
          </div>
          <button
            onClick={handleCommit}
            disabled={!canCommit}
            className={`px-4 py-2 rounded font-medium transition-colors flex items-center space-x-2 ${
              canCommit
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{amendLast ? 'Amend Commit' : 'Commit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};