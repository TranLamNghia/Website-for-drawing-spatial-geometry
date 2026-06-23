'use client'

import { useMemo, useState } from 'react'
import { Plus, Clock, MoreHorizontal, Trash2, Sparkles, Grid3x3, Zap, AlertCircle } from 'lucide-react'
import {
  useProjectStore,
  buildProject,
  MAX_PROJECTS,
  type SavedProject,
} from '@/hooks/use-project-store'

export type { SavedProject }

// Keep existing helper exports for backward compatibility.
export { MAX_PROJECTS }
export function addProject(project: SavedProject): boolean {
  // Disable saving to localStorage as requested
  return true
}
export function loadProjects(): SavedProject[] {
  // Disable loading from localStorage as requested
  return []
}
export function saveProjects(p: SavedProject[]) {
  // Disable saving to localStorage as requested
}
export function createProject(name: string, problemText: string, geometryJson: string, thumbnail?: string): SavedProject {
  return buildProject(name, problemText, geometryJson, thumbnail)
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor(diff / 3_600_000)
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  if (days === 1) return 'Hôm qua'
  if (days < 7) return `${days} ngày trước`
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

function NewProjectCard({
  onClick,
  disabled,
  count,
}: {
  onClick: () => void
  disabled?: boolean
  count: number
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative aspect-[4/3] rounded-2xl border transition-all overflow-hidden text-left
        ${disabled ? 'opacity-50 cursor-not-allowed border-border' : 'hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 border-border'}
        bg-card`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative h-full p-4 flex flex-col justify-between">
        <div className="w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center">
          <Plus size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-foreground">Tạo bản vẽ mới</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {disabled ? 'Đã đạt giới hạn' : `${count} / ${MAX_PROJECTS} bản vẽ`}
          </p>
          {disabled && (
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
              <Zap size={10} /> Nâng cấp để tạo thêm
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function NewAIProjectCard({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[4/3] rounded-2xl border border-primary/20 transition-all overflow-hidden text-left
        hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 bg-card/60 backdrop-blur-sm"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent opacity-30 group-hover:opacity-100 transition-opacity" />
      <div className="relative h-full p-4 flex flex-col justify-between">
        <div className="w-10 h-10 rounded-xl bg-primary/20 ring-1 ring-primary/30 flex items-center justify-center animate-pulse">
          <Sparkles size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-[13px] font-extrabold text-primary flex items-center gap-1.5">
            Tạo bằng AI <Sparkles size={12} />
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
            Vẽ hình từ văn bản với trợ lý ảo
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-bold text-primary border border-primary/20 uppercase tracking-tighter">
            Trí tuệ nhân tạo
          </div>
        </div>
      </div>
    </button>
  )
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: SavedProject
  onOpen: (p: SavedProject) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="group relative bg-card border border-border rounded-2xl overflow-hidden cursor-pointer
                 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5"
      onClick={() => onOpen(project)}
    >
      <div className="aspect-[4/3] bg-gradient-to-br from-muted/40 via-muted/20 to-background/60 flex items-center justify-center relative overflow-hidden">
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-20">
            <Grid3x3 size={32} />
            <span className="text-[10px] font-medium">Hình học 3D</span>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">{project.name}</p>
            <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
              <Clock size={10} />
              <span className="text-[10px]">{relativeTime(project.updatedAt)}</span>
            </div>
          </div>

          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Tùy chọn bản vẽ"
              aria-expanded={menuOpen}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground opacity-100 transition-all hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 lg:opacity-0 lg:group-hover:opacity-100"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(project.id)
                  }}
                  className="flex min-h-11 w-full items-center gap-2 px-3 text-[12px] text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={14} />
                  Xóa bản vẽ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface DashboardViewProps {
  onNewProject: () => void
  onNewAIProject: () => void
  onOpenProject: (project: SavedProject) => void
}

export function DashboardView({ onNewProject, onNewAIProject, onOpenProject }: DashboardViewProps) {
  const { projects, isLimitReached, deleteProject } = useProjectStore()

  const sorted = useMemo(() => projects, [projects])

  return (
    <div className="h-full flex flex-col overflow-hidden min-w-0">
      <header className="flex-shrink-0 border-b border-border/40 px-4 pt-5 pb-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 lg:pb-5">
        <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={13} className="text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Công cụ vẽ hình không gian</span>
            </div>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl lg:text-[28px]">
              Chào mừng bạn đến với công cụ vẽ hình không gian 3D!
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              Tạo, khám phá và phân tích hình học không gian 3D với sự hỗ trợ của trí tuệ nhân tạo.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[12px] font-medium leading-relaxed text-amber-500/90 sm:flex-row sm:items-start sm:gap-3 sm:p-4">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500 animate-pulse sm:mt-0" />
          <span>Vì website đang trong giai đoạn chờ kiểm tra tính ổn định nên chưa thể lưu các bản vẽ cũ, chức năng này sẽ có mặt trong thời gian sớm nhất có thể.</span>
        </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Danh sách bản vẽ</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {sorted.length === 0
                ? 'Chưa có bản vẽ nào. Hãy bắt đầu bằng cách tạo bản vẽ đầu tiên!'
                : `${sorted.length} / ${MAX_PROJECTS} bản vẽ đã sử dụng`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-4">
          <NewProjectCard onClick={onNewProject} disabled={isLimitReached} count={sorted.length} />
          <NewAIProjectCard onClick={onNewAIProject} />
          {sorted.map(project => (
            <ProjectCard key={project.id} project={project} onOpen={onOpenProject} onDelete={deleteProject} />
          ))}
        </div>
        </div>
      </main>
    </div>
  )
}
