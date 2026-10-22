import { expect, it } from 'vitest';
import type { DraftEditorPage } from '../src/lib/contracts';
import { filterManagementPages } from '../src/lib/page-management';

type PageSummary = Pick<
  DraftEditorPage,
  'title' | 'slug' | 'status' | 'publishedSlug' | 'hasUnpublishedChanges'
>;

const pages: PageSummary[] = [
  {
    title: 'Private draft',
    slug: 'private-draft',
    status: 'draft',
    publishedSlug: null,
    hasUnpublishedChanges: true,
  },
  {
    title: 'Published page',
    slug: 'published-page',
    status: 'published',
    publishedSlug: 'published-page',
    hasUnpublishedChanges: false,
  },
  {
    title: 'Published with edits',
    slug: 'published-with-edits',
    status: 'published',
    publishedSlug: 'published-with-edits',
    hasUnpublishedChanges: true,
  },
  {
    title: 'Needs attention',
    slug: 'needs-attention',
    status: 'error',
    publishedSlug: null,
    hasUnpublishedChanges: true,
  },
  {
    title: 'Syncing page',
    slug: 'syncing-page',
    status: 'syncing',
    publishedSlug: null,
    hasUnpublishedChanges: true,
  },
];

it('filters pages by their management status without confusing failed or syncing pages', () => {
  expect(
    filterManagementPages(pages, '', 'drafts').map((page) => page.slug),
  ).toEqual(['private-draft']);
  expect(
    filterManagementPages(pages, '', 'published').map((page) => page.slug),
  ).toEqual(['published-page', 'published-with-edits']);
  expect(
    filterManagementPages(pages, '', 'changes').map((page) => page.slug),
  ).toEqual(['published-with-edits']);
  expect(
    filterManagementPages(pages, '', 'attention').map((page) => page.slug),
  ).toEqual(['needs-attention']);
  expect(
    filterManagementPages(pages, '', 'updating').map((page) => page.slug),
  ).toEqual(['syncing-page']);
});

it('combines case-insensitive title or URL search with the selected status', () => {
  expect(
    filterManagementPages(pages, 'PUBLISHED-WITH', 'changes').map(
      (page) => page.title,
    ),
  ).toEqual(['Published with edits']);
  expect(filterManagementPages(pages, 'private', 'published')).toEqual([]);
  expect(filterManagementPages(pages, '', 'all')).toEqual(pages);
});
