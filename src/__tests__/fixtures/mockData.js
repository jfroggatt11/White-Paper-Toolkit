// Mock data for component testing
export const mockThemes = [
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
];

export const mockBarriers = [
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
];

export const mockResources = [
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
];
