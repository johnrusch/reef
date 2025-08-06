import React from 'react';
import { Github, Key, Bell, Palette } from 'lucide-react';

const Settings: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
      
      <div className="space-y-6">
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Github className="text-blue-500" size={24} />
            <h3 className="text-lg font-semibold text-white">GitHub Integration</h3>
          </div>
          <p className="text-gray-400 mb-4">Connect your GitHub account to enable advanced features</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Connect GitHub Account
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Key className="text-green-500" size={24} />
            <h3 className="text-lg font-semibold text-white">Authentication</h3>
          </div>
          <p className="text-gray-400 mb-4">Manage your authentication tokens and SSH keys</p>
          <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Manage Credentials
          </button>
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