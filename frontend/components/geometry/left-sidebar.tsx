'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Play, AlertCircle, CheckCircle2, MessageSquareWarning } from 'lucide-react'
import { useGeometry, GeometryData } from './geometry-context'

const SAMPLE_PROBLEM = `Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. SA vuông góc với mặt phẳng (ABCD) và SA = a.`

export function LeftSidebar() {
  const {
    geometryData,
    setGeometryData,
    validation,
    setValidation,
    setIsConsistent,
    setErrorMessage,
    setQueries,
  } = useGeometry()
  const [problem, setProblem] = useState(SAMPLE_PROBLEM)
  const [isLoading, setIsLoading] = useState(false)

  const handleApplyData = (result: any) => {
    // Map BE response (entities, validation, points: {A: {x,y,z}})
    const points: Record<string, [number, number, number]> = {}
    const rawPoints = result.points || {}
    Object.entries(rawPoints).forEach(([name, coords]: [string, any]) => {
      const x = coords.x ?? coords.X ?? 0
      const y = coords.y ?? coords.Y ?? 0
      const z = coords.z ?? coords.Z ?? 0
      points[name] = [x, y, z]
    })

    const rawSegments = result.edges || result.segments || result.data?.entities?.segments || []
    const pointNames = Object.keys(points).sort((a,b) => b.length - a.length)
    
    const mappedEdges = rawSegments.map((s: string) => {
      if (typeof s !== 'string') return ''
      if (s.includes('-')) return s
      for(const p of pointNames) {
        if (s.startsWith(p)) {
          const rest = s.slice(p.length)
          if (pointNames.includes(rest)) return `${p}-${rest}`
        }
      }
      if (s.length === 2) return `${s[0]}-${s[1]}`
      return s
    }).filter(Boolean)

    const mappedData: GeometryData = {
      points,
      is_consistent: result.validation?.allPassed ?? true,
      error_message: result.validation?.allPassed ? '' : 'Dữ liệu không khớp',
      edges: mappedEdges,
      queries: (result.queries || result.data?.queries || []).map((q: any) => ({
        id: q.id || Math.random().toString(),
        text: q.question_text || q.raw_text || '',
        edges: [] 
      })),
      circles: result.circles || result.data?.entities?.circles || [],
      planes: result.planes || result.data?.entities?.planes || [],
      spheres: result.spheres || result.data?.entities?.spheres || [],
      cones: result.cones || [],
      cylinders: result.cylinders || [],
      clippingPlane: result.clippingPlane || undefined,
      pointSides: result.pointSides || undefined,
      sections: result.sections || undefined,
    }

    setGeometryData(mappedData)
    setIsConsistent(mappedData.is_consistent)
    setQueries(mappedData.queries || [])
    setValidation({
      isConsistent: mappedData.is_consistent,
      issues: result.validation?.failures?.map((f: any) => f.message) || []
    })
  }

  const handleSolveNow = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const response = await fetch('http://localhost:5000/api/Geometry/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problem),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Lỗi server')
      }

      const result = await response.json()
      handleApplyData(result)
    } catch (error: any) {
      setErrorMessage(error.message || 'Lỗi kết nối.')
      setValidation({ isConsistent: false, issues: [error.message || 'Lỗi'] })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-card text-card-foreground border-r border-border shadow-inner">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">Trình giải Hình học AI</h1>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest">Trình giải toán không gian</p>
      </div>

      {/* Main Input Section */}
      <div className="flex flex-col gap-3 flex-1">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
            Đề bài toán học
          </label>
          <div className="relative group">
            <Textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Nhập đề bài hình học tại đây..."
              className="w-full h-[320px] bg-background border-border resize-none text-[13px] leading-relaxed p-4 rounded-2xl focus:ring-primary/20 transition-all shadow-inner"
            />
            <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
              {problem.length} ký tự
            </div>
          </div>
        </div>

        <Button
          onClick={handleSolveNow}
          disabled={isLoading}
          className="w-full h-12 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Đang phân tích...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Play size={16} fill="currentColor" />
              VẼ HÌNH NGAY
            </div>
          )}
        </Button>

        {/* Validation Status Label */}
        {geometryData && (
          <div className={`
            mt-2 p-4 rounded-2xl border flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2
            ${validation.isConsistent 
              ? 'bg-green-500/5 border-green-500/20 text-green-600' 
              : 'bg-destructive/5 border-destructive/20 text-destructive'}
          `}>
            {validation.isConsistent ? (
              <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-1">
              <p className="text-[13px] font-bold leading-none">
                {validation.isConsistent ? 'Hình vẽ chính xác' : 'Phát hiện mâu thuẫn'}
              </p>
              <p className="text-[11px] opacity-80 leading-relaxed">
                {validation.isConsistent 
                  ? 'Hệ thống đã xác thực tính nhất quán của dữ liệu hình học.' 
                  : (validation.issues[0] || 'Dữ liệu đề bài có thể bị thiếu hoặc mâu thuẫn.')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Tools */}
      <div className="pt-4 border-t border-border/60">
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl border-dashed border-border hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all flex items-center gap-2 text-xs font-semibold"
          onClick={() => alert('Cảm ơn bạn đã báo cáo. Chúng tôi sẽ cải thiện thuật toán sớm nhất.')}
        >
          <MessageSquareWarning size={14} />
          Báo cáo hình vẽ sai
        </Button>
      </div>
    </div>
  )
}
