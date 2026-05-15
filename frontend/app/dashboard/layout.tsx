'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useMemo } from 'react'
import {
  LayoutGrid,
  Settings,
  User,
  MessageSquare,
  Zap,
  FlaskConical,
  BookOpen,
  ChevronRight,
} from 'lucide-react'

type NavId = 'drawings' | 'docs' | 'feedback' | 'settings' | 'profile' | 'upgrade'

const NAV_TOP: { id: NavId; icon: React.ReactNode; label: string }[] = [
  { id: 'drawings', icon: <LayoutGrid size={18} />, label: 'Danh sách bản vẽ' },
  { id: 'docs', icon: <BookOpen size={18} />, label: 'Tài liệu' },
]
const NAV_BOTTOM: { id: NavId; icon: React.ReactNode; label: string; special?: boolean }[] = [
  { id: 'feedback', icon: <MessageSquare size={18} />, label: 'Hòm thư góp ý' },
  { id: 'settings', icon: <Settings size={18} />, label: 'Cài đặt' },
  { id: 'profile', icon: <User size={18} />, label: 'Thông tin cá nhân' },
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
  if (pathname.startsWith('/dashboard/settings')) return 'settings'
  if (pathname.startsWith('/dashboard')) return 'drawings'
  return 'drawings'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const activeNav = useMemo(() => getActiveNav(pathname), [pathname])

  const handleNav = (id: NavId) => {
    if (id === 'drawings') router.push('/dashboard')
    else if (id === 'settings') router.push('/dashboard/settings')
    else router.push('/dashboard') // MVP: stubs route back to dashboard
  }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <aside className="w-[240px] flex-shrink-0 bg-card border-r border-border flex flex-col py-5 z-10">
        <div className="px-4 mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20 flex-shrink-0">
            <FlaskConical size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground leading-tight">Phòng thí nghiệm Hình học</p>
            <p className="text-[10px] text-muted-foreground">Hỗ trợ bởi AI</p>
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
    </div>
  )
}
