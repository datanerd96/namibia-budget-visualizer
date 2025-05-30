import { render, screen, fireEvent } from '@testing-library/react';
import App from './App'; // The main App component
import { AppThemeProvider } from './contexts/AppThemeContext'; // Needed as App uses useAppTheme

// Mock the API service to prevent actual API calls during tests
// vi.mock('./services/api', () => ({
//   fetchDistinctValues: vi.fn().mockResolvedValue([]), // Mock other functions as needed
// }));

// If child components make API calls on mount (e.g. Controls), they might need more specific mocks
// For App.tsx itself, we mainly test the shell.

describe('App Component', () => {
  beforeEach(() => {
    // Wrap App with ThemeProvider, as it's used internally for theme toggle
    render(
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
    );
  });

  test('renders the main application title', () => {
    expect(screen.getByText(/Namibia Budget Visualiser/i)).toBeInTheDocument();
  });

  test('renders the theme toggle button', () => {
    // The button has an aria-label that changes, check for its presence by initial label or role
    expect(screen.getByRole('button', { name: /activate dark mode/i })).toBeInTheDocument();
  });

  test('theme toggle button changes theme (visual check via aria-label change)', () => {
    const themeToggleButton = screen.getByRole('button', { name: /activate dark mode/i });
    fireEvent.click(themeToggleButton);
    // Now the label should change to 'activate light mode'
    expect(screen.getByRole('button', { name: /activate light mode/i })).toBeInTheDocument();
    // Click again to toggle back
    fireEvent.click(themeToggleButton);
    expect(screen.getByRole('button', { name: /activate dark mode/i })).toBeInTheDocument();
  });

  test('renders placeholder for Controls section', () => {
    expect(screen.getByText(/Controls Area/i)).toBeInTheDocument();
  });

  test('renders placeholder for KPI Cards section', () => {
    expect(screen.getByText(/KPI Cards Area/i)).toBeInTheDocument();
  });

  test('renders placeholder for Stacked Bar Chart section', () => {
    expect(screen.getByText(/Stacked Bar Chart Area/i)).toBeInTheDocument();
  });

  test('renders footer', () => {
    expect(screen.getByText(/Economic Association of Namibia & IPPR/i)).toBeInTheDocument();
  });
});
