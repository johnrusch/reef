import { render, screen, fireEvent, waitFor, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Enhanced render function with common providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  user?: ReturnType<typeof userEvent.setup>;
  wrapper?: ({ children }: { children: ReactNode }) => ReactElement;
}

interface CustomRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult => {
  const { initialRoute = '/', user = userEvent.setup(), wrapper, ...renderOptions } = options;

  // Create a wrapper component that includes common providers
  const Wrapper = ({ children }: { children: ReactNode }) => {
    // If a custom wrapper is provided, use it
    if (wrapper) {
      return wrapper({ children });
    }

    // Default wrapper with minimal providers
    return <div data-testid="test-wrapper">{children}</div>;
  };

  const result = render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });

  return {
    user,
    ...result,
  };
};

// Component interaction utilities
export const componentUtils = {
  // Input interactions
  async fillInput(element: HTMLElement, value: string) {
    const user = userEvent.setup();
    await user.clear(element);
    await user.type(element, value);
  },

  async selectOption(selectElement: HTMLElement, optionText: string) {
    const user = userEvent.setup();
    await user.selectOptions(selectElement, optionText);
  },

  async toggleCheckbox(checkboxElement: HTMLElement) {
    const user = userEvent.setup();
    await user.click(checkboxElement);
  },

  // Button interactions
  async clickButton(buttonText: string | RegExp) {
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: buttonText });
    await user.click(button);
    return button;
  },

  async doubleClickButton(buttonText: string | RegExp) {
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: buttonText });
    await user.dblClick(button);
    return button;
  },

  // Keyboard interactions
  async pressKey(key: string, element?: HTMLElement) {
    const user = userEvent.setup();
    if (element) {
      await user.type(element, `{${key}}`);
    } else {
      await user.keyboard(`{${key}}`);
    }
  },

  async pressKeyCombo(combo: string) {
    const user = userEvent.setup();
    await user.keyboard(combo);
  },

  // Mouse interactions
  async hoverElement(element: HTMLElement) {
    const user = userEvent.setup();
    await user.hover(element);
  },

  async unhoverElement(element: HTMLElement) {
    const user = userEvent.setup();
    await user.unhover(element);
  },

  // Drag and drop
  async dragAndDrop(source: HTMLElement, target: HTMLElement) {
    const user = userEvent.setup();
    await user.pointer([
      { target: source, coords: { x: 0, y: 0 } },
      { keys: '[MouseLeft>]' },
      { target: target, coords: { x: 0, y: 0 } },
      { keys: '[/MouseLeft]' },
    ]);
  },

  // Focus management
  async focusElement(element: HTMLElement) {
    const user = userEvent.setup();
    await user.click(element);
  },

  async tabToNext() {
    const user = userEvent.setup();
    await user.tab();
  },

  async tabToPrevious() {
    const user = userEvent.setup();
    await user.tab({ shift: true });
  },
};

// Assertion utilities
export const assertionUtils = {
  // Visibility assertions
  expectVisible(element: HTMLElement | null) {
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  },

  expectHidden(element: HTMLElement | null) {
    if (element) {
      expect(element).not.toBeVisible();
    } else {
      expect(element).not.toBeInTheDocument();
    }
  },

  // State assertions
  expectEnabled(element: HTMLElement) {
    expect(element).toBeEnabled();
    expect(element).not.toHaveAttribute('disabled');
  },

  expectDisabled(element: HTMLElement) {
    expect(element).toBeDisabled();
  },

  expectChecked(element: HTMLElement) {
    expect(element).toBeChecked();
  },

  expectUnchecked(element: HTMLElement) {
    expect(element).not.toBeChecked();
  },

  // Content assertions
  expectTextContent(element: HTMLElement, text: string | RegExp) {
    expect(element).toHaveTextContent(text);
  },

  expectValue(element: HTMLElement, value: string) {
    expect(element).toHaveValue(value);
  },

  expectAttributeValue(element: HTMLElement, attribute: string, value: string) {
    expect(element).toHaveAttribute(attribute, value);
  },

  // Class assertions
  expectHasClass(element: HTMLElement, className: string) {
    expect(element).toHaveClass(className);
  },

  expectNotHasClass(element: HTMLElement, className: string) {
    expect(element).not.toHaveClass(className);
  },

  // ARIA assertions
  expectAriaLabel(element: HTMLElement, label: string) {
    expect(element).toHaveAccessibleName(label);
  },

  expectAriaDescription(element: HTMLElement, description: string) {
    expect(element).toHaveAccessibleDescription(description);
  },

  // Focus assertions
  expectFocused(element: HTMLElement) {
    expect(element).toHaveFocus();
  },

  expectNotFocused(element: HTMLElement) {
    expect(element).not.toHaveFocus();
  },
};

