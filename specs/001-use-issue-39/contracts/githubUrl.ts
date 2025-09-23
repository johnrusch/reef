/**
 * GitHub URL Utility Contracts
 * 
 * These interfaces define the contract for GitHub URL parsing and validation
 * utilities. All implementations must conform to these contracts.
 */

/**
 * Supported Git URL formats for GitHub repositories
 */
export type GitUrlFormat = 'ssh' | 'https' | 'git' | 'unknown';

/**
 * Types of GitHub pages that can be linked to
 */
export type GitHubLinkType = 
  | 'repository'    // Base repository page
  | 'pulls'         // All pull requests
  | 'issues'        // All issues  
  | 'actions'       // All workflow runs
  | 'pull'          // Specific pull request
  | 'issue'         // Specific issue
  | 'workflow';     // Specific workflow run

/**
 * Result of parsing a git remote URL
 */
export interface GitHubUrlParseResult {
  /** The clean HTTPS GitHub URL, or null if parsing failed */
  webUrl: string | null;
  
  /** Repository owner/organization name */
  owner: string | null;
  
  /** Repository name */
  repo: string | null;
  
  /** Whether the URL was successfully parsed */
  isValid: boolean;
  
  /** Original URL format detected */
  format: GitUrlFormat;
  
  /** Error message if parsing failed */
  error?: string;
}

/**
 * Repository information extracted from GitHub URL
 */
export interface GitHubRepoInfo {
  /** Repository owner/organization name */
  owner: string;
  
  /** Repository name */
  repo: string;
}

/**
 * Contract for parsing GitHub URLs from git remote URLs
 * 
 * @param gitUrl - Raw git remote URL (SSH, HTTPS, git protocol)
 * @returns Parse result with web URL or null if invalid
 */
export interface GitHubUrlParser {
  parseGitHubUrl(gitUrl: string): GitHubUrlParseResult;
  
  /**
   * Ensure a URL is a valid GitHub web URL
   * @param url - URL to validate and clean
   * @returns Clean GitHub web URL or null if invalid
   */
  ensureValidGitHubUrl(url: string): string | null;
  
  /**
   * Extract owner and repo from GitHub URL
   * @param url - GitHub web URL
   * @returns Repository info or null if extraction fails
   */
  extractRepoInfo(url: string): GitHubRepoInfo | null;
}

/**
 * Contract for generating external GitHub links
 * 
 * @param baseUrl - Clean GitHub repository URL
 * @param linkType - Type of link to generate
 * @param itemId - Item ID for specific items (PR/issue number)
 * @returns Complete external link URL
 */
export interface GitHubLinkGenerator {
  generateExternalLink(
    baseUrl: string, 
    linkType: GitHubLinkType, 
    itemId?: number
  ): string | null;
}

/**
 * Complete GitHub URL utility interface
 * Combines parsing and link generation functionality
 */
export interface GitHubUrlUtils extends GitHubUrlParser, GitHubLinkGenerator {}