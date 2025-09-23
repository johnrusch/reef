/**
 * Component Integration Contracts
 * 
 * These interfaces define how React components should integrate with the
 * GitHub URL utilities for external link functionality.
 */

/**
 * Props for external link components that navigate to GitHub
 */
export interface ExternalLinkProps {
  /** The target GitHub URL */
  href: string;
  
  /** Link text or children */
  children: React.ReactNode;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Whether the link should be disabled if URL is invalid */
  disableIfInvalid?: boolean;
}

/**
 * Props for GitHub dashboard components
 */
export interface GitHubDashboardProps {
  /** Repository information */
  repository: {
    /** Git remote URL (any format) */
    remoteUrl: string;
    
    /** Repository name for display */
    name: string;
  };
}

/**
 * Props for GitHub widget components (PRs, Issues, Actions)
 */
export interface GitHubWidgetProps {
  /** Repository git remote URL */
  repoUrl: string;
  
  /** Widget title */
  title: string;
  
  /** Items to display with external links */
  items: Array<{
    /** Item ID (PR/issue number, workflow run ID) */
    id: number;
    
    /** Item title */
    title: string;
    
    /** GitHub API provided html_url (fallback) */
    html_url?: string;
  }>;
  
  /** Type of GitHub content */
  contentType: 'pulls' | 'issues' | 'actions';
}

/**
 * Hook interface for GitHub URL functionality
 */
export interface UseGitHubUrlHook {
  /**
   * Parse a git remote URL and return GitHub web URL
   * @param gitUrl - Raw git remote URL
   * @returns Parsed GitHub web URL or null
   */
  parseGitUrl: (gitUrl: string) => string | null;
  
  /**
   * Generate external link for specific GitHub page
   * @param baseUrl - Repository base URL
   * @param linkType - Type of GitHub page
   * @param itemId - Optional item ID
   * @returns External link URL or null
   */
  generateLink: (
    baseUrl: string, 
    linkType: import('./githubUrl').GitHubLinkType, 
    itemId?: number
  ) => string | null;
  
  /**
   * Check if a URL is a valid GitHub URL
   * @param url - URL to validate
   * @returns Whether URL is valid
   */
  isValidGitHubUrl: (url: string) => boolean;
}