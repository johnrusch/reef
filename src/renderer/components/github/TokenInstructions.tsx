import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const TokenInstructions: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-750 transition-colors"
      >
        <span className="text-sm font-medium text-white">
          How to create a GitHub personal access token
        </span>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="text-sm text-gray-300 space-y-2">
            <p>Follow these steps to create a personal access token:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-400">
              <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
              <li>Click &quot;Generate new token&quot; (use Classic tokens for broader compatibility)</li>
              <li>Select the required scopes for Reef functionality</li>
              <li>Copy the generated token and paste it above</li>
            </ol>
          </div>
          
          <div className="border-t border-gray-700 pt-3">
            <h5 className="text-sm font-medium text-white mb-2">Recommended token scopes:</h5>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• <code className="bg-gray-900 px-1 rounded">repo</code> - Full repository access</li>
              <li>• <code className="bg-gray-900 px-1 rounded">user</code> - User profile information</li>
              <li>• <code className="bg-gray-900 px-1 rounded">workflow</code> - GitHub Actions access</li>
            </ul>
          </div>
          
          <div className="flex items-center space-x-2">
            <a
              href="https://github.com/settings/tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              <span>Create token on GitHub</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenInstructions;