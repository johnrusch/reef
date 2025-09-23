# Quickstart: Fix External GitHub Links

**Feature**: Fix External GitHub Links in Repository Management  
**Date**: 2025-09-03  
**Purpose**: Manual validation guide for testing GitHub link functionality

## Prerequisites

1. **Testing Framework Setup**:
   ```bash
   npm install --save-dev vitest
   ```

2. **Test Repository**: Any GitHub repository with SSH remote URL configured

3. **Development Environment**: 
   ```bash
   npm run dev
   ```

## Manual Test Scenarios

### Scenario 1: Repository "Open in GitHub" Link

**Setup**:
1. Open Reef application
2. Navigate to a repository with SSH remote URL (e.g., `git@github.com:owner/repo.git`)
3. Go to Repository View → Repository tab

**Test Steps**:
1. Click "Open in GitHub →" button
2. **Expected**: New browser tab opens to `https://github.com/owner/repo`
3. **Verify**: URL in browser matches repository on GitHub

**Pass Criteria**: Link navigates to correct repository homepage

---

### Scenario 2: Pull Requests "View All" Link

**Setup**:
1. Repository with pull requests visible in Repository Management tab
2. PullRequestsWidget shows "View all →" link

**Test Steps**:
1. Click "View all →" in Pull Requests widget  
2. **Expected**: New browser tab opens to `https://github.com/owner/repo/pulls`
3. **Verify**: GitHub pulls page loads correctly

**Pass Criteria**: Link navigates to repository's pull requests page

---

### Scenario 3: Individual Pull Request External Link

**Setup**:
1. Repository with at least one pull request in the widget
2. External link icon visible next to PR item

**Test Steps**:
1. Click external link icon next to a specific pull request
2. **Expected**: New browser tab opens to `https://github.com/owner/repo/pull/{number}`  
3. **Verify**: Correct pull request page loads

**Pass Criteria**: Link navigates to specific pull request

---

### Scenario 4: Issues "View All" Link

**Setup**:
1. Repository with issues visible in Repository Management tab
2. IssuesWidget shows "View all →" link

**Test Steps**:
1. Click "View all →" in Issues widget
2. **Expected**: New browser tab opens to `https://github.com/owner/repo/issues`
3. **Verify**: GitHub issues page loads correctly

**Pass Criteria**: Link navigates to repository's issues page

---

### Scenario 5: Individual Issue External Link  

**Setup**:
1. Repository with at least one issue in the widget
2. External link icon visible next to issue item

**Test Steps**:
1. Click external link icon next to a specific issue
2. **Expected**: New browser tab opens to `https://github.com/owner/repo/issues/{number}`
3. **Verify**: Correct issue page loads

**Pass Criteria**: Link navigates to specific issue

---

### Scenario 6: Actions "View All" Link

**Setup**:
1. Repository with GitHub Actions enabled
2. ActionsWidget shows workflow runs and "View all →" link

**Test Steps**:
1. Click "View all →" in Actions widget
2. **Expected**: New browser tab opens to `https://github.com/owner/repo/actions`  
3. **Verify**: GitHub Actions page loads correctly

**Pass Criteria**: Link navigates to repository's actions page

---

### Scenario 7: URL Format Compatibility

**Setup**: Test with repositories using different git remote URL formats

**Test Cases**:
1. **SSH**: `git@github.com:owner/repo.git` → All links work
2. **HTTPS**: `https://github.com/owner/repo.git` → All links work  
3. **HTTPS with auth**: `https://token@github.com/owner/repo.git` → All links work (token stripped)
4. **Git protocol**: `git://github.com/owner/repo.git` → All links work
5. **Already correct**: `https://github.com/owner/repo` → All links work

**Pass Criteria**: All URL formats produce working external links

---

## Error Scenarios

### Invalid URL Handling

**Setup**: Repository with malformed or non-GitHub remote URL

**Test Steps**:  
1. Check that no broken external links appear
2. **Expected**: External link buttons/icons are hidden or disabled
3. **Verify**: Console shows warning but no errors

**Pass Criteria**: Graceful degradation without broken UI

---

## Automated Test Validation

After manual testing passes, run automated tests:

```bash
npm run test
```

**Expected Results**:
- [ ] All URL parsing tests pass  
- [ ] All link generation tests pass
- [ ] All component integration tests pass
- [ ] No console errors during test runs

## Performance Validation

**Test**: URL parsing performance
```bash
# Time URL parsing with large dataset
console.time('url-parsing');
// Parse 1000 URLs
console.timeEnd('url-parsing');
```

**Expected**: <10ms for 1000 URL parsing operations

## Success Criteria

✅ **All manual scenarios pass**  
✅ **All automated tests pass**  
✅ **No broken links in UI**  
✅ **Performance meets requirements**  
✅ **Error handling works correctly**

## Rollback Plan

If issues occur:
1. Revert utility function changes
2. Restore original component link logic  
3. Remove vitest dependency if not used elsewhere
4. Validate original (broken) behavior is restored