import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, access, stat, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import * as fsPromises from 'fs/promises';
import { ReefStorageService } from '@main/services/reef/reefStorageService';
import type { ReefMetaJson } from '@main/services/reef/reefStorageTypes';

describe('ReefStorageService', () => {
  let service: ReefStorageService;
  let tmpDir: string;

  const validMeta: ReefMetaJson = {
    schemaVersion: 1,
    level: 'context',
    generatedAt: '2026-01-01T00:00:00Z',
    modelUsed: 'claude-haiku',
    promptVersion: '1.0',
  };

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'reef-test-'));
    service = new ReefStorageService();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('writeLevelFiles', () => {
    it('creates .puml, .svg, .meta.json for context level', async () => {
      const puml = '@startuml\nactor User\n@enduml';
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>context</text></svg>';

      await service.writeLevelFiles(tmpDir, 'context', puml, svg, validMeta);

      const pumlContent = await readFile(join(tmpDir, '.reef', 'context.puml'), 'utf8');
      const svgContent = await readFile(join(tmpDir, '.reef', 'context.svg'), 'utf8');
      const metaContent = await readFile(join(tmpDir, '.reef', 'context.meta.json'), 'utf8');

      expect(pumlContent).toBe(puml);
      expect(svgContent).toBe(svg);
      expect(JSON.parse(metaContent)).toMatchObject({ schemaVersion: 1, level: 'context' });
    });

    it('creates .puml, .svg, .meta.json for container level', async () => {
      const containerMeta: ReefMetaJson = { ...validMeta, level: 'container' };
      const puml = '@startuml\ncontainer App\n@enduml';
      const svg = '<svg><text>container</text></svg>';

      await service.writeLevelFiles(tmpDir, 'container', puml, svg, containerMeta);

      const pumlContent = await readFile(join(tmpDir, '.reef', 'container.puml'), 'utf8');
      const svgContent = await readFile(join(tmpDir, '.reef', 'container.svg'), 'utf8');
      const metaContent = await readFile(join(tmpDir, '.reef', 'container.meta.json'), 'utf8');

      expect(pumlContent).toBe(puml);
      expect(svgContent).toBe(svg);
      expect(JSON.parse(metaContent)).toMatchObject({ schemaVersion: 1, level: 'container' });
    });

    it('creates .reef/ lazily — directory does not exist before write', async () => {
      const reefDir = join(tmpDir, '.reef');

      // Verify .reef does NOT exist before first write
      let existsBefore = true;
      try {
        await access(reefDir);
      } catch {
        existsBefore = false;
      }
      expect(existsBefore).toBe(false);

      await service.writeLevelFiles(tmpDir, 'context', '@startuml\n@enduml', '<svg/>', validMeta);

      // Verify .reef now exists
      let existsAfter = false;
      try {
        await access(reefDir);
        existsAfter = true;
      } catch {
        existsAfter = false;
      }
      expect(existsAfter).toBe(true);
    });

    it('overwrites existing files on second write', async () => {
      const puml1 = '@startuml\nfirst\n@enduml';
      const puml2 = '@startuml\nsecond\n@enduml';

      await service.writeLevelFiles(tmpDir, 'context', puml1, '<svg/>', validMeta);
      await service.writeLevelFiles(tmpDir, 'context', puml2, '<svg/>', validMeta);

      const content = await readFile(join(tmpDir, '.reef', 'context.puml'), 'utf8');
      expect(content).toBe(puml2);
    });
  });

  describe('writeSubDiagramFiles', () => {
    it('creates nested component/{parentId}/diagram.* files', async () => {
      const componentMeta: ReefMetaJson = { ...validMeta, level: 'component' };
      const puml = '@startuml\ncomponent API\n@enduml';
      const svg = '<svg><text>api-server</text></svg>';

      await service.writeSubDiagramFiles(tmpDir, 'component', 'api-server', puml, svg, componentMeta);

      const pumlContent = await readFile(
        join(tmpDir, '.reef', 'component', 'api-server', 'diagram.puml'),
        'utf8'
      );
      const svgContent = await readFile(
        join(tmpDir, '.reef', 'component', 'api-server', 'diagram.svg'),
        'utf8'
      );
      const metaContent = await readFile(
        join(tmpDir, '.reef', 'component', 'api-server', 'diagram.meta.json'),
        'utf8'
      );

      expect(pumlContent).toBe(puml);
      expect(svgContent).toBe(svg);
      expect(JSON.parse(metaContent)).toMatchObject({ schemaVersion: 1, level: 'component' });
    });

    it('creates nested code/{parentId}/diagram.* files', async () => {
      const codeMeta: ReefMetaJson = { ...validMeta, level: 'code' };
      const puml = '@startuml\nclass UserService\n@enduml';
      const svg = '<svg><text>user-service</text></svg>';

      await service.writeSubDiagramFiles(tmpDir, 'code', 'user-service', puml, svg, codeMeta);

      const pumlContent = await readFile(
        join(tmpDir, '.reef', 'code', 'user-service', 'diagram.puml'),
        'utf8'
      );
      const svgContent = await readFile(
        join(tmpDir, '.reef', 'code', 'user-service', 'diagram.svg'),
        'utf8'
      );
      const metaContent = await readFile(
        join(tmpDir, '.reef', 'code', 'user-service', 'diagram.meta.json'),
        'utf8'
      );

      expect(pumlContent).toBe(puml);
      expect(svgContent).toBe(svg);
      expect(JSON.parse(metaContent)).toMatchObject({ schemaVersion: 1, level: 'code' });
    });
  });

  describe('readMeta', () => {
    it('returns parsed meta when schemaVersion is 1', async () => {
      await service.writeLevelFiles(tmpDir, 'context', '@startuml\n@enduml', '<svg/>', validMeta);

      const result = await service.readMeta(tmpDir, 'context');

      expect(result).not.toBeNull();
      expect(result?.schemaVersion).toBe(1);
      expect(result?.level).toBe('context');
      expect(result?.generatedAt).toBe('2026-01-01T00:00:00Z');
    });

    it('returns null when schemaVersion is missing', async () => {
      await mkdir(join(tmpDir, '.reef'), { recursive: true });
      await writeFile(
        join(tmpDir, '.reef', 'context.meta.json'),
        JSON.stringify({ level: 'context', generatedAt: '2026-01-01T00:00:00Z' }),
        'utf8'
      );

      const result = await service.readMeta(tmpDir, 'context');
      expect(result).toBeNull();
    });

    it('returns null when schemaVersion is wrong value', async () => {
      await mkdir(join(tmpDir, '.reef'), { recursive: true });
      await writeFile(
        join(tmpDir, '.reef', 'context.meta.json'),
        JSON.stringify({ schemaVersion: 2, level: 'context', generatedAt: '2026-01-01T00:00:00Z' }),
        'utf8'
      );

      const result = await service.readMeta(tmpDir, 'context');
      expect(result).toBeNull();
    });

    it('returns null when file does not exist', async () => {
      const result = await service.readMeta(tmpDir, 'context');
      expect(result).toBeNull();
    });

    it('returns null when file contains invalid JSON', async () => {
      await mkdir(join(tmpDir, '.reef'), { recursive: true });
      await writeFile(
        join(tmpDir, '.reef', 'context.meta.json'),
        'this is not valid JSON!!!',
        'utf8'
      );

      const result = await service.readMeta(tmpDir, 'context');
      expect(result).toBeNull();
    });

    it('returns parsed meta for nested sub-diagram when parentId provided', async () => {
      const componentMeta: ReefMetaJson = { ...validMeta, level: 'component' };
      await service.writeSubDiagramFiles(
        tmpDir,
        'component',
        'api-server',
        '@startuml\n@enduml',
        '<svg/>',
        componentMeta
      );

      const result = await service.readMeta(tmpDir, 'component', 'api-server');
      expect(result).not.toBeNull();
      expect(result?.level).toBe('component');
    });
  });

  describe('ensureGitattributes', () => {
    it('creates .reef/.gitattributes with binary markers', async () => {
      await service.ensureGitattributes(tmpDir);

      const content = await readFile(join(tmpDir, '.reef', '.gitattributes'), 'utf8');
      expect(content).toContain('*.svg binary');
      expect(content).toContain('*.puml binary');
    });

    it('is idempotent — does not overwrite on second call', async () => {
      await service.ensureGitattributes(tmpDir);

      const statBefore = await stat(join(tmpDir, '.reef', '.gitattributes'));

      // Small delay to ensure mtime would differ if file were rewritten
      await new Promise((resolve) => setTimeout(resolve, 10));

      await service.ensureGitattributes(tmpDir);

      const statAfter = await stat(join(tmpDir, '.reef', '.gitattributes'));
      expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs);
    });

    it('is called automatically by writeLevelFiles', async () => {
      await service.writeLevelFiles(tmpDir, 'context', '@startuml\n@enduml', '<svg/>', validMeta);

      const gitattrsPath = join(tmpDir, '.reef', '.gitattributes');
      let exists = false;
      try {
        await access(gitattrsPath);
        exists = true;
      } catch {
        exists = false;
      }
      expect(exists).toBe(true);
    });
  });

  describe('atomicWrite error handling', () => {
    it('cleans up .tmp file on write failure', async () => {
      // Spy on rename to simulate a failure
      const renameSpy = vi.spyOn(fsPromises, 'rename').mockRejectedValueOnce(
        new Error('EPERM: operation not permitted')
      );

      try {
        await service.writeLevelFiles(tmpDir, 'context', '@startuml\n@enduml', '<svg/>', validMeta);
      } catch {
        // Expected to throw
      }

      // Verify no .tmp files remain
      const reefDir = join(tmpDir, '.reef');
      let tmpFilesFound = false;
      try {
        const { readdir } = await import('fs/promises');
        const files = await readdir(reefDir);
        tmpFilesFound = files.some((f) => f.endsWith('.tmp'));
      } catch {
        // .reef dir may not exist if mkdir also failed — that's fine
      }

      expect(tmpFilesFound).toBe(false);
      renameSpy.mockRestore();
    });
  });
});
