'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  LayoutGrid,
  Settings,
  User,
  MessageSquare,
  Zap,
  Boxes,
  BookOpen,
  ChevronRight,
} from 'lucide-react'

type NavId = 'drawings' | 'docs' | 'feedback' | 'settings' | 'profile' | 'upgrade'

const NAV_TOP: { id: NavId; icon: React.ReactNode; label: string }[] = [
  { id: 'drawings', icon: <LayoutGrid size={18} />, label: 'Danh sách bản vẽ' },
  { id: 'docs', icon: <BookOpen size={18} />, label: 'Hướng dẫn sử dụng' },
]
const NAV_BOTTOM: { id: NavId; icon: React.ReactNode; label: string; special?: boolean }[] = [
  { id: 'feedback', icon: <MessageSquare size={18} />, label: 'Hòm thư góp ý' },
  { id: 'settings', icon: <Settings size={18} />, label: 'Cài đặt' },
  { id: 'profile', icon: <User size={18} />, label: 'Thông tin chủ sở hữu' },
  { id: 'upgrade', icon: <Zap size={18} />, label: 'Gói nâng cấp', special: true },
]

function NavItem({
  icon,
  label,
  active,
  special,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  special?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
        transition-all duration-200 group text-left
        ${
          active
            ? 'bg-primary/15 text-primary'
            : special
              ? 'text-amber-400 hover:bg-amber-400/10'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
        }
      `}
    >
      <span className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-primary' : ''}`}>
        {icon}
      </span>
      <span className="text-[13px] font-medium truncate leading-tight">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto text-primary/60 flex-shrink-0" />}
    </button>
  )
}

function getActiveNav(pathname: string): NavId {
  if (pathname.startsWith('/trangchu/caidat')) return 'settings'
  if (pathname.startsWith('/trangchu/homthu')) return 'feedback'
  if (pathname.startsWith('/trangchu/thongtin')) return 'profile'
  if (pathname.startsWith('/trangchu/huongdan')) return 'docs'
  return 'drawings'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const activeNav = useMemo(() => getActiveNav(pathname), [pathname])
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const handleNav = (id: NavId) => {
    if (id === 'drawings') router.push('/trangchu')
    else if (id === 'docs') router.push('/trangchu/huongdan')
    else if (id === 'settings') router.push('/trangchu/caidat')
    else if (id === 'feedback') router.push('/trangchu/homthu')
    else if (id === 'profile') router.push('/trangchu/thongtin')
    else if (id === 'upgrade') setUpgradeOpen(true)
    else router.push('/trangchu')
  }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <aside className="w-[240px] flex-shrink-0 bg-card border-r border-border flex flex-col py-5 z-10">
        <div className="px-4 mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20 flex-shrink-0">
            <Boxes size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground leading-tight">Vẽ hình không &quot;khó&quot;</p>
          </div>
        </div>

        <div className="px-3 flex flex-col gap-0.5">
          {NAV_TOP.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeNav === item.id}
              onClick={() => handleNav(item.id)}
            />
          ))}
        </div>

        <div className="flex-1" />

        <div className="mx-4 my-3 border-t border-border/60" />

        <div className="px-3 flex flex-col gap-0.5">
          {NAV_BOTTOM.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeNav === item.id}
              special={item.special}
              onClick={() => handleNav(item.id)}
            />
          ))}
        </div>
      </aside>

      <div className="flex-1 overflow-hidden min-w-0">{children}</div>

      <AlertDialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gói nâng cấp</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Bạn chưa cần bỏ tiền ra để mua gì cả, hãy trải nghiệm miễn phí và góp ý cho tôi để tôi có thể hiểu được mong muốn của bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Đồng ý</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
