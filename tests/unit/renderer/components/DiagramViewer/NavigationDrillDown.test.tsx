/**
 * NavigationDrillDown.test.tsx
 *
 * Tests for SVG click handler traversal logic and CSS interception patch.
 * Covers NAV-04: extractElementIdFromClick handles transparent overlay elements
 * and PlantUML link wrappers (<a> elements) without elem_ prefix.
 */

import { describe, it, expect } from 'vitest';
import { extractElementIdFromClick, patchSvgClickInterception } from '../../../../../src/renderer/components/PlantUMLRenderer';

// Helper: create an SVG namespace element
function svgEl(tag: string, attrs: Record<string, string> = {}): Element {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// Helper: create a plain HTML element
function htmlEl(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// Build a DOM tree and return [root, target].
// root acts as the click boundary (event.currentTarget).
// Call tree: root -> ... -> target (click starts at target, traverses to root).
function buildTree(...elements: Element[]): [Element, Element] {
  // elements[0] = root (boundary), elements[last] = target (click origin)
  for (let i = 0; i < elements.length - 1; i++) {
    elements[i].appendChild(elements[i + 1]);
  }
  return [elements[0], elements[elements.length - 1]];
}

describe('extractElementIdFromClick', () => {
  it('Test 1: extracts elem_ id when click originates inside transparent <a> wrapper', () => {
    // PlantUML structure: <g id="elem_Main_Process"> > <a href="" id="link_1"> > <rect> (click target)
    const boundary = svgEl('svg');
    const group = svgEl('g', { id: 'elem_Main_Process' });
    const aLink = svgEl('a', { href: '', id: 'link_1' });
    const rect = svgEl('rect', { fill: '#dde', width: '100', height: '50' });
    boundary.appendChild(group);
    group.appendChild(aLink);
    aLink.appendChild(rect);

    const result = extractElementIdFromClick(rect, boundary);
    expect(result).toBe('Main_Process');
  });

  it('Test 2: traverses up from transparent <rect fill="none" pointer-events="all"> to find parent elem_ group', () => {
    // Structure: <g id="elem_Renderer"> > <rect fill="none" pointer-events="all"> (click target)
    const boundary = svgEl('svg');
    const group = svgEl('g', { id: 'elem_Renderer' });
    const overlayRect = svgEl('rect', { fill: 'none', 'pointer-events': 'all' });
    boundary.appendChild(group);
    group.appendChild(overlayRect);

    const result = extractElementIdFromClick(overlayRect, boundary);
    expect(result).toBe('Renderer');
  });

  it('Test 3: extracts id from element with id="elem_Renderer" directly (baseline — no regression)', () => {
    // Structure: <g id="elem_Renderer"> (click target)
    const boundary = svgEl('svg');
    const group = svgEl('g', { id: 'elem_Renderer' });
    boundary.appendChild(group);

    const result = extractElementIdFromClick(group, boundary);
    expect(result).toBe('Renderer');
  });

  it('Test 4: skips <a> without elem_ prefix and finds elem_ parent', () => {
    // Structure: <g id="elem_APIServer"> > <a href="" id="link_2"> (no elem_ prefix — click target)
    const boundary = svgEl('svg');
    const group = svgEl('g', { id: 'elem_APIServer' });
    const aLink = svgEl('a', { href: '', id: 'link_2' });
    boundary.appendChild(group);
    group.appendChild(aLink);

    const result = extractElementIdFromClick(aLink, boundary);
    expect(result).toBe('APIServer');
  });

  it('returns null when no elem_ group found (click on diagram background)', () => {
    const boundary = svgEl('svg');
    const bgRect = svgEl('rect', { id: 'svg_root', fill: '#fff' });
    boundary.appendChild(bgRect);

    const result = extractElementIdFromClick(bgRect, boundary);
    expect(result).toBeNull();
  });

  it('skips elements with ids starting with _ (internal PlantUML IDs)', () => {
    // Structure: <g id="_internal_1"> > <g id="elem_Container1">
    const boundary = svgEl('svg');
    const internalGroup = svgEl('g', { id: '_internal_1' });
    const targetGroup = svgEl('g', { id: 'elem_Container1' });
    boundary.appendChild(internalGroup);
    internalGroup.appendChild(targetGroup);

    const result = extractElementIdFromClick(targetGroup, boundary);
    expect(result).toBe('Container1');
  });
});

describe('patchSvgClickInterception', () => {
  it('Test 5: sets pointer-events:none on <a href=""> elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const aEmpty = document.createElementNS('http://www.w3.org/2000/svg', 'a');
    aEmpty.setAttribute('href', '');
    svg.appendChild(aEmpty);

    patchSvgClickInterception(svg);

    expect((aEmpty as HTMLElement).style.pointerEvents).toBe('none');
  });

  it('Test 6: sets pointer-events:none on <rect fill="none" pointer-events="all"> elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    overlay.setAttribute('fill', 'none');
    overlay.setAttribute('pointer-events', 'all');
    svg.appendChild(overlay);

    patchSvgClickInterception(svg);

    expect((overlay as HTMLElement).style.pointerEvents).toBe('none');
  });

  it('does NOT patch <rect fill="none"> without pointer-events="all" or "painted"', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const normalRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    normalRect.setAttribute('fill', 'none');
    // No pointer-events attribute
    svg.appendChild(normalRect);

    patchSvgClickInterception(svg);

    // pointer-events should be untouched (empty string means not set)
    expect((normalRect as HTMLElement).style.pointerEvents).toBe('');
  });

  it('sets pointer-events:none on <rect fill="none" pointer-events="painted"> elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    overlay.setAttribute('fill', 'none');
    overlay.setAttribute('pointer-events', 'painted');
    svg.appendChild(overlay);

    patchSvgClickInterception(svg);

    expect((overlay as HTMLElement).style.pointerEvents).toBe('none');
  });
});
