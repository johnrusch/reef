import React from 'react';

export interface TestComponentProps {
  title: string;
}

/** A test React component */
export function TestComponent({ title }: TestComponentProps): React.ReactElement {
  return React.createElement('div', null, title);
}
