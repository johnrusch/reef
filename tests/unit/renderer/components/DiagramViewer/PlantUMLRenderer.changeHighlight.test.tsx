/**
 * Tests for SVG DOM change highlighting in PlantUMLRenderer (VISU-01, VISU-04)
 *
 * Tests the exported applyChangeHighlighting() function which is used by PlantUMLRenderer
 * via a useEffect after SVG content renders. Testing this standalone function avoids the
 * complexity of mocking PlantUML's async SVG generation pipeline.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { applyChangeHighlighting } from '../../../../../src/renderer/components/PlantUMLRenderer';

/**
 * Build a minimal SVG container mimicking what PlantUML outputs.
 * PlantUML wraps each element in a <g id="elem_<elementId>"> group containing shapes.
 */
function buildSvgContainer(elementIds: string[]): Element {
  const wrapper = document.createElement('div');
  wrapper.className = 'diagram-wrapper';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  for (const id of elementIds) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', `elem_${id}`);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('fill', '#blue');
    rect.setAttribute('stroke', '#black');
    group.appendChild(rect);

    svg.appendChild(group);
  }

  wrapper.appendChild(svg);
  return wrapper;
}

describe('applyChangeHighlighting', () => {
  describe('VISU-01 — direct changed elements get amber fill', () => {
    it('sets data-changed="direct" on direct elements', () => {
      const container = buildSvgContainer(['Services', 'Database']);

      applyChangeHighlighting(container, ['Services'], []);

      const group = container.querySelector('[id="elem_Services"]');
      expect(group).not.toBeNull();
      expect(group!.getAttribute('data-changed')).toBe('direct');
    });

    it('injects style with amber fill for direct elements', () => {
      const container = buildSvgContainer(['Services']);

      applyChangeHighlighting(container, ['Services'], []);

      const styleEl = container.querySelector('style[data-reef-changes]');
      expect(styleEl).not.toBeNull();
      expect(styleEl!.textContent).toContain('rgba(251, 191, 36, 0.25)');
    });

    it('does not set data-changed on non-changed elements', () => {
      const container = buildSvgContainer(['Services', 'Database']);

      applyChangeHighlighting(container, ['Services'], []);

      const dbGroup = container.querySelector('[id="elem_Database"]');
      expect(dbGroup!.getAttribute('data-changed')).toBeNull();
    });
  });

  describe('VISU-04 — inherited changed elements get dashed border', () => {
    it('sets data-changed="inherited" on inherited elements', () => {
      const container = buildSvgContainer(['ApiGateway', 'Frontend']);

      applyChangeHighlighting(container, [], ['ApiGateway']);

      const group = container.querySelector('[id="elem_ApiGateway"]');
      expect(group!.getAttribute('data-changed')).toBe('inherited');
    });

    it('injects style with stroke-dasharray for inherited elements', () => {
      const container = buildSvgContainer(['ApiGateway']);

      applyChangeHighlighting(container, [], ['ApiGateway']);

      const styleEl = container.querySelector('style[data-reef-changes]');
      expect(styleEl).not.toBeNull();
      expect(styleEl!.textContent).toContain('stroke-dasharray: 4 2');
    });

    it('VISU-04 — direct and inherited styled differently', () => {
      const container = buildSvgContainer(['DirectService', 'InheritedService']);

      applyChangeHighlighting(container, ['DirectService'], ['InheritedService']);

      const directGroup = container.querySelector('[id="elem_DirectService"]');
      const inheritedGroup = container.querySelector('[id="elem_InheritedService"]');

      expect(directGroup!.getAttribute('data-changed')).toBe('direct');
      expect(inheritedGroup!.getAttribute('data-changed')).toBe('inherited');

      // They must have different attribute values
      expect(directGroup!.getAttribute('data-changed')).not.toBe(
        inheritedGroup!.getAttribute('data-changed')
      );
    });
  });

  describe('VISU-01 — highlights reset when IDs change', () => {
    it('removes data-changed attributes when called with empty arrays', () => {
      const container = buildSvgContainer(['Services', 'Database']);

      // First call: apply highlights
      applyChangeHighlighting(container, ['Services'], ['Database']);
      expect(container.querySelector('[data-changed]')).not.toBeNull();

      // Second call: clear highlights
      applyChangeHighlighting(container, [], []);
      expect(container.querySelector('[data-changed]')).toBeNull();
    });

    it('replaces existing style block on re-application', () => {
      const container = buildSvgContainer(['Services']);

      applyChangeHighlighting(container, ['Services'], []);
      applyChangeHighlighting(container, ['Services'], []);

      // Should only have one style block (not accumulate)
      const styleBlocks = container.querySelectorAll('style[data-reef-changes]');
      expect(styleBlocks.length).toBe(1);
    });

    it('removes previous data-changed attributes before applying new ones', () => {
      const container = buildSvgContainer(['Services', 'Database']);

      // Apply direct to Services
      applyChangeHighlighting(container, ['Services'], []);
      expect(container.querySelector('[id="elem_Services"]')!.getAttribute('data-changed')).toBe('direct');

      // Re-apply with only Database direct — Services should be cleared
      applyChangeHighlighting(container, ['Database'], []);
      expect(container.querySelector('[id="elem_Services"]')!.getAttribute('data-changed')).toBeNull();
      expect(container.querySelector('[id="elem_Database"]')!.getAttribute('data-changed')).toBe('direct');
    });
  });

  describe('edge cases', () => {
    it('does nothing when element IDs are not found in SVG', () => {
      const container = buildSvgContainer(['Services']);

      // Apply for non-existent element IDs — should not throw
      expect(() => {
        applyChangeHighlighting(container, ['NonExistent'], ['AlsoNonExistent']);
      }).not.toThrow();

      // No data-changed attributes should be set
      expect(container.querySelector('[data-changed]')).toBeNull();
    });

    it('handles empty arrays gracefully', () => {
      const container = buildSvgContainer(['Services']);

      expect(() => {
        applyChangeHighlighting(container, [], []);
      }).not.toThrow();
    });

    it('injects style block even with empty ID arrays', () => {
      const container = buildSvgContainer(['Services']);

      applyChangeHighlighting(container, [], []);

      // Style block is always injected if SVG exists
      const styleEl = container.querySelector('style[data-reef-changes]');
      expect(styleEl).not.toBeNull();
    });
  });
});
