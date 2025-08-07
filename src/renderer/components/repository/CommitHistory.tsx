import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GitCommit, Search, Calendar, User, Copy, ExternalLink } from 'lucide-react';

interface Commit {
  hash: string;
  author: {
    name: string;
    email: string;
  };
  date: string;
  message: string;
  refs?: string;
  body?: string;
}

interface CommitHistoryProps {
  commits: Commit[];
  loading?: boolean;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  onViewCommit?: (commit: Commit) => void;
}

export const CommitHistory: React.FC<CommitHistoryProps> = ({
  commits,
  loading = false,
  onLoadMore,
  hasMore = false,
  onViewCommit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const filteredCommits = commits.filter((commit) => {
    const matchesSearch = searchQuery
      ? commit.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commit.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commit.author.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const matchesAuthor = selectedAuthor
      ? commit.author.email === selectedAuthor
      : true;
    
    return matchesSearch && matchesAuthor;
  });

  const uniqueAuthors = Array.from(
    new Set(commits.map((c) => c.author.email))
  ).map((email) => {
    const author = commits.find((c) => c.author.email === email)?.author;
    return author;
  }).filter(Boolean);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [handleLoadMore]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center space-x-2">
            <GitCommit className="w-4 h-4" />
            <span>Commit History</span>
            <span className="text-gray-500 text-sm">({commits.length})</span>
          </h3>
        </div>

        {/* Filters */}
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commits..."
              className="w-full bg-gray-800 text-white pl-9 pr-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
          {uniqueAuthors.length > 1 && (
            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
            >
              <option value="">All authors</option>
              {uniqueAuthors.map((author) => (
                <option key={author!.email} value={author!.email}>
                  {author!.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Commit List */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredCommits.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <GitCommit className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{searchQuery || selectedAuthor ? 'No matching commits' : 'No commits yet'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredCommits.map((commit) => (
              <div
                key={commit.hash}
                className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
                onClick={() => onViewCommit?.(commit)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-4">
                    <p className="text-white font-medium line-clamp-1">
                      {commit.message}
                    </p>
                    {commit.refs && (
                      <div className="mt-1">
                        {commit.refs.split(', ').map((ref) => (
                          <span
                            key={ref}
                            className="inline-block px-2 py-0.5 text-xs rounded bg-blue-900/50 text-blue-300 mr-1"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyHash(commit.hash);
                      }}
                      className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                      title="Copy commit hash"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {onViewCommit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewCommit(commit);
                        }}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                        title="View commit details"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <code className="bg-gray-800 px-1.5 py-0.5 rounded">
                      {commit.hash.substring(0, 7)}
                    </code>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{commit.author.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(commit.date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Load More Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="p-4 text-center">
            {loading ? (
              <span className="text-gray-500 text-sm">Loading more commits...</span>
            ) : (
              <button
                onClick={handleLoadMore}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};