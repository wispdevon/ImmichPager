import type { DraftEditorPage } from './contracts';

export const pageManagementFilters = [
  { value: 'all', label: 'All pages' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'changes', label: 'Unpublished changes' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'updating', label: 'Updating' },
] as const;

export type PageManagementFilter =
  (typeof pageManagementFilters)[number]['value'];

type PageSummary = Pick<
  DraftEditorPage,
  'title' | 'slug' | 'status' | 'publishedSlug' | 'hasUnpublishedChanges'
>;

function matchesFilter(page: PageSummary, filter: PageManagementFilter) {
  switch (filter) {
    case 'all':
      return true;
    case 'drafts':
      return page.status === 'draft';
    case 'published':
      return page.status === 'published';
    case 'changes':
      return page.status === 'published' && page.hasUnpublishedChanges;
    case 'attention':
      return page.status === 'error';
    case 'updating':
      return page.status === 'syncing';
  }
}

export function filterManagementPages<T extends PageSummary>(
  pages: readonly T[],
  search: string,
  filter: PageManagementFilter,
): T[] {
  const query = search.toLowerCase();
  return pages.filter(
    (page) =>
      `${page.title} ${page.slug}`.toLowerCase().includes(query) &&
      matchesFilter(page, filter),
  );
}
