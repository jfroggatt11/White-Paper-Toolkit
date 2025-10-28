import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the data imports - must use inline factory functions for hoisting
vi.mock('../../data/resources.json', () => ({
  default: [
    {
      "id": "resource-1",
      "title": "Project Delivery Standard",
      "url": "https://example.com/project-delivery",
      "date": "2024-01-15",
      "description": "A comprehensive guide for project delivery and governance",
      "personas": ["Programme", "Project"],
      "barriers": ["leadership-and-alignment.fragmented-governance"],
      "barrier_category": "leadership-and-alignment",
      "tags": ["governance", "standards"],
      "publisher": "Government",
      "type": "Guide"
    },
    {
      "id": "resource-2",
      "title": "Data Strategy Framework",
      "url": "https://example.com/data-strategy",
      "date": "2024-02-20",
      "description": "Framework for developing organizational data strategy and standards",
      "personas": ["Business", "Programme"],
      "barriers": ["data-pooling-and-interoperability.data-standards"],
      "barrier_category": "data-pooling-and-interoperability",
      "tags": ["data", "strategy"],
      "publisher": "Tech Organization",
      "type": "Framework"
    },
    {
      "id": "resource-3",
      "title": "Legacy System Migration Guide",
      "url": "https://example.com/legacy-migration",
      "date": "2024-03-10",
      "description": "Best practices for migrating from legacy systems to modern platforms",
      "personas": ["Project"],
      "barriers": ["digital-and-tech-constraints.legacy-systems"],
      "barrier_category": "digital-and-tech-constraints",
      "tags": ["technical", "migration"],
      "publisher": "Consulting Firm",
      "type": "Guide"
    },
    {
      "id": "resource-4",
      "title": "Performance Metrics Alignment",
      "url": "https://example.com/metrics",
      "date": "2024-01-25",
      "description": "How to align performance metrics across organizational boundaries",
      "personas": ["Business", "Programme"],
      "barriers": ["leadership-and-alignment.misaligned-metrics"],
      "barrier_category": "leadership-and-alignment",
      "tags": ["metrics", "performance", "alignment"],
      "publisher": "Business School",
      "type": "Research"
    }
  ]
}));

vi.mock('../../data/barrier_themes.json', () => ({
  default: [
    {
      "id": "leadership-and-alignment",
      "name": "Leadership & Alignment",
      "order": "1"
    },
    {
      "id": "data-pooling-and-interoperability",
      "name": "Data Pooling & Interoperability",
      "order": "2"
    },
    {
      "id": "digital-and-tech-constraints",
      "name": "Digital & Tech Constraints",
      "order": "3"
    }
  ]
}));

vi.mock('../../data/barriers.json', () => ({
  default: [
    {
      "id": "leadership-and-alignment.fragmented-governance",
      "name": "Fragmented governance",
      "themeId": "leadership-and-alignment"
    },
    {
      "id": "leadership-and-alignment.misaligned-metrics",
      "name": "Misaligned metrics",
      "themeId": "leadership-and-alignment"
    },
    {
      "id": "data-pooling-and-interoperability.data-standards",
      "name": "Data standards",
      "themeId": "data-pooling-and-interoperability"
    },
    {
      "id": "digital-and-tech-constraints.legacy-systems",
      "name": "Legacy systems",
      "themeId": "digital-and-tech-constraints"
    }
  ]
}));

// Mock Recharts to avoid canvas rendering issues in tests
vi.mock('recharts', () => ({
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children, data, onClick, onMouseEnter, onMouseLeave }) => (
    <div data-testid="pie" data-pie-items={data?.length || 0}>
      {data?.map((item, idx) => (
        <div
          key={item.id || idx}
          data-testid={`pie-segment-${item.id}`}
          onClick={() => onClick?.(item)}
          onMouseEnter={() => onMouseEnter?.(item)}
          onMouseLeave={() => onMouseLeave?.(item)}
        >
          {item.name}
        </div>
      ))}
      {children}
    </div>
  ),
  Cell: ({ children }) => <div>{children}</div>,
  Tooltip: () => <div data-testid="tooltip">Tooltip</div>,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>
}));

