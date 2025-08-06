import React, { useState, useEffect } from 'react';
import { Github, Key, Bell, Palette, Loader2 } from 'lucide-react';
import { useGitHubStore } from '../stores/githubStore';
import TokenInput from '../components/github/TokenInput';
import AuthenticationStatus from '../components/github/AuthenticationStatus';
import UserProfile from '../components/github/UserProfile';
import TokenInstructions from '../components/github/TokenInstructions';

const Settings: React.FC = () => {
  const {
    isAuthenticated,
    user,
    loading,
    error,
    checkingAuth,
    oauthLoading,
    authenticate,
    logout,
    checkAuthStatus,
    clearError,
    startOAuth,
  } = useGitHubStore();
  
  const [token, setToken] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);


  const handleAuthenticate = async () => {
    if (!token.trim()) return;
    
    const success = await authenticate(token);
    if (success) {
      setToken('');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleOAuth = async () => {
    try {
      await startOAuth();
    } catch (error) {
      console.error('OAuth start failed:', error);
    }
  };

  const handleTokenChange = (newToken: string) => {
    setToken(newToken);
    if (error) {
      clearError();
    }
  };

  const renderGitHubSection = () => {
    if (checkingAuth) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <span className="ml-2 text-gray-400">Checking authentication status...</span>
        </div>
      );
    }

    if (isAuthenticated && user) {
      return (
        <div className="space-y-4">
          <AuthenticationStatus 
            isAuthenticated={isAuthenticated} 
            loading={loading} 
            error={error} 
          />
          <UserProfile user={user} />
          <button
            onClick={handleLogout}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <span>Disconnect Account</span>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <AuthenticationStatus 
          isAuthenticated={isAuthenticated} 
          loading={loading} 
          error={error} 
        />
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-white font-medium mb-2">Recommended: OAuth Authentication</h4>
          <p className="text-gray-400 text-sm mb-3">
            Securely connect with GitHub using OAuth flow
          </p>
          <button
            onClick={handleOAuth}
            disabled={oauthLoading || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {oauthLoading && <Loader2 size={16} className="animate-spin" />}
            <span>{oauthLoading ? 'Opening browser...' : 'Connect GitHub Account'}</span>
          </button>
        </div>
        
        <div className="text-center text-gray-500 text-sm">
          <span>or</span>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-white font-medium mb-2">Manual Token Authentication</h4>
          <p className="text-gray-400 text-sm mb-3">
            Use a personal access token for immediate access
          </p>
          <p className="text-yellow-400 text-xs mb-3">
            ⚠️ For manual token setup, use the Authentication section below
          </p>
        </div>
      </div>
    );
  };

  const renderAuthenticationSection = () => {
    if (checkingAuth) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="animate-spin text-gray-400" />
          <span className="ml-2 text-gray-400">Checking authentication...</span>
        </div>
      );
    }

    if (isAuthenticated && user) {
      return (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-400 text-sm font-medium">GitHub Token Active</span>
            </div>
            <p className="text-gray-400 text-sm">
              Your GitHub personal access token is configured and working
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <TokenInput
            value={token}
            onChange={handleTokenChange}
            disabled={loading}
            error={error}
            placeholder="Enter your GitHub personal access token"
          />
          <button
            onClick={handleAuthenticate}
            disabled={loading || !token.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <span>{loading ? 'Authenticating...' : 'Authenticate with Token'}</span>
          </button>
        </div>
        
        <TokenInstructions />
      </div>
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
      
      <div className="space-y-6">
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Github className="text-blue-500" size={24} />
            <h3 className="text-lg font-semibold text-white">GitHub Integration</h3>
          </div>
          <p className="text-gray-400 mb-6">Connect your GitHub account to enable advanced features</p>
          
          {renderGitHubSection()}
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Key className="text-green-500" size={24} />
            <h3 className="text-lg font-semibold text-white">Authentication</h3>
          </div>
          <p className="text-gray-400 mb-6">Configure GitHub personal access tokens and manage credentials</p>
          
          {renderAuthenticationSection()}
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="text-yellow-500" size={24} />
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
          </div>
          <p className="text-gray-400 mb-4">Configure how you receive notifications</p>
          <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Notification Settings
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Palette className="text-purple-500" size={24} />
            <h3 className="text-lg font-semibold text-white">Appearance</h3>
          </div>
          <p className="text-gray-400 mb-4">Customize the look and feel of Reef</p>
          <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Theme Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;