'use client'

import { useMemo, useState } from 'react'
import { Plus, Clock, MoreHorizontal, Trash2, Sparkles, Grid3x3, Zap } from 'lucide-react'
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
  const raw = localStorage.getItem('geometry_projects')
  const list: SavedProject[] = raw ? JSON.parse(raw) : []
  if (list.length >= MAX_PROJECTS) return false
  localStorage.setItem('geometry_projects', JSON.stringify([project, ...list]))
  return true
}
export function loadProjects(): SavedProject[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('geometry_projects') || '[]')
  } catch {
    return []
  }
}
export function saveProjects(p: SavedProject[]) {
  localStorage.setItem('geometry_projects', JSON.stringify(p))
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

          <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted/80 transition-all text-muted-foreground hover:text-foreground"
              title="Tùy chọn"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-popover shadow-xl overflow-hidden z-20">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(project.id)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-destructive hover:bg-destructive/10"
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
  onOpenProject: (project: SavedProject) => void
}

export function DashboardView({ onNewProject, onOpenProject }: DashboardViewProps) {
  const { projects, isLimitReached, deleteProject } = useProjectStore()

  const sorted = useMemo(() => projects, [projects])

  return (
    <div className="h-full flex flex-col overflow-hidden min-w-0">
      <header className="flex-shrink-0 px-8 pt-8 pb-5 border-b border-border/40">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-primary" />
              <span className="text-[11px] font-bold text-primary tracking-widest uppercase">Phòng thí nghiệm Hình học AI</span>
            </div>
            <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight">
              Chào mừng bạn quay trở lại!
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
              Tạo, khám phá và phân tích hình học không gian 3D với sự hỗ trợ của AI.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-card border border-border rounded-2xl px-5 py-3 text-center shadow-sm">
              <p className="text-2xl font-extrabold text-primary tabular-nums leading-none">
                {sorted.length}
                <span className="text-base font-semibold text-muted-foreground ml-0.5">/{MAX_PROJECTS}</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Bản vẽ đã lưu</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Danh sách bản vẽ</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {sorted.length === 0
                ? 'Chưa có bản vẽ nào. Hãy bắt đầu bằng cách tạo bản vẽ đầu tiên!'
                : `${sorted.length} / ${MAX_PROJECTS} bản vẽ đã sử dụng`}
            </p>
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <NewProjectCard onClick={onNewProject} disabled={isLimitReached} count={sorted.length} />
          {sorted.map(project => (
            <ProjectCard key={project.id} project={project} onOpen={onOpenProject} onDelete={deleteProject} />
          ))}
        </div>
      </main>
    </div>
  )
}