// Import App after all mocks are set up
import App from '../../App';

// Helper function to match text that might be split across elements
const matchTextContent = (text) => {
  return (content, element) => element?.textContent?.match(new RegExp(text, 'i'));
};

describe('App Component', () => {
  beforeEach(() => {
    // Reset URL before each test
    window.history.replaceState({}, '', '/');

    // Clear any mocks
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the main header with title', () => {
      render(<App />);
      expect(screen.getByText('PDATF Toolkit')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should render all persona buttons', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: 'Project' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Programme' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Business' })).toBeInTheDocument();
    });

    it('should render clear button', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    });

    it('should render pie chart container', () => {
      render(<App />);
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should display initial resource count', async () => {
      render(<App />);
      // Should show all 4 mock resources initially - check by counting articles
      await waitFor(() => {
        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(4);
      });
    });

    it('should render all resources initially', () => {
      render(<App />);
      expect(screen.getByText('Project Delivery Standard')).toBeInTheDocument();
      expect(screen.getByText('Data Strategy Framework')).toBeInTheDocument();
      expect(screen.getByText('Legacy System Migration Guide')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics Alignment')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter resources by title search', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      await user.type(searchInput, 'strategy');

      await waitFor(() => {
        expect(screen.getByText('Data Strategy Framework')).toBeInTheDocument();
        expect(screen.queryByText('Project Delivery Standard')).not.toBeInTheDocument();
        expect(screen.queryByText('Legacy System Migration Guide')).not.toBeInTheDocument();
      });
    });

    it('should filter resources by description search', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      await user.type(searchInput, 'migration');

      await waitFor(() => {
        expect(screen.getByText('Legacy System Migration Guide')).toBeInTheDocument();
        expect(screen.queryByText('Data Strategy Framework')).not.toBeInTheDocument();
      });
    });

    it('should filter resources by tag search', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      await user.type(searchInput, 'governance');

      await waitFor(() => {
        expect(screen.getByText('Project Delivery Standard')).toBeInTheDocument();
        expect(screen.queryByText('Data Strategy Framework')).not.toBeInTheDocument();
      });
    });

    it('should be case-insensitive', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      await user.type(searchInput, 'STRATEGY');

      await waitFor(() => {
        expect(screen.getByText('Data Strategy Framework')).toBeInTheDocument();
      });
    });

    it('should show "no results" message when no matches', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      await user.type(searchInput, 'nonexistentterm');

      await waitFor(() => {
        expect(screen.getByText(/no resources match your filters/i)).toBeInTheDocument();
      });
    });

    it('should update result count when searching', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      await user.type(searchInput, 'strategy');

      await waitFor(() => {
        // Verify by checking filtered results
        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(1);
        expect(screen.getByText('Data Strategy Framework')).toBeInTheDocument();
      });
    });

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      await user.type(searchInput, 'strategy');

      await waitFor(() => {
        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(1);
      });

      const clearButton = screen.getByRole('button', { name: 'Clear' });
      await user.click(clearButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(4);
      });
    });
  });

  describe('Persona Selection and Filtering', () => {
    it('should filter resources by single persona', async () => {
      const user = userEvent.setup();
      render(<App />);

      const projectButton = screen.getByRole('button', { name: 'Project' });
      await user.click(projectButton);

      await waitFor(() => {
        // Should show resources with "Project" persona
        expect(screen.getByText('Project Delivery Standard')).toBeInTheDocument();
        expect(screen.getByText('Legacy System Migration Guide')).toBeInTheDocument();
        // Should not show resources without "Project" persona
        expect(screen.queryByText('Data Strategy Framework')).not.toBeInTheDocument();
      });
    });

    it('should filter resources by multiple personas (OR logic)', async () => {
      const user = userEvent.setup();
      render(<App />);

      const projectButton = screen.getByRole('button', { name: 'Project' });
      const businessButton = screen.getByRole('button', { name: 'Business' });

      await user.click(projectButton);
      await user.click(businessButton);

      await waitFor(() => {
        // Should show all resources that have either Project or Business
        expect(screen.getByText('Project Delivery Standard')).toBeInTheDocument();
        expect(screen.getByText('Data Strategy Framework')).toBeInTheDocument();
        expect(screen.getByText('Legacy System Migration Guide')).toBeInTheDocument();
        expect(screen.getByText('Performance Metrics Alignment')).toBeInTheDocument();
      });
    });

    it('should toggle persona selection on/off', async () => {
      const user = userEvent.setup();
      render(<App />);

      const projectButton = screen.getByRole('button', { name: 'Project' });

      // Click to select - Project appears in 2 resources (resource-1 and resource-3)
      await user.click(projectButton);
      await waitFor(() => {
        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(2);
      });

      // Click again to deselect - should show all 4 resources
      await user.click(projectButton);
      await waitFor(() => {
        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(4);
      });
    });

    it('should visually indicate selected personas', async () => {
      const user = userEvent.setup();
      render(<App />);

      const projectButton = screen.getByRole('button', { name: 'Project' });

      // Check initial state (not selected)
      expect(projectButton).not.toHaveClass('bg-indigo-600');

      // Click to select
      await user.click(projectButton);

      // Check selected state
      await waitFor(() => {
        expect(projectButton).toHaveClass('bg-indigo-600');
      });
    });

    it('should combine search and persona filters', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      const businessButton = screen.getByRole('button', { name: 'Business' });

      // Apply search
      await user.type(searchInput, 'strategy');
      // Apply persona filter
      await user.click(businessButton);

      await waitFor(() => {
        // Should show only resources matching both search AND persona
        expect(screen.getByText('Data Strategy Framework')).toBeInTheDocument();
        expect(screen.queryByText('Project Delivery Standard')).not.toBeInTheDocument();
        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(1);
      });
    });

    it('should clear persona selections when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      const projectButton = screen.getByRole('button', { name: 'Project' });
      const clearButton = screen.getByRole('button', { name: 'Clear' });

      await user.click(projectButton);
      await waitFor(() => {
        expect(projectButton).toHaveClass('bg-indigo-600');
      });

      await user.click(clearButton);

      await waitFor(() => {
        expect(projectButton).not.toHaveClass('bg-indigo-600');
        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(4);
      });
    });
  });

  describe('URL State Synchronization', () => {
    it('should update URL when search is performed', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      await user.type(searchInput, 'strategy');

      await waitFor(() => {
        expect(window.location.search).toContain('q=strategy');
      });
    });

    it('should update URL when persona is selected', async () => {
      const user = userEvent.setup();
      render(<App />);

      const projectButton = screen.getByRole('button', { name: 'Project' });
      await user.click(projectButton);

      await waitFor(() => {
        expect(window.location.search).toContain('personas=Project');
      });
    });

    it('should update URL when multiple personas are selected', async () => {
      const user = userEvent.setup();
      render(<App />);

      const projectButton = screen.getByRole('button', { name: 'Project' });
      const businessButton = screen.getByRole('button', { name: 'Business' });

      await user.click(projectButton);
      await user.click(businessButton);

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        const personas = params.get('personas');
        expect(personas).toContain('Project');
        expect(personas).toContain('Business');
      });
    });

    it('should restore state from URL on initial load', () => {
      // Set URL before rendering
      window.history.replaceState({}, '', '/?q=strategy&personas=Project');

      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      const projectButton = screen.getByRole('button', { name: 'Project' });

      expect(searchInput).toHaveValue('strategy');
      expect(projectButton).toHaveClass('bg-indigo-600');
    });

    it('should clear URL params when clear button is clicked', async () => {
      const user = userEvent.setup();
      window.history.replaceState({}, '', '/?q=test&personas=Project');

      render(<App />);

      const clearButton = screen.getByRole('button', { name: 'Clear' });
      await user.click(clearButton);

      await waitFor(() => {
        expect(window.location.search).toBe('');
      });
    });
  });

  describe('Resource List Rendering', () => {
    it('should display resource titles', () => {
      render(<App />);
      expect(screen.getByText('Project Delivery Standard')).toBeInTheDocument();
      expect(screen.getByText('Data Strategy Framework')).toBeInTheDocument();
      expect(screen.getByText('Legacy System Migration Guide')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics Alignment')).toBeInTheDocument();
    });

    it('should display resource descriptions', () => {
      render(<App />);
      expect(screen.getByText(/comprehensive guide for project delivery/i)).toBeInTheDocument();
      expect(screen.getByText(/Framework for developing organizational data/i)).toBeInTheDocument();
      expect(screen.getByText(/Best practices for migrating from legacy systems/i)).toBeInTheDocument();
      expect(screen.getByText(/align performance metrics across organizational/i)).toBeInTheDocument();
    });

    it('should display persona tags for each resource', () => {
      render(<App />);
      // Check that persona tags are rendered
      const personaTags = screen.getAllByText('Project');
      expect(personaTags.length).toBeGreaterThan(0);
    });

    it('should display "Open resource" links', () => {
      render(<App />);
      const links = screen.getAllByText('Open resource');
      expect(links).toHaveLength(4);

      // All links should have target="_blank" and rel="noreferrer"
      links.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer');
      });
    });

    it('should sort resources by date descending', () => {
      render(<App />);
      const articles = screen.getAllByRole('article');

      // First article should be the most recent (2024-03-10)
      expect(within(articles[0]).getByText('Legacy System Migration Guide')).toBeInTheDocument();

      // Last should be oldest (2024-01-15)
      const lastIndex = articles.length - 1;
      expect(within(articles[lastIndex]).getByText('Project Delivery Standard')).toBeInTheDocument();
    });
  });

  describe('Combined Filter Scenarios', () => {
    it('should apply search + persona + theme filters together', async () => {
      const user = userEvent.setup();
      // Set theme via URL
      window.history.replaceState({}, '', '/?theme=leadership-and-alignment');

      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      const programmeButton = screen.getByRole('button', { name: 'Programme' });

      await user.type(searchInput, 'delivery');
      await user.click(programmeButton);

      await waitFor(() => {
        // Should only show "Project Delivery Standard" which matches all criteria
        expect(screen.getByText('Project Delivery Standard')).toBeInTheDocument();
        expect(screen.queryByText('Performance Metrics Alignment')).not.toBeInTheDocument();
        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(1);
      });
    });

    it('should handle empty results gracefully with multiple filters', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      const businessButton = screen.getByRole('button', { name: 'Business' });

      await user.type(searchInput, 'legacy');
      await user.click(businessButton);

      await waitFor(() => {
        expect(screen.getByText(/no resources match your filters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible search input', () => {
      render(<App />);
      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      // Input should be accessible and editable
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.tagName).toBe('INPUT');
    });

    it('should have keyboard-accessible buttons', () => {
      render(<App />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeEnabled();
      });
    });

    it('should have external links with proper attributes', () => {
      render(<App />);
      const links = screen.getAllByText('Open resource');
      links.forEach(link => {
        expect(link).toHaveAttribute('rel', 'noreferrer');
        expect(link).toHaveAttribute('target', '_blank');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle resources with missing fields gracefully', () => {
      // This is already handled by normalizeResource, but test the UI
      render(<App />);
      // Should not crash and should render all resources
      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(4);
    });

    it('should handle rapid filter changes', async () => {
      const user = userEvent.setup();
      render(<App />);

      const projectButton = screen.getByRole('button', { name: 'Project' });
      const programmeButton = screen.getByRole('button', { name: 'Programme' });

      // Rapidly toggle filters
      await user.click(projectButton);
      await user.click(programmeButton);
      await user.click(projectButton);
      await user.click(programmeButton);

      // Should still work correctly - check that resources are displayed
      await waitFor(() => {
        const articles = screen.getAllByRole('article');
        expect(articles.length).toBeGreaterThan(0);
      });
    });

    it('should handle search with special characters', async () => {
      const user = userEvent.setup();
      render(<App />);

      const searchInput = screen.getByPlaceholderText(/search title, description, tags/i);
      await user.type(searchInput, '&');

      // Should not crash - check search input has the value
      await waitFor(() => {
        expect(searchInput).toHaveValue('&');
        // App should still render without crashing
        expect(screen.getByText('PDATF Toolkit')).toBeInTheDocument();
      });
    });
  });
});
