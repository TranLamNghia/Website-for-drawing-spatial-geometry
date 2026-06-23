'use client'

import Link from 'next/link'
import { ArrowLeft, Monitor, TabletSmartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GeometryMobileGate() {
  return (
    <main className="flex h-svh min-h-dvh items-center justify-center bg-background px-4 py-6 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-5 text-center shadow-xl shadow-black/5 backdrop-blur-md sm:p-6">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <TabletSmartphone size={26} />
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Không gian dựng hình 3D
          </p>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Màn hình này quá nhỏ để vẽ hình ổn định
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Công cụ vẽ 3D cần nhiều vùng thao tác cho canvas, thanh công cụ và bảng thuộc tính.
            Vui lòng dùng tablet từ 768px hoặc ưu tiên máy tính để có trải nghiệm chính xác hơn.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-left text-[12px] leading-relaxed text-amber-500/90">
          <div className="flex gap-2">
            <Monitor size={16} className="mt-0.5 shrink-0" />
            <span>
              Trên điện thoại, website vẫn hỗ trợ xem trang chủ, hướng dẫn và gửi góp ý. Riêng workspace 3D sẽ mở từ tablet trở lên.
            </span>
          </div>
        </div>

        <Button asChild className="mt-6 w-full rounded-xl">
          <Link href="/trangchu">
            <ArrowLeft size={16} />
            Quay về trang chủ
          </Link>
        </Button>
      </section>
    </main>
  )
}
