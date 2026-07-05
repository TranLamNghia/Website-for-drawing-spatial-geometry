import { test, expect } from '@playwright/test'

const PUBLIC_ROUTES = [
  { path: '/trangchu', name: 'dashboard' },
  { path: '/trangchu/huongdan', name: 'guide' },
  { path: '/trangchu/thongtin', name: 'profile' },
  { path: '/trangchu/caidat', name: 'settings' },
] as const

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1920, height: 1080 },
] as const

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    for (const route of PUBLIC_ROUTES) {
      test(`${route.name} loads without horizontal overflow`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: 'networkidle' })

        // Trang đã render: heading chính hiển thị.
        await expect(page.locator('h1').first()).toBeVisible()

        // Không có cuộn ngang ngoài ý muốn (cho phép lệch 1px do làm tròn).
        const overflow = await page.evaluate(() => {
          const el = document.documentElement
          return el.scrollWidth - el.clientWidth
        })
        expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1)
      })
    }
  })
}

test.describe('auth redirects (guest)', () => {
  test('feedback mailbox redirects to login', async ({ page }) => {
    await page.goto('/trangchu/homthu', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/dang-nhap/)
    expect(page.url()).toContain('callbackUrl=')
    await expect(page.getByRole('button', { name: /Đăng nhập bằng Google/i })).toBeVisible()
  })

  test('smart draw redirects to login', async ({ page }) => {
    await page.goto('/chedovethongminh', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/dang-nhap/)
    expect(page.url()).toContain('callbackUrl=')
    await expect(page.getByRole('button', { name: /Đăng nhập bằng Google/i })).toBeVisible()
  })

  test('login page loads without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dang-nhap', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /Đăng nhập bằng Google/i })).toBeVisible()
    const overflow = await page.evaluate(() => {
      const el = document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
