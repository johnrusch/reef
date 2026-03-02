/**
 * C4 PlantUML Generator
 *
 * Generates C4-PlantUML syntax for all four C4 abstraction levels:
 * - Context: System landscape with external dependencies
 * - Container: Deployable units and technology stack
 * - Component: Logical groupings within containers
 * - Code: Implementation-level class diagrams
 *
 * Follows official C4-PlantUML syntax from:
 * https://github.com/plantuml-stdlib/C4-PlantUML
 *
 * AI enrichment data is consumed when available; static analysis heuristics
 * serve as fallback when enrichedData is null or contains empty arrays.
 */

import type { AnalysisResult } from './types/analysisTypes';
import type {
  EnrichedContextLevel,
  EnrichedContainerLevel,
  EnrichedComponentLevel,
  EnrichedArchitecture,
} from './types/enrichmentTypes';

export class C4PlantUMLGenerator {
  /**
   * Generates C4 Context diagram showing system in its environment.
   * Uses AI-provided actors and external systems when available;
   * falls back to static analysis heuristics when enrichedData is null/empty.
   */
  generateContextDiagram(enrichedData: EnrichedContextLevel | null, staticData: AnalysisResult): string {
    const lines: string[] = [];

    // Extract project info
    const projectName = staticData.metadata.projectName;
    const systemId = this.sanitizeId(projectName);

    // Add C4-PlantUML include from stdlib (bundled with PlantUML JAR)
    lines.push('@startuml');
    lines.push('!include <C4/C4_Context>');
    lines.push('');

    // Add title
    lines.push(`title System Context Diagram for ${projectName}`);
    lines.push('');

    // Determine actors: use AI-provided or static fallback
    const actors =
      enrichedData?.actors && enrichedData.actors.length > 0
        ? enrichedData.actors
        : [{ name: 'User', description: 'Uses the system' }];

    for (const actor of actors) {
      const id = this.sanitizeId(actor.name);
      lines.push(`Person(${id}, "${actor.name}", "${this.escapeQuotes(actor.description)}")`);
    }
    lines.push('');

    // Add target system
    lines.push(`System(${systemId}, "${projectName}", "Software system")`);
    lines.push('');

    // Determine external systems: use AI-provided or static fallback
    const externalSystems =
      enrichedData?.externalSystems && enrichedData.externalSystems.length > 0
        ? enrichedData.externalSystems.map(s => ({
            name: s.name,
            description: s.description,
            relationship: s.relationship,
            tech: s.technology,
          }))
        : this.detectExternalSystems(staticData);

    // Add external systems
    for (const system of externalSystems) {
      const id = this.sanitizeId(system.name);
      const description = this.escapeQuotes(system.description);
      lines.push(`System_Ext(${id}, "${system.name}", "${description}")`);
    }

    if (externalSystems.length > 0) {
      lines.push('');
    }

    // Add relationships: use AI-provided or static fallback
    if (enrichedData?.relationships && enrichedData.relationships.length > 0) {
      for (const rel of enrichedData.relationships) {
        const fromId = this.sanitizeId(rel.from);
        const toId = this.sanitizeId(rel.to);
        if (rel.technology) {
          lines.push(`Rel(${fromId}, ${toId}, "${rel.label}", "${rel.technology}")`);
        } else {
          lines.push(`Rel(${fromId}, ${toId}, "${rel.label}")`);
        }
      }
    } else {
      // Static fallback relationships
      const primaryActorId = this.sanitizeId(actors[0].name);
      lines.push(`Rel(${primaryActorId}, ${systemId}, "Uses")`);

      for (const system of externalSystems) {
        const id = this.sanitizeId(system.name);
        lines.push(`Rel(${systemId}, ${id}, "${system.relationship}", "${system.tech || 'API'}")`);
      }
    }

    lines.push('');
    lines.push('SHOW_LEGEND()');
    lines.push('@enduml');

    return lines.join('\n');
  }