// Query utilities
export const queryUtils = {
  // Common element queries
  findByTestId: (testId: string) => screen.findByTestId(testId),
  queryByTestId: (testId: string) => screen.queryByTestId(testId),
  getByTestId: (testId: string) => screen.getByTestId(testId),

  findByRole: (role: string, options?: any) => screen.findByRole(role, options),
  queryByRole: (role: string, options?: any) => screen.queryByRole(role, options),
  getByRole: (role: string, options?: any) => screen.getByRole(role, options),

  findByText: (text: string | RegExp) => screen.findByText(text),
  queryByText: (text: string | RegExp) => screen.queryByText(text),
  getByText: (text: string | RegExp) => screen.getByText(text),

  findByLabelText: (label: string | RegExp) => screen.findByLabelText(label),
  queryByLabelText: (label: string | RegExp) => screen.queryByLabelText(label),
  getByLabelText: (label: string | RegExp) => screen.getByLabelText(label),

  findByPlaceholderText: (placeholder: string | RegExp) => screen.findByPlaceholderText(placeholder),
  queryByPlaceholderText: (placeholder: string | RegExp) => screen.queryByPlaceholderText(placeholder),
  getByPlaceholderText: (placeholder: string | RegExp) => screen.getByPlaceholderText(placeholder),

  // Multiple elements
  findAllByTestId: (testId: string) => screen.findAllByTestId(testId),
  queryAllByTestId: (testId: string) => screen.queryAllByTestId(testId),
  getAllByTestId: (testId: string) => screen.getAllByTestId(testId),

  findAllByRole: (role: string, options?: any) => screen.findAllByRole(role, options),
  queryAllByRole: (role: string, options?: any) => screen.queryAllByRole(role, options),
  getAllByRole: (role: string, options?: any) => screen.getAllByRole(role, options),

  // Custom queries
  findFormField: (label: string | RegExp) => {
    return screen.findByLabelText(label);
  },

  findButton: (name: string | RegExp) => {
    return screen.findByRole('button', { name });
  },

  findLink: (name: string | RegExp) => {
    return screen.findByRole('link', { name });
  },

  findHeading: (name: string | RegExp, level?: number) => {
    return screen.findByRole('heading', { name, level });
  },

  findList: (name?: string | RegExp) => {
    return screen.findByRole('list', name ? { name } : undefined);
  },

  findListItem: (name: string | RegExp) => {
    return screen.findByRole('listitem', { name });
  },

  findDialog: (name?: string | RegExp) => {
    return screen.findByRole('dialog', name ? { name } : undefined);
  },

  findAlert: (name?: string | RegExp) => {
    return screen.findByRole('alert', name ? { name } : undefined);
  },
};

// Wait utilities
export const waitUtils = {
  // Wait for element to appear
  waitForElement: async (testId: string, timeout = 5000) => {
    return waitFor(() => screen.getByTestId(testId), { timeout });
  },

  // Wait for element to disappear
  waitForElementToDisappear: async (testId: string, timeout = 5000) => {
    return waitFor(() => {
      const element = screen.queryByTestId(testId);
      expect(element).not.toBeInTheDocument();
    }, { timeout });
  },

  // Wait for text to appear
  waitForText: async (text: string | RegExp, timeout = 5000) => {
    return waitFor(() => screen.getByText(text), { timeout });
  },

  // Wait for condition
  waitForCondition: async (condition: () => boolean | Promise<boolean>, timeout = 5000) => {
    return waitFor(async () => {
      const result = await condition();
      expect(result).toBe(true);
    }, { timeout });
  },

  // Wait for loading to complete
  waitForLoadingToComplete: async (loadingTestId = 'loading-indicator', timeout = 10000) => {
    return waitUtils.waitForElementToDisappear(loadingTestId, timeout);
  },

  // Wait for form submission
  waitForFormSubmission: async (submitButtonTestId: string, timeout = 5000) => {
    const submitButton = screen.getByTestId(submitButtonTestId);
    return waitFor(() => {
      expect(submitButton).toBeDisabled();
    }, { timeout });
  },
};

