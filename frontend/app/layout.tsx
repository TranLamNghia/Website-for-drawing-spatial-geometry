import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { SessionProvider } from '@/components/auth/session-provider'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Phòng thí nghiệm Hình học AI - Trợ lý Hình học Không gian',
  description: 'Ứng dụng trợ lý hình học không gian AI cho giáo viên và học sinh',
  generator: 'v0.app',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/*
          Opt auth pages out of bfcache. If a browser still restores from bfcache
          (pageshow.persisted), force a full reload so Next.js is not frozen.
        */}
        <Script id="sg-disable-bfcache" strategy="beforeInteractive">{`
          (function () {
            var path = location.pathname || '';
            if (path.indexOf('/dangnhap') !== 0 && path.indexOf('/dangky') !== 0) return;
            window.addEventListener('unload', function () {});
            window.addEventListener('pagehide', function () {});
            window.addEventListener('pageshow', function (e) {
              try {
                var payload = JSON.stringify({
                  sessionId: '66918d',
                  runId: 'post-fix-9',
                  hypothesisId: 'J',
                  location: 'layout.tsx:pageshow',
                  message: 'auth pageshow',
                  data: { persisted: !!e.persisted, href: location.href },
                  timestamp: Date.now()
                });
                fetch('/api/debug-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }).catch(function () {});
                fetch('http://127.0.0.1:7363/ingest/91e218d2-2acc-4172-b006-a0069f330ca6', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '66918d' }, body: payload }).catch(function () {});
              } catch (err) {}
              if (e.persisted) location.reload();
            });
          })();
        `}</Script>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </SessionProvider>
        {process.env.NODE_ENV !== 'production' ? (
          <style>{`#devtools-indicator{display:none!important}`}</style>
        ) : null}
        <Analytics />
      </body>
    </html>
  )
}