  /**
   * Generates C4 Container diagram showing deployable units.
   * Uses AI-provided containers, relationships, and external systems when available;
   * falls back to static analysis heuristics when enrichedData is null or has empty arrays.
   */
  generateContainerDiagram(enrichedData: EnrichedContainerLevel | null, staticData: AnalysisResult): string {
    const lines: string[] = [];

    // Extract project info
    const projectName = staticData.metadata.projectName;
    const systemId = this.sanitizeId(projectName);

    // Add C4-PlantUML include from stdlib (bundled with PlantUML JAR)
    lines.push('@startuml');
    lines.push('!include <C4/C4_Container>');
    lines.push('');

    // Add title
    lines.push(`title Container Diagram for ${projectName}`);
    lines.push('');

    // Add primary actor
    lines.push('Person(user, "User", "Uses the system")');
    lines.push('');

    // Add system boundary
    lines.push(`System_Boundary(${systemId}, "${projectName}") {`);

    // Determine containers: use AI-provided or static fallback
    const useAiContainers = enrichedData?.containers && enrichedData.containers.length > 0;
    const containers = useAiContainers
      ? enrichedData!.containers.map(c => ({
          name: c.name,
          description: c.description,
          tech: c.technology,
          type: (c.type === 'database' || c.type === 'queue' || c.type === 'storage') ? 'database' as const : 'container' as const,
        }))
      : this.detectContainers(staticData);

    for (const container of containers) {
      const id = this.sanitizeId(container.name);
      const description = this.escapeQuotes(container.description);
      const tech = this.escapeQuotes(container.tech);

      if (container.type === 'database') {
        lines.push(`  ContainerDb(${id}, "${container.name}", "${tech}", "${description}")`);
      } else {
        lines.push(`  Container(${id}, "${container.name}", "${tech}", "${description}")`);
      }
    }

    lines.push('}');
    lines.push('');

    // Determine external systems: use AI-provided or static fallback
    const externalSystems =
      enrichedData?.externalSystems && enrichedData.externalSystems.length > 0
        ? enrichedData.externalSystems.map(s => ({
            name: s.name,
            description: s.description,
            relationship: s.relationship,
            tech: s.technology,
          }))
        : this.detectExternalSystems(staticData);

    for (const system of externalSystems) {
      const id = this.sanitizeId(system.name);
      const description = this.escapeQuotes(system.description);
      lines.push(`System_Ext(${id}, "${system.name}", "${description}")`);
    }

    if (externalSystems.length > 0) {
      lines.push('');
    }

    // Add relationships
    if (enrichedData?.relationships && enrichedData.relationships.length > 0) {
      // Add user -> first container relationship
      if (containers.length > 0) {
        const firstContainer = this.sanitizeId(containers[0].name);
        lines.push(`Rel(user, ${firstContainer}, "Uses")`);
      }

      // Use AI-provided inter-container relationships
      for (const rel of enrichedData.relationships) {
        const fromId = this.sanitizeId(rel.from);
        const toId = this.sanitizeId(rel.to);
        if (rel.technology) {
          lines.push(`Rel(${fromId}, ${toId}, "${rel.label}", "${rel.technology}")`);
        } else {
          lines.push(`Rel(${fromId}, ${toId}, "${rel.label}")`);
        }
      }

      // Add external system relationships from first container (if no explicit external rels in AI data)
      if (containers.length > 0 && externalSystems.length > 0) {
        const firstContainerId = this.sanitizeId(containers[0].name);
        for (const system of externalSystems) {
          const id = this.sanitizeId(system.name);
          lines.push(`Rel(${firstContainerId}, ${id}, "${system.relationship}", "${system.tech || 'API'}")`);
        }
      }
    } else {
      // Static fallback relationship generation
      if (containers.length > 0) {
        const firstContainer = this.sanitizeId(containers[0].name);
        lines.push(`Rel(user, ${firstContainer}, "Uses")`);

        // Add inter-container relationships based on detection
        const isElectronApp = staticData.technologies.includes('Electron');

        if (isElectronApp && containers.length >= 2) {
          // For Electron apps, add typical IPC relationships
          const containerIds = containers.map(c => this.sanitizeId(c.name));

          if (containerIds.some(id => id.includes('main'))) {
            const mainId = containerIds.find(id => id.includes('main')) || containerIds[0];
            const rendererId = containerIds.find(id => id.includes('renderer'));
            const preloadId = containerIds.find(id => id.includes('preload'));

            if (rendererId) {
              lines.push(`Rel(${mainId}, ${rendererId}, "IPC communication", "Electron IPC")`);
            }
            if (preloadId) {
              lines.push(`Rel(${mainId}, ${preloadId}, "Loads", "Context Bridge")`);
              if (rendererId) {
                lines.push(`Rel(${rendererId}, ${preloadId}, "Uses", "IPC Bridge")`);
              }
            }

            // Connect to database if present
            const dbContainer = containers.find(c => c.type === 'database');
            if (dbContainer) {
              const dbId = this.sanitizeId(dbContainer.name);
              lines.push(`Rel(${mainId}, ${dbId}, "Reads/writes")`);
            }
          }
        } else {
          // For non-Electron apps, add basic container relationships
          for (let i = 0; i < containers.length - 1; i++) {
            const fromId = this.sanitizeId(containers[i].name);
            const toId = this.sanitizeId(containers[i + 1].name);
            lines.push(`Rel(${fromId}, ${toId}, "Uses")`);
          }
        }
      }

      // Add external relationships from first container
      if (containers.length > 0 && externalSystems.length > 0) {
        const firstContainerId = this.sanitizeId(containers[0].name);
        for (const system of externalSystems) {
          const id = this.sanitizeId(system.name);
          lines.push(`Rel(${firstContainerId}, ${id}, "${system.relationship}", "${system.tech || 'API'}")`);
        }
      }
    }

    lines.push('');
    lines.push('SHOW_LEGEND()');
    lines.push('@enduml');

    return lines.join('\n');
  }

