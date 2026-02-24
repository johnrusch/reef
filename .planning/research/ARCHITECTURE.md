# Architecture Integration: Persistent Diagrams with Change Visualization

**Project:** Reef C4 Architecture Diagrams v1.1
**Researched:** 2026-02-24
**Overall confidence:** HIGH

## Executive Summary

The v1.1 milestone extends the existing C4 diagram infrastructure with three major architectural additions: (1) permanent diagram storage with auto-generation on repo add, (2) real-time change detection with visual indicators that propagate through C4 levels, and (3) contextual navigation from changed diagram elements to the diff viewer. The existing architecture provides solid foundations (SQLite cache, chokidar file watching, Zustand navigation), requiring targeted extensions rather than redesigns. Critical integration points include cache schema evolution, file watcher event enrichment, SVG post-processing for change highlighting, and cross-tab navigation patterns.

## Current Architecture Baseline (v1.0)

### Existing Components

| Component | Location | Purpose | Integration Point |
|-----------|----------|---------|------------------|
| **C4CacheService** | `src/main/services/c4/c4CacheService.ts` | SQLite-based diagram caching with level-aware TTL | Extend schema for permanent storage |
| **FileWatcherService** | `src/main/services/fileWatcherService.ts` | chokidar-based file watching with staleness detection | Enrich events with change details |
| **NavigationStore** | `src/renderer/stores/navigationStore.ts` | Zustand store for C4 hierarchy navigation | Add diff navigation action |
| **DiagramViewer** | `src/renderer/components/DiagramViewer/DiagramViewer.tsx` | Main diagram display with click handling | Add change visualization layer |
| **PlantUMLRenderer** | `src/renderer/components/PlantUMLRenderer.tsx` | SVG generation and click detection | Post-process SVG for highlighting |
| **DiffViewer** | `src/renderer/components/repository/DiffViewer.tsx` | Git diff display with revert functionality | Accept navigation from diagram |
| **C4AnalyzerService** | `src/main/services/c4/c4AnalyzerService.ts` | Three-phase pipeline (static → AI → PlantUML) | Trigger on repo add |

### Current Data Flow

```
User adds repository → RepositoryStore persists
User navigates to Visual Map Tab → Manual generation trigger
FileWatcherService detects changes → Emit 'diagram:stale' IPC event
DiagramViewer receives event → Display StalenessBadge
User clicks badge → Regenerate diagram → Cache in SQLite
```

## New Architecture: v1.1 Additions

### 1. Persistent Storage Architecture

**Problem:** Current cache uses TTL expiration (Context: 7d, Container: 3d, Component: 1d, Code: 6h). Diagrams disappear after TTL, requiring expensive regeneration.

**Solution:** Extend SQLite schema to support permanent storage with generation state tracking.

#### Database Schema Changes

**New Table: `diagram_metadata`**
```sql
CREATE TABLE diagram_metadata (
  repo_path TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('context', 'container', 'component', 'code')),
  element_id TEXT,  -- NULL for context/container root diagrams
  state TEXT NOT NULL CHECK(state IN ('never_generated', 'generating', 'fresh', 'stale', 'error')),
  generated_at INTEGER,  -- Unix timestamp
  last_checked INTEGER,  -- Last staleness check timestamp
  error_message TEXT,    -- If state = 'error'
  PRIMARY KEY (repo_path, level, element_id)
);
```

**Modified Table: `c4_cache`**
- Remove TTL-based logic from cache retrieval
- Keep cache entries indefinitely (remove `clearExpiredEntries()`)
- Add `element_id` to cache key for component/code level diagrams

**Modified Table: `generation_timestamps`**
- Already exists, retain for file modification comparison
- Add index on `(repo_path, timestamp)` for faster staleness queries

**Migration Strategy:**
- Use better-sqlite3's `user_version` pragma for schema versioning
- Implement incremental migration in C4CacheService constructor
- Check `PRAGMA user_version`, apply migrations if needed
- Wrap in transaction for atomicity

