# Data Model: Fix External GitHub Links in Repository Management

**Feature**: Fix External GitHub Links in Repository Management  
**Date**: 2025-09-03  
**Status**: Complete

## Core Entities

### GitHubUrlInput
Raw git remote URL that needs parsing and validation.

**Attributes**:
- `rawUrl: string` - The original git remote URL from repository configuration
- `source: 'ssh' | 'https' | 'git' | 'unknown'` - Detected URL format type

**Validation Rules**:
- Must be non-empty string
- Must contain 'github.com' domain
- Should match at least one known git URL format

**State Transitions**:
- Input → Parsing → Valid/Invalid

### GitHubWebUrl
Clean, browser-ready GitHub URL for external navigation.

**Attributes**:
- `webUrl: string` - Clean HTTPS GitHub URL (e.g., 'https://github.com/owner/repo')
- `owner: string` - Repository owner/organization name
- `repo: string` - Repository name
- `isValid: boolean` - Whether the URL was successfully parsed

**Validation Rules**:
- Must start with 'https://github.com/'
- Must have valid owner/repo format
- Must not contain authentication tokens or .git suffix

### ExternalLinkTarget
Specific GitHub page destinations for navigation.

**Attributes**:
- `baseUrl: string` - Repository base URL
- `linkType: 'repository' | 'pulls' | 'issues' | 'actions' | 'pull' | 'issue' | 'workflow'` - Type of GitHub page
- `itemId?: number` - Specific item ID for individual items (PR/issue number)
- `finalUrl: string` - Complete navigation URL

**Relationships**:
- Derived from GitHubWebUrl
- Used by React components for external link rendering

## Data Flow

```
GitHubUrlInput → [parseGitHubUrl] → GitHubWebUrl → [generateExternalLink] → ExternalLinkTarget
```

### Parsing Logic

1. **Input Detection**: Identify URL format (SSH, HTTPS, git protocol)
2. **Pattern Matching**: Extract owner/repo using regex patterns
3. **Validation**: Verify extracted components are valid
4. **URL Construction**: Build clean HTTPS web URL
5. **Link Generation**: Create specific navigation URLs based on target type

### Error States

- **ParseError**: Invalid or unrecognized URL format
- **ValidationError**: Malformed owner/repo components  
- **SecurityError**: URLs containing suspicious patterns

## Integration Points

### Repository Store
- `repositoryStore.ts` - Source of git remote URLs
- Needs integration with new URL parsing utility
- Should cache parsed results for performance

### UI Components
- `GitHubDashboard.tsx` - Repository "Open in GitHub" link
- `PullRequestsWidget.tsx` - PR "View all" and individual links
- `IssuesWidget.tsx` - Issues "View all" and individual links  
- `ActionsWidget.tsx` - Actions "View all" and workflow links

### Utility Functions
- `src/renderer/utils/githubUrl.ts` - Core parsing and validation logic
- Pure functions for testability and reusability

## Performance Considerations

- **Caching**: Parsed URLs cached in repository store
- **Lazy Parsing**: Only parse when external links are accessed
- **Validation**: Fast regex-based validation (sub-millisecond)
- **Memory**: Minimal memory footprint for parsed URL objects

## Security Considerations

- **Token Stripping**: Remove authentication tokens from URLs
- **Validation**: Prevent malicious URL construction
- **External Navigation**: All links open in new browser tabs (not Electron webview)