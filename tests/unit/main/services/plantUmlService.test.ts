import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import { EventEmitter } from 'events';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

// Mock node-plantuml
vi.mock('node-plantuml', () => ({
  default: {
    generate: vi.fn(() => {
      const emitter = new EventEmitter();
      // Simulate successful SVG generation
      setTimeout(() => {
        emitter.emit('data', Buffer.from('<svg>test</svg>'));
        emitter.emit('end');
      }, 0);
      return { out: emitter };
    }),
  },
}));

describe('PlantUMLService - C4 Include Whitelist', () => {
  let generateHandler: (event: unknown, plantUmlText: string) => Promise<string>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Clear the module cache to get a fresh instance
    vi.resetModules();

    // Re-import the service to register handlers
    await import('../../../../src/main/services/plantUmlService');

    // Extract the handler function from the mock
    const handleCalls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
    const generateCall = handleCalls.find(call => call[0] === 'plantuml:generate-svg');

    if (generateCall) {
      generateHandler = generateCall[1];
    }
  });

  it('should accept C4-PlantUML stdlib includes with angle bracket syntax', async () => {
    const validC4Text = `@startuml
!include <C4/C4_Context>
title System Context Diagram
@enduml`;

    await expect(generateHandler(null, validC4Text)).resolves.toBeDefined();
  });

  it('should accept C4-PlantUML includes from official GitHub URL', async () => {
    const validC4Text = `@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
title Container Diagram
@enduml`;

    await expect(generateHandler(null, validC4Text)).resolves.toBeDefined();
  });

  it('should accept C4-PlantUML Component diagram include', async () => {
    const validC4Text = `@startuml
!include <C4/C4_Component>
title Component Diagram
@enduml`;

    await expect(generateHandler(null, validC4Text)).resolves.toBeDefined();
  });

  it('should reject non-whitelisted include directives', async () => {
    const invalidText = `@startuml
!include /etc/passwd
title Malicious Diagram
@enduml`;

    await expect(generateHandler(null, invalidText)).rejects.toThrow(
      /Security: PlantUML text contains non-whitelisted include/
    );
  });

  it('should reject arbitrary URL includes', async () => {
    const invalidText = `@startuml
!include https://evil.com/malicious.puml
title Malicious Diagram
@enduml`;

    await expect(generateHandler(null, invalidText)).rejects.toThrow(
      /Security: PlantUML text contains non-whitelisted include/
    );
  });

  it('should reject includeurl directives that are not whitelisted', async () => {
    const invalidText = `@startuml
!includeurl https://example.com/diagram.puml
title Malicious Diagram
@enduml`;

    await expect(generateHandler(null, invalidText)).rejects.toThrow(
      /Security: PlantUML text contains non-whitelisted include/
    );
  });

  it('should reject import directives', async () => {
    const invalidText = `@startuml
!import /path/to/file
title Malicious Diagram
@enduml`;

    await expect(generateHandler(null, invalidText)).rejects.toThrow(
      /Security: PlantUML text contains non-whitelisted include/
    );
  });

  it('should accept multiple C4 includes in same diagram', async () => {
    const validC4Text = `@startuml
!include <C4/C4_Context>
!include <C4/C4_Container>
title Multi-level Diagram
@enduml`;

    await expect(generateHandler(null, validC4Text)).resolves.toBeDefined();
  });

  it('should accept diagram without any includes', async () => {
    const simpleText = `@startuml
class User {
  +name: string
  +email: string
}
@enduml`;

    await expect(generateHandler(null, simpleText)).resolves.toBeDefined();
  });
});
