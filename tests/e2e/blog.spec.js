import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Justme.dev Blog page.
 * These tests ensure that the content pipeline is correctly rendering the blog list,
 * the search functionality is reachable, and individual articles are accessible.
 */
test.describe('Blog Page Functionality', () => {
  const BASE_URL = 'http://localhost:5173/blog';

  test.beforeEach(async ({ page }) => {
    // Navigate to the blog page before each test
    await page.goto(BASE_URL);
    // Wait for the page to be fully loaded (VitePress/Vue hydration)
    await page.waitForLoadState('networkidle');
  });

  test('should display the DocSearch button', async ({ page }) => {
    // Verify that the standard VitePress DocSearch button is present and visible
    const searchButton = page.locator('button.DocSearch-Button');
    await expect(searchButton).toBeVisible();
    await expect(searchButton).toContainText('Search');
  });

  test('should render the blog article list', async ({ page }) => {
    // The blog list is generated dynamically. We check for the presence of article links.
    const blogLinks = page.locator('a.stretched-link.nolinkdecor');

    // Assert that at least one blog post is rendered
    const count = await blogLinks.count();
    expect(count).toBeGreaterThan(0);

    // Check if the first article card is visible and contains text
    await expect(blogLinks.first()).toBeVisible();
    const firstArticleTitle = await blogLinks.first().innerText();
    expect(firstArticleTitle.length).toBeGreaterThan(5);
  });

  test('should navigate to an article and display correctly', async ({
    page
  }) => {
    const firstBlogLink = page.locator('a.stretched-link.nolinkdecor').first();
    const expectedTitle = await firstBlogLink.innerText();

    // Click on the first blog post
    await firstBlogLink.click();

    // Wait for navigation and ensure the URL has changed from the base blog path
    await page.waitForURL(/\/blog\/.+/);
    expect(page.url()).not.toBe(BASE_URL);

    // In VitePress, the main article title is expected to be an H1
    const articleHeader = page.locator('h1');
    await expect(articleHeader).toBeVisible();

    // Verify that the header text matches the title from the list
    const actualTitle = await articleHeader.innerText();
    expect(actualTitle.trim()).toBe(expectedTitle.trim());
  });
});
