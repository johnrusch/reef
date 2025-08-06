import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
  email: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
}

interface GitHubState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  loading: boolean;
  error: string | null;
  checkingAuth: boolean;
  oauthLoading: boolean;
  authenticate: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
  startOAuth: () => Promise<void>;
}

export const useGitHubStore = create<GitHubState>()(
  devtools(
    (set) => ({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
      checkingAuth: false,
      oauthLoading: false,

      authenticate: async (token: string) => {
        if (!token || token.trim() === '') {
          set({ error: 'Token is required' });
          return false;
        }

        set({ loading: true, error: null });
        
        try {
          const success = await window.reef.github.authenticate(token);
          if (success) {
            const user = await window.reef.github.getUser();
            set({ 
              isAuthenticated: true, 
              user, 
              loading: false,
              error: null 
            });
            return true;
          } else {
            set({ 
              isAuthenticated: false, 
              user: null, 
              loading: false,
              error: 'Authentication failed' 
            });
            return false;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
          set({ 
            isAuthenticated: false, 
            user: null, 
            loading: false,
            error: errorMessage 
          });
          return false;
        }
      },

      logout: async () => {
        set({ loading: true, error: null });
        
        try {
          await window.reef.github.logout();
          set({ 
            isAuthenticated: false, 
            user: null, 
            loading: false,
            error: null 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Logout failed';
          set({ 
            loading: false,
            error: errorMessage 
          });
        }
      },

      checkAuthStatus: async () => {
        set({ checkingAuth: true, error: null });
        
        try {
          const user = await window.reef.github.getUser();
          set({ 
            isAuthenticated: true, 
            user, 
            checkingAuth: false,
            error: null 
          });
        } catch (error) {
          set({ 
            isAuthenticated: false, 
            user: null, 
            checkingAuth: false,
            error: null // Don't show error for failed auth check on startup
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      startOAuth: async () => {
        set({ oauthLoading: true, error: null });
        
        try {
          const user = await window.reef.github.startOAuth();
          set({ 
            isAuthenticated: true, 
            user, 
            oauthLoading: false,
            error: null 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'OAuth flow failed';
          set({ 
            isAuthenticated: false,
            user: null,
            oauthLoading: false,
            error: errorMessage 
          });
          throw error;
        }
      },
    }),
    {
      name: 'github-storage',
    }
  )
);