// Mock utilities for components
export const mockUtils = {
  // Mock React hooks
  mockUseState: <T>(initialValue: T) => {
    const setState = vi.fn();
    return [initialValue, setState] as const;
  },

  mockUseEffect: () => {
    return vi.fn();
  },

  mockUseCallback: <T extends (...args: any[]) => any>(callback: T) => {
    return vi.fn(callback);
  },

  mockUseMemo: <T>(value: T) => {
    return value;
  },

  // Mock component props
  createMockProps: <T extends Record<string, any>>(defaults: T, overrides: Partial<T> = {}): T => {
    return { ...defaults, ...overrides };
  },

  // Mock event handlers
  createMockEventHandlers: () => ({
    onClick: vi.fn(),
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    onFocus: vi.fn(),
    onBlur: vi.fn(),
    onKeyDown: vi.fn(),
    onKeyUp: vi.fn(),
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
  }),

  // Mock refs
  createMockRef: <T>(current: T | null = null) => ({
    current,
  }),
};

// Testing utilities for specific component patterns
export const patternUtils = {
  // Test form components
  async testFormField(
    fieldLabel: string,
    value: string,
    expectedValue?: string
  ) {
    const field = await queryUtils.findFormField(fieldLabel);
    await componentUtils.fillInput(field, value);
    assertionUtils.expectValue(field, expectedValue || value);
    return field;
  },

  // Test button interactions
  async testButtonClick(
    buttonName: string | RegExp,
    expectedAction?: () => void | Promise<void>
  ) {
    const button = await componentUtils.clickButton(buttonName);
    if (expectedAction) {
      await expectedAction();
    }
    return button;
  },

  // Test modal/dialog patterns
  async testModal(
    triggerButtonName: string | RegExp,
    modalTestId: string,
    closeAction?: () => Promise<void>
  ) {
    // Open modal
    await componentUtils.clickButton(triggerButtonName);
    const modal = await queryUtils.findByTestId(modalTestId);
    assertionUtils.expectVisible(modal);

    // Close modal if close action provided
    if (closeAction) {
      await closeAction();
      await waitUtils.waitForElementToDisappear(modalTestId);
    }

    return modal;
  },

  // Test list/table patterns
  async testListRendering(
    listTestId: string,
    expectedItemCount: number,
    itemTestIdPattern?: string
  ) {
    const list = await queryUtils.findByTestId(listTestId);
    assertionUtils.expectVisible(list);

    if (itemTestIdPattern) {
      const items = await queryUtils.findAllByTestId(itemTestIdPattern);
      expect(items).toHaveLength(expectedItemCount);
      return items;
    }

    return list;
  },

  // Test loading states
  async testLoadingState(
    triggerAction: () => Promise<void>,
    loadingTestId = 'loading-indicator'
  ) {
    // Trigger loading
    await triggerAction();
    
    // Check loading appears
    const loadingElement = await queryUtils.findByTestId(loadingTestId);
    assertionUtils.expectVisible(loadingElement);

    // Wait for loading to complete
    await waitUtils.waitForLoadingToComplete(loadingTestId);
  },

  // Test error states
  async testErrorState(
    triggerAction: () => Promise<void>,
    errorTestId = 'error-message',
    expectedErrorMessage?: string | RegExp
  ) {
    await triggerAction();
    
    const errorElement = await queryUtils.findByTestId(errorTestId);
    assertionUtils.expectVisible(errorElement);

    if (expectedErrorMessage) {
      assertionUtils.expectTextContent(errorElement, expectedErrorMessage);
    }

    return errorElement;
  },
};

// Cleanup utilities
export const cleanupUtils = {
  // Reset all mocks
  resetAllMocks: () => {
    vi.clearAllMocks();
  },

  // Clear mock implementations
  clearMockImplementations: (...mocks: any[]) => {
    mocks.forEach(mock => {
      if (vi.isMockFunction(mock)) {
        mock.mockClear();
      }
    });
  },

  // Restore original implementations
  restoreAllMocks: () => {
    vi.restoreAllMocks();
  },
};

// Export all utilities
export {
  renderWithProviders as render,
  screen,
  fireEvent,
  waitFor,
  userEvent,
  componentUtils,
  assertionUtils,
  queryUtils,
  waitUtils,
  mockUtils,
  patternUtils,
  cleanupUtils,
};