**Sources:**
- [better-sqlite3 migrations patterns](https://github.com/BlackGlory/better-sqlite3-migrations)
- [SQLite versioning strategies](https://www.sqliteforum.com/p/sqlite-versioning-and-migration-strategies)

#### Component Changes

**Modified: C4CacheService**
```typescript
// New methods
initializeMigrations(): void
  - Check user_version
  - Apply migration if < current version
  - Update user_version

getDiagramState(repoPath: string, level: C4Level, elementId?: string): DiagramState
  - Query diagram_metadata table
  - Return state enum value

setDiagramState(repoPath: string, level: C4Level, state: DiagramState, elementId?: string): void
  - Insert/update diagram_metadata
  - Set generated_at, last_checked timestamps

removeTTLLogic(): void
  - Delete clearExpiredEntries() method
  - Remove TTL checks from getCachedDiagram()
  - Keep generation_timestamps for staleness detection
```

**New: DiagramAutoGenerator** (`src/main/services/c4/diagramAutoGenerator.ts`)
```typescript
class DiagramAutoGenerator {
  constructor(
    private c4Analyzer: C4AnalyzerService,
    private cache: C4CacheService
  )

  async checkAndGenerateForRepo(repoPath: string): Promise<void>
    - Check diagram_metadata for all 4 levels
    - If state = 'never_generated', prompt user via IPC
    - If user confirms, generate Context diagram
    - Update state to 'generating' → 'fresh' / 'error'

  async generateContextDiagram(repoPath: string): Promise<void>
    - Emit IPC 'diagram:generation-started'
    - Call c4Analyzer.generateC4Diagram('context')
    - Update cache and metadata
    - Emit IPC 'diagram:generation-complete'
}
```

**IPC Handlers: main.ts**
```typescript
ipcMain.handle('diagram:auto-generate-prompt', async (event, repoPath: string) => {
  // Show Electron native dialog
  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Generate Now', 'Later'],
    defaultId: 0,
    title: 'Generate C4 Diagrams?',
    message: 'Generate architecture diagrams for this repository?',
    detail: 'Uses Claude API (Haiku model). Estimated cost: $0.02-0.10'
  });
  return result.response === 0; // true if "Generate Now"
});
```

**Trigger Point: Repository Add Flow**
```typescript
// In RepositoryStore.addRepository() or AddRepositoryModal
After repository added to store:
  1. Emit IPC 'repo:added' with repoPath
  2. Main process receives event
  3. DiagramAutoGenerator.checkAndGenerateForRepo(repoPath)
  4. Prompt user if never generated
  5. Background generation if confirmed
```

**Sources:**
- [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- [Electron confirmation dialogs](https://www.brainbell.com/javascript/dialog-show-message-box.html)

### 2. Real-Time Change Detection with Visual Indicators

**Problem:** Current staleness detection emits binary 'diagram:stale' events. Need granular change information to highlight specific elements and propagate changes up the C4 hierarchy.

**Solution:** Enrich file watcher events with change context and implement SVG post-processing for visual highlighting.

#### Change Event Enrichment

**Modified: FileWatcherService**
```typescript
// Enhanced event data structure
interface DiagramChangeEvent {
  repoPath: string;
  level: C4Level;
  changedPath: string;         // File that changed
  timestamp: number;
  changeType: 'add' | 'modify' | 'delete';
  affectedElements: string[];  // Element IDs affected by this change
}

private async handleFileChange(repoPath: string, level: C4Level, changedPath: string): Promise<void> {
  // Existing staleness check logic
  // NEW: Determine affected elements
  const affectedElements = await this.mapFileToElements(changedPath, level);

  this.emitEnrichedChangeEvent({
    repoPath,
    level,
    changedPath,
    timestamp: Date.now(),
    changeType: await this.detectChangeType(changedPath),
    affectedElements
  });
}

private async mapFileToElements(filePath: string, level: C4Level): Promise<string[]> {
  // Context level: System boundary (affects entire diagram)
  if (level === 'context') return ['system'];

  // Container level: Map file to container (main/renderer/services)
  if (level === 'container') {
    if (filePath.includes('/main/')) return ['reef_main'];
    if (filePath.includes('/renderer/')) return ['reef_renderer'];
    return [];
  }

  // Component/Code level: Extract component name from file path
  const componentName = this.extractComponentFromPath(filePath);
  return [componentName.toLowerCase().replace(/\s+/g, '_')];
}
```

**New: ChangeAggregationService** (`src/main/services/c4/changeAggregationService.ts`)
```typescript
class ChangeAggregationService {
  private changeBuffer: Map<string, DiagramChangeEvent[]>; // key: repo:level
  private debounceTimer: NodeJS.Timeout;

  aggregateChanges(event: DiagramChangeEvent): void {
    // Buffer changes for 500ms
    // Group by repo + level
    // Merge affectedElements arrays
    // Emit single aggregated event

  private emitAggregatedChange(key: string, events: DiagramChangeEvent[]): void {
    // Merge all affectedElements
    const uniqueElements = [...new Set(events.flatMap(e => e.affectedElements))];

    // Emit to renderer
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('diagram:changes-detected', {
        repoPath: events[0].repoPath,
        level: events[0].level,
        affectedElements: uniqueElements,
        changedFiles: events.map(e => e.changedPath),
        timestamp: Date.now()
      });
    });
  }
}
```

#### Change Propagation Through C4 Levels

**Logic:**
- **Code → Component:** Code-level changes mark parent component as changed
- **Component → Container:** Component changes mark parent container as changed
- **Container → Context:** Container changes mark entire system context as changed
- **Store in SQLite:** Track propagated changes in new table

**New Table: `diagram_changes`**
```sql
CREATE TABLE diagram_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_path TEXT NOT NULL,
  level TEXT NOT NULL,
  element_id TEXT,  -- Element affected (NULL for system-level)
  changed_files TEXT NOT NULL,  -- JSON array of file paths
  detected_at INTEGER NOT NULL,
  propagated_to_parent BOOLEAN DEFAULT 0,
  cleared_at INTEGER  -- NULL if not cleared yet
);

CREATE INDEX idx_changes_active ON diagram_changes(repo_path, level, cleared_at) WHERE cleared_at IS NULL;
```

**Modified: NavigationStore**
```typescript
interface NavigationState {
  // Existing fields...
  changedElements: Map<string, Set<string>>; // level -> Set of changed element IDs

  // New actions
  markElementChanged: (level: C4Level, elementId: string) => void;
  clearChanges: (level: C4Level) => void;
  getChangesForLevel: (level: C4Level) => string[];
}

// Listen for IPC events
useEffect(() => {
  window.reef.ipc.on('diagram:changes-detected', (event, data) => {
    navigationStore.markElementChanged(data.level, ...data.affectedElements);
  });
}, []);
```

**Sources:**
- [Real-time data visualization strategies](https://risingwave.com/blog/real-time-data-visualization-tools-and-strategies/)
- [Code change visualization patterns](https://softagram.com/docs/visualizing-code-changes)
- [Architecture change detection](https://archtocode.com/)

#### SVG Highlighting Implementation

**Approach:** Post-process PlantUML-generated SVG to add visual change indicators.

**Modified: PlantUMLRenderer**
```typescript
private postProcessSVG(svgContent: string, changedElements: string[]): string {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

  changedElements.forEach(elementId => {
    // Find element by ID (PlantUML uses id="elem_<name>")
    const element = svgDoc.getElementById(`elem_${elementId}`);
    if (!element) return;

    // Add change indicator styles
    // Option 1: Border highlight
    const rect = element.querySelector('rect');
    if (rect) {
      rect.setAttribute('stroke', '#FFB800');  // Amber border
      rect.setAttribute('stroke-width', '3');
      rect.setAttribute('stroke-dasharray', '5,5');  // Dashed
    }

    // Option 2: Background color change
    rect?.setAttribute('fill', '#FFF3CD');  // Light amber

    // Option 3: Add pulsing animation
    const style = svgDoc.createElement('style');
    style.textContent = `
      @keyframes pulse-${elementId} {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      #elem_${elementId} {
        animation: pulse-${elementId} 2s infinite;
      }
    `;
    svgDoc.querySelector('defs')?.appendChild(style);

    // Option 4: Add change badge
    const badge = this.createChangeBadge(elementId);
    element.appendChild(badge);
  });

  return new XMLSerializer().serializeToString(svgDoc);
}

private createChangeBadge(elementId: string): SVGElement {
  // Create small circle with "!" or file count
  // Position in top-right corner of element
  // Add tooltip with changed files
}
```

**Visual Design:**
- **Amber/Orange color scheme** (#FFB800, #FFF3CD) for change indicators
- **Pulsing animation** to draw attention (2s interval)
- **Dashed borders** to distinguish from normal elements
- **Change badges** with file count tooltip
- **Legend component** explaining change visualization

**New Component: ChangeVisualizationLegend**
```tsx
const ChangeVisualizationLegend: React.FC = () => (
  <div className="absolute top-4 left-4 bg-gray-900/90 rounded-lg p-3 border border-gray-700">
    <h4 className="text-xs font-semibold text-gray-300 mb-2">Change Indicators</h4>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-amber-500 border-dashed rounded" />
        <span className="text-xs text-gray-400">Modified elements</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-amber-100 rounded" />
        <span className="text-xs text-gray-400">Elements with changes</span>
      </div>
    </div>
  </div>
);
```

**Sources:**
- [PlantUML SVG styling](https://plantuml.com/style-evolution)
- [PlantUML interactive SVG features](https://github.com/plantuml/plantuml/issues/2130)
- [Data visualization trends 2026](https://medium.com/@anuj.rawat_17321/data-visualization-trends-2026-cxo-guide-to-stay-ahead-15d380261809)

### 3. Diagram-to-Diff Navigation

**Problem:** Users see changed elements in diagrams but need context about what changed. Should navigate directly from diagram element to relevant diff view.

**Solution:** Extend click handling to support "View Changes" action and cross-tab navigation.

#### Click Handler Extension

**Modified: DiagramViewer**
```typescript
const handleElementClick = useCallback(async (elementId: string, metaKey: boolean) => {
  // Existing drill-down logic...
  if (!metaKey && navigationStore.canDrillDown()) {
    // Normal click: drill down to next level
    await handleDrillDown(elementId);
    return;
  }

  // NEW: Meta+Click or changed element: show changes
  const hasChanges = navigationStore.getChangesForLevel(currentLevel.level).includes(elementId);
  if (metaKey || hasChanges) {
    await showChangesForElement(elementId);
  }
}, [navigationStore, currentLevel]);

const showChangesForElement = async (elementId: string) => {
  // Get changed files for this element
  const changes = await window.reef.diagram.getChangesForElement(
    repository.path,
    currentLevel.level,
    elementId
  );

  if (changes.files.length === 0) {
    console.log('No changes for element:', elementId);
    return;
  }

  // Navigate to Commit Workflow tab with diff view
  navigationStore.setActiveTab('commit-workflow');
  navigationStore.setDiffContext({
    elementId,
    elementName: getElementName(elementId),
    files: changes.files,
    level: currentLevel.level
  });
};
```

**New IPC Handler: main.ts**
```typescript
ipcMain.handle('diagram:get-changes-for-element',
  async (event, repoPath: string, level: C4Level, elementId: string) => {
    // Query diagram_changes table
    const changes = changeAggregationService.getChangesForElement(repoPath, level, elementId);

    // Get git diff for changed files
    const diffs = await Promise.all(
      changes.files.map(file => gitService.diff(repoPath, file))
    );

    return {
      files: changes.files,
      diffs: diffs,
      detectedAt: changes.timestamp
    };
  }
);
```

**Modified: NavigationStore**
```typescript
interface NavigationState {
  // Existing fields...
  activeTab: 'repositories' | 'commit-workflow' | 'visual-map';
  diffContext: DiffContext | null;

  // New actions
  setActiveTab: (tab: string) => void;
  setDiffContext: (context: DiffContext) => void;
  clearDiffContext: () => void;
}

interface DiffContext {
  elementId: string;
  elementName: string;
  files: string[];
  level: C4Level;
  sourceTab: 'visual-map';  // For back navigation
}
```

**Modified: CommitWorkflowTab / EnhancedChangesPanel**
```typescript
useEffect(() => {
  // Listen for diff context from diagram navigation
  const diffContext = navigationStore.diffContext;

  if (diffContext && diffContext.sourceTab === 'visual-map') {
    // Highlight relevant files in changes panel
    setHighlightedFiles(diffContext.files);

    // Auto-open first file diff
    if (diffContext.files.length > 0) {
      handleFileClick(diffContext.files[0]);
    }

    // Show context banner
    setContextBanner({
      message: `Viewing changes for ${diffContext.elementName}`,
      onBack: () => {
        navigationStore.setActiveTab('visual-map');
        navigationStore.clearDiffContext();
      }
    });
  }
}, [navigationStore.diffContext]);
```

**New Component: DiffContextBanner**
```tsx
const DiffContextBanner: React.FC<{ context: DiffContext, onBack: () => void }> = ({ context, onBack }) => (
  <div className="bg-blue-900/20 border-b border-blue-800/50 px-4 py-2 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <FileCode className="w-4 h-4 text-blue-400" />
      <span className="text-sm text-blue-300">
        Changes in {context.elementName} ({context.level} level)
      </span>
    </div>
    <button
      onClick={onBack}
      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
    >
      ← Back to Diagram
    </button>
  </div>
);
```

#### Context Menu for Changed Elements

**Optional Enhancement:** Right-click menu on changed elements.

**Implementation:**
```typescript
const handleElementRightClick = useCallback((elementId: string, event: React.MouseEvent) => {
  event.preventDefault();

  const hasChanges = navigationStore.getChangesForLevel(currentLevel.level).includes(elementId);
  if (!hasChanges) return;

  // Show context menu
  setContextMenu({
    x: event.clientX,
    y: event.clientY,
    elementId,
    options: [
      { label: 'View Changes', action: () => showChangesForElement(elementId) },
      { label: 'Clear Change Indicator', action: () => clearElementChanges(elementId) },
      { label: 'Regenerate Diagram', action: () => regenerateDiagram() }
    ]
  });
}, [navigationStore, currentLevel]);
```

## Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│ Main Process                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌────────────────────────┐   │
│  │ C4CacheService   │────────▶│ diagram_metadata       │   │
│  │ (extended)       │         │ c4_cache (no TTL)      │   │
│  └────────┬─────────┘         │ diagram_changes (NEW)  │   │
│           │                   └────────────────────────┘   │
│           │                                                 │
│  ┌────────▼───────────────┐                                │
│  │ DiagramAutoGenerator   │                                │
│  │ (NEW)                  │                                │
│  └────────┬───────────────┘                                │
│           │                                                 │
│           ▼                                                 │
│  ┌────────────────────────┐   ┌──────────────────────┐    │
│  │ C4AnalyzerService      │──▶│ StaticAnalyzer       │    │
│  │ (existing)             │   │ AIEnricher           │    │
│  │                        │   │ PlantUMLGenerator    │    │
│  └────────────────────────┘   └──────────────────────┘    │
│           │                                                 │
│           │                                                 │
│  ┌────────▼───────────────┐   ┌──────────────────────┐    │
│  │ FileWatcherService     │──▶│ ChangeAggregation    │    │
│  │ (enriched events)      │   │ Service (NEW)        │    │
│  └────────────────────────┘   └──────────┬───────────┘    │
│                                           │                 │
└───────────────────────────────────────────┼─────────────────┘
                                            │ IPC Events
                                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Renderer Process                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │ NavigationStore      │◀─────│ IPC Event Listeners  │    │
│  │ (change tracking)    │      │ - diagram:stale      │    │
│  │                      │      │ - diagram:changes    │    │
│  └─────────┬────────────┘      │ - diagram:generated  │    │
│            │                   └──────────────────────┘    │
│            ▼                                                │
│  ┌──────────────────────┐                                  │
│  │ DiagramViewer        │                                  │
│  │ (change handlers)    │                                  │
│  └─────────┬────────────┘                                  │
│            │                                                │
│    ┌───────┴───────┬─────────────┬──────────────┐         │
│    ▼               ▼             ▼              ▼         │
│  ┌──────┐   ┌──────────┐  ┌──────────┐  ┌────────────┐   │
│  │ Dia- │   │ PlantUML │  │ Change   │  │ Diff       │   │
│  │ gram │   │ Renderer │  │ Viz      │  │ Context    │   │
│  │ Panel│   │ (SVG     │  │ Legend   │  │ Banner     │   │
│  │      │   │ post-    │  │ (NEW)    │  │ (NEW)      │   │
│  │      │   │ process) │  │          │  │            │   │
│  └──────┘   └──────────┘  └──────────┘  └─────┬──────┘   │
│                                                 │          │
│                                                 ▼          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ CommitWorkflowTab / EnhancedChangesPanel           │  │
│  │ (diff view with context)                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Build Order Recommendation

Based on dependency analysis, suggested implementation sequence:

### Phase 1: Persistent Storage Foundation
**Dependencies:** None (extends existing cache)
**Complexity:** Low-Medium

1. **Database Schema Migration** (1-2 hours)
   - Add migration logic to C4CacheService
   - Create diagram_metadata table
   - Test migration on existing cache.db

2. **Remove TTL Logic** (1 hour)
   - Delete clearExpiredEntries()
   - Update getCachedDiagram() to ignore TTL
   - Keep generation_timestamps table

3. **State Management** (2-3 hours)
   - Implement getDiagramState() / setDiagramState()
   - Add state machine logic (never_generated → generating → fresh/error)
   - Test state transitions

### Phase 2: Auto-Generation on Repo Add
**Dependencies:** Phase 1 complete
**Complexity:** Medium

4. **DiagramAutoGenerator Service** (3-4 hours)
   - Create new service class
   - Implement checkAndGenerateForRepo()
   - Add user prompt via Electron dialog
   - Test generation flow

5. **Integration with Repository Add** (2 hours)
   - Add IPC event 'repo:added'
   - Hook into AddRepositoryModal or RepositoryStore
   - Test auto-prompt on new repo

6. **Background Generation** (2-3 hours)
   - Emit progress events during generation
   - Handle concurrent repo adds gracefully
   - Test error recovery

### Phase 3: Change Detection Enhancement
**Dependencies:** Phase 1-2 complete
**Complexity:** Medium-High

7. **Enrich FileWatcher Events** (3-4 hours)
   - Extend DiagramChangeEvent structure
   - Implement mapFileToElements()
   - Test file-to-element mapping accuracy

8. **Change Aggregation Service** (4-5 hours)
   - Create ChangeAggregationService
   - Implement debouncing (500ms)
   - Add diagram_changes table
   - Test change propagation logic

9. **NavigationStore Change Tracking** (2-3 hours)
   - Add changedElements Map
   - Implement markElementChanged() / clearChanges()
   - Wire up IPC event listeners

### Phase 4: Change Visualization
**Dependencies:** Phase 3 complete
**Complexity:** Medium-High

10. **SVG Post-Processing** (4-6 hours)
    - Implement postProcessSVG() in PlantUMLRenderer
    - Add highlighting styles (border, fill, animation)
    - Create change badge component
    - Test with various diagram sizes

11. **Change Visualization Legend** (2 hours)
    - Create ChangeVisualizationLegend component
    - Add toggle in DiagramControls
    - Test visibility logic

12. **Change Clearing Logic** (2-3 hours)
    - Add "Clear Changes" button
    - Update diagram_changes.cleared_at timestamp
    - Refresh diagram after clearing

### Phase 5: Diagram-to-Diff Navigation
**Dependencies:** Phase 3-4 complete
**Complexity:** Medium

13. **Enhanced Click Handling** (3-4 hours)
    - Extend handleElementClick with Meta key detection
    - Implement showChangesForElement()
    - Add IPC handler 'diagram:get-changes-for-element'

14. **Cross-Tab Navigation** (3-4 hours)
    - Extend NavigationStore with activeTab / diffContext
    - Add setDiffContext() action
    - Test tab switching flow

15. **DiffContextBanner Component** (2 hours)
    - Create banner component
    - Add to CommitWorkflowTab
    - Implement back navigation

16. **Highlighted Files in Changes Panel** (2-3 hours)
    - Add highlight styling to EnhancedChangesPanel
    - Auto-open first diff
    - Test integration

### Total Estimated Effort
- **Phase 1:** 4-6 hours
- **Phase 2:** 7-9 hours
- **Phase 3:** 9-12 hours
- **Phase 4:** 8-11 hours
- **Phase 5:** 10-13 hours

**Total:** 38-51 hours (approximately 5-7 days for single developer)

## Integration Points Summary

| Integration Point | Existing Component | New/Modified Component | Risk Level |
|-------------------|-------------------|------------------------|------------|
| **Cache Schema** | C4CacheService | Add diagram_metadata table | LOW - Backwards compatible via migration |
| **File Watching** | FileWatcherService | Enrich events with element mapping | MEDIUM - Complex file-to-element logic |
| **Navigation State** | NavigationStore | Add change tracking + diff context | LOW - Additive changes only |
| **SVG Rendering** | PlantUMLRenderer | Post-process for highlighting | MEDIUM - DOM manipulation risk |
| **Cross-Tab Nav** | MainLayout/Tabs | Pass navigation context | LOW - Standard React patterns |
| **IPC Events** | main.ts / preload.ts | Add 5 new handlers | LOW - Established pattern |
| **Repo Add Flow** | AddRepositoryModal | Trigger auto-generation | LOW - Optional prompt, no breaking changes |

## Performance Considerations

### Database Performance
- **Index Strategy:** Add indexes on `diagram_changes(repo_path, level, cleared_at)`
- **Query Optimization:** Use prepared statements for repeated queries
- **Cleanup Strategy:** Periodically archive cleared changes older than 30 days
- **Expected Load:** ~100-500 rows per active repo, acceptable for SQLite

### Change Event Throughput
- **Debouncing:** 500ms aggregation window reduces event flood
- **Batch Updates:** Aggregate 10-50 file changes into single event
- **IPC Overhead:** Minimal (<1ms per event), negligible impact
- **Memory:** ChangeBuffer max size: 1000 events, auto-flush on limit

### SVG Post-Processing
- **Parsing Time:** DOMParser ~5-10ms for typical C4 diagram (<100 elements)
- **Highlighting:** O(n) where n = changed elements, typically <10
- **Serialization:** ~2-5ms for modified SVG
- **Total Overhead:** <20ms per diagram render, imperceptible to user

### Navigation Performance
- **Store Updates:** Zustand shallow equality checks prevent unnecessary re-renders
- **Diff Loading:** Lazy load diffs only when navigating to Commit Workflow tab
- **File Highlighting:** CSS-based, no JavaScript overhead

## Testing Strategy

### Unit Tests
- **C4CacheService:** Schema migration, state transitions
- **ChangeAggregationService:** Debouncing, element mapping
- **PlantUMLRenderer:** SVG parsing, highlighting logic

### Integration Tests
- **Auto-Generation Flow:** Repo add → prompt → background generation
- **Change Detection:** File change → event emission → store update
- **Cross-Tab Navigation:** Diagram click → tab switch → diff display

### E2E Tests (Playwright)
- **Full Flow:** Add repo → generate diagrams → modify file → see highlights → navigate to diff
- **Error Cases:** Generation failure, missing diagram, no changes

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Schema migration breaks existing cache** | HIGH | LOW | Test on copy of production db, versioned migrations |
| **File-to-element mapping inaccurate** | MEDIUM | MEDIUM | Start with conservative mapping, add test cases |
| **SVG post-processing breaks rendering** | HIGH | LOW | Graceful fallback to unhighlighted SVG |
| **Change events flood IPC** | MEDIUM | MEDIUM | Debouncing + aggregation reduces to <1 event/sec |
| **Cross-tab navigation confusing** | LOW | LOW | Clear context banner + back button |
| **Auto-generation unexpected costs** | HIGH | LOW | Explicit user prompt with cost estimate |

## Open Questions for Phase-Specific Research

1. **Element ID Standardization:** Should element IDs in PlantUML follow strict naming convention for reliable mapping?
2. **Change Hierarchy Propagation:** Should code-level changes always bubble up, or only when viewing higher levels?
3. **Performance at Scale:** How does SVG highlighting perform with >100 changed elements? Need progressive disclosure?
4. **User Preferences:** Should auto-generation prompt be shown once per repo or respect global setting?
5. **Diff View Integration:** Should diff viewer support split-screen with diagram for side-by-side viewing?

## References and Sources

### Electron & Storage
- [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- [Electron confirmation dialogs best practices](https://www.brainbell.com/javascript/dialog-show-message-box.html)
- [better-sqlite3 migrations](https://github.com/BlackGlory/better-sqlite3-migrations)
- [SQLite versioning strategies](https://www.sqliteforum.com/p/sqlite-versioning-and-migration-strategies)
- [SQLite change tracking patterns](https://til.simonwillison.net/sqlite/json-audit-log)

### Visualization & UI
- [PlantUML SVG generation](https://plantuml.com/svg)
- [PlantUML CSS-like styling](https://plantuml.com/style-evolution)
- [PlantUML interactive SVG](https://github.com/plantuml/plantuml/issues/2130)
- [Real-time data visualization strategies 2026](https://risingwave.com/blog/real-time-data-visualization-tools-and-strategies/)
- [Data visualization trends 2026](https://medium.com/@anuj.rawat_17321/data-visualization-trends-2026-cxo-guide-to-stay-ahead-15d380261809)
- [Code change visualization patterns](https://softagram.com/docs/visualizing-code-changes)
- [Architecture change detection](https://archtocode.com/)

### Architecture Patterns
- [Electron data persistence patterns](https://10xdev.blog/electron-data-persistence/)
- [RxDB for Electron databases](https://rxdb.info/electron-database.html)

---

**Next Steps:**
1. Review architecture with team/stakeholders
2. Address open questions via phase-specific research
3. Create detailed implementation plans for each phase
4. Begin Phase 1: Persistent Storage Foundation
