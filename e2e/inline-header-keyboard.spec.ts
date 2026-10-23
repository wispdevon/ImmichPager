import { expect, test } from '@playwright/test';

test('inline header keys finish editing, preserve autosave, and keep natural Tab movement', async ({
  page,
}) => {
  await page.goto('/dev-login/alice');
  await page.goto('/page/manage/new');

  const titleTrigger = page
    .frameLocator('[title="Live page canvas"]')
    .getByRole('button', {
      name: 'Edit title, Add a title',
      exact: true,
    });
  await titleTrigger.click();
  const title = page
    .frameLocator('[title="Live page canvas"]')
    .getByLabel('Title', { exact: true });
  await title.fill('Jane Doe photography');

  await title.evaluate((element) => {
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      isComposing: true,
    });
    element.dispatchEvent(event);
  });
  await expect(title).toBeVisible();

  await title.evaluate((element) => {
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      keyCode: 229,
    });
    element.dispatchEvent(event);
  });
  await expect(title).toBeVisible();

  await title.press('Enter');
  const committedTitle = page
    .frameLocator('[title="Live page canvas"]')
    .getByRole('button', {
      name: 'Edit title, Jane Doe photography',
      exact: true,
    });
  await expect(committedTitle).toBeFocused();

  await committedTitle.click();
  const titleEditor = page
    .frameLocator('[title="Live page canvas"]')
    .getByLabel('Title', { exact: true });
  await titleEditor.fill('This title stays in the private draft');
  await titleEditor.press('Escape');
  const savedTitle = page
    .frameLocator('[title="Live page canvas"]')
    .getByRole('button', {
      name: 'Edit title, This title stays in the private draft',
      exact: true,
    });
  await expect(savedTitle).toBeFocused();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  const pageId = new URL(page.url()).pathname.split('/').pop();
  const titleAfterEscape = await (
    await page.request.get(`/page/api/pages/${pageId}`)
  ).json();
  expect(titleAfterEscape).toMatchObject({
    title: 'This title stays in the private draft',
    status: 'draft',
    publishedSlug: null,
  });
  expect((await page.request.get('/page/jane-doe-photography')).status()).toBe(
    404,
  );

  await savedTitle.click();
  await page
    .frameLocator('[title="Live page canvas"]')
    .getByLabel('Title', { exact: true })
    .press('Tab');
  const descriptionTrigger = page
    .frameLocator('[title="Live page canvas"]')
    .getByRole('button', {
      name: 'Edit description, Add a description',
      exact: true,
    });
  await expect(descriptionTrigger).toBeFocused();
  await descriptionTrigger.click();
  const description = page
    .frameLocator('[title="Live page canvas"]')
    .getByLabel('Description', { exact: true });
  await description.fill('This description stays in the private draft');
  await description.press('Escape');
  const savedDescription = page
    .frameLocator('[title="Live page canvas"]')
    .getByRole('button', {
      name: 'Edit description, This description stays in the private draft',
      exact: true,
    });
  await expect(savedDescription).toBeFocused();
  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  const descriptionAfterEscape = await (
    await page.request.get(`/page/api/pages/${pageId}`)
  ).json();
  expect(descriptionAfterEscape.description).toBe(
    'This description stays in the private draft',
  );

  await savedDescription.click();
  await page
    .frameLocator('[title="Live page canvas"]')
    .getByLabel('Description', { exact: true })
    .press('Tab');
  await expect(
    page
      .frameLocator('[title="Live page canvas"]')
      .getByRole('button', { name: 'Photos', exact: true })
      .first(),
  ).toBeFocused();
  await expect(savedDescription).toBeVisible();

  await savedDescription.click();
  const committedDescription = page
    .frameLocator('[title="Live page canvas"]')
    .getByLabel('Description', { exact: true });
  await committedDescription.fill('Portraits and stories, made together.');
  await committedDescription.press('Control+Enter');
  const descriptionButton = page
    .frameLocator('[title="Live page canvas"]')
    .getByRole('button', {
      name: 'Edit description, Portraits and stories, made together.',
      exact: true,
    });
  await expect(descriptionButton).toBeFocused();

  await expect(page.getByTestId('save-state')).toHaveText('All changes saved');
  const saved = await (
    await page.request.get(`/page/api/pages/${pageId}`)
  ).json();
  expect(saved).toMatchObject({
    title: 'This title stays in the private draft',
    description: 'Portraits and stories, made together.',
    status: 'draft',
    publishedSlug: null,
  });
  expect((await page.request.get('/page/jane-doe-photography')).status()).toBe(
    404,
  );
});
