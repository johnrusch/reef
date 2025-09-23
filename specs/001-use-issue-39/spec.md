# Feature Specification: Fix External GitHub Links in Repository Management

**Feature Branch**: `001-use-issue-39`  
**Created**: 2025-09-03  
**Status**: Draft  
**Input**: User description: "use issue #39 from this github repo for information on this session of work"

## Execution Flow (main)
```
1. Parse user description from Input
   → Extracted GitHub issue #39 details for external link bug fix
2. Extract key concepts from description
   → Identified: broken external links, URL parsing, GitHub navigation
3. For each unclear aspect:
   → All aspects clear from detailed issue description
4. Fill User Scenarios & Testing section
   → User flow: navigate from Reef to GitHub for PRs/Issues/Actions
5. Generate Functional Requirements
   → Each requirement testable via link clicks and navigation
6. Identify Key Entities (if data involved)
   → Repository URLs, GitHub links, navigation destinations
7. Run Review Checklist
   → No tech details in requirements, focused on user experience
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
Users working with repositories in Reef need to quickly navigate to corresponding GitHub pages to perform actions like reviewing pull requests, checking issues, or monitoring workflow runs. When they click external link buttons or "View all" links in the Repository Management tab, they expect to be taken directly to the correct GitHub page without encountering broken links or 404 errors.

### Acceptance Scenarios
1. **Given** a repository is loaded in Reef with an SSH remote URL, **When** user clicks "Open in GitHub" in the Repository tab, **Then** they are taken to the correct GitHub repository page
2. **Given** the Repository Management tab is open, **When** user clicks "View all" for Pull Requests, **Then** they are taken to the repository's pull requests page on GitHub
3. **Given** there are pull requests listed in the PR widget, **When** user clicks an external link icon next to a specific PR, **Then** they are taken to that specific pull request on GitHub
4. **Given** there are issues listed in the Issues widget, **When** user clicks "View all" for Issues, **Then** they are taken to the repository's issues page on GitHub
5. **Given** there are workflow runs listed in the Actions widget, **When** user clicks "View all" for Actions, **Then** they are taken to the repository's actions page on GitHub

### Edge Cases
- What happens when repository uses non-standard SSH port or custom GitHub enterprise URL?
- How does system handle repositories with authentication tokens in the remote URL?
- What happens when GitHub API returns malformed html_url values for individual items?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST correctly parse SSH format GitHub URLs (git@github.com:owner/repo.git) into valid web URLs
- **FR-002**: System MUST correctly parse HTTPS GitHub URLs with authentication tokens into clean web URLs  
- **FR-003**: System MUST correctly parse git protocol URLs into valid HTTPS web URLs
- **FR-004**: System MUST preserve already-correct HTTPS GitHub URLs without modification
- **FR-005**: Repository "Open in GitHub" link MUST navigate to the correct repository homepage
- **FR-006**: Pull Requests "View all" link MUST navigate to the repository's pulls page (/pulls)
- **FR-007**: Individual pull request external links MUST navigate to the specific pull request page (/pull/{number})
- **FR-008**: Issues "View all" link MUST navigate to the repository's issues page (/issues)
- **FR-009**: Individual issue external links MUST navigate to the specific issue page (/issues/{number})
- **FR-010**: Actions "View all" link MUST navigate to the repository's actions page (/actions)
- **FR-011**: Individual workflow run external links MUST navigate to the correct GitHub workflow run page
- **FR-012**: System MUST handle invalid or unparseable URLs gracefully by not displaying broken links
- **FR-013**: All external links MUST open in new browser tabs/windows to preserve Reef application state

### Key Entities
- **Repository Remote URL**: The git remote URL in various formats (SSH, HTTPS, git protocol) that needs parsing into GitHub web URL
- **GitHub Web URL**: The canonical HTTPS URL format for accessing GitHub pages in a web browser
- **External Navigation Target**: The specific GitHub page type (repository, pulls, issues, actions, individual items) that users want to access

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---