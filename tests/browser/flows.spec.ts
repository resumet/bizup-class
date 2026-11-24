import { test, expect } from '@playwright/test';
test('reader journey, filtering and member gate do not leak the full article', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'AI를 아는 만큼, 나의 세상이 넓어집니다.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '자동화', exact: true }).click();
  await expect(page.locator('.article-card')).toHaveCount(1);
  await page.getByRole('button', { name: '전체', exact: true }).click();
  await page.getByRole('textbox', { name: '콘텐츠 검색' }).fill('없는글');
  await expect(page.getByText('검색 결과가 없어요')).toBeVisible();
  await page.getByRole('textbox', { name: '콘텐츠 검색' }).fill('');
  await page.locator('.article-card').first().click();
  await expect(page.getByRole('link', { name: '카카오로 무료로 시작하기' })).toBeVisible();
  const html = await (await request.get('/articles/chatgpt-work')).text();
  expect(html).not.toContain('첫 답변을 완성본으로 생각하지 마세요');
  await page.getByRole('link', { name: '카카오로 무료로 시작하기' }).click();
  await expect(page).toHaveURL(/login\?next=\/articles\/chatgpt-work/);
  await page.getByRole('button', { name: '카카오로 3초 만에 시작하기' }).click();
  await expect(page.locator('.error-message')).toContainText('준비하고 있습니다');
});
test('course curriculum stays locked without paid session', async ({ page, request }) => {
  await page.goto('/courses/ai-workflow');
  await expect(page.locator('.lesson')).toHaveCount(5);
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.locator('.lesson').nth(2).click();
  await expect(page.getByText('현재 회차 · 자료 조사와 근거 확인')).toBeVisible();
  await page.getByRole('link', { name: '월 19,900원으로 시작하기' }).click();
  await expect(page.getByText('멤버십 오픈 준비 중입니다.', { exact: false })).toBeVisible();
  const res = await request.post('/api/admin/articles', {
    data: {},
    headers: { Origin: 'http://localhost:3000' },
  });
  expect(res.status()).toBe(400);
  const cron = await request.get('/api/cron/billing');
  expect(cron.status()).toBe(401);
});
test('notion-style editor saves and restores a local demo draft', async ({ page }) => {
  await page.goto('/admin/editor');
  await page.getByRole('textbox', { name: '글 제목' }).fill('테스트 AI 콘텐츠');
  await page.getByLabel('공개 주소').fill('test-ai-content');
  await page
    .getByLabel('요약 · 검색 및 SNS 소개')
    .fill('이 글은 브라우저에서 편집기 저장을 확인하는 테스트 콘텐츠입니다.');
  await page.locator('.tiptap').click();
  await expect(page.locator('.preview-break')).toHaveCount(1);
  await page.locator('.tiptap').press('/');
  await expect(page.getByRole('group', { name: '블록 추가' })).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '초안 저장', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('브라우저에 초안을 저장');
  await page.reload();
  await page.getByRole('button', { name: '저장한 초안 불러오기' }).click();
  await expect(page.getByRole('textbox', { name: '글 제목' })).toHaveValue('테스트 AI 콘텐츠');
});
test('responsive layouts and screenshots', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('textbox', { name: '콘텐츠 검색' }).fill('');
  await page.screenshot({
    path: 'test-results/home-desktop.png',
    fullPage: true,
    caret: 'initial',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    '/',
    '/articles/chatgpt-work',
    '/courses/ai-workflow',
    '/membership',
    '/admin/editor',
  ]) {
    await page.goto(path);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), {
        message: `Overflow on ${path}`,
      })
      .toBeLessThanOrEqual(0);
  }
  await page.goto('/');
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true, caret: 'initial' });
  expect(errors).toEqual([]);
});
