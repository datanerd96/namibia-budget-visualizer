import '@testing-library/jest-dom/vitest'; // Extends expect with jest-dom matchers for Vitest
// import '@testing-library/jest-dom'; // Alternative if the above doesn't work directly, depends on exact versions

// Any other global setup for tests can go here
// For example, mocking global objects or functions:
// global.ResizeObserver = require('resize-observer-polyfill') // If charts need it and it's not in jsdom

// Mock Recharts ResponsiveContainer as it can cause issues in JSDOM if not properly handled
// Vitest's mocking API is similar to Jest's
vi.mock('recharts', async () => {
  const OriginalModule = await vi.importActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container-mock">{children}</div>,
    // Mock other specific Recharts components if they cause issues
    // Treemap: ({ children }) => <div data-testid="treemap-mock">{children}</div>,
  };
});
