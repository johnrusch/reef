# Research: Fix External GitHub Links in Repository Management

**Feature**: Fix External GitHub Links in Repository Management  
**Date**: 2025-09-03  
**Status**: Complete

## Research Summary

All research questions resolved through existing codebase analysis and understanding existing tech stack.

## Testing Framework Setup

**Decision**: Add Vitest for unit testing  
**Rationale**: 
- Vitest is the modern testing framework for Vite-based projects
- Native TypeScript support without additional configuration
- Fast HMR-style test execution
- Compatible with existing Vite build system
- Minimal setup required

**Alternatives considered**:
- Jest: Requires additional TypeScript configuration, slower
- No testing: Violates constitution (testing is NON-NEGOTIABLE)

**Implementation**: Add vitest dev dependency, minimal vitest.config.ts

## URL Parsing Approach

**Decision**: Pure TypeScript utility functions with regex-based parsing  
**Rationale**:
- No external dependencies (meets constraint)
- Regex patterns handle all GitHub URL formats reliably
- Pure functions are easily testable
- TypeScript provides type safety

**Alternatives considered**:
- URL parsing libraries: Violates "no new dependencies" constraint
- Node.js URL class: Cannot handle SSH git URLs properly
- Simple string replacement: Fragile, already proven broken in existing code

## Component Integration Strategy

**Decision**: Utility functions with error boundaries  
**Rationale**:
- Utility functions can be tested independently
- Error boundaries prevent broken URLs from rendering
- Backward compatibility maintained
- Easy integration with existing React components

**Alternatives considered**:
- Direct component modification: Less testable, harder to maintain
- Store-level integration: Unnecessary complexity

## File Structure

**Decision**: Place utility in `src/renderer/utils/githubUrl.ts`  
**Rationale**:
- Follows existing codebase patterns
- Renderer-side utility (used by React components)
- Clear separation of concerns
- Easy to import and test

**Alternatives considered**:
- Shared utilities: Overkill for renderer-only functionality
- Component co-location: Reduces reusability

## Testing Strategy

**Decision**: Unit tests for utility functions, integration tests for components  
**Rationale**:
- Unit tests verify URL parsing logic comprehensively
- Integration tests verify link rendering and click behavior
- Follows TDD constitutional requirements
- Real URL testing (no mocks needed)

**Test Cases**:
- SSH format: `git@github.com:owner/repo.git`
- HTTPS format: `https://github.com/owner/repo.git` 
- HTTPS with auth: `https://token@github.com/owner/repo.git`
- Git protocol: `git://github.com/owner/repo.git`
- Already correct: `https://github.com/owner/repo`
- Invalid/unparseable URLs
- Edge cases: enterprise GitHub, non-standard ports

## Error Handling

**Decision**: Graceful degradation with logging  
**Rationale**:
- Invalid URLs don't break the interface
- Console warnings for debugging
- Fallback to no external link rather than broken link

## Constitutional Compliance

**Testing Framework Addition**: Required to comply with TDD requirements  
- Vitest will be added to devDependencies
- Test files will be created before implementation
- RED-GREEN-Refactor cycle will be followed

**No Architecture Violations**: URL utility aligns with simplicity principles  
**No New Runtime Dependencies**: Only dev dependency for testing

## Next Steps

Phase 1 will design the data model and contracts based on this research.