  /**
   * Generates C4 Component diagram for a specific container.
   * Uses AI-provided components and relationships when available;
   * falls back to static analysis heuristics when enrichedData is null/empty.
   */
  generateComponentDiagram(
    enrichedData: EnrichedComponentLevel | null,
    staticData: AnalysisResult,
    containerId: string
  ): string {
    const lines: string[] = [];

    // Add C4-PlantUML include from stdlib (bundled with PlantUML JAR)
    lines.push('@startuml');
    lines.push('!include <C4/C4_Component>');
    lines.push('');

    // Add title
    lines.push(`title Component Diagram for ${containerId}`);
    lines.push('');

    // Determine container path filter
    const containerPath = this.getContainerPath(containerId);

    // Add container boundary
    lines.push(`Container_Boundary(${this.sanitizeId(containerId)}, "${containerId}") {`);

    // Determine components: use AI-provided or static fallback
    const useAiComponents = enrichedData?.components && enrichedData.components.length > 0;
    const components = useAiComponents
      ? enrichedData!.components.map(c => ({
          name: c.name,
          description: c.description,
          tech: c.technology || 'TypeScript',
        }))
      : this.detectComponents(staticData, containerPath);

    for (const component of components) {
      const id = this.sanitizeId(component.name);
      const description = this.escapeQuotes(component.description);
      const tech = this.escapeQuotes(component.tech);
      lines.push(`  Component(${id}, "${component.name}", "${tech}", "${description}")`);
    }

    lines.push('}');
    lines.push('');

    // Determine relationships: use AI-provided or static fallback
    if (enrichedData?.relationships && enrichedData.relationships.length > 0) {
      for (const rel of enrichedData.relationships) {
        const fromId = this.sanitizeId(rel.from);
        const toId = this.sanitizeId(rel.to);
        if (rel.technology) {
          lines.push(`Rel(${fromId}, ${toId}, "${rel.label}", "${rel.technology}")`);
        } else {
          lines.push(`Rel(${fromId}, ${toId}, "${rel.label}")`);
        }
      }

      lines.push('');
    } else {
      // Static fallback relationships
      const relationships = this.extractComponentRelationships(staticData, components);

      for (const rel of relationships) {
        const fromId = this.sanitizeId(rel.from);
        const toId = this.sanitizeId(rel.to);
        lines.push(`Rel(${fromId}, ${toId}, "${rel.label}")`);
      }

      if (relationships.length > 0) {
        lines.push('');
      }
    }

    lines.push('SHOW_LEGEND()');
    lines.push('@enduml');

    return lines.join('\n');
  }

