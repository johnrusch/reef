import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
}

const TokenInput: React.FC<TokenInputProps> = ({
  value,
  onChange,
  placeholder = "Enter your GitHub personal access token",
  disabled = false,
  error = null,
}) => {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type={showToken ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
            error 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShowToken(!showToken)}
          disabled={disabled}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
};

export default TokenInput;