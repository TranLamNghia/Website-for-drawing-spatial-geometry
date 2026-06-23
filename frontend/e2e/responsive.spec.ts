import { test, expect } from '@playwright/test'

const ROUTES = [
  { path: '/trangchu', name: 'dashboard' },
  { path: '/trangchu/homthu', name: 'feedback' },
  { path: '/trangchu/huongdan', name: 'guide' },
  { path: '/trangchu/thongtin', name: 'profile' },
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

    for (const route of ROUTES) {
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
