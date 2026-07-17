'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { KeyRound, Palette, UserRound } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SettingsNavId = 'profile' | 'appearance' | 'password'

const SETTINGS_NAV: {
  id: SettingsNavId
  href: string
  label: string
  icon: React.ReactNode
  group: string
}[] = [
  {
    id: 'profile',
    href: '/trangchu/caidat',
    label: 'Hồ sơ công khai',
    icon: <UserRound size={16} />,
    group: 'Tài khoản',
  },
  {
    id: 'password',
    href: '/trangchu/caidat/doi-mat-khau',
    label: 'Mật khẩu và xác thực',
    icon: <KeyRound size={16} />,
    group: 'Tài khoản',
  },
  {
    id: 'appearance',
    href: '/trangchu/caidat/giao-dien',
    label: 'Giao diện',
    icon: <Palette size={16} />,
    group: 'Tùy chỉnh',
  },
]

function getActiveSettingsNav(pathname: string): SettingsNavId {
  if (pathname.startsWith('/trangchu/caidat/doi-mat-khau')) return 'password'
  if (pathname.startsWith('/trangchu/caidat/giao-dien')) return 'appearance'
  return 'profile'
}

function SettingsNavButton({
  href,
  label,
  icon,
  active,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`
        flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60
        ${
          active
            ? 'border-l-2 border-primary bg-primary/10 font-medium text-foreground'
            : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        }
      `}
    >
      <span className={active ? 'text-primary' : ''}>{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  )
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const active = getActiveSettingsNav(pathname)
  const accountItems = SETTINGS_NAV.filter(item => item.group === 'Tài khoản')
  const preferenceItems = SETTINGS_NAV.filter(item => item.group === 'Tùy chỉnh')
  const activeItem = SETTINGS_NAV.find(item => item.id === active)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <header className="mb-6 border-b border-border pb-5 sm:mb-8">
          <div className="flex items-center gap-3">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="size-10 shrink-0 rounded-full object-cover ring-1 ring-border"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
                <UserRound size={18} />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Cài đặt</h1>
              <p className="truncate text-sm text-muted-foreground">
                {session?.user?.name || session?.user?.email || 'Tùy chỉnh tài khoản và giao diện'}
              </p>
            </div>
          </div>
        </header>

        {/* Mobile section switcher */}
        <div className="mb-5 md:hidden">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Mục cài đặt
          </label>
          <Select
            value={active}
            onValueChange={value => {
              const target = SETTINGS_NAV.find(item => item.id === value)
              if (target) router.push(target.href)
            }}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Chọn mục">{activeItem?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SETTINGS_NAV.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  <span className="inline-flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-8 md:flex-row md:gap-10 lg:gap-12">
          <aside className="hidden w-56 shrink-0 md:block lg:w-60">
            <nav className="sticky top-4 space-y-5">
              <div>
                <p className="mb-1.5 px-2 text-xs font-semibold text-muted-foreground">Tài khoản</p>
                <div className="space-y-0.5">
                  {accountItems.map(item => (
                    <SettingsNavButton
                      key={item.id}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={active === item.id}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 px-2 text-xs font-semibold text-muted-foreground">Tùy chỉnh</p>
                <div className="space-y-0.5">
                  {preferenceItems.map(item => (
                    <SettingsNavButton
                      key={item.id}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={active === item.id}
                    />
                  ))}
                </div>
              </div>
            </nav>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
