/**
 * generationQueueService.test.ts
 *
 * GEN-01: Tests for elementId auto-discovery in the generation queue service.
 * The service must generate all 4 C4 levels, discovering container and component
 * element IDs from previously generated diagrams.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock Electron and its dependencies before importing the module under test
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  BrowserWindow: { getAllWindows: vi.fn(() => []) },
  safeStorage: { isEncryptionAvailable: vi.fn(() => false), decryptString: vi.fn() },
  app: { getPath: vi.fn(() => '/tmp') },
}));

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
  })),
}));

vi.mock('../../../src/main/services/c4/c4StorageHandlers', () => ({
  getStorageService: vi.fn(() => ({
    getDiagram: vi.fn(() => null),
    updateState: vi.fn(),
    clearChangeTracking: vi.fn(),
    deleteDiagramsForRepo: vi.fn(),
  })),
}));

vi.mock('../../../src/main/services/c4/c4AnalyzerService', () => ({
  C4AnalyzerService: vi.fn().mockImplementation(() => ({
    generateC4Diagram: vi.fn(() => Promise.resolve({ success: true, diagram: '@startuml\n@enduml' })),
  })),
}));

import { extractElementIds } from '../../../src/main/services/c4/generationQueueService';

describe('extractElementIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('extracts Container element IDs from a container diagram', () => {
    const diagramContent = `
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

Container(webApp, "Web Application", "React", "Frontend")
Container(apiServer, "API Server", "Node.js", "Backend")
ContainerDb(database, "Database", "PostgreSQL", "Storage")
@enduml
`;
    const ids = extractElementIds(diagramContent, 'container');
    expect(ids).toContain('webApp');
    expect(ids).toContain('apiServer');
    expect(ids).toContain('database');
    expect(ids).toHaveLength(3);
  });

  test('extracts ContainerQueue and Container_Ext IDs', () => {
    const diagramContent = `
Container_Ext(externalSvc, "External Service", "API")
ContainerQueue(msgQueue, "Message Queue", "RabbitMQ")
`;
    const ids = extractElementIds(diagramContent, 'container');
    expect(ids).toContain('externalSvc');
    expect(ids).toContain('msgQueue');
  });

  test('extracts ContainerBoundary IDs', () => {
    const diagramContent = `
Container_Boundary(boundary1, "Boundary")
`;
    const ids = extractElementIds(diagramContent, 'container');
    expect(ids).toContain('boundary1');
  });

  test('extracts Component element IDs from a component diagram', () => {
    const diagramContent = `
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

Component(authController, "Auth Controller", "Express", "Handles authentication")
Component(userService, "User Service", "Node.js", "User management")
ComponentDb(userRepo, "User Repository", "PostgreSQL", "Data access")
@enduml
`;
    const ids = extractElementIds(diagramContent, 'component');
    expect(ids).toContain('authController');
    expect(ids).toContain('userService');
    expect(ids).toContain('userRepo');
    expect(ids).toHaveLength(3);
  });

  test('returns empty array for context level (not applicable)', () => {
    const ids = extractElementIds('some diagram content', 'context' as any);
    expect(ids).toHaveLength(0);
  });

  test('returns empty array for code level (not applicable)', () => {
    const ids = extractElementIds('some diagram content', 'code' as any);
    expect(ids).toHaveLength(0);
  });

  test('returns empty array for empty diagram', () => {
    const ids = extractElementIds('', 'container');
    expect(ids).toHaveLength(0);
  });

  test('returns empty array when no matching elements found', () => {
    const diagramContent = 'Person(user, "User", "A user of the system")';
    const ids = extractElementIds(diagramContent, 'container');
    expect(ids).toHaveLength(0);
  });

  test('handles multiple occurrences of same ID gracefully', () => {
    const diagramContent = `
Container(webApp, "Web App", "React", "Frontend")
Rel(webApp, apiServer, "Calls")
Container(apiServer, "API", "Node", "Backend")
`;
    const ids = extractElementIds(diagramContent, 'container');
    expect(ids).toContain('webApp');
    expect(ids).toContain('apiServer');
    expect(ids).toHaveLength(2);
  });
});
