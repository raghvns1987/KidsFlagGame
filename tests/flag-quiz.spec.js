// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Fun Flag Quiz for Kids', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage so theme preference from a prior test doesn't leak
    await page.evaluate(() => localStorage.clear());
    // Reload to apply clean state
    await page.reload({ waitUntil: 'domcontentloaded' });
  });

  // ==================== Home Screen ====================

  test.describe('Home screen', () => {

    test('should display the quiz title and continent selection', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Fun Flag Quiz' })).toBeVisible();
      await expect(page.locator('#continent-selection')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Select a Continent/ })).toBeVisible();
      await expect(page.locator('#continent-select')).toBeVisible();
      await expect(page.locator('#start-quiz')).toBeVisible();
    });

    test('should populate the continent dropdown with options', async ({ page }) => {
      const select = page.locator('#continent-select');
      const options = await select.locator('option').all();
      // At least "All Continents" + Africa + Asia + Europe + North America + South America + Oceania
      expect(options.length).toBeGreaterThan(1);

      // First option should be "All Continents"
      await expect(options[0]).toHaveText('All Continents');
      await expect(options[0]).toHaveAttribute('value', 'All');
    });

    test('should hide quiz interface and results on initial load', async ({ page }) => {
      await expect(page.locator('#quiz-interface')).toHaveClass(/hidden/);
      await expect(page.locator('#result')).toHaveClass(/hidden/);
    });
  });

  // ==================== Quiz Flow ====================

  test.describe('Quiz flow', () => {

    test('should start the quiz and show the first question', async ({ page }) => {
      await page.locator('#start-quiz').click();

      // Continent selection should hide, quiz interface should show
      await expect(page.locator('#continent-selection')).toHaveClass(/hidden/);
      await expect(page.locator('#quiz-interface')).not.toHaveClass(/hidden/);

      // Score should be visible and at 0
      await expect(page.locator('#score-value')).toHaveText('0');

      // Flag image should have a source
      await expect(page.locator('#flag-image')).toHaveAttribute('src', /flagcdn\.com/);

      // Should have 4 answer options
      const options = page.locator('.option-btn');
      await expect(options).toHaveCount(4);

      // Streak display should be visible
      await expect(page.locator('#streak-value')).toHaveText('0');
    });

    test('should show feedback after selecting an answer', async ({ page }) => {
      await page.locator('#start-quiz').click();

      // Get the first option button and click it
      const firstOption = page.locator('.option-btn').first();
      await firstOption.click();

      // Feedback should appear
      const feedback = page.locator('#feedback');
      await expect(feedback).not.toBeEmpty();

      // All option buttons should be disabled
      const buttons = page.locator('.option-btn');
      for (const btn of await buttons.all()) {
        await expect(btn).toBeDisabled();
      }

      // Next button should appear (endless mode)
      await expect(page.locator('#next-btn')).toBeVisible();
    });

    test('should prevent answering the same question twice', async ({ page }) => {
      await page.locator('#start-quiz').click();

      // Click the first option
      const firstOption = page.locator('.option-btn').first();
      await firstOption.click();

      // Wait for feedback to appear
      await expect(page.locator('#feedback')).not.toBeEmpty();

      // All option buttons should now be disabled
      const initialScore = await page.locator('#score-value').textContent();
      const buttons = page.locator('.option-btn');
      for (const btn of await buttons.all()) {
        await expect(btn).toBeDisabled();
      }

      // Verify score hasn't changed after all buttons are disabled
      await expect(page.locator('#score-value')).toHaveText(initialScore ?? '0');
    });

    test('should highlight the correct answer after selection', async ({ page }) => {
      await page.locator('#start-quiz').click();

      // Click the first option
      await page.locator('.option-btn').first().click();

      // At least one button should have the "correct" class
      await expect(page.locator('.option-btn.correct').first()).toBeVisible();
    });

    test('should see results by clicking "See My Score"', async ({ page }) => {
      await page.locator('#start-quiz').click();

      // Answer at least one question
      await page.locator('.option-btn').first().click();
      await expect(page.locator('#next-btn')).toBeVisible();
      await page.locator('#next-btn').click();

      // Click "See My Score" to end the endless quiz
      await page.locator('#stop-quiz-btn').click();

      // Results screen should appear
      await expect(page.locator('#result')).not.toHaveClass(/hidden/);
      await expect(page.locator('#quiz-interface')).toHaveClass(/hidden/);

      // Final score should be displayed with accuracy
      await expect(page.locator('#final-score')).toBeVisible();
    });

    test('should have no duplicate country options', async ({ page }) => {
      await page.locator('#start-quiz').click();

      // Check that all 4 option buttons have unique text
      const options = page.locator('.option-btn');
      const texts = await options.allTextContents();
      const uniqueTexts = new Set(texts);
      expect(uniqueTexts.size).toBe(4);
    });
  });

  // ==================== Scoring ====================

  test.describe('Scoring', () => {

    test('should increment score on correct answer', async ({ page }) => {
      await page.locator('#start-quiz').click();

      // Click the first option
      const firstOption = page.locator('.option-btn').first();
      await firstOption.click();

      // Check if the clicked option was correct
      const feedback = page.locator('#feedback');
      await expect(feedback).toBeVisible();

      const feedbackText = await feedback.textContent();
      if (feedbackText?.includes('Correct!')) {
        // The answer was correct, score should be 1
        await expect(page.locator('#score-value')).toHaveText('1');
      } else {
        // Wrong answer, score should still be 0 but correct answer is highlighted
        await expect(page.locator('#score-value')).toHaveText('0');
      }
    });

    test('should track cumulative score across multiple questions', async ({ page }) => {
      await page.locator('#start-quiz').click();

      let correctCount = 0;

      // Answer 3 questions
      for (let i = 0; i < 3; i++) {
        const firstOption = page.locator('.option-btn').first();
        await firstOption.click();

        const feedbackText = await page.locator('#feedback').textContent();
        if (feedbackText?.includes('Correct!')) {
          correctCount++;
        }

        await expect(page.locator('#score-value')).toHaveText(String(correctCount));

        if (i < 2) {
          await page.locator('#next-btn').click();
        }
      }
    });

    test('should display and update streak counter', async ({ page }) => {
      await page.locator('#start-quiz').click();

      // Initial streak should be 0
      await expect(page.locator('#streak-value')).toHaveText('0');

      // Answer a question
      await page.locator('.option-btn').first().click();

      const feedbackText = await page.locator('#feedback').textContent();
      if (feedbackText?.includes('Correct!')) {
        await expect(page.locator('#streak-value')).toHaveText('1');

        // Go to next question and answer again
        await page.locator('#next-btn').click();
        await page.locator('.option-btn').first().click();

        const feedback2 = await page.locator('#feedback').textContent();
        if (feedback2?.includes('Correct!')) {
          await expect(page.locator('#streak-value')).toHaveText('2');
        }
      }
    });
  });

  // ==================== Continent Filtering ====================

  test.describe('Continent filtering', () => {

    test('should show "All Continents" indicator when no filter is applied', async ({ page }) => {
      await page.locator('#start-quiz').click();
      await expect(page.locator('#current-continent')).toHaveText('All Continents');
    });

    test('should filter by a specific continent', async ({ page }) => {
      const select = page.locator('#continent-select');

      // Pick a specific continent (Europe has many countries)
      await select.selectOption('Europe');
      await page.locator('#start-quiz').click();

      // Continent indicator should show Europe
      await expect(page.locator('#current-continent')).toHaveText('Europe');

      // Answer a question to verify options are displayed
      await expect(page.locator('.option-btn').first()).toBeEnabled();
      await page.locator('.option-btn').first().click();
    });

    test('should allow selecting different continents', async ({ page }) => {
      // Go through multiple continents
      for (const continent of ['Africa', 'Asia', 'South America']) {
        // Go back to continent selection if needed
        if (!await page.locator('#continent-selection').isVisible()) {
          if (await page.locator('#change-continent-btn').isVisible()) {
            await page.locator('#change-continent-btn').click();
          } else if (await page.locator('#stop-quiz-btn').isVisible()) {
            await page.locator('#stop-quiz-btn').click();
            // Stop now shows results, click restart to get back to continent selection
            await expect(page.locator('#restart-btn')).toBeVisible();
            await page.locator('#restart-btn').click();
          }
        }

        await page.locator('#continent-select').selectOption(continent);
        await page.locator('#start-quiz').click();
        await expect(page.locator('#current-continent')).toHaveText(continent);

        // Stop and loop (goes to results first)
        await page.locator('#stop-quiz-btn').click();
        await expect(page.locator('#restart-btn')).toBeVisible();
        await page.locator('#restart-btn').click();
      }
    });
  });

  // ==================== Navigation ====================

  test.describe('Navigation', () => {

    test('should see my score and return to continent selection via restart', async ({ page }) => {
      await page.locator('#start-quiz').click();
      await expect(page.locator('#quiz-interface')).not.toHaveClass(/hidden/);

      // "See My Score" shows results
      await page.locator('#stop-quiz-btn').click();

      await expect(page.locator('#result')).not.toHaveClass(/hidden/);
      await expect(page.locator('#quiz-interface')).toHaveClass(/hidden/);

      // From results, "Play Again" returns to continent selection
      await page.locator('#restart-btn').click();
      await expect(page.locator('#continent-selection')).toBeVisible();
    });

    test('should restart the quiz from the results screen', async ({ page }) => {
      await page.locator('#start-quiz').click();

      // Answer a question, then see results
      await page.locator('.option-btn').first().click();
      await expect(page.locator('#next-btn')).toBeVisible();
      await page.locator('#next-btn').click();
      await page.locator('#stop-quiz-btn').click();

      // Wait for results
      await expect(page.locator('#result')).not.toHaveClass(/hidden/);

      // Play again - goes back to continent selection (initGame)
      await page.locator('#restart-btn').click();

      await expect(page.locator('#continent-selection')).toBeVisible();
      await expect(page.locator('#result')).toHaveClass(/hidden/);
      await expect(page.locator('#quiz-interface')).toHaveClass(/hidden/);

      // Score should be reset
      await expect(page.locator('#score-value')).toHaveText('0');
    });

    test('should navigate from results to continent selection via "Change Continent"', async ({ page }) => {
      await page.locator('#start-quiz').click();

      // Answer a question
      await page.locator('.option-btn').first().click();
      await expect(page.locator('#next-btn')).toBeVisible();
      await page.locator('#next-btn').click();

      // Stop quiz to see results
      await page.locator('#stop-quiz-btn').click();
      await expect(page.locator('#result')).not.toHaveClass(/hidden/);

      // Change continent
      await page.locator('#change-continent-btn').click();

      await expect(page.locator('#continent-selection')).toBeVisible();
      await expect(page.locator('#result')).toHaveClass(/hidden/);
    });
  });

  // ==================== Responsive Design ====================

  test.describe('Responsive design', () => {

    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'Fun Flag Quiz' })).toBeVisible();
      await expect(page.locator('#start-quiz')).toBeVisible();
    });

    test('should have single-column options on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.locator('#start-quiz').click();

      // Options should be stacked (single column on mobile)
      const options = page.locator('.option-btn');
      const firstBox = await options.first().boundingBox();
      const secondBox = await options.nth(1).boundingBox();

      // On mobile single-column layout, second option should be below first
      if (firstBox && secondBox) {
        expect(secondBox.y).toBeGreaterThan(firstBox.y);
      }
    });
  });

  // ==================== Accessibility ====================

  test.describe('Accessibility', () => {

    test('should have alt text on the flag image', async ({ page }) => {
      await page.locator('#start-quiz').click();
      await expect(page.locator('#flag-image')).toHaveAttribute('alt', /Flag of/);
    });

    test('should have semantic headings', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    });

    test('should have buttons with accessible names', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Start Quiz' })).toBeVisible();

      // "See My Score" is only visible during an active quiz
      await page.locator('#start-quiz').click();
      await expect(page.getByRole('button', { name: 'See My Score' })).toBeVisible();
    });
  });

  // ==================== Edge Cases ====================

  test.describe('Edge cases', () => {

    test('should handle flag image loading error gracefully', async ({ page }) => {
      // Intercept flag image requests to simulate failure
      await page.route('**/flagcdn.com/**', async (route) => {
        await route.fulfill({
          status: 404,
          body: 'Not Found',
        });
      });

      await page.locator('#start-quiz').click();

      // Wait for the error handler to fire
      await expect(page.locator('.flag-error')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.flag-error')).toContainText('Flag not available');

      // Options should still be displayed
      await expect(page.locator('.option-btn')).toHaveCount(4);
    });

    test('should show error for continent with too few countries', async ({ page }) => {
      // Antarctica has only 1 country - less than the 4 minimum required
      await page.locator('#continent-select').selectOption('Antarctica');

      // We need to listen for the alert dialog
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Not enough countries');
        await dialog.dismiss();
      });

      await page.locator('#start-quiz').click();

      // Should return to continent selection
      await expect(page.locator('#continent-selection')).toBeVisible();
    });
  });

  // ==================== Theme Toggle ====================

  test.describe('Theme toggle', () => {

    test('should display the theme toggle button', async ({ page }) => {
      await expect(page.locator('#theme-toggle')).toBeVisible();
    });

    test('should start in light mode by default', async ({ page }) => {
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    test('should toggle to dark mode when clicked', async ({ page }) => {
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

      // Click the toggle
      await page.locator('#theme-toggle').click();

      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });

    test('should persist theme preference in localStorage', async ({ page }) => {
      // Switch to dark mode
      await page.locator('#theme-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

      // Reload the page — beforeEach cleared localStorage so this reload
      // should pick up the saved dark preference
      await page.reload();

      // Theme should still be dark after reload
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });

    test('should toggle back to light mode on second click', async ({ page }) => {
      await page.locator('#theme-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

      await page.locator('#theme-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });
  });
});