  /**
   * Generates C4 Code diagram showing class-level details.
   * Uses static analysis exclusively — enrichedData is accepted for signature
   * consistency but NOT consumed at code level (UML class diagrams reflect actual code structure).
   */
  generateCodeDiagram(
    enrichedData: EnrichedArchitecture | null,  // eslint-disable-line @typescript-eslint/no-unused-vars
    staticData: AnalysisResult,
    componentId: string
  ): string {
    // enrichedData intentionally unused: code level uses static analysis only.
    void enrichedData;

    const lines: string[] = [];

    // Add PlantUML header (no C4 include - uses standard class diagram syntax)
    lines.push('@startuml');
    lines.push('');

    // Add title
    lines.push(`title Code Diagram for ${componentId}`);
    lines.push('');

    // Extract classes for this component
    const classes = staticData.structure.classes.filter(cls => {
      const fileName = cls.file.split('/').pop() || '';
      return fileName.includes(componentId) || cls.name === componentId;
    });

    const interfaces = staticData.structure.interfaces.filter(iface => {
      const fileName = iface.file.split('/').pop() || '';
      return fileName.includes(componentId) || iface.name.includes(componentId);
    });

    // Generate class definitions
    for (const cls of classes) {
      lines.push(`class ${cls.name} {`);

      // Add properties
      for (const prop of cls.properties) {
        lines.push(`  +${prop}`);
      }

      // Add methods
      for (const method of cls.methods) {
        lines.push(`  +${method}()`);
      }

      lines.push('}');
      lines.push('');
    }

    // Generate interface definitions
    for (const iface of interfaces) {
      lines.push(`interface ${iface.name} {`);

      // Add properties
      for (const prop of iface.properties) {
        const optional = prop.optional ? '?' : '';
        lines.push(`  ${prop.name}${optional}: ${prop.type}`);
      }

      lines.push('}');
      lines.push('');
    }

    // Generate relationships
    for (const cls of classes) {
      // Inheritance
      if (cls.extends) {
        const parentName = cls.extends.split('<')[0].trim(); // Handle generics
        lines.push(`${parentName} <|-- ${cls.name}`);
      }

      // Interface implementation
      for (const impl of cls.implements) {
        const interfaceName = impl.split('<')[0].trim(); // Handle generics
        lines.push(`${interfaceName} <|.. ${cls.name}`);
      }
    }

    // Add usage relationships from imports
    const usageRels = this.extractUsageRelationships(staticData, classes, interfaces);
    for (const rel of usageRels) {
      lines.push(`${rel.from} --> ${rel.to} : uses`);
    }

    lines.push('');
    lines.push('@enduml');

    return lines.join('\n');
  }

  // ========== Helper Methods ==========

