import React from 'react';
import { GitHubUser } from '../../stores/githubStore';
import { User, Star, GitFork, ExternalLink } from 'lucide-react';

interface UserProfileProps {
  user: GitHubUser;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start space-x-4">
        <img
          src={user.avatar_url}
          alt={`${user.login}'s avatar`}
          className="w-16 h-16 rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="text-lg font-semibold text-white">
              {user.name || user.login}
            </h4>
            <a
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink size={16} />
            </a>
          </div>
          {user.name && (
            <p className="text-gray-400 text-sm">@{user.login}</p>
          )}
          {user.email && (
            <p className="text-gray-400 text-sm">{user.email}</p>
          )}
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <User size={14} />
              <span>{user.public_repos} repos</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star size={14} />
              <span>{user.followers} followers</span>
            </div>
            <div className="flex items-center space-x-1">
              <GitFork size={14} />
              <span>{user.following} following</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;