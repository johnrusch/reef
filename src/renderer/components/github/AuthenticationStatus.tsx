import React from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AuthenticationStatusProps {
  isAuthenticated: boolean;
  loading: boolean;
  error?: string | null;
}

const AuthenticationStatus: React.FC<AuthenticationStatusProps> = ({
  isAuthenticated,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Checking authentication...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-400">
        <XCircle size={16} />
        <span className="text-sm">Authentication failed</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center space-x-2 text-green-400">
        <CheckCircle size={16} />
        <span className="text-sm">Connected to GitHub</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-gray-400">
      <XCircle size={16} />
      <span className="text-sm">Not connected</span>
    </div>
  );
};

export default AuthenticationStatus;