  /**
   * Detects external systems from import patterns
   */
  private detectExternalSystems(staticData: AnalysisResult): Array<{
    name: string;
    description: string;
    relationship: string;
    tech?: string;
  }> {
    const systems: Array<{ name: string; description: string; relationship: string; tech?: string }> = [];

    // Check for GitHub API usage
    const hasGitHub = staticData.structure.imports.some(
      imp => imp.moduleSpecifier.includes('@octokit') || imp.moduleSpecifier.includes('octokit')
    );
    if (hasGitHub) {
      systems.push({
        name: 'GitHub',
        description: 'Source code hosting and API',
        relationship: 'Fetches repositories and data',
        tech: 'REST API',
      });
    }

    // Check for file system access
    const hasFileSystem = staticData.structure.imports.some(
      imp => imp.moduleSpecifier === 'fs' || imp.moduleSpecifier === 'fs/promises'
    );
    if (hasFileSystem) {
      systems.push({
        name: 'File System',
        description: 'Local repository storage',
        relationship: 'Reads/writes repository files',
        tech: 'Node.js fs',
      });
    }

    return systems;
  }

  /**
   * Detects containers from entry points and technology stack
   */
  private detectContainers(staticData: AnalysisResult): Array<{
    name: string;
    description: string;
    tech: string;
    type: 'container' | 'database';
  }> {
    const containers: Array<{ name: string; description: string; tech: string; type: 'container' | 'database' }> = [];

    // Main process container
    if (staticData.entryPoints.some(ep => ep.includes('main.ts'))) {
      containers.push({
        name: 'Main Process',
        description: 'Application lifecycle and IPC',
        tech: 'Electron/Node.js',
        type: 'container',
      });
    }

    // Renderer process container
    if (staticData.entryPoints.some(ep => ep.includes('App.tsx') || ep.includes('main.tsx'))) {
      containers.push({
        name: 'Renderer Process',
        description: 'User interface',
        tech: staticData.technologies.includes('React') ? 'React/TypeScript' : 'TypeScript',
        type: 'container',
      });
    }

    // Preload script container
    const hasPreload = staticData.structure.classes.some(
      cls => cls.file.includes('preload') || cls.file.includes('Preload')
    ) || staticData.structure.imports.some(
      imp => imp.file.includes('preload')
    );
    if (hasPreload) {
      containers.push({
        name: 'Preload Script',
        description: 'IPC bridge',
        tech: 'TypeScript',
        type: 'container',
      });
    }

    // Config store container
    const hasElectronStore = staticData.technologies.some(
      tech => tech.toLowerCase().includes('electron')
    );
    if (hasElectronStore) {
      containers.push({
        name: 'Config Store',
        description: 'Settings and tokens',
        tech: 'electron-store',
        type: 'database',
      });
    }

    return containers;
  }

  /**
   * Gets container path pattern for filtering
   */
  private getContainerPath(containerId: string): string {
    const pathMap: Record<string, string> = {
      'Main Process': 'src/main',
      'Renderer Process': 'src/renderer',
      'Preload Script': 'preload',
    };

    return pathMap[containerId] || containerId.toLowerCase();
  }

  /**
   * Detects components within a container.
   * Prefers pre-computed componentGroups from StaticAnalyzerService (ANLZ-03),
   * falls back to legacy class-directory-grouping for backward compatibility.
   */
  private detectComponents(staticData: AnalysisResult, containerPath: string): Array<{
    name: string;
    description: string;
    tech: string;
  }> {
    // Prefer pre-computed componentGroups from StaticAnalyzerService (ANLZ-03)
    if (staticData.componentGroups && staticData.componentGroups.length > 0) {
      return staticData.componentGroups
        .filter(group => {
          // Filter to groups that have files within the container path
          return group.files.some(f => f.includes(containerPath));
        })
        .map(group => ({
          name: group.label,  // "Service Layer" not "services"
          description: `${group.classCount} classes, ${group.functionCount} functions`,
          tech: this.inferTechFromQuality(staticData),
        }));
    }

    // Legacy fallback for AnalysisResult without componentGroups
    return this.detectComponentsLegacy(staticData, containerPath);
  }

