import { expect, test } from '@playwright/test';

async function readLayoutGeometry(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const tail = document.querySelector<HTMLElement>('.advantages-section');
    const experience = document.querySelector<HTMLElement>('.xp-section');
    return {
      documentHeight: document.documentElement.scrollHeight,
      experienceHeight: experience?.getBoundingClientRect().height ?? 0,
      tailTop: tail?.offsetTop ?? 0,
      faqCount: document.querySelectorAll('[data-component="InternalFaqItem"]').length,
    };
  });
}

test('legacy geometry remains aligned with the read-only source', async ({ page }) => {
  await page.goto('http://127.0.0.1:4177/?skip', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1_000);
  const reference = await readLayoutGeometry(page);

  await page.goto('/?skip', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1_000);
  const current = await readLayoutGeometry(page);

  expect(current).toEqual(reference);
});

test('legacy remains the source-faithful migration default', async ({ page }) => {
  await page.goto('/?skip');
  await expect(page.locator('.experience-shell')).toBeVisible();
  await expect(page.locator('[data-runtime="r3f"]')).toHaveCount(0);
  await expect(page.locator('.advantages-section a')).toHaveCount(0);
  await expect(page.locator('[data-component="InternalFaqItem"]')).toHaveCount(5);
  await expect(page.locator('.xp-section .sound svg path')).toHaveCount(3);
});

test('legacy FAQ is controlled once by the source runtime', async ({ page }) => {
  await page.goto('/?skip', { waitUntil: 'networkidle' });
  const item = page.locator('[data-component="InternalFaqItem"]').first();
  const wrapper = item.locator('.content-wrapper');
  await item.scrollIntoViewIfNeeded();
  await item.locator('.content-trigger').click();
  await expect(item).toHaveClass(/open/);
  await expect.poll(() => wrapper.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(0);
  await page.waitForTimeout(850);
  await item.locator('.content-trigger').click();
  await expect(item).not.toHaveClass(/open/);
  await expect.poll(() => wrapper.evaluate((element) => element.getBoundingClientRect().height))
    .toBe(0);
});

test('R3F preserves the two loading stages', async ({ page }) => {
  await page.goto('/?runtime=r3f');
  await expect(page.locator('#loader')).toBeVisible();
  await expect(page.locator('#loader')).toBeHidden({ timeout: 8_000 });
  await expect(page.locator('.r3f-asset-loader')).toBeVisible();
  await expect(page.locator('.r3f-asset-loader')).toBeHidden();
  await expect(page.locator('[data-runtime="r3f"] canvas')).toBeVisible();
});

test('R3F scroll, landscapes, FAQ, static links and restart stay in-page', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    Object.defineProperty(window, '__verminoblePlayCalls', { configurable: true, value: 0, writable: true });
    HTMLMediaElement.prototype.play = function play() {
      const runtimeWindow = window as typeof window & { __verminoblePlayCalls: number };
      runtimeWindow.__verminoblePlayCalls += 1;
      return originalPlay.call(this);
    };
  });
  const errors: string[] = [];
  const badResponses: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '127.0.0.1') {
      externalRequests.push(request.url());
    }
  });

  await page.goto('/?runtime=r3f&skip');
  await expect(page.locator('[data-runtime="r3f"]')).toBeVisible();
  await expect(page.locator('.r3f-asset-loader')).toBeHidden();
  const initialUrl = page.url();

  const sound = page.locator('.r3f-experience-shell > .sound');
  await expect(sound).not.toHaveClass(/hidden/, { timeout: 3_000 });
  await expect(sound.locator('svg path')).toHaveCount(3);
  await sound.click();
  await expect(sound).toHaveAccessibleName('Turn sound off');
  await expect.poll(() => page.evaluate(
    () => (window as typeof window & { __verminoblePlayCalls: number }).__verminoblePlayCalls,
  )).toBeGreaterThan(0);

  const metrics = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    sectionHeight: document.querySelector<HTMLElement>('.r3f-experience')?.offsetHeight ?? 0,
  }));
  expect(metrics.height).toBeGreaterThanOrEqual(testInfo.project.name === 'desktop' ? 6000 : 5600);
  expect(metrics.sectionHeight).toBeGreaterThan(1700);

  const sceneProgress = [0.02, 0.15, 0.27, 0.35, 0.56, 0.67];
  for (const [index, progress] of sceneProgress.entries()) {
    await page.evaluate((value) => {
      const section = document.querySelector<HTMLElement>('.r3f-experience');
      if (!section) return;
      const available = section.offsetHeight - window.innerHeight;
      window.scrollTo(0, available * value);
    }, progress);
    await page.waitForTimeout(100);
    await page.locator('.r3f-scene-cta').click({ force: true });
    await expect(page.locator('.r3f-landscape')).toHaveAttribute('data-scene', String(index + 1));
    await page.locator('.r3f-back').click();
    await expect(page.locator('.r3f-landscape')).toHaveCount(0);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('.r3f-poem[data-section="0"]')).toHaveClass(/is-active/);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByText('Commonly Asked Questions')).toBeVisible();
  await expect(sound).toBeVisible();
  await expect(page.locator('.advantages-section a')).toHaveCount(0);
  await page.locator('[data-component="InternalFaqItem"] .content-trigger').first().click();
  const firstFaq = page.locator('[data-component="InternalFaqItem"]').first();
  const firstAnswer = firstFaq.locator('.content-wrapper');
  await expect(firstFaq).toHaveClass(/open/);
  await expect.poll(() => firstAnswer.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(0);
  await page.waitForTimeout(850);
  await firstFaq.locator('.content-trigger').click();
  await expect(firstFaq).not.toHaveClass(/open/);
  await expect.poll(() => firstAnswer.evaluate((element) => element.getBoundingClientRect().height))
    .toBe(0);
  await page.getByRole('button', { name: 'Restart the experience' }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expect(page.url()).toBe(initialUrl);
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
  expect(externalRequests).toEqual([]);
});
