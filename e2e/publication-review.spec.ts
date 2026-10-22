import { expect, test } from '@playwright/test';
import {
  closeCustomize,
  openCustomize,
  openAdvancedDesign,
} from './customize-helper';

test('reviews album and appearance changes before they replace the live page', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  const albums = await (await page.request.get('/page/api/albums')).json();
  expect(albums.length).toBeGreaterThan(1);
  const [removedAlbum, addedAlbum] = albums;
  const response = await page.request.post('/page/api/pages', {
    headers: { origin: 'http://127.0.0.1:3200' },
    data: {
      title: 'Acme current season',
      slug: 'review-snapshot',
      albumIds: [removedAlbum.id],
    },
  });
  expect(response.ok()).toBe(true);
  const draft = await response.json();

  await page.goto(`/page/manage/${draft.id}`);
  await page.getByRole('button', { name: 'Publish page', exact: true }).click();
  const firstReview = page.getByRole('dialog', {
    name: 'Review publication',
    exact: true,
  });
  await expect(firstReview).toContainText(removedAlbum.albumName);
  await firstReview.getByRole('button', { name: 'Publish page' }).click();
  await expect(page.getByRole('status')).toContainText('Page published');

  await page
    .getByRole('button', {
      name: `Remove ${removedAlbum.albumName}`,
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Select albums', exact: true })
    .click();
  await page
    .getByRole('checkbox', {
      name: `Include ${addedAlbum.albumName}`,
      exact: true,
    })
    .check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Edit title, Acme current season',
      exact: true,
    })
    .click();
  const title = page.getByLabel('Title', { exact: true });
  await title.fill('Acme autumn season');
  await title.press('Tab');
  await openCustomize(page);
  await openAdvancedDesign(page);
  await page.getByRole('button', { name: 'Header size', exact: true }).click();
  await page.getByRole('option', { name: 'Tall', exact: true }).click();
  for (let step = 0; step < 4; step++)
    await page.getByRole('slider', { name: 'Logo size' }).press('ArrowRight');
  for (let step = 0; step < 4; step++)
    await page
      .getByRole('slider', { name: 'Title size', exact: true })
      .press('ArrowRight');
  for (let step = 0; step < 2; step++)
    await page
      .getByRole('slider', { name: 'Description size' })
      .press('ArrowRight');
  for (let step = 0; step < 4; step++)
    await page
      .getByRole('slider', { name: 'Header spacing' })
      .press('ArrowRight');
  await closeCustomize(page);
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');

  await page
    .getByRole('button', { name: 'Update live page', exact: true })
    .click();
  const review = page.getByRole('dialog', {
    name: 'Review publication',
    exact: true,
  });
  await expect(
    review.getByRole('heading', { name: 'Added albums' }),
  ).toBeVisible();
  await expect(
    review.getByRole('heading', { name: 'Removed albums' }),
  ).toBeVisible();
  await expect(review).toContainText(addedAlbum.albumName);
  await expect(review).toContainText(removedAlbum.albumName);
  await expect(review).toContainText('Page title');
  await expect(review).toContainText('Banner size');
  await expect(review).toContainText('Logo size');
  await expect(review).toContainText('Title size');
  await expect(review).toContainText('Description size');
  await expect(review).toContainText('Header spacing');
  await review.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(review).toHaveCount(0);

  await page.goto('/page/review-snapshot');
  await expect(
    page.getByRole('heading', { name: 'Acme current season' }),
  ).toBeVisible();
  await expect(page.getByText(removedAlbum.albumName)).toBeVisible();
  await expect(page.getByText(addedAlbum.albumName)).toHaveCount(0);

  await page.goto(`/page/manage/${draft.id}`);
  await page
    .getByRole('button', { name: 'Update live page', exact: true })
    .click();
  const confirmedReview = page.getByRole('dialog', {
    name: 'Review publication',
    exact: true,
  });
  await expect(confirmedReview).toContainText(addedAlbum.albumName);
  await expect(confirmedReview).toContainText(removedAlbum.albumName);
  await confirmedReview
    .getByRole('button', { name: 'Update live page', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Page published');

  await page.goto('/page/review-snapshot');
  await expect(
    page.getByRole('heading', { name: 'Acme autumn season' }),
  ).toBeVisible();
  await expect(page.getByText(addedAlbum.albumName)).toBeVisible();
  await expect(page.getByText(removedAlbum.albumName)).toHaveCount(0);
});