  /**
   * Legacy component detection using class-directory-grouping.
   * Preserved for backward compatibility with cached AnalysisResult without componentGroups.
   */
  private detectComponentsLegacy(staticData: AnalysisResult, containerPath: string): Array<{
    name: string;
    description: string;
    tech: string;
  }> {
    const components: Array<{ name: string; description: string; tech: string }> = [];
    const componentMap = new Map<string, { files: string[]; classes: string[] }>();

    // Group classes by directory within container
    for (const cls of staticData.structure.classes) {
      if (!cls.file.includes(containerPath)) continue;

      // Extract component name from path (e.g., services, stores, components)
      const pathParts = cls.file.split('/');
      const containerIndex = pathParts.findIndex(part => part === containerPath.split('/').pop());

      if (containerIndex >= 0 && containerIndex < pathParts.length - 1) {
        const componentName = pathParts[containerIndex + 1];

        if (!componentMap.has(componentName)) {
          componentMap.set(componentName, { files: [], classes: [] });
        }

        const component = componentMap.get(componentName)!;
        component.files.push(cls.file);
        component.classes.push(cls.name);
      }
    }

    // Convert map to component array
    for (const [name, data] of componentMap.entries()) {
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      components.push({
        name: capitalizedName,
        description: `${data.classes.length} ${name} handling ${name.replace(/s$/, '')} logic`,
        tech: 'TypeScript',
      });
    }

    return components;
  }

  /**
   * Infers technology label from analysis quality indicator
   */
  private inferTechFromQuality(staticData: AnalysisResult): string {
    const quality = staticData.metadata?.analysisQuality;
    if (quality === 'js-ast') return 'JavaScript';
    if (quality === 'file-structure') return 'File Structure';
    return 'TypeScript';
  }

  /**
   * Extracts component relationships from dependency graph
   */
  private extractComponentRelationships(
    staticData: AnalysisResult,
    components: Array<{ name: string; description: string; tech: string }>
  ): Array<{ from: string; to: string; label: string }> {
    const relationships: Array<{ from: string; to: string; label: string }> = [];

    // Build relationships from dependency edges
    for (const edge of staticData.dependencies.edges) {
      const fromComponent = this.findComponentForFile(edge.from, components);
      const toComponent = this.findComponentForFile(edge.to, components);

      if (fromComponent && toComponent && fromComponent !== toComponent) {
        // Avoid duplicates
        const exists = relationships.some(
          r => r.from === fromComponent && r.to === toComponent
        );

        if (!exists) {
          relationships.push({
            from: fromComponent,
            to: toComponent,
            label: 'uses',
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Finds component name for a given file path
   */
  private findComponentForFile(
    filePath: string,
    components: Array<{ name: string; description: string; tech: string }>
  ): string | null {
    for (const component of components) {
      const componentName = component.name.toLowerCase();
      if (filePath.toLowerCase().includes(componentName)) {
        return component.name;
      }
    }
    return null;
  }

  /**
   * Extracts usage relationships between classes
   */
  private extractUsageRelationships(
    staticData: AnalysisResult,
    classes: readonly { name: string; file: string }[],
    interfaces: readonly { name: string; file: string }[]
  ): Array<{ from: string; to: string }> {
    const relationships: Array<{ from: string; to: string }> = [];
    const classNames = new Set(classes.map(c => c.name));
    const interfaceNames = new Set(interfaces.map(i => i.name));

    // Check imports from classes in scope
    for (const cls of classes) {
      const imports = staticData.structure.imports.filter(imp => imp.file === cls.file);

      for (const imp of imports) {
        // Check if any imported symbol is a class or interface in scope
        for (const symbol of [...imp.namedImports, imp.defaultImport || '']) {
          if (classNames.has(symbol) || interfaceNames.has(symbol)) {
            relationships.push({
              from: cls.name,
              to: symbol,
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Sanitizes name to valid PlantUML identifier
   */
  private sanitizeId(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&'); // IDs can't start with number
  }

  /**
   * Escapes quotes in text for PlantUML
   */
  private escapeQuotes(text: string): string {
    return text.replace(/"/g, '\\"');
  }

  /**
   * Generates hierarchical element ID
   */
  generateElementId(level: string, name: string): string {
    return `${level}_${this.sanitizeId(name)}`;
  }
}
